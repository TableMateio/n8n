# n8n Workflow Architecture

This document outlines the architecture of our n8n-based workflow system, focusing on organization, component structure, and implementation patterns.

## Core Architecture Principles

Our architecture is designed around these key principles:

1. **Layered Abstraction**: Organizing components by abstraction level rather than by entity
2. **Adaptive Implementation**: Operations that adapt to their environment automatically
3. **Convention Over Configuration**: Using consistent naming and structure for discoverability
4. **Composition Over Inheritance**: Building complex workflows from simple, reusable parts
5. **Clear Boundaries**: Each component has a single, well-defined responsibility

## Directory Structure

```
/n8n
  /workflow-templates   # All workflow components in one main folder
    /triggers           # Entry points/routers organized by source type
      /airtable         # Airtable record change triggers
        foreclosure-created.js
        contact-updated.js
      /schedule         # Time-based triggers
        daily-auction-scan.js
      /webhook          # External webhook triggers
        payment-received.js

    /processes          # Business logic flows organized by domain
      /auction
        discover-auctions.js
        monitor-auction.js
      /foreclosure
        enrich-foreclosure.js
        calculate-surplus.js
      /contact
        research-contact.js
        generate-letter.js

    /operations         # Reusable, atomic operations
      /web              # Web interaction operations
        navigate.js
        scrape.js
        fill-form.js
      /airtable         # Airtable operations
        get-record.js
        update-record.js
        search-records.js
      /data             # Data operations
        parse-address.js
        format-currency.js

  /utils                # Utilities and tools
    /node-reference     # Tools for referencing node definitions
      node-finder.js    # Find node types in packages/nodes
      parameter-parser.js # Extract parameter schemas from node definitions
    /generators         # Code generators
      node-builder.js   # Create properly formatted nodes
      flow-builder.js   # Generate workflow structures
    /managers           # Workflow management
      workflow-manager.js # Get/update/create workflows
    /testing            # Testing utilities
      flow-tester.js    # Test workflows

  /examples             # Working examples of common patterns
    switch-workflow.js  # Example with branching logic
    configurable-workflow.js # Example with external configuration
    reusable-workflow.js # Example of workflow calling another workflow

  /config               # Configuration
    environments.js     # Environment definitions
    system-configs.js   # County system configurations
```

## Component Types

### 1. Triggers

Triggers are entry points that respond to external events and route to appropriate processes.

**Characteristics**:
- Respond to a specific event type (Airtable changes, schedules, webhooks)
- Contain minimal logic, primarily for routing
- Determine which process to call based on event conditions
- Pass contextual data to the target process

**Example**: `workflow-templates/triggers/airtable/foreclosure-created.js`
```javascript
// When a new foreclosure record is created in Airtable
// Route to appropriate process based on status

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define trigger node
  const triggerNode = NodeBuilder.createWebhookNode({
    id: 'webhook_trigger',
    name: 'Airtable Webhook',
    // webhook configuration
  });

  // Define routing logic
  const switchNode = NodeBuilder.createSwitchNode({
    id: 'route_by_status',
    name: 'Route by Status',
    // switch configuration
  });

  // Define target process nodes
  const executeEnrichNode = NodeBuilder.createExecuteWorkflowNode({
    id: 'execute_enrich',
    name: 'Enrich Foreclosure',
    workflowName: 'processes/foreclosure/enrich-foreclosure',
    parameters: {
      foreclosureId: '={{ $json.id }}'
    }
  });

  // Create connections
  const connections = {
    [triggerNode.id]: {
      main: [[{ node: switchNode.id, type: 'main', index: 0 }]]
    },
    [switchNode.id]: {
      main: [
        [{ node: executeEnrichNode.id, type: 'main', index: 0 }],
        // other branches
      ]
    }
  };

  // Create the workflow
  return manager.createWorkflow(
    'Foreclosure Created Trigger',
    [triggerNode, switchNode, executeEnrichNode],
    connections
  );
}

module.exports = { buildWorkflow };
```

### 2. Processes

Processes represent business logic flows that accomplish specific goals within a domain.

**Characteristics**:
- Represent a complete business process
- Organized by domain (auction, foreclosure, contact)
- Composed of multiple operations
- Handle state and error management
- Focus on WHAT to do, not HOW to do it

