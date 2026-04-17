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
const FORM_DEBUG_ENABLED = false;
const STATIC_REVIEWS = [
    {
        author: 'Tiago Gontijo',
        text: 'Gostaria de agradecer imenso a CI Intercambio, em especial a Thamiris e a Aliny, por todo o apoio na minha entrada na faculdade. Depois de concluir meus 3 anos de curso, o suporte delas foi essencial para que essa transicao fosse um sucesso. Profissionais dedicadas, atenciosas e que realmente acompanham o aluno ate o final.',
        rating: 5,
        consultant: { name: 'Aliny', role: 'Consultora Acadêmica', photo: 'images/consultants/aliny.jpg' }
    },
    {
        author: 'Franciane Brito',
        text: 'Recomendo a CI intercambio irlanda com os olhos fechados. Tive um atendimento excelente da consultora Talita que me ajudou muito sobre a decisao da faculdade com muita atencao e simpatia, juntamente com o suporte da Amanda que foi excelente em me ajudar com os papeis para imigracao e adicionais para a faculdade com muita atencao e apoio. Valeu muito a pena ter fechado com eles!',
        rating: 5,
        consultant: { name: 'Talita', role: 'Consultora Acadêmica', photo: 'images/consultants/talita.jpg' }
    },
    {
        author: 'Samara Mesquita',
        text: 'Minha experiencia com a CI foi incrivel! Recebi a ajuda do Romario, que me auxiliou em todas as minhas renovacoes. Ele foi um profissional excepcional e sou muito grata por tudo que fez por mim. Recomendo a todos!',
        rating: 5,
        consultant: { name: 'Romário', role: 'Consultor Acadêmico', photo: 'images/consultants/romario.jpg' }
    },
    {
        author: 'Cibele',
        text: 'Excelente atendimento! Amanda Zangarini e Wagner foram extremamente profissionais, solucionando todas minhas duvidas e problemas com paciencia e respeito!',
        rating: 5,
        consultant: { name: 'Wagner', role: 'Consultor Acadêmico', photo: 'images/consultants/wagner.jpg' }
    },
    {
        author: 'Andrea Estrada',
        text: 'Excelente servico e apoio durante todo o meu processo universitario com o meu orientador Albert. Muito confiavel e atencioso.',
        rating: 5,
        consultant: { name: 'Albert', role: 'Consultor Acadêmico', photo: 'images/consultants/albert.jpg' }
    },
    {
        author: 'Roberta Blanco',
        text: 'Amanda e Gabriel foram extremamente gentis e prestativos durante toda a minha jornada para encontrar o curso certo e me forneceram tudo o que eu precisava para prosseguir. Estou muito satisfeita com o servico e recomendo fortemente.',
        rating: 5,
        consultant: { name: 'Gabriel', role: 'Consultor Acadêmico', photo: 'images/consultants/gabriel.jpg' }
    }
];

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
        headerButton: 'Falar com um consultor.',
        heroTitle1: '',
        heroTitle2: '<span class="hero-orange">SEU FUTURO<br>NA IRLANDA</span>',
        heroSubtitle: 'Há <strong>9 anos</strong> apoiando <strong>+5000 estudantes internacionais</strong> a ingressarem em uma universidade na Irlanda de forma estratégica, considerando visto, carreira e empregabilidade.',
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
            title: 'Quero iniciar meu planejamento acadêmico',
            labels: {
                name: 'Nome Completo *',
                email: 'E-mail *',
                phone: 'Telefone/WhatsApp *',
                visaType: 'Tipo de visto *'
            },
            placeholders: {
                name: 'Seu nome completo',
                email: 'seu@email.com',
                phone: '+353 83 123 4567 ou +55 11 91234 5678'
            },
            visaTypeOptions: ['Selecione o visto', 'Stamp 2', 'Stamp 4', 'Stamp 1/1G', 'EU Passport', 'Other'],
            submit: 'Falar com um consultor.',
            sending: 'Enviando...',
            kicker: 'Consultoria universitária gratuita.',
            sub: 'Deixe suas informações para ser contactado pelo nosso time:',
            trust: ['✓ Gratuita', '✓ Individual']
        },
        benefitsSection: {
            title: 'Por que escolher a CI Irlanda?',
            subtitleTitle: 'Porque nós entendemos as consequências da sua escolha.',
            subtitleText: 'Ao longo de mais de 5.000 orientações acadêmicas, vimos como um curso bem escolhido acelera trajetórias,  e como uma decisão desalinhada pode limitar oportunidades.',
            cards: [
                ['Mais de 1200 Cursos', 'Portfólio completo de universidades parceiras com graduações, pós-graduações e mestrados.'],
                ['Mais de 5000 Alunos', 'Mais de 5000 histórias transformadas com aplicação, orientação e acompanhamento universitário.'],
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
            title: 'Orientação estratégica começa com o <span class="caveat-highlight">primeiro passo</span>.',
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
        reviews: {
            title: 'O que nossos alunos dizem:',
            subtitle: 'Avaliações de alunos que confiraram na CI irlanda.',
            prev: 'Avaliação anterior',
            next: 'Próxima avaliação',
            dots: 'Navegação de avaliações',
            loading: 'Carregando avaliações...',
            source: 'Google Reviews',
            error: 'Não foi possível carregar as avaliações agora.',
            fromGoogle: 'Avaliações no Google',
            seeOriginal: 'Ver review no Google',
            reviewDatePrefix: 'Publicado',
            filteredBy: 'Mostrando apenas 4 e 5 estrelas'
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
            requiredVisaType: 'Tipo de visto é obrigatório',
            captchaUnstable: 'Alerta: o CAPTCHA está instável no momento. Seu envio continuará normalmente.',
            captchaError: 'Não foi possível validar a segurança do formulário. Tente novamente.',
            successDefault: 'Solicitação enviada com sucesso. Em breve, um especialista da CI Irlanda falará com você.',
            errorDefault: 'Erro ao enviar formulário. Por favor, tente novamente.',
            networkError: 'Erro ao enviar formulário. Por favor, verifique sua conexão e tente novamente.',
            captchaNote: 'Observação: houve instabilidade no CAPTCHA, mas seu formulário foi enviado com sucesso.'
        }
    },
    en: {
        pageTitle: 'CI Ireland - Higher Education Enrollment | Already in Ireland?',
        pageDescription: 'Already in Ireland? Enroll in higher education now. More than 1,200 courses available with complete support for your application.',
        languageNames: { pt: 'Português', en: 'English', es: 'Español' },
        headerButton: 'Talk to an advisor.',
        heroTitle1: '',
        heroTitle2: '<span class="hero-orange">YOUR FUTURE<br>IN IRELAND</span>',
        heroSubtitle: 'For <strong>9 years</strong>, supporting <strong>+5,000 international students</strong> to enter a university in Ireland strategically — considering visa, career, and employability.',
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
                visaType: 'Visa type *'
            },
            placeholders: {
                name: 'Your full name',
                email: 'your@email.com',
                phone: '+353 83 123 4567 or +55 11 91234 5678'
            },
            visaTypeOptions: ['Select visa type', 'Stamp 2', 'Stamp 4', 'Stamp 1/1G', 'EU Passport', 'Other'],
            submit: 'Talk to an advisor.',
            sending: 'Sending...',
            kicker: 'Free university consultation.',
            sub: 'Leave your information to be contacted by our team:',
            trust: ['✓ Free', '✓ One-to-one']
        },
        benefitsSection: {
            title: 'Why choose CI Ireland?',
            subtitleTitle: 'Because we understand the consequences of your choice.',
            subtitleText: 'After more than 5,000 academic guidance cases, we have seen how the right course accelerates careers, while a poor choice can limit opportunities.',
            cards: [
                ['More than 1,200 Courses', 'A complete portfolio of partner universities with undergraduate, postgraduate, and master programs.'],
                ['More than 5,000 Students', 'More than 5,000 transformed stories with enrollment, guidance, and university support.'],
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
            title: 'Strategic guidance starts with the <span class="caveat-highlight">first step</span>.',
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
        reviews: {
            title: 'What our students say:',
            subtitle: 'Reviews from students who trusted CI Ireland.',
            prev: 'Previous review',
            next: 'Next review',
            dots: 'Review navigation',
            loading: 'Loading reviews...',
            source: 'Google Reviews',
            error: 'Could not load reviews right now.',
            fromGoogle: 'Google Reviews',
            seeOriginal: 'See review on Google',
            reviewDatePrefix: 'Published',
            filteredBy: 'Showing only 4 and 5-star reviews',
            consultantRole: 'Academic Advisor'
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
            requiredVisaType: 'Visa type is required',
            captchaUnstable: 'Warning: CAPTCHA is unstable right now. Your submission will continue normally.',
            captchaError: 'Could not validate form security. Please try again.',
            successDefault: 'Request sent successfully. A CI Ireland specialist will contact you shortly.',
            errorDefault: 'Error submitting form. Please try again.',
            networkError: 'Error submitting form. Please check your connection and try again.',
            captchaNote: 'Note: CAPTCHA was unstable, but your form was successfully submitted.'
        }
    },
    es: {
        pageTitle: 'CI Irlanda - Matrícula en Educación Superior | ¿Ya estás en Irlanda?',
        pageDescription: '¿Ya estás en Irlanda? Matricúlate en educación superior ahora. Más de 1.200 cursos disponibles con soporte completo para tu aplicación.',
        languageNames: { pt: 'Português', en: 'English', es: 'Español' },
        headerButton: 'Hablar con un asesor.',
        heroTitle1: '',
        heroTitle2: '<span class="hero-orange">TU FUTURO<br>EN IRLANDA</span>',
        heroSubtitle: 'Hace <strong>9 años</strong> apoyando a <strong>+5.000 estudiantes internacionales</strong> a ingresar en una universidad en Irlanda de forma estratégica, considerando visado, carrera y empleabilidad.',
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
                visaType: 'Tipo de visa *'
            },
            placeholders: {
                name: 'Tu nombre completo',
                email: 'tu@email.com',
                phone: '+353 83 123 4567 o +55 11 91234 5678'
            },
            visaTypeOptions: ['Selecciona la visa', 'Stamp 2', 'Stamp 4', 'Stamp 1/1G', 'EU Passport', 'Other'],
            submit: 'Hablar con un asesor.',
            sending: 'Enviando...',
            kicker: 'Consultoría universitaria gratuita.',
            sub: 'Deja tus datos para ser contactado por nuestro equipo:',
            trust: ['✓ Gratuita', '✓ Individual']
        },
        benefitsSection: {
            title: '¿Por qué elegir CI Irlanda?',
            subtitleTitle: 'Porque entendemos las consecuencias de tu elección.',
            subtitleText: 'A lo largo de más de 5.000 orientaciones académicas, vimos cómo un curso bien elegido acelera trayectorias y cómo una decisión desalineada puede limitar oportunidades.',
            cards: [
                ['Más de 1.200 Cursos', 'Portafolio completo de universidades aliadas con licenciaturas, posgrados y maestrías.'],
                ['Más de 5.000 Estudiantes', 'Más de 5.000 historias transformadas con aplicación, orientación y acompañamiento universitario.'],
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
            title: 'La orientación estratégica empieza con el <span class="caveat-highlight">primer paso</span>.',
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
        reviews: {
            title: 'Qué dicen nuestros estudiantes:',
            subtitle: 'Reseñas de estudiantes que confiaron en CI Irlanda.',
            prev: 'Reseña anterior',
            next: 'Próxima reseña',
            dots: 'Navegación de reseñas',
            loading: 'Cargando reseñas...',
            source: 'Google Reviews',
            error: 'No fue posible cargar las reseñas ahora.',
            fromGoogle: 'Reseñas en Google',
            seeOriginal: 'Ver reseña en Google',
            reviewDatePrefix: 'Publicado',
            filteredBy: 'Mostrando solo reseñas de 4 y 5 estrellas',
            consultantRole: 'Asesor Académico'
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
            requiredVisaType: 'El tipo de visa es obligatorio',
            captchaUnstable: 'Aviso: el CAPTCHA está inestable en este momento. Tu envío continuará normalmente.',
            captchaError: 'No fue posible validar la seguridad del formulario. Inténtalo de nuevo.',
            successDefault: 'Solicitud enviada con éxito. En breve, un especialista de CI Irlanda se pondrá en contacto contigo.',
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

    setText('.hero-form-kicker', tr('form.kicker'));
    setText('.hero-form-sub', tr('form.sub'));
    const trustSpans = document.querySelectorAll('.hero-form-trust span');
    const trustLabels = I18N[currentLocale].form.trust;
    if (trustSpans && trustLabels) {
        trustSpans.forEach((span, i) => { if (trustLabels[i]) span.textContent = trustLabels[i]; });
    }
    setText('label[for="nomecontato"]', tr('form.labels.name'));
    setText('label[for="emailcontato"]', tr('form.labels.email'));
    setText('label[for="telefonecontato"]', tr('form.labels.phone'));
    setText('label[for="tipovisto"]', tr('form.labels.visaType'));

    const nomeInput = document.getElementById('nomecontato');
    const emailInput = document.getElementById('emailcontato');
    const telefoneInputEl = document.getElementById('telefonecontato');
    if (nomeInput) nomeInput.placeholder = tr('form.placeholders.name');
    if (emailInput) emailInput.placeholder = tr('form.placeholders.email');
    if (telefoneInputEl) telefoneInputEl.placeholder = tr('form.placeholders.phone');

    const visaTypeSelect = document.getElementById('tipovisto');
    if (visaTypeSelect) {
        Array.from(visaTypeSelect.options).forEach((option, index) => {
            const translated = I18N[currentLocale].form.visaTypeOptions[index];
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

    setHtml('.final-cta-title', tr('finalCta.title'));
    setText('.final-cta-subtitle', tr('finalCta.subtitle'));
    setText('.final-cta-button', tr('finalCta.button'));

    setText('#reviewsSectionTitle', tr('reviews.title'));
    setText('#reviewsSectionSubtitle', tr('reviews.subtitle'));
    const reviewsCarousel = document.querySelector('[data-reviews-carousel]');
    if (reviewsCarousel) {
        const prevReviewBtn = reviewsCarousel.querySelector('.reviews-carousel-btn.prev');
        const nextReviewBtn = reviewsCarousel.querySelector('.reviews-carousel-btn.next');
        if (prevReviewBtn) prevReviewBtn.setAttribute('aria-label', tr('reviews.prev'));
        if (nextReviewBtn) nextReviewBtn.setAttribute('aria-label', tr('reviews.next'));
    }
    const reviewsDots = document.getElementById('reviewsDots');
    if (reviewsDots) reviewsDots.setAttribute('aria-label', tr('reviews.dots'));

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

function formatReviewDate(isoDate) {
    if (!isoDate) return '';
    try {
        return new Date(isoDate).toLocaleDateString(currentLocale === 'pt' ? 'pt-BR' : currentLocale === 'es' ? 'es-ES' : 'en-IE', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
    } catch (_error) {
        return '';
    }
}

function renderReviewStars(rating) {
    const rounded = Math.max(0, Math.min(5, Number(rating || 0)));
    const full = '★'.repeat(Math.round(rounded));
    const empty = '☆'.repeat(5 - Math.round(rounded));
    return `${full}${empty}`;
}

// Consultant shown on review cards – fallback when review has no consultant defined
const REVIEW_CONSULTANT = {
    name: 'Equipe CI Irlanda',
    role: 'Consultora Acadêmica',
    photo: null
};

function createReviewCard(review) {
    const card = document.createElement('article');
    card.className = 'review-card';

    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.textContent = renderReviewStars(review.rating);
    card.appendChild(stars);

    const text = document.createElement('p');
    text.className = 'review-text';
    text.textContent = review.text;
    card.appendChild(text);

    const author = document.createElement('p');
    author.className = 'review-author';
    author.textContent = review.author || tr('reviews.source');
    card.appendChild(author);

    const dateValue = review.relativeTime || formatReviewDate(review.publishedAt);
    if (dateValue) {
        const time = document.createElement('p');
        time.className = 'review-time';
        time.textContent = `${tr('reviews.reviewDatePrefix')}: ${dateValue}`;
        card.appendChild(time);
    }

    if (review.profileUrl) {
        const link = document.createElement('a');
        link.className = 'review-link';
        link.href = review.profileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = tr('reviews.seeOriginal');
        card.appendChild(link);
    }

    // Consultant info with verified badge
    const consultantData = review.consultant || REVIEW_CONSULTANT;

    const consultant = document.createElement('div');
    consultant.className = 'review-consultant';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'consultant-avatar';

    if (consultantData.photo) {
        const img = document.createElement('img');
        img.src = consultantData.photo;
        img.alt = consultantData.name;
        img.className = 'consultant-photo';
        avatarWrap.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'consultant-photo-placeholder';
        placeholder.textContent = '👩‍💼';
        avatarWrap.appendChild(placeholder);
    }

    const badge = document.createElement('span');
    badge.className = 'verified-badge';
    badge.textContent = '✓';
    avatarWrap.appendChild(badge);

    const info = document.createElement('div');
    info.className = 'consultant-info';

    const name = document.createElement('span');
    name.className = 'consultant-name';
    name.textContent = consultantData.name;

    const role = document.createElement('span');
    role.className = 'consultant-role';
    role.textContent = tr('reviews.consultantRole') || consultantData.role;

    info.appendChild(name);
    info.appendChild(role);
    consultant.appendChild(avatarWrap);
    consultant.appendChild(info);
    card.appendChild(consultant);

    return card;
}

function initReviewsCarousel(cardsCount) {
    const carousel = document.querySelector('[data-reviews-carousel]');
    const track = document.getElementById('reviewsTrack');
    const dotsContainer = document.getElementById('reviewsDots');
    if (!carousel || !track || !dotsContainer || cardsCount <= 0) return;

    const prevBtn = carousel.querySelector('.reviews-carousel-btn.prev');
    const nextBtn = carousel.querySelector('.reviews-carousel-btn.next');

    const getCardsPerPage = () => {
        if (window.innerWidth >= 1024) return 3;
        if (window.innerWidth >= 768) return 2;
        return 1;
    };

    let currentPage = 0;
    const totalPages = () => Math.max(1, Math.ceil(cardsCount / getCardsPerPage()));

    const renderDots = () => {
        dotsContainer.replaceChildren();
        const pages = totalPages();
        for (let i = 0; i < pages; i += 1) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `reviews-dot${i === currentPage ? ' is-active' : ''}`;
            dot.setAttribute('aria-label', `${tr('reviews.next')} ${i + 1}`);
            dot.addEventListener('click', () => {
                currentPage = i;
                update();
            });
            dotsContainer.appendChild(dot);
        }
    };

    const updateButtons = () => {
        const pages = totalPages();
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage >= pages - 1;
    };

    const update = () => {
        const cardsPerPage = getCardsPerPage();
        const pages = totalPages();
        if (currentPage >= pages) currentPage = pages - 1;
        const firstCard = track.firstElementChild;
        const cardWidth = firstCard ? firstCard.offsetWidth : track.parentElement.offsetWidth;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const translate = currentPage * cardsPerPage * (cardWidth + gap);
        track.style.transform = `translateX(-${translate}px)`;
        updateButtons();
        renderDots();
    };

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentPage = Math.max(0, currentPage - 1);
            update();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentPage = Math.min(totalPages() - 1, currentPage + 1);
            update();
        });
    }

    window.addEventListener('resize', update);
    update();
}

function loadGoogleReviews() {
    const track = document.getElementById('reviewsTrack');
    const summary = document.getElementById('reviewsSummary');
    if (!track || !summary) return;

    formDebug('Reviews load started', { source: 'embedded' });

    try {
        const reviews = STATIC_REVIEWS;
        if (reviews.length === 0) {
            throw new Error('reviews-empty');
        }

        summary.textContent = '';
        track.replaceChildren();
        reviews.forEach((review) => {
            track.appendChild(createReviewCard(review));
        });
        initReviewsCarousel(reviews.length);
        formDebug('Reviews loaded successfully', { count: reviews.length });
    } catch (error) {
        formWarn('Reviews load failed', { message: error.message });
        track.replaceChildren();
        const fallback = document.createElement('article');
        fallback.className = 'review-card';
        const stars = document.createElement('div');
        stars.className = 'review-stars';
        stars.textContent = '★★★★☆';
        const reviewText = document.createElement('p');
        reviewText.className = 'review-text';
        reviewText.textContent = tr('reviews.error');
        const reviewAuthor = document.createElement('p');
        reviewAuthor.className = 'review-author';
        reviewAuthor.textContent = tr('reviews.source');
        fallback.appendChild(stars);
        fallback.appendChild(reviewText);
        fallback.appendChild(reviewAuthor);
        track.appendChild(fallback);
        summary.textContent = '';
        const carousel = document.querySelector('[data-reviews-carousel]');
        if (carousel) {
            const prevBtn = carousel.querySelector('.reviews-carousel-btn.prev');
            const nextBtn = carousel.querySelector('.reviews-carousel-btn.next');
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
        }
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

    // Mensagens de sucesso permanecem visíveis para reforço de confirmação.
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

    if (!formData.tipovisto || formData.tipovisto.trim() === '') {
        errors.push(tr('validation.requiredVisaType'));
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
    
    const tipoVisto = formData.get('tipovisto') || '';
    const siteLanguage = (I18N[currentLocale] && I18N[currentLocale].languageNames[currentLocale]) || currentLocale;
    const mensagem = `Idioma do site: ${siteLanguage}. Tipo de visto: ${tipoVisto}.`;

    const data = {
        nomecontato: formData.get('nomecontato'),
        emailcontato: formData.get('emailcontato'),
        dditelefonecontato: dditelefonecontato,
        telefonecontato: telefonecontato,
        mensagem: mensagem,
        tipovisto: tipoVisto,
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

    // Capturar referrer (influencer/distribuidor)
    const referrer = sessionStorage.getItem('ci_referrer');
    if (referrer) data.referrer_id = referrer;

    formDebug('Form data collected', {
        nomecontato: maskForLog(data.nomecontato, 'name'),
        emailcontato: maskForLog(data.emailcontato, 'email'),
        telefonecontato: maskForLog(data.telefonecontato, 'phone'),
        dditelefonecontato: data.dditelefonecontato,
        tipovisto: data.tipovisto,
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
        if (!btnLoader) {
            const span = document.createElement('span');
            span.className = 'btn-text';
            span.textContent = tr('form.submit');
            submitBtn.replaceChildren(span);
        }
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
                tipovisto: formData.tipovisto
            }
        });
        const response = await fetchAPI(API_LEAD_ENDPOINT, {
            method: 'POST',
            headers: turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {},
            body: JSON.stringify(formData)
        });
        formDebug('API response processed in submit', { response });

        if (response.sucesso) {
            const successMsg = tr('validation.successDefault');
            const captchaWarning = captchaBypassed || response.captcha_warning;
            const finalMsg = captchaWarning
                ? `${successMsg} ${tr('validation.captchaNote')}`
                : successMsg;
            showMessage(finalMsg, 'success');

            // Analytics: GTM dataLayer + Meta Pixel Lead event
            const capiEventId = response.capi_event_id || null;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'generate_lead',
                form_name: 'ci_lead_form',
                lead_type: formData.tipovisto || '',
                referrer_id: sessionStorage.getItem('ci_referrer') || '',
                enhanced_conversion_data: {
                    email: formData.emailcontato || '',
                    phone_number: (formData.dditelefonecontato || '') + (formData.telefonecontato || ''),
                    first_name: (formData.nomecontato || '').split(' ')[0],
                    last_name: (formData.nomecontato || '').split(' ').slice(1).join(' ')
                },
                event_id: capiEventId
            });
            if (typeof fbq === 'function') {
                fbq('track', 'Lead', {
                    content_name: 'CI Irlanda Lead Form',
                    content_category: formData.tipovisto || ''
                }, capiEventId ? { eventID: capiEventId } : {});
            }

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
    loadGoogleReviews();

    // --- Influencer/Distributor Referrer Tracking ---
    (function() {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        if (ref) {
            sessionStorage.setItem('ci_referrer', ref.trim());
        }
        const storedRef = sessionStorage.getItem('ci_referrer');
        if (storedRef) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'referrer_identified',
                referrer_id: storedRef
            });
        }
    })();

    document.querySelectorAll('.language-flag-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedLocale = btn.dataset.locale || DEFAULT_LOCALE;
            setLocale(selectedLocale, true);
            loadGoogleReviews();
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

    const heroFormEl = document.getElementById('contactForm');
    const openFormTriggers = document.querySelectorAll('[data-open-form]');

    const scrollToHeroForm = (trigger) => {
        if (!heroFormEl) return;
        heroFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = heroFormEl.querySelector('input:not([type=hidden]):not([tabindex="-1"]), select');
        if (firstInput) {
            setTimeout(() => firstInput.focus({ preventScroll: true }), 500);
        }
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'form_scroll_to',
            form_name: 'ci_lead_form',
            trigger_location: (trigger && (trigger.closest('section, header')?.className || 'unknown')) || 'unknown',
            page_location: window.location.href,
            referrer_id: sessionStorage.getItem('ci_referrer') || ''
        });
    };

    openFormTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToHeroForm(trigger);
        });
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
