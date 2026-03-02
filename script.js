// Configuração da API
// Use CONFIG do arquivo config.js se disponível, senão use valores padrão
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) || '/api';
const API_LEAD_ENDPOINT = (typeof CONFIG !== 'undefined' && CONFIG.API_LEAD_ENDPOINT) || '/lead';
const SECURITY_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.SECURITY) || {};
const TURNSTILE_CONFIG = SECURITY_CONFIG.TURNSTILE || {};
const TURNSTILE_FAIL_OPEN = TURNSTILE_CONFIG.FAIL_OPEN !== false;

const formSecurityState = {
    startTimestamp: Date.now(),
    touchedFields: new Set(),
    turnstileWidgetId: null,
    turnstileVisible: false,
    turnstileToken: ''
};

const SUPPORTED_LOCALES = ['pt', 'en', 'es'];
const DEFAULT_LOCALE = 'pt';
const LOCALE_STORAGE_KEY = 'ci_landing_locale';
let currentLocale = DEFAULT_LOCALE;
const FORM_DEBUG_ENABLED = true;

function debugTimestamp() {
    return new Date().toISOString();
}

function maskForLog(value, kind) {
    const str = String(value || '');
    if (!str) return str;
    if (kind === 'email') {
        const [user, domain] = str.split('@');
        if (!domain) return '***';
        return `${(user || '').slice(0, 2)}***@${domain}`;
    }
    if (kind === 'phone') {
        const clean = str.replace(/\s+/g, ' ').trim();
        if (clean.length <= 6) return '***';
        return `${clean.slice(0, 4)}***${clean.slice(-2)}`;
    }
    if (kind === 'name') {
        if (str.length <= 3) return '***';
        return `${str.slice(0, 2)}***`;
    }
    return str;
}

function formDebug(step, details = {}) {
    if (!FORM_DEBUG_ENABLED) return;
    console.log(`[FORM DEBUG][${debugTimestamp()}] ${step}`, details);
}

function formWarn(step, details = {}) {
    if (!FORM_DEBUG_ENABLED) return;
    console.warn(`[FORM DEBUG][${debugTimestamp()}] ${step}`, details);
}

function formError(step, details = {}) {
    if (!FORM_DEBUG_ENABLED) return;
    console.error(`[FORM DEBUG][${debugTimestamp()}] ${step}`, details);
}

