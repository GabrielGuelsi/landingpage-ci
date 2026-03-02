# Testando a API - Guia Rápido (Produção)

## Visão geral

A landing agora usa backend próprio (`server.js`).
O navegador não fala mais direto com a API externa.

Fluxo:
- Frontend -> `POST /api/lead`
- Backend valida segurança e envia para API SPREAD

## Como testar localmente

1. Configure ambiente:

```bash
cp .env.example .env
```

2. Preencha `.env` com suas chaves reais.

3. Inicie o servidor:

```bash
npm start
```

4. Acesse:

- `http://localhost:8000`

## Validações esperadas

- Honeypot bloqueia bots silenciosamente
- Tempo mínimo bloqueia envio rápido demais
- Rate limit por IP bloqueia excesso de tentativas
- Turnstile é validado no backend

## Verificação manual

1. Abra o DevTools (Network)
2. Envie o formulário
3. Confirme chamada para `POST /api/lead`
4. Confirme status:
- `200`: envio aceito
- `400/403`: bloqueio de validação
- `429`: rate limit
- `502/503`: falha no serviço externo/configuração

## Problemas comuns

### `503 Serviço temporariamente indisponível`
- `SPREAD_API_TOKEN` não foi configurado no `.env`.

### `403 Falha na validação de segurança`
- `TURNSTILE_SECRET_KEY` inválida/ausente ou token expirado.

### `429 Muitas tentativas`
- IP excedeu limite na janela de tempo.

## Segurança

- Nunca coloque `SPREAD_API_TOKEN` no frontend.
- Nunca exponha `TURNSTILE_SECRET_KEY` no frontend.
- Se uma chave já foi exposta, rotacione imediatamente.
