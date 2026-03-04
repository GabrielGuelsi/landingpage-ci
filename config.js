// Configuração pública do frontend (sem segredos)
// Em produção, este arquivo pode ser sobrescrito pelo backend em /config.js

const CONFIG = {
    API_BASE_URL: 'https://gogreen.ci.com.br/api',
    API_LEAD_ENDPOINT: '/comum/formulario/',
    API_TOKEN: 'wOSfJm5NP5h6xqU78PB5u6M12o450D43k43knvN2',

    MESSAGES: {
        SUCCESS: 'Formulário enviado com sucesso! Nossos consultores entrarão em contato em breve.',
        ERROR: 'Erro ao enviar formulário. Por favor, tente novamente.',
        VALIDATION_ERROR: 'Por favor, preencha todos os campos obrigatórios corretamente.',
        NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.'
    },

    SUCCESS_MESSAGE_TIMEOUT: 5000,
    DEFAULT_DDI: '+353',
    DEFAULT_UNIT_ID: '2',

    SECURITY: {
        ENABLED: true,
        HONEYPOT_FIELD: 'company_website',
        MIN_SUBMIT_TIME_MS: 3000,
        RATE_LIMIT_WINDOW_MS: 10 * 60 * 1000,
        RATE_LIMIT_MAX_ATTEMPTS: 3,
        RATE_LIMIT_STORAGE_KEY: 'ci_form_rate_limit_v1',
        TURNSTILE: {
            ENABLED: false,
            SITE_KEY: '',
            ACTION: 'lead_form',
            FALLBACK_TO_VISIBLE_CHALLENGE: true,
            FAIL_OPEN: true
        }
    }
};

if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