const I18N = {
    pt: {
        pageTitle: 'CI Irlanda - Matrícula em Curso Superior | Já está na Irlanda?',
        pageDescription: 'Já está na Irlanda? Faça sua matrícula em curso superior agora! Mais de 1200 cursos disponíveis. Suporte gratuito e completo para sua aplicação.',
        languageNames: { pt: 'Português', en: 'English', es: 'Español' },
        headerButton: 'Iniciar meu planejamento acadêmico',
        heroTitle1: 'Escolher um curso superior na Irlanda não é sobre matrícula.',
        heroTitle2: '<strong>É sobre o seu futuro.</strong>',
        heroSubtitle: 'Há <strong>9 anos</strong>, orientamos mais de <strong>8.000 estudantes internacionais</strong> em decisões acadêmicas estratégicas, alinhadas a visto, carreira e empregabilidade.',
        heroBenefitsTitle: 'Decisões bem orientadas começam com entendimento profundo do seu perfil:',
        heroBenefits: [
            {
                title: 'Análise Estratégica Individual',
                description: 'Realizamos um diagnóstico do seu histórico e objetivos antes de qualquer recomendação. Cada orientação é personalizada e baseada no seu perfil real.'
            },
            {
                title: 'Curadoria Criteriosa de Instituições',
                description: 'Indicamos programas que fortalecem seu currículo e ampliam suas oportunidades no mercado irlandês e mundial.'
            },
            {
                title: 'Orientação especializada, sem honorários extras.',
                description: 'Não há cobrança adicional pela nossa consultoria. O investimento está apenas no valor do curso junto à instituição.'
            },
            {
                title: 'Planejamento de Visto e Progressão de Carreira',
                description: 'Alinhamos sua escolha acadêmica à sua estratégia migratória e posicionamento profissional.'
            },
            {
                title: 'Acompanhamento Consultivo do Diagnóstico à Matrícula',
                description: 'Conduzimos todo o processo com método, organização e orientação especializada até a matrícula.'
            }
        ],
        form: {
            title: 'Iniciar meu planejamento acadêmico',
            labels: {
                name: 'Nome Completo *',
                email: 'E-mail *',
                phone: 'Telefone/WhatsApp *',
                level: 'Qual seu nível de Inglês? *',
                visa: 'Quando vence o seu visto? *'
            },
            placeholders: {
                name: 'Seu nome completo',
                email: 'seu@email.com',
                phone: '+353 83 123 4567 ou +55 11 91234 5678'
            },
            levelOptions: ['Selecione seu nível', 'Básico', 'Intermediário', 'Avançado', 'Fluente'],
            submit: 'Solicitar Contato',
            sending: 'Enviando...'
        },
        benefitsSection: {
            title: 'Por que escolher a CI Irlanda?',
            subtitleTitle: 'Porque nós entendemos as consequências da sua escolha.',
            subtitleText: 'Ao longo de mais de 8.000 orientações acadêmicas, vimos como um curso bem escolhido acelera trajetórias,  e como uma decisão desalinhada pode limitar oportunidades.',
            cards: [
                ['Mais de 1200 Cursos', 'Portfólio completo de universidades parceiras com graduações, pós-graduações e mestrados.'],
                ['Mais de 8000 Alunos', 'Mais de 8000 histórias transformadas com aplicação, orientação e acompanhamento universitário.'],
                ['Loja Física na Irlanda', 'Presença física em Dublin para dar suporte completo durante sua jornada acadêmica.'],
                ['Economia Real', 'Orientamos sem cobrança. O valor é só do programa na universidade parceira.'],
                ['Visto e progressão acadêmica', 'Orientamos sua escolha considerando impacto no visto atual e nas próximas etapas da sua trajetória na Irlanda.'],
                ['Intermediação B2B', 'Te representamos perante a instituição escolhida, tornando os processos mais fáceis e fluidos.'],
                ['Flexibilidade no Pagamento', 'Parcelamento no cartão de crédito e apoio na solicitação de empréstimo estudantil.'],
                ['Preparatório para o exame de aceitação', 'Você terá acesso às aulas preparatórias para o exame de aceitação nas universidades parceiras.'],
                ['Tax Relief', 'Orientação para buscar reembolso de até 20% do valor pago no curso.'],
                ['Apoio Antes, Durante e Depois', 'Customer Experience ao seu lado na Irlanda, com convites para eventos e apoio local via WhatsApp.']
            ]
        },
        finalCta: {
            title: 'Orientação estratégica começa com o primeiro passo.',
            subtitle: 'Compartilhe os seus objetivos. Nossa equipe analisará seu caso para estruturar sua próxima decisão acadêmica na Irlanda.',
            button: 'Solicitar minha análise personalizada'
        },
        location: {
            title: 'Nossa Loja Física em Dublin',
            subtitle: 'Contamos com estrutura física na Irlanda para receber estudantes que preferem orientação presencial. Nossa equipe está disponível para atendimentos em nosso escritório em Dublin.\n\nSerá um prazer receber você.',
            prevPhoto: 'Foto anterior',
            nextPhoto: 'Próxima foto',
            goToPhoto: 'Ir para foto'
        },
        footer: {
            contactTitle: 'Contato',
            phone: '<strong>Telefone:</strong> +353 01 874 7095',
            whatsapp: '<strong>WhatsApp:</strong> +353 83 083 7734 ou +353 86 014 2313',
            email: '<strong>E-mail:</strong> <a href="mailto:mktireland@ci.com.br">mktireland@ci.com.br</a>',
            addressTitle: 'Endereço',
            address1: 'Ground Floor, Ormond Building',
            address2: '31-36 Ormond Quay Upper, Inns Quay',
            address3: 'Dublin 7 - Dublin, Irlanda',
            rights: '© 2024 CI Irlanda. Todos os direitos reservados.',
            registration: 'Intercambio Study Travel Limited | Número de registro: 584564'
        },
        validation: {
            readError: 'Erro ao ler os dados do formulário. Atualize a página e tente novamente.',
            minSubmitTime: 'Confirme seus dados e tente novamente em {seconds}s.',
            rateLimit: 'Você atingiu o limite de tentativas. Tente novamente em {minutes} minuto(s).',
            requiredName: 'Nome completo é obrigatório',
            requiredEmail: 'E-mail válido é obrigatório',
            requiredPhone: 'Telefone é obrigatório',
            invalidPhone: 'Telefone deve incluir código do país e número completo',
            requiredLevel: 'Nível de Inglês é obrigatório',
            requiredVisa: 'Data de vencimento do visto é obrigatória',
            captchaUnstable: 'Alerta: o CAPTCHA está instável no momento. Seu envio continuará normalmente.',
            captchaError: 'Não foi possível validar a segurança do formulário. Tente novamente.',
            successDefault: 'Formulário enviado com sucesso! Nossos consultores entrarão em contato em breve.',
            errorDefault: 'Erro ao enviar formulário. Por favor, tente novamente.',
            networkError: 'Erro ao enviar formulário. Por favor, verifique sua conexão e tente novamente.',
            captchaNote: 'Observação: houve instabilidade no CAPTCHA, mas seu formulário foi enviado com sucesso.'
        }
    },
    en: {
        pageTitle: 'CI Ireland - Higher Education Enrollment | Already in Ireland?',
        pageDescription: 'Already in Ireland? Enroll in higher education now. More than 1,200 courses available with complete support for your application.',
        languageNames: { pt: 'Português', en: 'English', es: 'Español' },
        headerButton: 'Start my academic planning',
        heroTitle1: 'Choosing a higher education course in Ireland is not just about enrollment.',
        heroTitle2: '<strong>It is about your future.</strong>',
        heroSubtitle: 'For <strong>9 years</strong>, we have guided more than <strong>8,000 international students</strong> in strategic academic decisions aligned with visa, career, and employability goals.',
        heroBenefitsTitle: 'Well-informed decisions start with a deep understanding of your profile:',
        heroBenefits: [
            {
                title: 'Individual Strategic Analysis',
                description: 'We assess your background and goals before any recommendation. Every guidance is personalized and based on your real profile.'
            },
            {
                title: 'Careful Institution Curation',
                description: 'We recommend programs that strengthen your CV and expand your opportunities in the Irish and global market.'
            },
            {
                title: 'Specialized guidance with no extra fees.',
                description: 'There is no additional fee for our consultancy. Your investment is only the course cost charged by the institution.'
            },
            {
                title: 'Visa and Career Progression Planning',
                description: 'We align your academic choice with your immigration strategy and professional positioning.'
            },
            {
                title: 'Consultative Support from Diagnosis to Enrollment',
                description: 'We guide the entire process with method, organization, and specialized support until enrollment.'
            }
        ],
        form: {
            title: 'Start my academic planning',
            labels: {
                name: 'Full Name *',
                email: 'Email *',
                phone: 'Phone/WhatsApp *',
                level: 'What is your English level? *',
                visa: 'When does your visa expire? *'
            },
            placeholders: {
                name: 'Your full name',
                email: 'your@email.com',
                phone: '+353 83 123 4567 or +55 11 91234 5678'
            },
            levelOptions: ['Select your level', 'Basic', 'Intermediate', 'Advanced', 'Fluent'],
            submit: 'Request Contact',
            sending: 'Sending...'
        },
        benefitsSection: {
            title: 'Why choose CI Ireland?',
            subtitleTitle: 'Because we understand the consequences of your choice.',
            subtitleText: 'After more than 8,000 academic guidance cases, we have seen how the right course accelerates careers, while a poor choice can limit opportunities.',
            cards: [
                ['More than 1,200 Courses', 'A complete portfolio of partner universities with undergraduate, postgraduate, and master programs.'],
                ['More than 8,000 Students', 'More than 8,000 transformed stories with enrollment, guidance, and university support.'],
                ['Physical Office in Ireland', 'A physical office in Dublin to provide full support throughout your academic journey.'],
                ['Real Savings', 'Our guidance is free of charge. You only pay the university program fee.'],
                ['Visa and academic progression', 'We guide your choice considering your current visa impact and next steps in your journey in Ireland.'],
                ['B2B Intermediation', 'We represent you before the chosen institution, making processes simpler and smoother.'],
                ['Payment Flexibility', 'Credit card installments and support when applying for student loans.'],
                ['Acceptance Exam Preparation', 'You will have access to preparation classes for acceptance exams in partner universities.'],
                ['Tax Relief', 'Guidance to seek up to 20% reimbursement of your course fees.'],
                ['Support Before, During, and After', 'Customer Experience by your side in Ireland, with event invitations and local WhatsApp support.']
            ]
        },
        finalCta: {
            title: 'Strategic guidance starts with the first step.',
            subtitle: 'Share your goals. Our team will analyze your case and structure your next academic decision in Ireland.',
            button: 'Request my personalized analysis'
        },
        location: {
            title: 'Our Physical Store in Dublin',
            subtitle: 'We have a physical structure in Ireland for students who prefer in-person guidance. Our team is available for appointments at our office in Dublin.\n\nWe will be happy to welcome you.',
            prevPhoto: 'Previous photo',
            nextPhoto: 'Next photo',
            goToPhoto: 'Go to photo'
        },
        footer: {
            contactTitle: 'Contact',
            phone: '<strong>Phone:</strong> +353 01 874 7095',
            whatsapp: '<strong>WhatsApp:</strong> +353 83 083 7734 or +353 86 014 2313',
            email: '<strong>Email:</strong> <a href="mailto:mktireland@ci.com.br">mktireland@ci.com.br</a>',
            addressTitle: 'Address',
            address1: 'Ground Floor, Ormond Building',
            address2: '31-36 Ormond Quay Upper, Inns Quay',
            address3: 'Dublin 7 - Dublin, Ireland',
            rights: '© 2024 CI Ireland. All rights reserved.',
            registration: 'Intercambio Study Travel Limited | Registration number: 584564'
        },
        validation: {
            readError: 'Error reading form data. Refresh the page and try again.',
            minSubmitTime: 'Please review your details and try again in {seconds}s.',
            rateLimit: 'You reached the attempt limit. Try again in {minutes} minute(s).',
            requiredName: 'Full name is required',
            requiredEmail: 'A valid email is required',
            requiredPhone: 'Phone number is required',
            invalidPhone: 'Phone must include country code and full number',
            requiredLevel: 'English level is required',
            requiredVisa: 'Visa expiration date is required',
            captchaUnstable: 'Warning: CAPTCHA is unstable right now. Your submission will continue normally.',
            captchaError: 'Could not validate form security. Please try again.',
            successDefault: 'Form submitted successfully! Our consultants will contact you soon.',
            errorDefault: 'Error submitting form. Please try again.',
            networkError: 'Error submitting form. Please check your connection and try again.',
            captchaNote: 'Note: CAPTCHA was unstable, but your form was successfully submitted.'
        }
    },
    es: {
        pageTitle: 'CI Irlanda - Matrícula en Educación Superior | ¿Ya estás en Irlanda?',
        pageDescription: '¿Ya estás en Irlanda? Matricúlate en educación superior ahora. Más de 1.200 cursos disponibles con soporte completo para tu aplicación.',
        languageNames: { pt: 'Português', en: 'English', es: 'Español' },
        headerButton: 'Iniciar mi planificación académica',
        heroTitle1: 'Elegir un curso superior en Irlanda no es solo una matrícula.',
        heroTitle2: '<strong>Se trata de tu futuro.</strong>',
        heroSubtitle: 'Hace <strong>9 años</strong>, orientamos a más de <strong>8.000 estudiantes internacionales</strong> en decisiones académicas estratégicas, alineadas con visa, carrera y empleabilidad.',
        heroBenefitsTitle: 'Las buenas decisiones comienzan con una comprensión profunda de tu perfil:',
        heroBenefits: [
            {
                title: 'Análisis Estratégico Individual',
                description: 'Realizamos un diagnóstico de tu historial y objetivos antes de cualquier recomendación. Cada orientación es personalizada y basada en tu perfil real.'
            },
            {
                title: 'Curaduría Cuidadosa de Instituciones',
                description: 'Indicamos programas que fortalecen tu currículum y amplían tus oportunidades en el mercado irlandés y global.'
            },
            {
                title: 'Orientación especializada, sin honorarios extra.',
                description: 'No hay costo adicional por nuestra consultoría. La inversión es solo el valor del curso con la institución.'
            },
            {
                title: 'Planificación de Visa y Progresión Profesional',
                description: 'Alineamos tu elección académica con tu estrategia migratoria y posicionamiento profesional.'
            },
            {
                title: 'Acompañamiento Consultivo desde el Diagnóstico hasta la Matrícula',
                description: 'Conducimos todo el proceso con método, organización y orientación especializada hasta la matrícula.'
            }
        ],
        form: {
            title: 'Iniciar mi planificación académica',
            labels: {
                name: 'Nombre Completo *',
                email: 'Correo electrónico *',
                phone: 'Teléfono/WhatsApp *',
                level: '¿Cuál es tu nivel de inglés? *',
                visa: '¿Cuándo vence tu visa? *'
            },
            placeholders: {
                name: 'Tu nombre completo',
                email: 'tu@email.com',
                phone: '+353 83 123 4567 o +55 11 91234 5678'
            },
            levelOptions: ['Selecciona tu nivel', 'Básico', 'Intermedio', 'Avanzado', 'Fluido'],
            submit: 'Solicitar contacto',
            sending: 'Enviando...'
        },
        benefitsSection: {
            title: '¿Por qué elegir CI Irlanda?',
            subtitleTitle: 'Porque entendemos las consecuencias de tu elección.',
            subtitleText: 'A lo largo de más de 8.000 orientaciones académicas, vimos cómo un curso bien elegido acelera trayectorias y cómo una decisión desalineada puede limitar oportunidades.',
            cards: [
                ['Más de 1.200 Cursos', 'Portafolio completo de universidades aliadas con licenciaturas, posgrados y maestrías.'],
                ['Más de 8.000 Estudiantes', 'Más de 8.000 historias transformadas con aplicación, orientación y acompañamiento universitario.'],
                ['Tienda Física en Irlanda', 'Presencia física en Dublín para brindar soporte completo durante tu jornada académica.'],
                ['Ahorro Real', 'Orientamos sin costo. Solo pagas el valor del programa con la universidad.'],
                ['Visa y progresión académica', 'Guiamos tu elección considerando el impacto en tu visa actual y las próximas etapas de tu trayectoria en Irlanda.'],
                ['Intermediación B2B', 'Te representamos ante la institución elegida, haciendo los procesos más simples y fluidos.'],
                ['Flexibilidad de Pago', 'Pago en cuotas con tarjeta de crédito y apoyo para solicitar préstamo estudiantil.'],
                ['Preparación para examen de admisión', 'Tendrás acceso a clases preparatorias para el examen de admisión en universidades aliadas.'],
                ['Tax Relief', 'Orientación para solicitar hasta 20% de reembolso del valor pagado del curso.'],
                ['Apoyo Antes, Durante y Después', 'Customer Experience a tu lado en Irlanda, con invitaciones a eventos y apoyo local por WhatsApp.']
            ]
        },
        finalCta: {
            title: 'La orientación estratégica empieza con el primer paso.',
            subtitle: 'Comparte tus objetivos. Nuestro equipo analizará tu caso para estructurar tu próxima decisión académica en Irlanda.',
            button: 'Solicitar mi análisis personalizado'
        },
        location: {
            title: 'Nuestra Tienda Física en Dublín',
            subtitle: 'Contamos con estructura física en Irlanda para recibir estudiantes que prefieren orientación presencial. Nuestro equipo está disponible para atenciones en nuestra oficina en Dublín.\n\nSerá un placer recibirte.',
            prevPhoto: 'Foto anterior',
            nextPhoto: 'Foto siguiente',
            goToPhoto: 'Ir a la foto'
        },
        footer: {
            contactTitle: 'Contacto',
            phone: '<strong>Teléfono:</strong> +353 01 874 7095',
            whatsapp: '<strong>WhatsApp:</strong> +353 83 083 7734 o +353 86 014 2313',
            email: '<strong>Correo:</strong> <a href="mailto:mktireland@ci.com.br">mktireland@ci.com.br</a>',
            addressTitle: 'Dirección',
            address1: 'Ground Floor, Ormond Building',
            address2: '31-36 Ormond Quay Upper, Inns Quay',
            address3: 'Dublin 7 - Dublin, Irlanda',
            rights: '© 2024 CI Irlanda. Todos los derechos reservados.',
            registration: 'Intercambio Study Travel Limited | Número de registro: 584564'
        },
        validation: {
            readError: 'Error al leer los datos del formulario. Actualiza la página e inténtalo de nuevo.',
            minSubmitTime: 'Confirma tus datos e inténtalo nuevamente en {seconds}s.',
            rateLimit: 'Alcanzaste el límite de intentos. Inténtalo otra vez en {minutes} minuto(s).',
            requiredName: 'El nombre completo es obligatorio',
            requiredEmail: 'Un correo electrónico válido es obligatorio',
            requiredPhone: 'El teléfono es obligatorio',
            invalidPhone: 'El teléfono debe incluir código de país y número completo',
            requiredLevel: 'El nivel de inglés es obligatorio',
            requiredVisa: 'La fecha de vencimiento de la visa es obligatoria',
            captchaUnstable: 'Aviso: el CAPTCHA está inestable en este momento. Tu envío continuará normalmente.',
            captchaError: 'No fue posible validar la seguridad del formulario. Inténtalo de nuevo.',
            successDefault: '¡Formulario enviado con éxito! Nuestros consultores se pondrán en contacto pronto.',
            errorDefault: 'Error al enviar el formulario. Por favor, inténtalo de nuevo.',
            networkError: 'Error al enviar el formulario. Revisa tu conexión e inténtalo de nuevo.',
            captchaNote: 'Nota: hubo inestabilidad en el CAPTCHA, pero tu formulario fue enviado correctamente.'
        }
    }
};

