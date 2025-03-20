# N8N Workflow Management

This document describes the tools created for managing n8n workflows programmatically from our codebase.

## Background

We've been working on connecting n8n with Cursor's MCP Bridge to allow Claude to manage workflows. However, we've faced some challenges with the MCP protocol, primarily related to certificate validation.

As a solution, we've created a set of tools that can be used to manage n8n workflows programmatically:

1. A CLI tool for interactive workflow management
2. A JavaScript class for programmatically managing workflows

## CLI Tool

The CLI tool is located at `tests/mcp/n8n-cli.js` and provides a command-line interface for managing n8n workflows. It can be used in both interactive and command-line modes.

### Usage

```bash
# Command-line mode
node n8n-cli.js [command] [arguments]

# Interactive mode
node n8n-cli.js
```

### Available Commands

- `test` - Test connection to n8n
- `list` - List all workflows
- `get [id]` - Get workflow details by ID
- `create [name]` - Create a new workflow
- `update [id] [name]` - Update workflow name
- `delete [id]` - Delete a workflow
- `activate [id]` - Activate a workflow
- `deactivate [id]` - Deactivate a workflow
- `help` - Show help
- `exit` - Exit interactive mode

### Example

```bash
# List all workflows
node n8n-cli.js list

# Create a new workflow
node n8n-cli.js create "My New Workflow"
```

## JavaScript Workflow Manager

The JavaScript Workflow Manager is a class that provides a programmatic interface for managing n8n workflows. It's located at `tests/mcp/workflow-manager.js`.

### Features

- List, get, create, update, and delete workflows
- Activate and deactivate workflows
- Helper methods for manipulating nodes and connections
- Built-in method for creating simple HTTP request workflows

### Example Usage

```javascript
const WorkflowManager = require('./workflow-manager');

async function example() {
  // Create a workflow manager
  const manager = new WorkflowManager(
    'https://127.0.0.1:5678',
    'YOUR_API_KEY'
  );

  // List all workflows
  const workflows = await manager.listWorkflows();
  console.log(`Found ${workflows.length} workflows`);

  // Create a simple HTTP request workflow
  const newWorkflow = await manager.createHttpRequestWorkflow(
    'API Test',
    'https://jsonplaceholder.typicode.com/posts/1'
  );

  console.log(`Created workflow: ${newWorkflow.name} (ID: ${newWorkflow.id})`);
}

example();
```

## TypeScript Definitions

We've also created TypeScript definitions for the workflow manager in `tests/mcp/workflow-manager.ts`. This version imports types from the n8n-workflow package.

Once you have the n8n-workflow package installed in your project, you can use the TypeScript version for better type checking and autocompletion.

## Next Steps

- Implement an Express.js server that exposes a JSON-RPC API for managing workflows
- Create a React component for visualizing and editing workflows
- Integrate with the MCP Bridge or use another method to connect with Cursor

## Conclusion

These tools provide a solid foundation for programmatically managing n8n workflows from our codebase. They can be used directly in JavaScript/TypeScript code or from the command line, providing flexibility for different use cases.
