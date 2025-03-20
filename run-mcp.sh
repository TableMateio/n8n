#!/bin/bash

# Export the environment variables directly
export N8N_HOST="https://localhost:5678"
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU"

# Get the path of the n8n-mcp-server script
MCP_SERVER_PATH=$(which n8n-mcp-server)

# Make sure n8n-mcp-server is installed
if [ -z "$MCP_SERVER_PATH" ]; then
    echo "Installing n8n-mcp-server..."
    npm install -g @illuminaresolutions/n8n-mcp-server
    MCP_SERVER_PATH=$(which n8n-mcp-server)
fi

# Run the MCP server with Node (since it's an ES module)
echo "Starting n8n-mcp-server with env variables..."
echo "N8N_HOST: $N8N_HOST"
echo "Using MCP server at: $MCP_SERVER_PATH"

# Execute with Node explicitly (this is the key part)
exec node $MCP_SERVER_PATH
