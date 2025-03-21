# n8n Workflow Managers

This directory contains manager classes that provide high-level interfaces for working with n8n workflows and resources.

## Workflow Manager

The `WorkflowManager` class provides a comprehensive API for interacting with n8n workflows programmatically:

- Listing, retrieving, creating, updating, and deleting workflows
- Activating and deactivating workflows
- Executing workflows
- Managing workflow nodes and connections
- Interacting with credentials and executions

### Usage

```javascript
const WorkflowManager = require('./workflow-manager');

// Create a manager instance
const manager = new WorkflowManager(
  'http://localhost:5678',
  'your-n8n-api-key'
);

// List all workflows
const workflows = await manager.listWorkflows();

// Create a new workflow
const workflow = await manager.createWorkflow(
  'My Workflow',
  nodes,
  connections
);

// Update a workflow
await manager.updateWorkflow(workflowId, {
  name: 'Updated Name',
  nodes: updatedNodes,
  connections: updatedConnections
});

// Delete a workflow
await manager.deleteWorkflow(workflowId);
```

### Key Features

1. **HTTP/HTTPS Support**: Works with both HTTP and HTTPS n8n instances
2. **Complete API Coverage**: Supports all major n8n API endpoints
3. **Helper Methods**: Includes methods for common operations like adding nodes and creating connections
4. **Error Handling**: Provides detailed error information for troubleshooting

## Using with Other Utilities

The `WorkflowManager` class is used by other utilities in the project:

- `WorkflowBuilder`: For creating complete workflows from scratch
- `WorkflowModifier`: For modifying existing workflows
- `WorkflowFixer`: For fixing common issues in workflows

## Implementation Notes

- Uses Node.js built-in HTTP/HTTPS modules for API requests
- Handles both ID-based and name-based references
- Supports both synchronous and asynchronous operations