**Example**: `workflow-templates/processes/foreclosure/enrich-foreclosure.js`
```javascript
// Process to enrich a foreclosure record with property data

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define input node
  const triggerNode = NodeBuilder.createTriggerNode('manual');

  // Get foreclosure data
  const getForeclosureNode = NodeBuilder.createAirtableNode({
    id: 'get_foreclosure',
    name: 'Get Foreclosure',
    operation: 'read',
    parameters: {
      table: 'Foreclosures',
      id: '={{ $json.foreclosureId }}'
    }
  });

  // Get property system
  const getSystemNode = NodeBuilder.createAirtableNode({
    id: 'get_system',
    name: 'Get Property System',
    operation: 'search',
    parameters: {
      table: 'Systems',
      filterByFormula: '={County}="{{$node["get_foreclosure"].json.County}}" AND {Type}="Property"'
    }
  });

  // Execute scrape operation
  const scrapePropertyNode = NodeBuilder.createExecuteWorkflowNode({
    id: 'scrape_property',
    name: 'Scrape Property Data',
    workflowName: 'operations/web/scrape',
    parameters: {
      system: '={{ $node["get_system"].json }}',
      selector: '={{ $node["get_system"].json.selectors.property }}',
      searchParams: {
        parcelId: '={{ $node["get_foreclosure"].json["Parcel ID"] }}'
      }
    }
  });

  // Store property data
  const createPropertyNode = NodeBuilder.createAirtableNode({
    id: 'create_property',
    name: 'Create Property Record',
    operation: 'create',
    parameters: {
      table: 'Properties',
      fields: '={{ $node["scrape_property"].json.data }}'
    }
  });

  // Create connections
  const connections = {
    [triggerNode.id]: {
      main: [[{ node: getForeclosureNode.id, type: 'main', index: 0 }]]
    },
    [getForeclosureNode.id]: {
      main: [[{ node: getSystemNode.id, type: 'main', index: 0 }]]
    },
    [getSystemNode.id]: {
      main: [[{ node: scrapePropertyNode.id, type: 'main', index: 0 }]]
    },
    [scrapePropertyNode.id]: {
      main: [[{ node: createPropertyNode.id, type: 'main', index: 0 }]]
    }
  };

  // Create the workflow
  return manager.createWorkflow(
    'Enrich Foreclosure',
    [triggerNode, getForeclosureNode, getSystemNode, scrapePropertyNode, createPropertyNode],
    connections
  );
}

module.exports = { buildWorkflow };
```

### 3. Operations

Operations are reusable, atomic functions that perform specific tasks and adapt to their environment.

**Characteristics**:
- Perform a single logical operation
- Adapt implementation based on environment type
- Have clear input/output contracts
- Are agnostic to specific entities or business processes
- Focus on HOW to do something, not WHAT to do

**Example**: `workflow-templates/operations/web/scrape.js`
```javascript
// Adaptive scrape operation that works in different environments

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define input node
  const triggerNode = NodeBuilder.createTriggerNode('manual');

  // Function node to determine environment and select strategy
  const strategyNode = NodeBuilder.createFunctionNode({
    id: 'determine_strategy',
    name: 'Determine Scrape Strategy',
    functionCode: `
      // Get system and environment information
      const system = $input.item.json.system;
      const environment = $input.item.json.environment ||
                         system.environment ||
                         'structured-web';

      // Log strategy selection
      console.log(\`Using \${environment} scrape strategy for \${system.name}\`);

      // Return with strategy information
      return {
        json: {
          ...$input.item.json,
          environment,
          usePlaywright: environment === 'dynamic-web',
          useCheerio: environment === 'structured-web',
          useAI: environment === 'unstructured'
        }
      };
    `
  });

  // Switch node to route to appropriate strategy
  const switchNode = NodeBuilder.createSwitchNode({
    id: 'strategy_switch',
    name: 'Select Strategy',
    // switch configuration for different environments
  });

  // Playwright implementation
  const playwrightNode = NodeBuilder.createPlaywrightNode({
    id: 'playwright_scrape',
    name: 'Dynamic Web Scraping',
    // playwright configuration
  });

  // Cheerio implementation
  const cheerioNode = NodeBuilder.createHttpRequestNode({
    id: 'cheerio_scrape',
    name: 'Static Web Scraping',
    // HTTP request + cheerio configuration
  });

  // AI-based implementation
  const aiNode = NodeBuilder.createHttpRequestNode({
    id: 'ai_scrape',
    name: 'AI-Assisted Extraction',
    // AI API configuration
  });

  // Merge results
  const mergeNode = NodeBuilder.createNoOpNode({
    id: 'merge_results',
    name: 'Merge Results'
  });

  // Create connections
  const connections = {
    [triggerNode.id]: {
      main: [[{ node: strategyNode.id, type: 'main', index: 0 }]]
    },
    [strategyNode.id]: {
      main: [[{ node: switchNode.id, type: 'main', index: 0 }]]
    },
    [switchNode.id]: {
      main: [
        [{ node: playwrightNode.id, type: 'main', index: 0 }], // dynamic-web
        [{ node: cheerioNode.id, type: 'main', index: 0 }],    // structured-web
        [{ node: aiNode.id, type: 'main', index: 0 }]          // unstructured
      ]
    },
    [playwrightNode.id]: {
      main: [[{ node: mergeNode.id, type: 'main', index: 0 }]]
    },
    [cheerioNode.id]: {
      main: [[{ node: mergeNode.id, type: 'main', index: 0 }]]
    },
    [aiNode.id]: {
      main: [[{ node: mergeNode.id, type: 'main', index: 0 }]]
    }
  };

  // Create the workflow
  return manager.createWorkflow(
    'Web Scrape Operation',
    [triggerNode, strategyNode, switchNode, playwrightNode, cheerioNode, aiNode, mergeNode],
    connections
  );
}

