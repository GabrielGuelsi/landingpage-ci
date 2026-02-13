# Landing Page CI Irlanda

Landing page moderna e responsiva para captura de leads da CI Irlanda, integrada com a API SPREAD.

## 🚀 Características

- **Design Moderno**: Interface atraente e profissional com gradientes e animações suaves
- **Totalmente Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Formulário Inteligente**: Validação em tempo real e máscaras de entrada
- **Integração com API**: Envio automático de leads para a API SPREAD
- **Rastreamento UTM**: Captura automática de parâmetros de campanha (UTM, gclid)
- **Feedback Visual**: Mensagens de sucesso e erro claras para o usuário

## 📋 Requisitos

- Navegador moderno com suporte a JavaScript ES6+
- Acesso à API: `https://goireland.ci.com.br/api/`
- Token de autorização da API

## 🔧 Configuração

### 1. Configurar Token da API

**Opção 1 (Recomendada):** Edite o arquivo `config.js` e substitua o valor de `API_TOKEN`:

```javascript
API_TOKEN: 'SUA_CHAVE_DE_AUTORIZACAO_AQUI',
```

**Opção 2:** Edite diretamente o arquivo `script.js` e substitua o valor de `API_TOKEN`.

### 2. Adicionar Vídeo de Fundo (Opcional)

A hero section possui suporte para vídeo de fundo. Para usar:

1. Crie a pasta `videos/` na raiz do projeto
2. Adicione um vídeo chamado `campus-hero.mp4` na pasta `videos/`
3. (Opcional) Adicione uma imagem de fallback `campus-hero.jpg` na pasta `images/`

**Recomendações para o vídeo:**
- Formato: MP4 (H.264)
- Duração: 10-30 segundos (será reproduzido em loop)
- Resolução: 1920x1080 ou superior
- Tamanho: Otimize para web (recomendado < 5MB)

Se não adicionar o vídeo, a hero section usará um gradiente laranja como fundo.

### 3. Testar Localmente (IMPORTANTE)

⚠️ **A API NÃO funciona se você abrir o HTML diretamente no navegador (file://)**

Você precisa usar um servidor HTTP local:

**Opção 1: Script Automático (Recomendado)**
```bash
./servidor-local.sh
```

**Opção 2: Python**
```bash
python3 -m http.server 8000
# Acesse: http://localhost:8000
```

**Opção 3: Node.js**
```bash
npm install -g http-server
http-server -p 8000
```

**Opção 4: VS Code Live Server**
- Instale a extensão "Live Server"
- Clique direito no `index.html` → "Open with Live Server"

### 4. Hospedar os Arquivos

Os arquivos podem ser hospedados em qualquer servidor web estático:
- Servidor Apache/Nginx
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Qualquer outro serviço de hospedagem estática

**Em produção, a API funcionará normalmente!**

### 5. Testar a Integração

1. Inicie um servidor local (veja opção 3 acima)
2. Acesse `http://localhost:8000` no navegador
3. Abra o console do navegador (F12)
4. Preencha o formulário com dados de teste
5. Verifique se os dados são enviados corretamente para a API
6. Veja mensagens de erro/sucesso no console

## 📁 Estrutura de Arquivos

```
landingpage-ci/
├── index.html      # Estrutura HTML da landing page
├── styles.css      # Estilos e design responsivo
├── script.js       # Lógica JavaScript e integração com API
├── config.js       # Arquivo de configuração (token, mensagens, etc.)
├── .gitignore      # Arquivos ignorados pelo Git
├── README.md       # Documentação
├── videos/         # Pasta para vídeos (criar se necessário)
│   └── campus-hero.mp4  # Vídeo de fundo da hero section
└── images/         # Pasta para imagens (criar se necessário)
    └── campus-hero.jpg  # Imagem de fallback caso vídeo não carregue
```

## 🎨 Personalização

### Cores

As cores podem ser personalizadas no arquivo `styles.css` através das variáveis CSS:

```css
:root {
    --primary-color: #1e40af;
    --secondary-color: #3b82f6;
    --accent-color: #f59e0b;
    /* ... */
}
```

### Textos

Todos os textos podem ser editados diretamente no arquivo `index.html`.

### Mensagens e Configurações

Personalize mensagens e outras configurações no arquivo `config.js`:

```javascript
const CONFIG = {
    API_TOKEN: 'sua_chave_aqui',
    MESSAGES: {
        SUCCESS: 'Sua mensagem de sucesso personalizada',
        ERROR: 'Sua mensagem de erro personalizada',
        // ...
    },
    DEFAULT_DDI: '+55',
    // ...
};
```

## 📊 Campos do Formulário

### Campos Obrigatórios
- Nome Completo
- E-mail
- DDI
- Telefone
- Unidade
- Mensagem

### Campos Opcionais
- Programa de Interesse
- País de Interesse
- Receber informações por e-mail (checkbox)
- Receber informações por SMS (checkbox)

### Dados Capturados Automaticamente
- URL de origem (origem)
- Parâmetros UTM (source, medium, campaign, term)
- Google Click ID (gclid)

## 🔌 Integração com API

A landing page utiliza os seguintes endpoints da API:

- `GET /comum/unidades/` - Lista de unidades
- `GET /comum/programas/` - Lista de programas
- `GET /comum/pais/` - Lista de países
- `POST /comum/formulario/` - Envio do formulário de contato

## 📱 Responsividade

A landing page é totalmente responsiva e se adapta a:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🐛 Troubleshooting

### Erro ao carregar unidades/programas/países
- Verifique se o token de autorização está correto
- Verifique se há acesso à API (CORS)
- Abra o console do navegador para ver erros detalhados

### Formulário não envia
- Verifique a conexão com a internet
- Verifique se todos os campos obrigatórios estão preenchidos
- Verifique o console do navegador para erros

### Estilos não carregam
- Verifique se o arquivo `styles.css` está no mesmo diretório
- Verifique o caminho do arquivo CSS no HTML

## 📝 Notas

- A landing page captura automaticamente parâmetros UTM da URL
- O formulário é limpo automaticamente após envio bem-sucedido
- Validação de e-mail e telefone é feita no lado do cliente
- Máscara de telefone brasileiro é aplicada automaticamente

## 📧 Suporte

Para dúvidas sobre a API, consulte a documentação oficial:
https://goireland.ci.com.br/docs

Para suporte sobre a landing page, entre em contato com a equipe de desenvolvimento.
