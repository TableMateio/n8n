# n8n Workflow Generators

This directory contains utilities for generating and modifying n8n workflows programmatically.

## Utilities

### WorkflowModifier

The `WorkflowModifier` class provides methods for modifying existing n8n workflows. It builds on top of the `WorkflowManager` to provide higher-level operations for common workflow modifications.

```javascript
const WorkflowModifier = require('./workflow-modifier');

// Create with environment variables
const modifier = new WorkflowModifier();

// Examples:
await modifier.addNodeAtEnd(workflowId, 'Last Node', newNodeConfig);
await modifier.insertNodeBetween(workflowId, 'Source Node', 'Target Node', newNodeConfig);
await modifier.addBranch(workflowId, 'Source Node', switchNodeConfig, branchNodesArray);
await modifier.removeNode(workflowId, 'Node to Remove', true);

// Multiple operations
await modifier.modifyWorkflow(workflowId, [
  { type: 'addNode', lastNodeName: 'Last Node', node: newNodeConfig },
  { type: 'updateLayout', adjustments: [{ node: 'Node Name', position: [x, y] }] }
]);
```

### NodeFactory

The `NodeFactory` class provides methods for creating common n8n node configurations. It handles version differences and provides sensible defaults.

```javascript
const NodeFactory = require('./node-factory');

// Create nodes
const triggerNode = NodeFactory.createManualTrigger();
const functionNode = NodeFactory.createFunctionNode({
  name: 'Transform Data',
  functionCode: 'return items.map(item => {...});'
});
const httpNode = NodeFactory.createHttpNode({
  url: 'https://api.example.com/data',
  method: 'GET'
});
const switchNode = NodeFactory.createSwitchNode({
  rules: [...]
});
```

## Usage Examples

See the `utils/examples/workflow-modifier-example.js` file for complete usage examples.

## Development

When adding new node types to the `NodeFactory` or new operations to the `WorkflowModifier`, follow these principles:

1. Use sensible defaults to minimize required configuration
2. Handle version differences where applicable
3. Document parameters with JSDoc comments
4. Provide a consistent interface across similar methods
5. Follow kebab-case file naming and camelCase method naming conventions
