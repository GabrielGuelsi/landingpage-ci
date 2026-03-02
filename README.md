# Landing Page CI Irlanda (Produção)

Landing page com backend Node para envio seguro de leads.

## Arquitetura de segurança

- Frontend envia formulário para `POST /api/lead` (mesmo domínio)
- Backend valida:
  - Honeypot
  - Tempo mínimo de preenchimento
  - Rate limit por IP
  - Turnstile server-side (Cloudflare)
- Backend encaminha para API SPREAD usando token secreto no servidor

## Requisitos

- Node.js 18+

## Instalação e execução

1. Configure variáveis de ambiente:

```bash
cp .env.example .env
```

2. Ajuste os valores em `.env`:

- `SPREAD_API_TOKEN`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- Demais parâmetros conforme ambiente

3. Suba o servidor:

```bash
npm start
```

4. Acesse:

- `http://localhost:8000`

## Variáveis de ambiente

Arquivo de referência: `.env.example`

- `PORT`: porta HTTP (default `8000`)
- `NODE_ENV`: `production` ou `development`
- `SPREAD_API_BASE_URL`: base da API de destino
- `SPREAD_API_TOKEN`: token secreto da API SPREAD
- `TURNSTILE_SITE_KEY`: chave pública do Turnstile (frontend)
- `TURNSTILE_SECRET_KEY`: chave secreta do Turnstile (backend)
- `TURNSTILE_VERIFY_URL`: endpoint de validação Turnstile
- `FORM_MIN_SUBMIT_TIME_MS`: tempo mínimo do formulário
- `FORM_RATE_LIMIT_WINDOW_MS`: janela de rate limit
- `FORM_RATE_LIMIT_MAX_ATTEMPTS`: máximo de tentativas por IP na janela

## Scripts

- `npm start`: inicia servidor Node (`server.js`)
- `npm run dev`: inicia com `NODE_ENV=development`

## Estrutura

- `server.js`: servidor HTTP, segurança e proxy para API externa
- `index.html`, `styles.css`, `script.js`: frontend
- `config.js`: fallback público sem segredos
- `.env.example`: template de configuração segura

## Observações de produção

- Nunca exponha `SPREAD_API_TOKEN` nem `TURNSTILE_SECRET_KEY` no frontend.
- Rotacione imediatamente qualquer chave que tenha sido exposta anteriormente.
- Para múltiplas instâncias de servidor, troque o rate limit em memória por Redis.
