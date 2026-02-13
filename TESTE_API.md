# Testando a API - Guia Rápido

## ⚠️ IMPORTANTE: CORS e Requisitos

A API **NÃO funciona** se você abrir o arquivo HTML diretamente no navegador (file://).

### Por quê?
- Navegadores bloqueiam requisições CORS quando o arquivo é aberto via `file://`
- A API precisa permitir requisições do domínio de origem
- Requer um servidor HTTP (mesmo que local)

## ✅ Como Testar Localmente

### Opção 1: Servidor Python (Recomendado)
```bash
# No terminal, na pasta do projeto:
python3 -m http.server 8000

# Depois acesse:
http://localhost:8000
```

### Opção 2: Servidor Node.js
```bash
# Instale o http-server globalmente:
npm install -g http-server

# Execute:
http-server -p 8000

# Depois acesse:
http://localhost:8000
```

### Opção 3: VS Code Live Server
- Instale a extensão "Live Server" no VS Code
- Clique com botão direito no `index.html`
- Selecione "Open with Live Server"

## 🔍 Verificando se a API Funciona

1. Abra o console do navegador (F12)
2. Preencha o formulário
3. Clique em "Quero me Matricular"
4. Verifique no console:
   - ✅ Se aparecer "Erro na requisição" → Problema de CORS ou conexão
   - ✅ Se aparecer resposta da API → Funcionando!

## 🌐 Em Produção

Quando hospedar o site (Netlify, Vercel, etc.):
- A API funcionará normalmente
- Certifique-se de que o token está correto no `config.js`
- Verifique se a API permite requisições do seu domínio

## 🐛 Problemas Comuns

### Erro de CORS
**Sintoma:** "CORS policy" no console
**Solução:** Use um servidor local (não abra direto o HTML)

### Erro 401 (Não autorizado)
**Sintoma:** "Unauthorized" na resposta
**Solução:** Verifique se o token no `config.js` está correto

### Erro 404
**Sintoma:** "Not Found"
**Solução:** Verifique se a URL da API está correta

## 📝 Nota sobre o Token

O token atual no código é um exemplo. **Substitua pela sua chave real** no arquivo `config.js`:

```javascript
API_TOKEN: 'SUA_CHAVE_REAL_AQUI',
```