module.exports = { buildWorkflow };
```

### 4. Utilities

Utilities are tools that help create, manage, and test workflows.

**Characteristics**:
- Provide infrastructure for other components
- Generate code or manage workflows
- Implement technical approaches
- Are generally not workflows themselves
- Focus on developer experience

**Example**: `utils/generators/node-builder.js`
```javascript
/**
 * Helper class to build properly formatted n8n nodes
 */
class NodeBuilder {
  /**
   * Create an Airtable node
   */
  static createAirtableNode({ id, name, operation, parameters }) {
    return {
      id,
      name,
      type: "n8n-nodes-base.airtable",
      typeVersion: 1,
      position: [0, 0], // Position would be calculated
      parameters: {
        application: parameters.application || process.env.AIRTABLE_APP_ID,
        table: parameters.table,
        operation,
        ...this.getParametersForOperation(operation, parameters)
      }
    };
  }

  /**
   * Get the correct parameter structure based on operation type
   */
  static getParametersForOperation(operation, params) {
    switch(operation) {
      case "read":
        return {
          id: params.id
        };
      case "search":
        return {
          filterByFormula: {
            __rl: true,
            __dl: {
              mode: "expression",
              value: params.filterByFormula
            }
          }
        };
      // Other operations...
      default:
        return {};
    }
  }

  // Other node creation methods...
}

module.exports = NodeBuilder;
```

## Component Interaction Patterns

### Pattern 1: Trigger to Process

The standard flow from trigger to process:

1. Trigger detects an event
2. Trigger evaluates conditions
3. Trigger calls appropriate process with context
4. Process executes business logic
5. Process returns results

### Pattern 2: Process to Operation

The standard flow from process to operation:

1. Process determines what operations are needed
2. Process calls operations with context
3. Operations adapt to the environment
4. Operations return standardized results
5. Process continues with results

### Pattern 3: Operation Implementation Selection

How operations adapt to environments:

1. Operation receives context with system information
2. Operation determines environment type
3. Operation selects appropriate implementation
4. Operation executes using selected strategy
5. Operation returns consistent result structure

## Decision Guidelines

### When to Create a Trigger

- Does it respond to an external event?
- Is it an entry point to the system?
- Does it need to route to different processes?
- Is it tied to a specific event source?

### When to Create a Process

- Does it represent a complete business process?
- Is it organized around a specific domain entity?
- Does it coordinate multiple operations?
- Does it maintain state between steps?

### When to Create an Operation

- Is it a single, atomic function?
- Could it be reused across different processes?
- Does it need to adapt to different environments?
- Does it have a clear input/output contract?

### When to Create a Utility

- Is it a tool for creating or managing workflows?
- Does it implement a technical approach?
- Will it be used by multiple components?
- Is it focused on developer experience?

## Environment Adaptation

Our operations adapt to different environment types:

1. **structured-api**: RESTful APIs with well-defined responses
2. **structured-web**: Static websites with consistent DOM structure
3. **dynamic-web**: JavaScript-heavy sites requiring browser automation
4. **unstructured**: Websites with inconsistent structure requiring AI assistance

Each operation implements strategies for relevant environments, allowing processes to be environment-agnostic.

## Workflow Management

We use the `WorkflowManager` class to interact with n8n:

```javascript
const WorkflowManager = require('./utils/managers/workflow-manager');

// Create a workflow manager
const manager = new WorkflowManager();

// List all workflows
const workflows = await manager.listWorkflows();

// Get a specific workflow
const workflow = await manager.getWorkflow(workflowId);

// Create a new workflow
const newWorkflow = await manager.createWorkflow(
  'My Workflow',
  nodes,
  connections
);

// Update a workflow
const updatedWorkflow = await manager.updateWorkflow(workflowId, updates);

// Delete a workflow
await manager.deleteWorkflow(workflowId);
```

## Version Control Strategy

To ensure proper version control:

1. **Export JSON After Changes**: Save workflow JSONs to the repository
2. **Commit with Related Code**: Keep workflow JSON and generation code together
3. **Use Semantic Versioning**: For workflow templates
4. **Include Version in Name**: For deployed workflows

## Conclusion

This architecture provides a flexible, maintainable approach to building n8n workflows. By organizing by abstraction level and using adaptive operations, we can build a system that is both powerful and maintainable.

The key benefits of this approach are:

1. **Clear Separation of Concerns**: Each component has a specific responsibility
2. **Adaptability Without Complexity**: Operations adapt to environments internally
3. **Discoverability Without Registration**: Convention-based organization makes components easy to find
4. **Balanced Abstraction**: Atomic operations are reusable, while processes are domain-specific
5. **Debuggability**: Each workflow can be tested independently with clear contracts
