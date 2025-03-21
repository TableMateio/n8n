# Workflow Creation Tests

This directory previously contained scripts for creating various types of n8n workflows.

## Consolidated into WorkflowBuilder

The functionality from these scripts has been consolidated into the `WorkflowBuilder` utility, which can be found at:

```
utils/generators/workflow-builder.js
```

## Examples

The following example scripts demonstrate how to use the `WorkflowBuilder` utility:

```
examples/create-basic-workflow.js
examples/create-surplus-list-workflow.js
```

## Workflow Builder Features

The `WorkflowBuilder` utility provides a more maintainable and structured approach to creating workflows:

1. **Fluent Interface**: Chain method calls to build workflows
2. **Proper Connections**: Handles both ID and name-based connections automatically
3. **Utility Methods**: Includes methods for common workflow patterns
4. **Flexible Node Creation**: Add nodes with various configurations
5. **Position Management**: Automatically positions nodes in a logical layout

## Usage

```javascript
const WorkflowBuilder = require('../../utils/generators/workflow-builder');

// Create a builder instance
const builder = new WorkflowBuilder();

// Create a basic workflow
const workflow = await builder.createBasicWorkflow({
  name: 'My Workflow',
  triggerType: 'n8n-nodes-base.manualTrigger',
  actionType: 'n8n-nodes-base.httpRequest',
  actionParameters: {
    url: 'https://example.com/api'
  }
});

// Or build a custom workflow using the builder pattern
builder.setName('Custom Workflow');
const triggerId = builder.addNode({...});
const actionId = builder.addNode({...});
builder.connectNodes({
  sourceNode: triggerId,
  targetNode: actionId
});
const workflow = await builder.createWorkflow();
```

See the examples directory for complete usage examples.

## Conclusion

The individual workflow creation scripts previously contained in this directory served as valuable prototypes and experiments for determining the correct structure and approach to workflow creation. Their functionality has now been consolidated, refined, and enhanced in the WorkflowBuilder utility, which provides a more maintainable and flexible solution for creating workflows programmatically.