function tr(path, vars = {}) {
    const fallback = I18N[DEFAULT_LOCALE];
    const source = I18N[currentLocale] || fallback;
    const value = path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), source);
    const base = value === undefined
        ? path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), fallback)
        : value;
    if (typeof base !== 'string') return '';
    return Object.entries(vars).reduce((msg, [key, val]) => msg.replaceAll(`{${key}}`, String(val)), base);
}

function normalizeLocale(locale) {
    const clean = String(locale || '').toLowerCase().trim();
    return SUPPORTED_LOCALES.includes(clean) ? clean : DEFAULT_LOCALE;
}

function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
}

function setHtml(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = value;
}

function applyLocalizedContent(locale) {
    currentLocale = normalizeLocale(locale);
    const docLang = currentLocale === 'pt' ? 'pt-BR' : currentLocale === 'es' ? 'es-ES' : 'en-IE';
    document.documentElement.lang = docLang;
    document.title = tr('pageTitle');

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', tr('pageDescription'));

    document.querySelectorAll('.language-flag-btn').forEach((btn) => {
        const isActive = btn.dataset.locale === currentLocale;
        btn.classList.toggle('active', isActive);
        const btnLocale = btn.dataset.locale;
        const label = (I18N[currentLocale] && I18N[currentLocale].languageNames[btnLocale]) || btnLocale;
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
    });

    setText('.header-button', tr('headerButton'));
    setText('.hero-title', tr('heroTitle1'));
    setHtml('.hero-title-2', tr('heroTitle2'));
    setHtml('.hero-subtitle', tr('heroSubtitle'));
    setText('.hero-benefits-title', tr('heroBenefitsTitle'));

    const heroCards = document.querySelectorAll('.hero-benefit-card');
    const heroBenefits = I18N[currentLocale].heroBenefits;
    heroCards.forEach((card, index) => {
        const titleNode = card.querySelector('h3');
        const descNode = card.querySelector('p');
        const benefit = heroBenefits[index];
        if (!benefit) return;
        if (titleNode) titleNode.textContent = benefit.title;
        if (descNode) descNode.textContent = benefit.description;
    });

    setText('.form-header h2', tr('form.title'));
    setText('label[for="nomecontato"]', tr('form.labels.name'));
    setText('label[for="emailcontato"]', tr('form.labels.email'));
    setText('label[for="telefonecontato"]', tr('form.labels.phone'));
    setText('label[for="nivelingles"]', tr('form.labels.level'));
    setText('label[for="vencimentovisto"]', tr('form.labels.visa'));

    const nomeInput = document.getElementById('nomecontato');
    const emailInput = document.getElementById('emailcontato');
    const telefoneInputEl = document.getElementById('telefonecontato');
    if (nomeInput) nomeInput.placeholder = tr('form.placeholders.name');
    if (emailInput) emailInput.placeholder = tr('form.placeholders.email');
    if (telefoneInputEl) telefoneInputEl.placeholder = tr('form.placeholders.phone');

    const levelSelect = document.getElementById('nivelingles');
    if (levelSelect) {
        Array.from(levelSelect.options).forEach((option, index) => {
            const translated = I18N[currentLocale].form.levelOptions[index];
            if (translated) option.textContent = translated;
        });
    }

    setText('#submitBtn .btn-text', tr('form.submit'));
    setText('#submitBtn .btn-loader', tr('form.sending'));

    setText('.benefits .section-title', tr('benefitsSection.title'));
    setText('.benefits-differential h3', tr('benefitsSection.subtitleTitle'));
    setText('.benefits-differential p', tr('benefitsSection.subtitleText'));

    const benefitCards = document.querySelectorAll('.benefits-track .benefit-card');
    const benefitTexts = I18N[currentLocale].benefitsSection.cards;
    benefitCards.forEach((card, index) => {
        const baseIndex = index % 10;
        const cardContent = benefitTexts[baseIndex];
        const titleNode = card.querySelector('h3');
        const descNode = card.querySelector('p');
        if (!cardContent) return;
        if (titleNode) titleNode.textContent = cardContent[0];
        if (descNode) descNode.textContent = cardContent[1];
    });

    setText('.final-cta-title', tr('finalCta.title'));
    setText('.final-cta-subtitle', tr('finalCta.subtitle'));
    setText('.final-cta-button', tr('finalCta.button'));

    setText('.location-section .section-title', tr('location.title'));
    setText('.location-subtitle', tr('location.subtitle'));
    const prevBtn = document.querySelector('.store-carousel-btn.prev');
    const nextBtn = document.querySelector('.store-carousel-btn.next');
    if (prevBtn) prevBtn.setAttribute('aria-label', tr('location.prevPhoto'));
    if (nextBtn) nextBtn.setAttribute('aria-label', tr('location.nextPhoto'));

    const footerSections = document.querySelectorAll('.footer-section');
    if (footerSections[0]) {
        const lines = footerSections[0].querySelectorAll('p');
        const heading = footerSections[0].querySelector('h3');
        if (heading) heading.textContent = tr('footer.contactTitle');
        if (lines[0]) lines[0].innerHTML = tr('footer.phone');
        if (lines[1]) lines[1].innerHTML = tr('footer.whatsapp');
        if (lines[2]) lines[2].innerHTML = tr('footer.email');
    }

    if (footerSections[1]) {
        const lines = footerSections[1].querySelectorAll('p');
        const heading = footerSections[1].querySelector('h3');
        if (heading) heading.textContent = tr('footer.addressTitle');
        if (lines[0]) lines[0].textContent = tr('footer.address1');
        if (lines[1]) lines[1].textContent = tr('footer.address2');
        if (lines[2]) lines[2].textContent = tr('footer.address3');
    }

    const footerBottomLines = document.querySelectorAll('.footer-bottom p');
    if (footerBottomLines[0]) footerBottomLines[0].textContent = tr('footer.rights');
    if (footerBottomLines[1]) footerBottomLines[1].textContent = tr('footer.registration');

    document.querySelectorAll('.store-carousel-dot').forEach((dot, index) => {
        dot.setAttribute('aria-label', `${tr('location.goToPhoto')} ${index + 1}`);
    });
}

