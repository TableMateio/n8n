#!/bin/bash

# ANSI color codes for better readability
RESET='\033[0m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'

# Get the URL from command line argument or use default
URL="${1:-https://localhost:5678}"

echo "${CYAN}Opening Safari with URL: ${BOLD}${URL}${RESET}"

# First, try to use AppleScript which is more reliable for Safari
osascript -e "tell application \"Safari\" to open location \"${URL}\"" -e "tell application \"Safari\" to activate"

# If AppleScript fails, try the open command as fallback
if [ $? -ne 0 ]; then
  echo "${YELLOW}AppleScript failed, trying open command...${RESET}"
  open -a Safari "${URL}"
fi

echo "${GREEN}Safari opening command completed${RESET}"
