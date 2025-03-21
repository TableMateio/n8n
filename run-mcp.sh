#!/bin/bash

# Set environment variables for the n8n connection
export N8N_HOST="https://127.0.0.1:5678"
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU"
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Set the current directory to the script directory
cd "$(dirname "$0")"

# Make the bridge script executable
chmod +x mcp-bridge.js

# Run our custom bridge instead of the n8n-mcp-server
# This gives us more control over debugging and error handling
node mcp-bridge.js
