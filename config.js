// Configurações da Landing Page CI Irlanda
// Personalize estas configurações conforme necessário

const CONFIG = {
    // URL base da API
    API_BASE_URL: 'https://gogreen.ci.com.br/api',
    
    // Token de autorização da API
    // IMPORTANTE: Substitua pela sua chave de autorização real
    API_TOKEN: 'wOSfJm5NP5h6xqU78PB5u6M12o450D43k43knvN2',
    
    // Configurações de mensagens
    MESSAGES: {
        SUCCESS: 'Formulário enviado com sucesso! Nossos consultores entrarão em contato em breve.',
        ERROR: 'Erro ao enviar formulário. Por favor, tente novamente.',
        VALIDATION_ERROR: 'Por favor, preencha todos os campos obrigatórios corretamente.',
        NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.'
    },
    
    // Tempo em milissegundos para ocultar mensagem de sucesso
    SUCCESS_MESSAGE_TIMEOUT: 5000,
    
    // DDI padrão para o campo de telefone (Irlanda)
    DEFAULT_DDI: '+353',
    
    // ID da unidade padrão (CI Irlanda - Dublin)
    // IMPORTANTE: Configure o ID correto da unidade CI Irlanda
    DEFAULT_UNIT_ID: '2' // Ajuste conforme necessário
};

// Exportar configuração (se usar módulos ES6)
// export default CONFIG;

// Para uso global (sem módulos)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
