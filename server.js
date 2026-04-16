'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 8000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

const PUBLIC_DIR = __dirname;
const SPREAD_API_BASE_URL = (process.env.SPREAD_API_BASE_URL || 'https://gogreen.ci.com.br/api').replace(/\/$/, '');
const SPREAD_API_TOKEN = process.env.SPREAD_API_TOKEN || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_VERIFY_URL = process.env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_FAIL_OPEN = process.env.TURNSTILE_FAIL_OPEN !== 'false';

const GTM_ID          = process.env.GTM_ID          || 'GTM-WVSTCSVV';
const META_PIXEL_ID   = process.env.META_PIXEL_ID   || '000000000000000';
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN || '';

const FORM_MIN_SUBMIT_TIME_MS = Number(process.env.FORM_MIN_SUBMIT_TIME_MS || 3000);
const FORM_RATE_LIMIT_WINDOW_MS = Number(process.env.FORM_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const FORM_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.FORM_RATE_LIMIT_MAX_ATTEMPTS || 5);

const rateLimitStore = new Map();
const STATIC_FILE_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.mp4', '.webm', '.woff', '.woff2', '.ttf', '.txt']);

if (!SPREAD_API_TOKEN) {
  console.warn('[WARN] SPREAD_API_TOKEN não definido. Envio de formulário falhará.');
}
if (!TURNSTILE_SECRET_KEY) {
  console.warn('[WARN] TURNSTILE_SECRET_KEY não definido. Validação Turnstile será rejeitada.');
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && requestUrl.pathname === '/config.js') {
      return handlePublicConfig(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/lead') {
      return handleLeadSubmit(req, res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return handleStatic(req, res, requestUrl);
    }

    return sendJson(res, 405, { sucesso: false, mensagem: 'Método não permitido' });
  } catch (error) {
    console.error('[ERROR] Falha inesperada:', error);
    return sendJson(res, 500, { sucesso: false, mensagem: 'Erro interno do servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`[INFO] Servidor iniciado em http://localhost:${PORT} (${NODE_ENV})`);
});

function handlePublicConfig(_req, res) {
  const publicConfig = {
    API_BASE_URL: '/api',
    API_LEAD_ENDPOINT: '/lead',
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
      MIN_SUBMIT_TIME_MS: FORM_MIN_SUBMIT_TIME_MS,
      RATE_LIMIT_WINDOW_MS: FORM_RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_ATTEMPTS: 3,
      RATE_LIMIT_STORAGE_KEY: 'ci_form_rate_limit_v1',
      TURNSTILE: {
        ENABLED: Boolean(TURNSTILE_SITE_KEY),
        SITE_KEY: TURNSTILE_SITE_KEY,
        ACTION: 'lead_form',
        FALLBACK_TO_VISIBLE_CHALLENGE: true,
        FAIL_OPEN: TURNSTILE_FAIL_OPEN
      }
    },
    ANALYTICS: { GTM_ID, META_PIXEL_ID }
  };

  const body = `const CONFIG = ${JSON.stringify(publicConfig, null, 2)};\nif (typeof window !== 'undefined') { window.CONFIG = CONFIG; }\n`;

  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': IS_PROD ? 'public, max-age=300' : 'no-store'
  };

  if (IS_PROD) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return sendText(res, 200, body, headers);
}

