# n8n Workflow Utilities

This directory contains utilities for working with n8n workflows programmatically.

## Directory Structure

- **generators/**: Utilities for generating and modifying n8n workflows
  - `workflow-modifier.js`: A utility for modifying existing workflows
  - `node-factory.js`: A factory for creating node configurations
  - `workflow-fixer.js`: A utility for fixing common issues in workflows
  - `workflow-builder.js`: A utility for building complete workflows from scratch

- **examples/**: Example scripts showing how to use the utilities
  - `workflow-modifier-example.js`: Example of using WorkflowModifier
  - `fix-workflow-issues.js`: Example of using WorkflowFixer
  - `create-basic-workflow.js`: Example of using WorkflowBuilder

- **testing/**: Utilities for testing workflows (future)

## Using These Utilities

The utilities in this directory are designed to work with the n8n API and follow the architecture principles outlined in the documentation at `docs/workflow-architecture/`.

### Key Benefits

1. **Abstraction**: High-level operations that handle the details
2. **Reusability**: Common patterns extracted into reusable functions
3. **Maintainability**: Consistent structure and naming
4. **Flexibility**: Utilities adapt to different node versions and configurations
5. **Reliability**: Built-in fixes for common workflow issues

### Getting Started

1. Ensure your n8n instance is running
2. Set your API key in the `.env` file
3. Use the utilities in your scripts

Example:

```javascript
const WorkflowModifier = require('./generators/workflow-modifier');
const NodeFactory = require('./generators/node-factory');
const WorkflowFixer = require('./generators/workflow-fixer');
const WorkflowBuilder = require('./generators/workflow-builder');

// Create a modifier
const modifier = new WorkflowModifier();

// Create a node
const codeNode = NodeFactory.createCodeNode({
  name: 'Process Data',
  jsCode: 'return items;'
});

// Add the node to a workflow
await modifier.addNodeAtEnd('workflow-id', 'Last Node', codeNode);

// Fix common issues in the workflow
const fixer = new WorkflowFixer();
await fixer.applyFixes('workflow-id', ['binary', 'paths', 'set', 'connections']);

// Create a new workflow from scratch
const builder = new WorkflowBuilder();
builder.setName('My New Workflow');

// Add nodes to the workflow
const triggerId = builder.addNode({
  name: 'Start',
  type: 'n8n-nodes-base.manualTrigger',
  typeVersion: 1,
  parameters: {}
});

const httpId = builder.addNode({
  name: 'HTTP Request',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 1,
  parameters: {
    url: 'https://example.com/api'
  }
});

// Connect the nodes
builder.connectNodes({
  sourceNode: triggerId,
  targetNode: httpId
});

// Create the workflow
const workflow = await builder.createWorkflow();
```

### Using WorkflowFixer

The `WorkflowFixer` utility provides fixes for common issues in n8n workflows:

```javascript
const WorkflowFixer = require('./generators/workflow-fixer');
const fixer = new WorkflowFixer();

// Fix binary data expressions
await fixer.fixBinaryExpressions('workflow-id');

// Fix file paths in configuration nodes
await fixer.fixConfigPaths('workflow-id');

// Fix Set nodes for compatibility with newer n8n versions
await fixer.fixSetNodes('workflow-id');

// Fix connection issues between nodes
await fixer.fixConnections('workflow-id');

// Apply multiple fixes at once
await fixer.applyFixes('workflow-id', ['binary', 'paths', 'set', 'connections']);
```

### Using WorkflowBuilder

The `WorkflowBuilder` utility provides a fluent interface for building complete workflows:

```javascript
const WorkflowBuilder = require('./generators/workflow-builder');
const builder = new WorkflowBuilder();

// Set workflow properties
builder.setName('API Integration Workflow');
builder.setActive(true);
builder.addTags(['api', 'integration']);

// Add nodes
const triggerId = builder.addNode({
  name: 'Webhook',
  type: 'n8n-nodes-base.webhook',
  typeVersion: 1,
  parameters: {
    path: 'incoming-data'
  }
});

const processId = builder.addNode({
  name: 'Process Data',
  type: 'n8n-nodes-base.function',
  typeVersion: 1,
  parameters: {
    functionCode: 'return $input.all();'
  }
});

const apiId = builder.addNode({
  name: 'API Request',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 1,
  parameters: {
    url: 'https://api.example.com/data'
  }
});

// Connect nodes
builder.connectNodes({
  sourceNode: triggerId,
  targetNode: processId
});

builder.connectNodes({
  sourceNode: processId,
  targetNode: apiId
});

// Create the workflow
const workflow = await builder.createWorkflow();
```

## Development

When adding new utilities, follow these principles:

1. Use kebab-case for file names and PascalCase for classes
2. Follow existing patterns and naming conventions
3. Document your code with JSDoc comments
4. Add examples showing how to use new utilities
5. Consider versioning differences in n8n nodes
