# Processes

Processes are business logic flows that accomplish specific goals within a domain.

## Purpose

Processes represent complete business workflows within a specific domain. They coordinate the execution of multiple operations to achieve a business objective. Processes should:

1. Focus on WHAT needs to be done, not HOW to do it
2. Orchestrate multiple operations
3. Handle state management and error handling
4. Be organized by domain

## Directory Structure

```
/processes
  /auction                 # Auction-related processes
    discover-auctions.js
    monitor-auction.js
  /foreclosure             # Foreclosure-related processes
    enrich-foreclosure.js
    calculate-surplus.js
  /contact                 # Contact-related processes
    research-contact.js
    generate-letter.js
```

## Implementation Pattern

Each process should follow this general pattern:

```javascript
// Example process template

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define input node (usually manual trigger for reusable processes)
  const triggerNode = NodeBuilder.createTriggerNode('manual');

  // Define data retrieval nodes
  const getDataNode = NodeBuilder.createDataRetrievalNode({
    // configuration for getting required data
  });

  // Define operation execution nodes
  const operationNode = NodeBuilder.createExecuteWorkflowNode({
    // configuration to execute a specific operation
  });

  // Define result handling nodes
  const resultHandlingNode = NodeBuilder.createDataStorageNode({
    // configuration for storing or returning results
  });

  // Create connections
  const connections = {
    // connections between nodes
  };

  // Create the workflow
  return manager.createWorkflow(
    'Process Name',
    [triggerNode, getDataNode, operationNode, resultHandlingNode],
    connections
  );
}

module.exports = { buildWorkflow };
```

## Best Practices

1. **Domain-driven design**: Organize processes by domain entities
2. **Single responsibility**: Each process should focus on a single business objective
3. **Use operations for implementation**: Delegate actual implementation to operations
4. **Error handling**: Include comprehensive error handling and recovery mechanisms
5. **State management**: Manage state throughout the process execution
6. **Documentation**: Include clear documentation about the process purpose and flow

## Usage

Processes are typically called by:

1. Triggers that detect relevant events
2. Other processes that need to execute a sub-process
3. Manual execution for testing or manual workflows

Processes should be designed to be reusable within their domain but focused on specific business objectives.
