# n8n Connection Utilities

This directory contains utilities for connecting to and interacting with n8n instances programmatically.

## Components

### N8nConnectionManager

`n8n-connection.js` provides a comprehensive connection manager that handles:

- HTTP/HTTPS API connections to n8n
- JSON-RPC protocol support
- MCP (Machine Communication Protocol) integration
- Event-based communication

```javascript
const N8nConnectionManager = require('./n8n-connection');

// Create a connection manager
const n8n = new N8nConnectionManager({
  url: 'https://localhost:5678',
  apiKey: 'your-api-key',
  allowSelfSigned: true
});

// Use direct API methods
const workflows = await n8n.listWorkflows();
const workflow = await n8n.getWorkflow('workflow-id');

// Or JSON-RPC
const response = await n8n.handleJsonRpcRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'list-workflows',
  params: { clientId: 'your-client-id' }
});
```

### Cursor MCP Bridge

`cursor-mcp-bridge.js` is a specialized bridge for connecting Cursor to n8n:

- Implements the Cursor MCP protocol
- Provides configuration management
- Handles standard n8n operations
- Supports debug logging

To use it:

1. Configure the bridge in Cursor
2. Point the bridge to this script
3. Use Claude to interact with n8n workflows

```bash
# Run the bridge
node utils/connection/cursor-mcp-bridge.js

# Or with environment variables
N8N_URL=https://localhost:5678 N8N_API_KEY=your-api-key DEBUG=true node utils/connection/cursor-mcp-bridge.js
```

## Usage Examples

### Basic API Usage

```javascript
const N8nConnectionManager = require('./n8n-connection');

async function main() {
  // Create a connection
  const n8n = new N8nConnectionManager({
    url: 'https://localhost:5678',
    apiKey: 'your-api-key'
  });

  // List workflows
  const workflows = await n8n.listWorkflows();
  console.log(`Found ${workflows.length} workflows`);

  // Create a workflow
  const newWorkflow = await n8n.createWorkflow(
    'My Test Workflow',
    [/* nodes */],
    {/* connections */}
  );
  console.log(`Created workflow: ${newWorkflow.id}`);

  // Execute a workflow
  const execution = await n8n.executeWorkflow(newWorkflow.id, {
    data: {/* input data */}
  });
  console.log(`Execution: ${execution.id}`);
}

main().catch(console.error);
```

### JSON-RPC Usage

```javascript
const N8nConnectionManager = require('./n8n-connection');

// Create a connection
const n8n = new N8nConnectionManager({
  url: 'https://localhost:5678',
  apiKey: 'your-api-key'
});

// Process a JSON-RPC request
async function processRequest(request) {
  const response = await n8n.handleJsonRpcRequest(request);
  console.log('Response:', response);
  return response;
}

// Example request
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'init-n8n',
  params: {
    url: 'https://localhost:5678',
    apiKey: 'your-api-key'
  }
};

processRequest(request);
```

## MCP Server Usage

```javascript
const N8nConnectionManager = require('./n8n-connection');

// Create a connection with MCP server path
const n8n = new N8nConnectionManager({
  url: 'https://localhost:5678',
  apiKey: 'your-api-key',
  mcpServerPath: '/path/to/n8n-mcp-server'
});

// Handle events
n8n.on('mcpOutput', (output) => {
  console.log('MCP output:', output);
});

n8n.on('mcpError', (error) => {
  console.error('MCP error:', error.message);
});

n8n.on('mcpExit', (info) => {
  console.log('MCP server exited with code:', info.code);
});

// Start MCP server
async function startServer() {
  try {
    const server = await n8n.startMcpServer();
    console.log('MCP server started');

    // Send a command
    await n8n.sendMcpCommand({
      jsonrpc: '2.0',
      id: 1,
      method: 'list-workflows',
      params: {}
    });

    // Later, stop the server
    // await n8n.stopMcpServer();
  } catch (error) {
    console.error('Failed to start MCP server:', error.message);
  }
}

startServer();
```
