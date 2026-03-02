// Configuração da API
// Use CONFIG do arquivo config.js se disponível, senão use valores padrão
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) || '/api';
const SECURITY_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.SECURITY) || {};
const TURNSTILE_CONFIG = SECURITY_CONFIG.TURNSTILE || {};

const formSecurityState = {
    startTimestamp: Date.now(),
    touchedFields: new Set(),
    turnstileWidgetId: null,
    turnstileVisible: false,
    turnstileToken: ''
};

// Função para fazer requisições à API
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Verificar se a resposta é OK
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ mensagem: 'Erro na requisição' }));
            console.error('Erro na API:', response.status, errorData);
            throw new Error(errorData.mensagem || `Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        // Verificar se é erro de CORS
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            console.error('Erro de CORS: Certifique-se de que está usando um servidor HTTP (não file://)');
            throw new Error('Erro de conexão. Certifique-se de que está usando um servidor HTTP local ou hospedado.');
        }
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// Funções de carregamento removidas - não precisamos mais de unidades e programas no formulário

// Máscara de telefone
function maskPhone(value) {
    value = value.replace(/\D/g, '');
    if (value.length <= 10) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else {
        value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    }
    return value;
}

// Máscara simples de telefone: permite +, números e espaços, sem forçar DDI
function maskPhoneComplete(value) {
    // Mantém apenas dígitos, + e espaços
    return value.replace(/[^\d+\s]/g, '');
}

// Aplicar máscara de telefone completo
const telefoneInput = document.getElementById('telefonecontato');

if (telefoneInput) {
    telefoneInput.addEventListener('input', (e) => {
        e.target.value = maskPhoneComplete(e.target.value);
    });
}

// Função para mostrar mensagem
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('formMessage');
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';

    // Scroll suave até a mensagem
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Remover mensagem após timeout (apenas se for sucesso)
    if (type === 'success') {
        const timeout = (typeof CONFIG !== 'undefined' && CONFIG.SUCCESS_MESSAGE_TIMEOUT) || 5000;
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, timeout);
    }
}

function isSecurityEnabled() {
    return SECURITY_CONFIG.ENABLED !== false;
}

function getRawFormData() {
    const form = document.getElementById('contactForm');
    if (!form) return null;
    return new FormData(form);
}

function getHoneypotValue(rawFormData) {
    if (!isSecurityEnabled() || !rawFormData) return '';
    const fieldName = SECURITY_CONFIG.HONEYPOT_FIELD || 'company_website';
    return String(rawFormData.get(fieldName) || '').trim();
}

function getFormElapsedMs(rawFormData) {
    const startedAtFromField = Number(rawFormData && rawFormData.get('form_started_at'));
    const startedAt = Number.isFinite(startedAtFromField) && startedAtFromField > 0
        ? startedAtFromField
        : formSecurityState.startTimestamp;
    return Date.now() - startedAt;
}

function validateMinimumSubmitTime(elapsedMs) {
    if (!isSecurityEnabled()) return { valid: true, remainingMs: 0 };
    const minSubmitTime = Number(SECURITY_CONFIG.MIN_SUBMIT_TIME_MS || 0);
    if (elapsedMs >= minSubmitTime) return { valid: true, remainingMs: 0 };
    return { valid: false, remainingMs: minSubmitTime - elapsedMs };
}

function getRateLimitAttempts() {
    const storageKey = SECURITY_CONFIG.RATE_LIMIT_STORAGE_KEY || 'ci_form_rate_limit_v1';
    const windowMs = Number(SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
    const now = Date.now();

    try {
        const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const validAttempts = current.filter((timestamp) => Number(timestamp) > (now - windowMs));
        localStorage.setItem(storageKey, JSON.stringify(validAttempts));
        return validAttempts;
    } catch (error) {
        console.warn('Não foi possível acessar o localStorage para rate limit:', error);
        return [];
    }
}

function validateRateLimit() {
    if (!isSecurityEnabled()) return { valid: true, remainingMs: 0, attempts: [] };
    const maxAttempts = Number(SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS || 3);
    const windowMs = Number(SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
    const attempts = getRateLimitAttempts();
    if (attempts.length < maxAttempts) return { valid: true, remainingMs: 0, attempts };

    const firstAttemptInWindow = attempts[0] || Date.now();
    const remainingMs = Math.max(0, (firstAttemptInWindow + windowMs) - Date.now());
    return { valid: false, remainingMs, attempts };
}

function registerRateLimitAttempt() {
    if (!isSecurityEnabled()) return;
    const storageKey = SECURITY_CONFIG.RATE_LIMIT_STORAGE_KEY || 'ci_form_rate_limit_v1';
    const attempts = getRateLimitAttempts();
    attempts.push(Date.now());
    try {
        localStorage.setItem(storageKey, JSON.stringify(attempts));
    } catch (error) {
        console.warn('Não foi possível registrar tentativa no rate limit:', error);
    }
}

function shouldForceTurnstileChallenge(elapsedMs, attemptsInWindow) {
    const minSubmitTime = Number(SECURITY_CONFIG.MIN_SUBMIT_TIME_MS || 0);
    const touchedCount = formSecurityState.touchedFields.size;
    const veryFastSubmit = elapsedMs < (minSubmitTime + 2000);
    const lowInteraction = touchedCount <= 1;
    const manyAttempts = attemptsInWindow >= Math.max(1, Number(SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS || 3) - 1);
    return veryFastSubmit || lowInteraction || manyAttempts;
}

function toggleTurnstileContainer(show) {
    const container = document.getElementById('turnstileContainer');
    if (!container) return;
    container.classList.toggle('is-visible', show);
}

function renderTurnstile(forceVisible = false) {
    if (!TURNSTILE_CONFIG.ENABLED || !TURNSTILE_CONFIG.SITE_KEY) return null;
    if (typeof window.turnstile === 'undefined') return null;

    const container = document.getElementById('turnstileContainer');
    if (!container) return null;

    if (formSecurityState.turnstileWidgetId && formSecurityState.turnstileVisible === forceVisible) {
        return formSecurityState.turnstileWidgetId;
    }

    if (formSecurityState.turnstileWidgetId) {
        window.turnstile.remove(formSecurityState.turnstileWidgetId);
        formSecurityState.turnstileWidgetId = null;
    }

    toggleTurnstileContainer(forceVisible);
    formSecurityState.turnstileVisible = forceVisible;
    formSecurityState.turnstileToken = '';

    const widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_CONFIG.SITE_KEY,
        action: TURNSTILE_CONFIG.ACTION || 'lead_form',
        appearance: forceVisible ? 'always' : 'execute',
        execution: 'execute',
        callback: (token) => {
            formSecurityState.turnstileToken = token;
        },
        'error-callback': () => {
            formSecurityState.turnstileToken = '';
        },
        'expired-callback': () => {
            formSecurityState.turnstileToken = '';
        }
    });

    formSecurityState.turnstileWidgetId = widgetId;
    return widgetId;
}

function waitForTurnstileToken(timeoutMs = 5000) {
    return new Promise((resolve) => {
        const intervalMs = 100;
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            resolve('');
        }, timeoutMs);

        const intervalId = setInterval(() => {
            if (formSecurityState.turnstileToken) {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                resolve(formSecurityState.turnstileToken);
            }
        }, intervalMs);
    });
}

async function getTurnstileToken(forceVisibleChallenge) {
    if (!TURNSTILE_CONFIG.ENABLED) return '';
    const widgetId = renderTurnstile(forceVisibleChallenge);
    if (!widgetId) return '';

    formSecurityState.turnstileToken = '';
    window.turnstile.execute(widgetId);

    let token = await waitForTurnstileToken(forceVisibleChallenge ? 120000 : 5000);
    const allowFallback = TURNSTILE_CONFIG.FALLBACK_TO_VISIBLE_CHALLENGE !== false;

    if (!token && !forceVisibleChallenge && allowFallback) {
        const visibleWidgetId = renderTurnstile(true);
        if (!visibleWidgetId) return '';
        window.turnstile.execute(visibleWidgetId);
        token = await waitForTurnstileToken(120000);
    }

    return token;
}

function resetFormSecurityState() {
    formSecurityState.startTimestamp = Date.now();
    formSecurityState.touchedFields.clear();

    const startedAtInput = document.getElementById('form_started_at');
    if (startedAtInput) {
        startedAtInput.value = String(formSecurityState.startTimestamp);
    }
}

function initFormSecurityTracking(form) {
    resetFormSecurityState();
    const trackFieldTouch = (event) => {
        if (event && event.target && event.target.name) {
            formSecurityState.touchedFields.add(event.target.name);
        }
    };

    form.addEventListener('input', trackFieldTouch);
    form.addEventListener('change', trackFieldTouch);
}

// Função para validar formulário
function validateForm(formData) {
    const errors = [];

    if (!formData.nomecontato || formData.nomecontato.trim() === '') {
        errors.push('Nome completo é obrigatório');
    }

    if (!formData.emailcontato || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailcontato)) {
        errors.push('E-mail válido é obrigatório');
    }

    if (!formData.telefonecontato || formData.telefonecontato.trim() === '') {
        errors.push('Telefone é obrigatório');
    } else {
        const telefoneLimpo = formData.telefonecontato.replace(/\D/g, '');
        // Verifica se tem ao menos 8 dígitos (qualquer país)
        if (telefoneLimpo.length < 8) {
            errors.push('Telefone deve incluir código do país e número completo');
        }
    }

    if (!formData.nivelingles || formData.nivelingles.trim() === '') {
        errors.push('Nível de Inglês é obrigatório');
    }

    if (!formData.vencimentovisto || formData.vencimentovisto.trim() === '') {
        errors.push('Data de vencimento do visto é obrigatória');
    }

    return errors;
}

// Função para coletar dados do formulário
function collectFormData(rawFormData) {
    const formData = rawFormData || getRawFormData();
    if (!formData) return {};
    
    // Separar DDI e telefone do campo único
    const telefoneCompleto = formData.get('telefonecontato') || '';
    let dditelefonecontato = '';
    let telefonecontato = telefoneCompleto.trim();
    
    // Extrair DDI se presente
    if (telefoneCompleto.startsWith('+')) {
        const match = telefoneCompleto.match(/^(\+\d{1,3})\s*(.+)$/);
        if (match) {
            dditelefonecontato = match[1];
            telefonecontato = match[2].trim();
        }
    }
    
    const nivelIngles = formData.get('nivelingles') || '';
    const vencimentoVisto = formData.get('vencimentovisto') || '';
    const mensagem = `Nível de Inglês: ${nivelIngles}. Vencimento do visto: ${vencimentoVisto}.`;

    const data = {
        nomecontato: formData.get('nomecontato'),
        emailcontato: formData.get('emailcontato'),
        dditelefonecontato: dditelefonecontato,
        telefonecontato: telefonecontato,
        mensagem: mensagem,
        nivelingles: nivelIngles,
        vencimentovisto: vencimentoVisto,
        form_started_at: Number(formData.get('form_started_at') || Date.now()),
        company_website: String(formData.get('company_website') || '')
    };

    // ID da unidade (obrigatório pela API, usando valor padrão se não fornecido)
    const idunidade = formData.get('idunidade');
    if (idunidade) {
        data.idunidade = idunidade;
    } else {
        // Usar unidade padrão da CI Irlanda
        const defaultUnitId = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_UNIT_ID) || '2';
        data.idunidade = defaultUnitId;
    }

    const idprograma = formData.get('idprograma');
    if (idprograma) data.idprograma = idprograma;

    const idpais = formData.get('idpais');
    if (idpais) data.idpais = idpais;

    // Checkboxes
    data.recebeemail = 'S'; // Sempre enviar como 'S' já que não há mais checkbox
    data.recebesms = formData.get('recebesms') === 'S' ? 'S' : 'N';

    // Capturar dados de origem (UTM parameters)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('utm_source')) data.source = urlParams.get('utm_source');
    if (urlParams.get('utm_medium')) data.medium = urlParams.get('utm_medium');
    if (urlParams.get('utm_campaign')) data.campaing = urlParams.get('utm_campaign');
    if (urlParams.get('utm_term')) data.term = urlParams.get('utm_term');
    if (urlParams.get('gclid')) data.gclid = urlParams.get('gclid');
    
    return data;
}

// Função para enviar formulário
async function submitForm(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    const resetSubmitButton = () => {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        if (!btnLoader) submitBtn.innerHTML = '<span class="btn-text">Enviar Formulário</span>';
    };

    const rawFormData = getRawFormData();
    if (!rawFormData) {
        showMessage('Erro ao ler os dados do formulário. Atualize a página e tente novamente.', 'error');
        return;
    }

    const honeypotValue = getHoneypotValue(rawFormData);
    if (honeypotValue) {
        return;
    }

    const elapsedMs = getFormElapsedMs(rawFormData);
    const minTimeValidation = validateMinimumSubmitTime(elapsedMs);
    if (!minTimeValidation.valid) {
        const remainingSeconds = Math.max(1, Math.ceil(minTimeValidation.remainingMs / 1000));
        showMessage(`Confirme seus dados e tente novamente em ${remainingSeconds}s.`, 'error');
        return;
    }

    const rateLimitValidation = validateRateLimit();
    if (!rateLimitValidation.valid) {
        const waitMinutes = Math.max(1, Math.ceil(rateLimitValidation.remainingMs / 60000));
        showMessage(`Você atingiu o limite de tentativas. Tente novamente em ${waitMinutes} minuto(s).`, 'error');
        return;
    }

    // Desabilitar botão e mostrar loading
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline';
    if (!btnLoader) submitBtn.textContent = 'Enviando...';

    const formData = collectFormData(rawFormData);

    const errors = validateForm(formData);
    if (errors.length > 0) {
        showMessage(errors.join(', '), 'error');
        resetSubmitButton();
        return;
    }

    let turnstileToken = '';
    if (TURNSTILE_CONFIG.ENABLED) {
        const forceChallenge = shouldForceTurnstileChallenge(elapsedMs, rateLimitValidation.attempts.length);
        turnstileToken = await getTurnstileToken(forceChallenge);

        if (!turnstileToken) {
            showMessage('Não foi possível validar a segurança do formulário. Tente novamente.', 'error');
            resetSubmitButton();
            return;
        }
    }

    registerRateLimitAttempt();

    try {
        // Enviar para API
        const response = await fetchAPI('/lead', {
            method: 'POST',
            headers: turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {},
            body: JSON.stringify(formData)
        });

        if (response.sucesso) {
            const successMsg = response.mensagem || 
                (typeof CONFIG !== 'undefined' && CONFIG.MESSAGES && CONFIG.MESSAGES.SUCCESS) || 
                'Formulário enviado com sucesso! Nossos consultores entrarão em contato em breve.';
            showMessage(successMsg, 'success');
            
            // Limpar formulário após sucesso
            document.getElementById('contactForm').reset();
            resetFormSecurityState();
            toggleTurnstileContainer(false);
            formSecurityState.turnstileToken = '';
            
            // Resetar telefone para padrão irlandês
            const telefoneField = document.getElementById('telefonecontato');
            if (telefoneField) {
                telefoneField.value = '+353 ';
            }
        } else {
            const errorMsg = response.mensagem || 
                (typeof CONFIG !== 'undefined' && CONFIG.MESSAGES && CONFIG.MESSAGES.ERROR) || 
                'Erro ao enviar formulário. Por favor, tente novamente.';
            showMessage(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        const networkError = (typeof CONFIG !== 'undefined' && CONFIG.MESSAGES && CONFIG.MESSAGES.NETWORK_ERROR) || 
            'Erro ao enviar formulário. Por favor, verifique sua conexão e tente novamente.';
        showMessage(networkError, 'error');
    } finally {
        resetSubmitButton();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const officeCarousel = document.querySelector('[data-office-carousel]');
    if (officeCarousel) {
        const slides = Array.from(officeCarousel.querySelectorAll('.store-image'));
        const prevBtn = officeCarousel.querySelector('.store-carousel-btn.prev');
        const nextBtn = officeCarousel.querySelector('.store-carousel-btn.next');
        const dotsContainer = officeCarousel.querySelector('.store-carousel-dots');
        let currentSlide = 0;

        const goToSlide = (index) => {
            slides.forEach((slide, idx) => {
                slide.classList.toggle('is-active', idx === index);
            });
            if (dotsContainer) {
                dotsContainer.querySelectorAll('.store-carousel-dot').forEach((dot, idx) => {
                    dot.classList.toggle('is-active', idx === index);
                });
            }
            currentSlide = index;
        };

        if (slides.length > 1) {
            slides.forEach((_, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `store-carousel-dot${idx === 0 ? ' is-active' : ''}`;
                dot.setAttribute('aria-label', `Ir para foto ${idx + 1}`);
                dot.addEventListener('click', () => goToSlide(idx));
                if (dotsContainer) dotsContainer.appendChild(dot);
            });

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const nextIndex = (currentSlide - 1 + slides.length) % slides.length;
                    goToSlide(nextIndex);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const nextIndex = (currentSlide + 1) % slides.length;
                    goToSlide(nextIndex);
                });
            }
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsContainer) dotsContainer.style.display = 'none';
        }
    }

    const formModal = document.getElementById('hero-form-modal');
    const openFormTriggers = document.querySelectorAll('[data-open-form]');
    const closeFormTriggers = document.querySelectorAll('[data-close-form]');

    const openFormModal = () => {
        if (!formModal) return;
        formModal.classList.add('is-open');
        formModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    const closeFormModal = () => {
        if (!formModal) return;
        formModal.classList.remove('is-open');
        formModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    openFormTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openFormModal();
        });
    });

    closeFormTriggers.forEach((trigger) => {
        trigger.addEventListener('click', closeFormModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && formModal && formModal.classList.contains('is-open')) {
            closeFormModal();
        }
    });

    // Adicionar event listener ao formulário
    const form = document.getElementById('contactForm');
    if (form) {
        initFormSecurityTracking(form);
        form.addEventListener('submit', submitForm);
    }

    // Adicionar animação suave ao scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.hasAttribute('data-open-form')) {
                return;
            }
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
