# n8n CLI Tools

This directory contains command-line tools for interacting with n8n.

## n8n-cli.js

A simple command-line interface for managing n8n workflows.

### Usage

```bash
# List all workflows
node utils/cli/n8n-cli.js list

# Get a specific workflow
node utils/cli/n8n-cli.js get <workflow-id>

# Create a new workflow
node utils/cli/n8n-cli.js create <name>

# Update a workflow
node utils/cli/n8n-cli.js update <workflow-id> <updates-json>

# Delete a workflow
node utils/cli/n8n-cli.js delete <workflow-id>

# Activate a workflow
node utils/cli/n8n-cli.js activate <workflow-id>

# Deactivate a workflow
node utils/cli/n8n-cli.js deactivate <workflow-id>

# Show help
node utils/cli/n8n-cli.js help
```

### Configuration

The CLI tool is configured with the following variables at the top of the file:

```javascript
const config = {
  url: 'https://127.0.0.1:5678',  // Your n8n URL
  apiKey: 'your-api-key-here'     // Your n8n API key
};
```

You can modify these values directly in the file or set environment variables:

```bash
N8N_URL=https://n8n.example.com N8N_API_KEY=your-api-key node utils/cli/n8n-cli.js list
```

### Features

- List all workflows with their IDs and active status
- Get detailed information about a specific workflow
- Create new workflows with optional nodes and connections
- Update existing workflows with new properties
- Delete workflows
- Activate and deactivate workflows
- Secure API key handling

### Implementation

The CLI tool uses the Node.js built-in HTTP/HTTPS modules to communicate with the n8n API. It handles:

- URL parsing and request formatting
- Authentication via API key
- JSON data serialization and deserialization
- Command-line argument parsing
- Error handling and user feedback
