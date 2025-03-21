# n8n Workflow Utilities

This directory contains utility classes and tools for working with n8n workflows programmatically.

## Core Utilities

- **workflow-manager.js**: JavaScript implementation of the WorkflowManager class
- **workflow-manager.ts**: TypeScript version of the WorkflowManager with stricter typing
- **n8n-cli.js**: Command-line interface for n8n workflow management

## WorkflowManager

The `WorkflowManager` class provides methods to:

- List all workflows
- Get workflow details
- Create new workflows
- Update existing workflows
- Activate/deactivate workflows
- Delete workflows
- Execute workflows

### Example Usage

```javascript
const { WorkflowManager } = require('./workflow-manager');

// Create manager instance
const manager = new WorkflowManager('http://localhost:5678', 'your-api-key');

// List all workflows
async function listWorkflows() {
  try {
    const workflows = await manager.listWorkflows();
    console.log(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
  }
}

listWorkflows();
```

## CLI Tool

The `n8n-cli.js` script provides a command-line interface for managing workflows:

```
node tests/mcp/utilities/n8n-cli.js list
node tests/mcp/utilities/n8n-cli.js get [workflow-id]
node tests/mcp/utilities/n8n-cli.js create [name] [file]
```