async function handleLeadSubmit(req, res) {
  if (!SPREAD_API_TOKEN) {
    return sendJson(res, 503, { sucesso: false, mensagem: 'Serviço temporariamente indisponível.' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return sendJson(res, 415, { sucesso: false, mensagem: 'Formato de payload inválido.' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return sendJson(res, 429, { sucesso: false, mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }

  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (!isValidOrigin(origin, host)) {
    registerAttempt(ip);
    return sendJson(res, 403, { sucesso: false, mensagem: 'Origem da requisição não autorizada.' });
  }

  const body = await parseJsonBody(req);
  if (!body || typeof body !== 'object') {
    registerAttempt(ip);
    return sendJson(res, 400, { sucesso: false, mensagem: 'Payload inválido.' });
  }

  const honeypot = String(body.company_website || '').trim();
  if (honeypot) {
    registerAttempt(ip);
    return sendJson(res, 200, { sucesso: true, mensagem: 'OK' });
  }

  const startedAt = Number(body.form_started_at || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    registerAttempt(ip);
    return sendJson(res, 400, { sucesso: false, mensagem: 'Tempo de preenchimento inválido.' });
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < FORM_MIN_SUBMIT_TIME_MS) {
    registerAttempt(ip);
    return sendJson(res, 400, { sucesso: false, mensagem: 'Envio rápido demais. Verifique os dados e tente novamente.' });
  }

  const turnstileToken = String(req.headers['cf-turnstile-response'] || '');
  let captchaBypassed = false;

  if (Boolean(TURNSTILE_SITE_KEY)) {
    const turnstileResult = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileResult.ok) {
      if (!TURNSTILE_FAIL_OPEN) {
        registerAttempt(ip);
        return sendJson(res, 403, { sucesso: false, mensagem: 'Falha na validação de segurança.' });
      }

      captchaBypassed = true;
      console.warn('[WARN] CAPTCHA em fail-open. Motivo:', turnstileResult.reason);
    }
  }

  const errors = validateBusinessPayload(body);
  if (errors.length > 0) {
    registerAttempt(ip);
    return sendJson(res, 400, { sucesso: false, mensagem: errors.join(', ') });
  }

  const payload = sanitizePayload(body);

  try {
    const upstreamResponse = await fetch(`${SPREAD_API_BASE_URL}/comum/formulario/`, {
      method: 'POST',
      headers: {
        'Authorization': SPREAD_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await upstreamResponse.json().catch(() => ({ mensagem: 'Erro na API externa' }));

    if (!upstreamResponse.ok) {
      console.error('[ERROR] API externa retornou erro:', upstreamResponse.status, responseData);
      registerAttempt(ip);
      return sendJson(res, 502, {
        sucesso: false,
        mensagem: responseData.mensagem || 'Erro ao processar solicitação no servidor de destino.'
      });
    }

    const finalResponse = (responseData && typeof responseData === 'object')
      ? { ...responseData }
      : { sucesso: true, mensagem: 'Formulário enviado com sucesso!' };

    if (captchaBypassed) {
      finalResponse.captcha_warning = true;
    }

    clearAttempts(ip);

    const capiEventId = crypto.randomUUID();
    finalResponse.capi_event_id = capiEventId;
    fireMetaCapi(body, ip, req.headers['user-agent'] || '', capiEventId); // fire-and-forget

    return sendJson(res, 200, finalResponse);
  } catch (error) {
    console.error('[ERROR] Falha ao chamar API externa:', error);
    registerAttempt(ip);
    return sendJson(res, 502, { sucesso: false, mensagem: 'Falha de comunicação com serviço externo.' });
  }
}

function handleStatic(req, res, requestUrl) {
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';

  const ext = path.extname(pathname).toLowerCase();
  if (!STATIC_FILE_EXTENSIONS.has(ext)) {
    return sendText(res, 404, 'Not Found');
  }

  const filePath = path.join(PUBLIC_DIR, pathname);
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, 'Forbidden');
  }

  fs.readFile(normalized, (err, data) => {
    if (err) return sendText(res, 404, 'Not Found');

    const headers = {
      'Content-Type': getContentType(ext),
      'Cache-Control': IS_PROD ? 'public, max-age=86400' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    if (IS_PROD) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://fonts.googleapis.com https://www.googletagmanager.com https://connect.facebook.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
        "frame-src https://www.google.com https://maps.google.com https://td.doubleclick.net https://www.googletagmanager.com",
        "connect-src 'self' https://challenges.cloudflare.com https://fonts.googleapis.com https://www.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'"
      ].join('; ');
    }

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      return res.end();
    }

    res.writeHead(200, headers);
    return res.end(data);
  });
}

function sanitizePayload(body) {
  const payload = {
    nomecontato: sanitizeString(body.nomecontato, 120),
    emailcontato: sanitizeString(body.emailcontato, 150),
    dditelefonecontato: sanitizeString(body.dditelefonecontato, 5),
    telefonecontato: sanitizeString(body.telefonecontato, 30),
    mensagem: sanitizeString(body.mensagem, 400),
    tipovisto: sanitizeString(body.tipovisto, 40),
    idunidade: sanitizeString(body.idunidade || '2', 10),
    idmidia: sanitizeString(body.idmidia || '60', 10),
    recebeemail: body.recebeemail === 'S' ? 'S' : 'N',
    recebesms: body.recebesms === 'S' ? 'S' : 'N'
  };

  if (body.idprograma) payload.idprograma = sanitizeString(body.idprograma, 10);
  if (body.idpais) payload.idpais = sanitizeString(body.idpais, 10);
  if (body.source) payload.source = sanitizeString(body.source, 100);
  if (body.medium) payload.medium = sanitizeString(body.medium, 100);
  if (body.campaing) payload.campaing = sanitizeString(body.campaing, 100);
  if (body.term) payload.term = sanitizeString(body.term, 100);
  if (body.gclid) payload.gclid = sanitizeString(body.gclid, 150);
  if (body.referrer_id) payload.referrer_id = sanitizeString(body.referrer_id, 10);

  return payload;
}

function validateBusinessPayload(body) {
  const errors = [];

  const nome = String(body.nomecontato || '').trim();
  const email = String(body.emailcontato || '').trim();
  const telefone = String(body.telefonecontato || '').trim();
  const tipoVisto = String(body.tipovisto || '').trim();

  if (!nome) errors.push('Nome completo é obrigatório');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('E-mail válido é obrigatório');
  if (!telefone || telefone.replace(/\D/g, '').length < 8) errors.push('Telefone deve incluir código do país e número completo');
  if (!tipoVisto) errors.push('Tipo de visto é obrigatório');

  return errors;
}

async function verifyTurnstile(token, remoteip) {
  if (!TURNSTILE_SECRET_KEY) return { ok: false, reason: 'secret-missing' };
  if (!token) return { ok: false, reason: 'token-missing' };

  try {
    const formData = new URLSearchParams();
    formData.set('secret', TURNSTILE_SECRET_KEY);
    formData.set('response', token);
    if (remoteip) formData.set('remoteip', remoteip);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (!response.ok) {
      console.error('[ERROR] Turnstile verify falhou com status:', response.status);
      return { ok: false, reason: `verify-status-${response.status}` };
    }

    const data = await response.json();
    if (!data.success) {
      console.warn('[WARN] Turnstile inválido:', data['error-codes'] || []);
      return { ok: false, reason: 'verify-failed' };
    }

    return { ok: true, reason: 'ok' };
  } catch (error) {
    console.error('[ERROR] Falha na validação do Turnstile:', error);
    return { ok: false, reason: 'verify-exception' };
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fireMetaCapi(body, ip, ua, eventId) {
  if (!META_CAPI_TOKEN) return;

  const email = String(body.emailcontato || '').trim().toLowerCase();
  const phone = String(body.telefonecontato || '').replace(/\D/g, '');
  const name = String(body.nomecontato || '').trim();
  const firstName = name.split(' ')[0] || '';
  const lastName = name.split(' ').slice(1).join(' ') || '';
  const tipovisto = String(body.tipovisto || '');

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      user_data: {
        em: email ? [sha256(email)] : [],
        ph: phone ? [sha256(phone)] : [],
        fn: firstName ? [sha256(firstName.toLowerCase())] : [],
        ln: lastName ? [sha256(lastName.toLowerCase())] : [],
        client_ip_address: ip,
        client_user_agent: ua
      },
      custom_data: { lead_type: tipovisto, currency: 'EUR' }
    }],
    access_token: META_CAPI_TOKEN
  };

  fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (r) => {
      if (!r.ok) {
        const err = await r.text().catch(() => r.status);
        console.error('[CAPI] Meta CAPI error:', err);
      }
    })
    .catch((err) => console.error('[CAPI] Meta CAPI fetch failed:', err));
}

function isRateLimited(ip) {
  cleanupOldAttempts();
  const now = Date.now();
  const attempts = rateLimitStore.get(ip) || [];
  const validAttempts = attempts.filter((ts) => now - ts <= FORM_RATE_LIMIT_WINDOW_MS);
  rateLimitStore.set(ip, validAttempts);
  return validAttempts.length >= FORM_RATE_LIMIT_MAX_ATTEMPTS;
}

function registerAttempt(ip) {
  const now = Date.now();
  const attempts = rateLimitStore.get(ip) || [];
  attempts.push(now);
  rateLimitStore.set(ip, attempts);
}

function clearAttempts(ip) {
  rateLimitStore.delete(ip);
}

function cleanupOldAttempts() {
  const now = Date.now();
  for (const [ip, attempts] of rateLimitStore.entries()) {
    const validAttempts = attempts.filter((ts) => now - ts <= FORM_RATE_LIMIT_WINDOW_MS);
    if (validAttempts.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, validAttempts);
    }
  }
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isValidOrigin(origin, host) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === host;
  } catch {
    return false;
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

function sanitizeString(value, maxLen) {
  const str = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return str.slice(0, maxLen);
}

function getContentType(ext) {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function sendJson(res, statusCode, payload) {
  return sendText(res, statusCode, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
}

function sendText(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
