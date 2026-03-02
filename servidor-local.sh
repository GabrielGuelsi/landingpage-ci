#!/bin/bash
# Script para iniciar servidor local seguro para a landing page

set -euo pipefail

echo "Iniciando servidor local..."
echo "Acesse: http://localhost:8000"
echo "Para parar, pressione Ctrl+C"
echo ""

if command -v node >/dev/null 2>&1; then
    node server.js
else
    echo "Node.js não encontrado. Instale Node 18+ para usar o backend seguro."
    exit 1
fi
