#!/bin/bash
# Script para iniciar servidor local para testar a landing page

echo "🚀 Iniciando servidor local..."
echo "📝 Acesse: http://localhost:8000"
echo "⏹️  Para parar, pressione Ctrl+C"
echo ""

# Verifica se Python 3 está instalado
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
else
    echo "❌ Python não encontrado. Instale Python 3 ou use outro método."
    echo ""
    echo "Alternativas:"
    echo "1. Node.js: npm install -g http-server && http-server -p 8000"
    echo "2. VS Code: Instale a extensão 'Live Server'"
    exit 1
fi
