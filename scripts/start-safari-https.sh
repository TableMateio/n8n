#!/bin/bash

# ANSI color codes for better readability
RESET='\033[0m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'

echo "${CYAN}Stopping any running n8n processes...${RESET}"
pkill -f "n8n" || true
pkill -f "pnpm" || true

# Wait to ensure processes are fully terminated
sleep 2

# Project root directory
PROJECT_ROOT="$(dirname "$0")/.."
cd "$PROJECT_ROOT"

# Check if we have certificates
if [ ! -f "localhost.key" ] || [ ! -f "localhost.crt" ]; then
  echo "${RED}Certificate files not found!${RESET}"
  echo "${YELLOW}Generating self-signed certificates...${RESET}"
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout localhost.key -out localhost.crt \
    -subj "/CN=localhost" \
    -extensions v3_ca -config <(echo -e "[req]\ndistinguished_name=req\n[req]\n[v3_ca]\nsubjectAltName=DNS:localhost\nbasicConstraints=critical,CA:true\n")

  echo "${YELLOW}Adding certificate to keychain. You'll need to enter your password...${RESET}"
  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain localhost.crt
fi

echo "${GREEN}Starting n8n with HTTPS settings for Safari${RESET}"
echo "${YELLOW}IMPORTANT: Use ${BOLD}https://localhost:5678${RESET}${YELLOW} in Safari${RESET}"

# Set environment variables
export N8N_PROTOCOL=https
export N8N_SECURE_COOKIE=true
export N8N_PORT=5678
export N8N_HOST=localhost
export N8N_EDITOR_BASE_URL=https://localhost:5678/
export NODE_ENV=development
export N8N_ENVIRONMENT=test
export N8N_BROWSER_OPEN_URL=true
export N8N_SSL_KEY="$PROJECT_ROOT/localhost.key"
export N8N_SSL_CERT="$PROJECT_ROOT/localhost.crt"

# Run n8n directly rather than through npm/pnpm scripts
echo "${CYAN}Starting n8n in dev mode with HTTPS...${RESET}"
./packages/cli/bin/n8n start
