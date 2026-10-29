#!/usr/bin/env bash
# Atalho para gerar o pacote portátil (pasta + zip).
# Uso: ./tools/package.sh [--config arquivo.json] [--no-zip]
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/package.py "$@"
