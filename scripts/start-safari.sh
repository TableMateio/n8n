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

echo "${GREEN}Starting n8n with Safari-compatible settings${RESET}"
echo "${YELLOW}IMPORTANT: Use ${BOLD}http://localhost:5678${RESET}${YELLOW} in Safari${RESET}"

# Change to project directory
cd "$(dirname "$0")/.."

# Set environment variables
export N8N_PROTOCOL=http
export N8N_SECURE_COOKIE=false
export N8N_PORT=5678
export N8N_HOST=localhost
export N8N_EDITOR_BASE_URL=http://localhost:5678/
export NODE_ENV=development
export N8N_ENVIRONMENT=test
export N8N_BROWSER_OPEN_URL=true

# Run n8n directly rather than through npm/pnpm scripts
echo "${CYAN}Starting n8n in dev mode...${RESET}"
./packages/cli/bin/n8n start