function getInitialLocale() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('lang')) {
        return normalizeLocale(params.get('lang'));
    }

    const stored = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    if (SUPPORTED_LOCALES.includes(stored)) {
        return stored;
    }

    return DEFAULT_LOCALE;
}

function setLocale(locale, updateUrl = true) {
    const normalized = normalizeLocale(locale);
    currentLocale = normalized;
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    applyLocalizedContent(normalized);

    if (updateUrl) {
        const url = new URL(window.location.href);
        if (normalized === DEFAULT_LOCALE) {
            url.searchParams.delete('lang');
        } else {
            url.searchParams.set('lang', normalized);
        }
        window.history.replaceState({}, '', url.toString());
    }
}

// Função para fazer requisições à API
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const apiToken = (typeof CONFIG !== 'undefined' && CONFIG.API_TOKEN) ? String(CONFIG.API_TOKEN) : '';
    const headers = {
        'Content-Type': 'application/json',
        ...(apiToken ? { 'Authorization': apiToken } : {}),
        ...options.headers
    };
    const method = options.method || 'GET';

    formDebug('API request started', {
        url,
        method,
        hasBody: Boolean(options.body),
        headers
    });

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type') || '';
        const isJsonResponse = contentType.includes('application/json');
        formDebug('API response received', {
            url,
            method,
            status: response.status,
            ok: response.ok,
            contentType,
            isJsonResponse
        });

        // Verificar se a resposta é OK
        if (!response.ok) {
            const errorData = isJsonResponse
                ? await response.json().catch(() => ({ mensagem: 'Erro na requisição' }))
                : { mensagem: `Resposta inválida do servidor (${response.status})` };
            formError('API returned non-OK status', {
                url,
                method,
                status: response.status,
                errorData
            });
            throw new Error(errorData.mensagem || `Erro ${response.status}: ${response.statusText}`);
        }

        if (!isJsonResponse) {
            const preview = await response.text().catch(() => '');
            formError('API returned non-JSON body', {
                url,
                method,
                preview: preview.slice(0, 300)
            });
            throw new Error('O servidor retornou HTML em vez de JSON. Verifique se o endpoint da API está correto e ativo.');
        }

        const data = await response.json();
        formDebug('API JSON parsed successfully', {
            url,
            method,
            data
        });
        return data;
    } catch (error) {
        // Verificar se é erro de CORS
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            formError('Network/CORS fetch failure', {
                url,
                method,
                error: error.message
            });
            throw new Error('Erro de conexão. Certifique-se de que está usando um servidor HTTP local ou hospedado.');
        }
        formError('Unhandled API fetch error', {
            url,
            method,
            error: error.message,
            stack: error.stack
        });
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
        errors.push(tr('validation.requiredName'));
    }

    if (!formData.emailcontato || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailcontato)) {
        errors.push(tr('validation.requiredEmail'));
    }

    if (!formData.telefonecontato || formData.telefonecontato.trim() === '') {
        errors.push(tr('validation.requiredPhone'));
    } else {
        const telefoneLimpo = formData.telefonecontato.replace(/\D/g, '');
        // Verifica se tem ao menos 8 dígitos (qualquer país)
        if (telefoneLimpo.length < 8) {
            errors.push(tr('validation.invalidPhone'));
        }
    }

    if (!formData.nivelingles || formData.nivelingles.trim() === '') {
        errors.push(tr('validation.requiredLevel'));
    }

    if (!formData.vencimentovisto || formData.vencimentovisto.trim() === '') {
        errors.push(tr('validation.requiredVisa'));
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

    formDebug('Form data collected', {
        nomecontato: maskForLog(data.nomecontato, 'name'),
        emailcontato: maskForLog(data.emailcontato, 'email'),
        telefonecontato: maskForLog(data.telefonecontato, 'phone'),
        dditelefonecontato: data.dditelefonecontato,
        nivelingles: data.nivelingles,
        vencimentovisto: data.vencimentovisto,
        idunidade: data.idunidade,
        idprograma: data.idprograma || null,
        idpais: data.idpais || null,
        recebeemail: data.recebeemail,
        recebesms: data.recebesms,
        hasUtmSource: Boolean(data.source),
        hasUtmMedium: Boolean(data.medium),
        hasUtmCampaign: Boolean(data.campaing),
        hasUtmTerm: Boolean(data.term),
        hasGclid: Boolean(data.gclid)
    });
    
    return data;
}

