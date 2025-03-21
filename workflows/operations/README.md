# Operations

Operations are reusable, atomic functions that perform specific tasks and adapt to their environment.

## Purpose

Operations represent the lowest level of abstraction in our workflow architecture. They perform specific tasks, adapting their implementation based on the environment while maintaining a consistent interface. Operations should:

1. Perform a single logical operation
2. Focus on HOW to do something, not WHAT to do
3. Adapt to different environments
4. Have clear input/output contracts
5. Be reusable across different processes

## Directory Structure

```
/operations
  /web                  # Web interaction operations
    navigate.js         # Navigate to a web page
    scrape.js           # Extract data from a web page
    fill-form.js        # Fill out a form on a website
  /airtable             # Airtable operations
    get-record.js       # Get a record from Airtable
    update-record.js    # Update a record in Airtable
    search-records.js   # Search for records in Airtable
  /data                 # Data operations
    parse-address.js    # Parse an address string
    format-currency.js  # Format currency values
```

## Implementation Pattern

Each operation should follow this general pattern:

```javascript
// Example operation template

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define input node (usually manual trigger for reusable operations)
  const triggerNode = NodeBuilder.createTriggerNode('manual');

  // Define environment detection node
  const environmentNode = NodeBuilder.createFunctionNode({
    // code to detect environment and select strategy
  });

  // Define implementation strategy selection (switch node)
  const strategyNode = NodeBuilder.createSwitchNode({
    // configuration to select the appropriate strategy
  });

  // Define implementation nodes for different environments
  const implementation1Node = NodeBuilder.createImplementationNode({
    // implementation for environment 1
  });

  const implementation2Node = NodeBuilder.createImplementationNode({
    // implementation for environment 2
  });

  // Define result normalization node
  const normalizationNode = NodeBuilder.createFunctionNode({
    // code to normalize results from different implementations
  });

  // Create connections
  const connections = {
    // connections between nodes
  };

  // Create the workflow
  return manager.createWorkflow(
    'Operation Name',
    [triggerNode, environmentNode, strategyNode, implementation1Node, implementation2Node, normalizationNode],
    connections
  );
}

module.exports = { buildWorkflow };
```

## Environment Adaptation

Operations should be designed to adapt to different environments:

1. **structured-api**: RESTful APIs with well-defined responses
2. **structured-web**: Static websites with consistent DOM structure
3. **dynamic-web**: JavaScript-heavy sites requiring browser automation
4. **unstructured**: Websites with inconsistent structure requiring AI assistance

Each operation should implement strategies for the relevant environments, allowing processes to use them without knowledge of the underlying implementation.

## Best Practices

1. **Single responsibility**: Each operation should do one thing well
2. **Clear interface**: Define clear input parameters and output format
3. **Consistent error handling**: Handle errors consistently across implementations
4. **Adaptive implementation**: Detect and adapt to different environments
5. **Self-contained**: Minimize dependencies on external state
6. **Well-documented**: Include documentation on parameters, return values, and behavior

## Usage

Operations are typically called by:

1. Processes that need to perform specific tasks
2. Other operations that need to compose functionality
3. Directly for testing or simple workflows

Operations are the building blocks that make up more complex processes and should be designed for maximum reusability.
