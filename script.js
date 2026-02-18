// Configuração da API
// Use CONFIG do arquivo config.js se disponível, senão use valores padrão
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) || 'https://goireland.ci.com.br/api';
const API_TOKEN = (typeof CONFIG !== 'undefined' && CONFIG.API_TOKEN) || 'eyJzdWIiOiIy0DAwMDcwMyIsIm5hbWUiOiJNWVRNIE9maWNpYWwiLCJpYXQiOjE1MTYyMzkwMjJ9'; // Substitua pela sua chave de autorização

// Função para fazer requisições à API
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Authorization': API_TOKEN,
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

    if (!formData.mensagem || formData.mensagem.trim() === '') {
        errors.push('Conte-nos sobre seus objetivos é obrigatório');
    }

    return errors;
}

// Função para coletar dados do formulário
function collectFormData() {
    const form = document.getElementById('contactForm');
    const formData = new FormData(form);
    
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
    
    const data = {
        nomecontato: formData.get('nomecontato'),
        emailcontato: formData.get('emailcontato'),
        dditelefonecontato: dditelefonecontato,
        telefonecontato: telefonecontato,
        mensagem: formData.get('mensagem')
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
    
    // Desabilitar botão e mostrar loading
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline';
    if (!btnLoader) submitBtn.textContent = 'Enviando...';

    // Coletar dados
    const formData = collectFormData();

    // Validar
    const errors = validateForm(formData);
    if (errors.length > 0) {
            showMessage(errors.join(', '), 'error');
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (!btnLoader) submitBtn.innerHTML = '<span class="btn-text">Enviar Formulário</span>';
            return;
    }

    try {
        // Enviar para API
        const response = await fetchAPI('/comum/formulario/', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (response.sucesso) {
            const successMsg = response.mensagem || 
                (typeof CONFIG !== 'undefined' && CONFIG.MESSAGES && CONFIG.MESSAGES.SUCCESS) || 
                'Formulário enviado com sucesso! Nossos consultores entrarão em contato em breve.';
            showMessage(successMsg, 'success');
            
            // Limpar formulário após sucesso
            document.getElementById('contactForm').reset();
            
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
        // Reabilitar botão
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        if (!btnLoader) submitBtn.innerHTML = '<span class="btn-text">Enviar Formulário</span>';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar event listener ao formulário
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', submitForm);
    }

    // Adicionar animação suave ao scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
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