// Função para enviar formulário
async function submitForm(event) {
    event.preventDefault();
    formDebug('Submit triggered', {
        locale: currentLocale,
        path: window.location.pathname,
        query: window.location.search
    });

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    const resetSubmitButton = () => {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        if (!btnLoader) submitBtn.innerHTML = `<span class="btn-text">${tr('form.submit')}</span>`;
    };

    const rawFormData = getRawFormData();
    if (!rawFormData) {
        formError('Submit aborted: could not read raw form data');
        showMessage(tr('validation.readError'), 'error');
        return;
    }

    const honeypotValue = getHoneypotValue(rawFormData);
    if (honeypotValue) {
        formWarn('Submit blocked by honeypot', { honeypotFilled: true });
        return;
    }

    const elapsedMs = getFormElapsedMs(rawFormData);
    formDebug('Security timing evaluated', {
        elapsedMs,
        minRequiredMs: Number(SECURITY_CONFIG.MIN_SUBMIT_TIME_MS || 0)
    });
    const minTimeValidation = validateMinimumSubmitTime(elapsedMs);
    if (!minTimeValidation.valid) {
        const remainingSeconds = Math.max(1, Math.ceil(minTimeValidation.remainingMs / 1000));
        formWarn('Submit blocked: minimum submit time not reached', {
            elapsedMs,
            remainingMs: minTimeValidation.remainingMs
        });
        showMessage(tr('validation.minSubmitTime', { seconds: remainingSeconds }), 'error');
        return;
    }

    const rateLimitValidation = validateRateLimit();
    formDebug('Rate limit evaluated', {
        valid: rateLimitValidation.valid,
        attemptsInWindow: rateLimitValidation.attempts.length,
        maxAttempts: Number(SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS || 3)
    });
    if (!rateLimitValidation.valid) {
        const waitMinutes = Math.max(1, Math.ceil(rateLimitValidation.remainingMs / 60000));
        formWarn('Submit blocked: rate limit exceeded', {
            remainingMs: rateLimitValidation.remainingMs,
            attemptsInWindow: rateLimitValidation.attempts.length
        });
        showMessage(tr('validation.rateLimit', { minutes: waitMinutes }), 'error');
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
        formWarn('Submit blocked: validation errors', { errors });
        showMessage(errors.join(', '), 'error');
        resetSubmitButton();
        return;
    }

    let turnstileToken = '';
    let captchaBypassed = false;
    if (TURNSTILE_CONFIG.ENABLED) {
        const forceChallenge = shouldForceTurnstileChallenge(elapsedMs, rateLimitValidation.attempts.length);
        formDebug('Turnstile check started', {
            enabled: true,
            forceChallenge
        });
        turnstileToken = await getTurnstileToken(forceChallenge);
        formDebug('Turnstile token result', {
            hasToken: Boolean(turnstileToken),
            tokenLength: turnstileToken ? turnstileToken.length : 0
        });

        if (!turnstileToken) {
            if (TURNSTILE_FAIL_OPEN) {
                captchaBypassed = true;
                formWarn('Turnstile failed but continuing due to fail-open config');
                showMessage(tr('validation.captchaUnstable'), 'warning');
            } else {
                formError('Submit blocked: turnstile token missing and fail-open disabled');
                showMessage(tr('validation.captchaError'), 'error');
                resetSubmitButton();
                return;
            }
        }
    }

    registerRateLimitAttempt();
    formDebug('Rate limit attempt registered');

    try {
        // Enviar para API
        formDebug('Submitting payload to API', {
            endpoint: API_LEAD_ENDPOINT,
            apiBaseUrl: API_BASE_URL,
            hasTurnstileHeader: Boolean(turnstileToken),
            payloadPreview: {
                nomecontato: maskForLog(formData.nomecontato, 'name'),
                emailcontato: maskForLog(formData.emailcontato, 'email'),
                telefonecontato: maskForLog(formData.telefonecontato, 'phone'),
                idunidade: formData.idunidade,
                nivelingles: formData.nivelingles,
                vencimentovisto: formData.vencimentovisto
            }
        });
        const response = await fetchAPI(API_LEAD_ENDPOINT, {
            method: 'POST',
            headers: turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {},
            body: JSON.stringify(formData)
        });
        formDebug('API response processed in submit', { response });

        if (response.sucesso) {
            const successMsg = response.mensagem || 
                tr('validation.successDefault');
            const captchaWarning = captchaBypassed || response.captcha_warning;
            const finalMsg = captchaWarning
                ? `${successMsg} ${tr('validation.captchaNote')}`
                : successMsg;
            showMessage(finalMsg, 'success');
            formDebug('Submit finished with success', {
                sucesso: true,
                captchaBypassed,
                captchaWarning: Boolean(response.captcha_warning)
            });
            
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
                tr('validation.errorDefault');
            formWarn('Submit finished with API business error', {
                sucesso: false,
                mensagem: response.mensagem
            });
            showMessage(errorMsg, 'error');
        }
    } catch (error) {
        formError('Submit exception', {
            message: error.message,
            stack: error.stack
        });
        const networkError = tr('validation.networkError');
        showMessage(networkError, 'error');
    } finally {
        formDebug('Submit flow finalized (finally block)');
        resetSubmitButton();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    formDebug('DOMContentLoaded', {
        path: window.location.pathname,
        query: window.location.search,
        origin: window.location.origin,
        apiBaseUrl: API_BASE_URL,
        turnstileEnabled: Boolean(TURNSTILE_CONFIG.ENABLED),
        turnstileHasSiteKey: Boolean(TURNSTILE_CONFIG.SITE_KEY),
        securityEnabled: isSecurityEnabled()
    });

    window.addEventListener('error', (event) => {
        formError('Global JS error captured', {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason || {};
        formError('Unhandled promise rejection captured', {
            message: reason.message || String(reason),
            stack: reason.stack || null
        });
    });

    const initialLocale = getInitialLocale();
    setLocale(initialLocale, false);

    document.querySelectorAll('.language-flag-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedLocale = btn.dataset.locale || DEFAULT_LOCALE;
            setLocale(selectedLocale, true);
        });
    });

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
                dot.setAttribute('aria-label', `${tr('location.goToPhoto')} ${idx + 1}`);
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
            const href = this.getAttribute('href') || '';
            if (href === '#' || href.trim() === '') {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
