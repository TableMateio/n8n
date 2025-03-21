# n8n Implementation Guide

This document provides practical implementation guidance for our n8n workflow system, including development environment setup, component creation, and best practices.

## Setting Up the Development Environment

### Prerequisites

Before starting development, ensure you have the following:

- Node.js (v14 or later) installed
- n8n installed and running locally
- Git for version control
- Access to the appropriate Airtable bases

### Installing n8n Locally

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n start

# Or with additional options
n8n start --tunnel --open
```

### Environment Configuration

Create a `.env` file in your project root with the necessary configuration:

```
# n8n Connection
N8N_HOST=https://localhost:5678
N8N_API_KEY=your_api_key_here

# Airtable Connection
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id

# System Variables
DEFAULT_ENVIRONMENT=structured-web
```

### Setting Up the Project Structure

Clone the repository and set up the project structure:

```bash
# Clone the repository
git clone https://github.com/your-org/tax-surplus-recovery.git
cd tax-surplus-recovery

# Create necessary directories
mkdir -p workflow-templates/{triggers,processes,operations}
mkdir -p utils/{node-reference,generators,managers,testing}
mkdir -p examples
mkdir -p config
```

## Creating Components

### Creating a Trigger

Triggers are entry points that respond to external events. Here's how to create one:

1. **Identify the Event Source**:
   - Airtable record changes
   - Schedule-based events
   - External webhooks

2. **Determine Routing Logic**:
   - What conditions determine which process to call?
   - What data needs to be passed to the process?

3. **Create the Trigger File**:
   - Place in the appropriate directory under `workflow-templates/triggers`
   - Use descriptive naming, e.g., `foreclosure-created.js`

#### Example: Creating an Airtable Trigger

```javascript
// workflow-templates/triggers/airtable/foreclosure-created.js

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define nodes
  const nodes = [];

  // 1. Create webhook trigger node
  const triggerNode = NodeBuilder.createWebhookNode({
    id: 'airtable_webhook_trigger',
    name: 'Airtable Webhook Trigger',
    parameters: {
      path: 'foreclosure/created',
      responseMode: 'responseNode',
      responseData: 'noData'
    }
  });
  nodes.push(triggerNode);

  // 2. Create function node to parse webhook data
  const parseNode = NodeBuilder.createFunctionNode({
    id: 'parse_webhook_data',
    name: 'Parse Webhook Data',
    functionCode: `
      // Extract Airtable record ID and data
      const payload = $input.item.json.body;

      // Get the record ID
      const recordId = payload.record.id;

      // Return the parsed data
      return {
        json: {
          recordId,
          tableName: 'Foreclosures',
          data: payload.record.fields
        }
      };
    `
  });
  nodes.push(parseNode);

  // 3. Create switch node to route based on condition
  const switchNode = NodeBuilder.createSwitchNode({
    id: 'route_by_status',
    name: 'Route By Status',
    typeVersion: 3.2,
    parameters: {
      rules: {
        values: [
          {
            outputKey: 'New Foreclosure',
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  operator: {
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.data.Status }}',
                  rightValue: 'New'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Skip',
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [] // Default case
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }
  });
  nodes.push(switchNode);

  // 4. Create execute workflow node to call the process
  const executeNode = NodeBuilder.createExecuteWorkflowNode({
    id: 'execute_enrich_process',
    name: 'Enrich Foreclosure',
    parameters: {
      workflowId: '={{ $getWorkflowByName("processes/foreclosure/enrich-foreclosure") }}',
      options: {},
      inputData: {
        data: {
          value: '={{ {"foreclosureId": $json.recordId} }}',
          type: 'json'
        }
      }
    }
  });
  nodes.push(executeNode);

  // Define connections
  const connections = {
    [triggerNode.id]: {
      main: [[{ node: parseNode.id, type: 'main', index: 0 }]]
    },
    [parseNode.id]: {
      main: [[{ node: switchNode.id, type: 'main', index: 0 }]]
    },
    [switchNode.id]: {
      main: [
        [{ node: executeNode.id, type: 'main', index: 0 }], // New Foreclosure
        [] // Skip case - no connection
      ]
    }
  };

  // Create the workflow
  return manager.createWorkflow(
    'Foreclosure Created Trigger',
    nodes,
    connections
  );
}

module.exports = { buildWorkflow };
```

### Creating a Process

Processes represent business logic flows. Here's how to create one:

1. **Define the Process Goal**:
   - What business process does this implement?
   - What are the inputs and outputs?

2. **Identify Required Operations**:
   - What operations does this process need?
   - What data needs to flow between operations?

3. **Create the Process File**:
   - Place in the appropriate directory under `workflow-templates/processes`
   - Use descriptive naming, e.g., `enrich-foreclosure.js`

#### Example: Creating a Foreclosure Enrichment Process

```javascript
// workflow-templates/processes/foreclosure/enrich-foreclosure.js

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define nodes
  const nodes = [];

  // 1. Create trigger node (manual or called by other workflow)
  const triggerNode = NodeBuilder.createTriggerNode('manual');
  nodes.push(triggerNode);

  // 2. Get foreclosure data from Airtable
  const getForeclosureNode = NodeBuilder.createAirtableNode({
    id: 'get_foreclosure',
    name: 'Get Foreclosure',
    operation: 'read',
    parameters: {
      application: process.env.AIRTABLE_BASE_ID,
      table: 'Foreclosures',
      id: '={{ $json.foreclosureId }}'
    }
  });
  nodes.push(getForeclosureNode);

  // 3. Get county system information
  const getSystemNode = NodeBuilder.createAirtableNode({
    id: 'get_system',
    name: 'Get Property System',
    operation: 'search',
    parameters: {
      application: process.env.AIRTABLE_BASE_ID,
      table: 'Systems',
      filterByFormula: {
        __rl: true,
        __dl: {
          mode: "expression",
          value: `={County}='{{$node["get_foreclosure"].json.County[0]}}' AND {Type}='Property'`
        }
      }
    }
  });
  nodes.push(getSystemNode);

  // 4. Execute property scraping operation
  const scrapePropertyNode = NodeBuilder.createExecuteWorkflowNode({
    id: 'scrape_property',
    name: 'Scrape Property Data',
    parameters: {
      workflowId: '={{ $getWorkflowByName("operations/web/scrape") }}',
      options: {},
      inputData: {
        data: {
          value: `={{ {
            "system": $node["get_system"].json,
            "selector": $node["get_system"].json.selectors.property,
            "searchParams": {
              "parcelId": $node["get_foreclosure"].json["Parcel ID"]
            }
          } }}`,
          type: 'json'
        }
      }
    }
  });
  nodes.push(scrapePropertyNode);

  // 5. Create property record in Airtable
  const createPropertyNode = NodeBuilder.createAirtableNode({
    id: 'create_property',
    name: 'Create Property Record',
    operation: 'create',
    parameters: {
      application: process.env.AIRTABLE_BASE_ID,
      table: 'Properties',
      options: {
        typecast: true
      },
      fields: {
        __rl: true,
        __dl: {
          mode: "expression",
          value: '={{ $node["scrape_property"].json.data }}'
        }
      }
    }
  });
  nodes.push(createPropertyNode);

  // 6. Update foreclosure with property link
  const updateForeclosureNode = NodeBuilder.createAirtableNode({
    id: 'update_foreclosure',
    name: 'Update Foreclosure',
    operation: 'update',
    parameters: {
      application: process.env.AIRTABLE_BASE_ID,
      table: 'Foreclosures',
      id: '={{ $json.foreclosureId }}',
      options: {
        typecast: true
      },
      fields: {
        __rl: true,
        __dl: {
          mode: "expression",
          value: `={{ {
            "Property": [$node["create_property"].json.id],
            "Status": "Property Enriched"
          } }}`
        }
      }
    }
  });
  nodes.push(updateForeclosureNode);

  // Define connections
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
    },
    [createPropertyNode.id]: {
      main: [[{ node: updateForeclosureNode.id, type: 'main', index: 0 }]]
    }
  };

  // Create the workflow
  return manager.createWorkflow(
    'Enrich Foreclosure',
    nodes,
    connections
  );
}

module.exports = { buildWorkflow };
```

### Creating an Operation

Operations are reusable, atomic functions. Here's how to create one:

1. **Define the Operation Goal**:
   - What specific function does this operation perform?
   - What inputs does it need?
   - What outputs should it produce?

2. **Identify Possible Environments**:
   - What environments will this operation need to support?
   - How should it adapt to each environment?

3. **Create the Operation File**:
   - Place in the appropriate directory under `workflow-templates/operations`
   - Use descriptive naming, e.g., `scrape.js`

#### Example: Creating a Web Scraping Operation

```javascript
// workflow-templates/operations/web/scrape.js

const WorkflowManager = require('../../../utils/managers/workflow-manager');
const NodeBuilder = require('../../../utils/generators/node-builder');

async function buildWorkflow() {
  const manager = new WorkflowManager();

  // Define nodes
  const nodes = [];

  // 1. Create trigger node
  const triggerNode = NodeBuilder.createTriggerNode('manual');
  nodes.push(triggerNode);

  // 2. Determine the environment and strategy
  const determineStrategyNode = NodeBuilder.createFunctionNode({
    id: 'determine_strategy',
    name: 'Determine Scrape Strategy',
    functionCode: `
      // Get system and environment information
      const system = $input.item.json.system || {};
      const selector = $input.item.json.selector || {};
      const searchParams = $input.item.json.searchParams || {};

      // Determine environment (from input, system, or default)
      const environment = $input.item.json.environment ||
                         system.environment ||
                         process.env.DEFAULT_ENVIRONMENT ||
                         'structured-web';

      // Log the strategy selection
      console.log(\`Using \${environment} scrape strategy for \${system.name || 'unknown system'}\`);

      // Return with strategy information
      return {
        json: {
          system,
          selector,
          searchParams,
          environment,
          usePlaywright: environment === 'dynamic-web',
          useCheerio: environment === 'structured-web',
          useAPI: environment === 'structured-api',
          useAI: environment === 'unstructured'
        }
      };
    `
  });
  nodes.push(determineStrategyNode);

  // 3. Create a switch node to route based on environment
  const switchNode = NodeBuilder.createSwitchNode({
    id: 'strategy_switch',
    name: 'Select Strategy',
    typeVersion: 3.2,
    parameters: {
      rules: {
        values: [
          {
            outputKey: 'Dynamic Web',
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  operator: {
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.environment }}',
                  rightValue: 'dynamic-web'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Static Web',
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  operator: {
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.environment }}',
                  rightValue: 'structured-web'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'API',
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  operator: {
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.environment }}',
                  rightValue: 'structured-api'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'AI',
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  operator: {
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.environment }}',
                  rightValue: 'unstructured'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }
  });
  nodes.push(switchNode);

  // 4. Create Playwright node for dynamic web
  const playwrightNode = NodeBuilder.createHttpRequestNode({
    id: 'playwright_scrape',
    name: 'Dynamic Web Scraping',
    // Use HTTP Request as a placeholder (in a real implementation, use custom Playwright node)
    parameters: {
      url: '={{ $json.system.url }}',
      method: 'GET',
      options: {
        followRedirect: true,
        timeout: 30000
      }
    }
  });
  nodes.push(playwrightNode);

  // 5. Create HTTP + Cheerio node for static web
  const cheerioNode = NodeBuilder.createHttpRequestNode({
    id: 'cheerio_scrape',
    name: 'Static Web Scraping',
    parameters: {
      url: '={{ $json.system.url }}',
      method: 'GET',
      options: {
        followRedirect: true
      }
    }
  });
  nodes.push(cheerioNode);

  // 6. Create HTTP node for API
  const apiNode = NodeBuilder.createHttpRequestNode({
    id: 'api_scrape',
    name: 'API Data Fetching',
    parameters: {
      url: '={{ $json.system.apiEndpoint }}',
      method: 'GET',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {
        proxy: '',
        timeout: 10000,
        allowUnauthorizedCerts: false,
        queryParameterArrays: 'brackets'
      }
    }
  });
  nodes.push(apiNode);

  // 7. Create HTTP + Function node for AI
  const aiNode = NodeBuilder.createHttpRequestNode({
    id: 'ai_scrape',
    name: 'AI-Assisted Extraction',
    parameters: {
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: {
        headerParameters: {
          parameter: [
            {
              name: 'Authorization',
              value: 'Bearer {{ $env.OPENAI_API_KEY }}'
            },
            {
              name: 'Content-Type',
              value: 'application/json'
            }
          ]
        }
      },
      bodyParametersJson: '={{ JSON.stringify({ "model": "gpt-4", "messages": [{"role": "system", "content": "Extract structured data from this web page."}, {"role": "user", "content": $json.pageContent}] }) }}'
    }
  });
  nodes.push(aiNode);

  // 8. Create a NoOp node to merge results
  const mergeResultsNode = NodeBuilder.createNoOpNode({
    id: 'merge_results',
    name: 'Merge Results'
  });
  nodes.push(mergeResultsNode);

  // Define connections
  const connections = {
    [triggerNode.id]: {
      main: [[{ node: determineStrategyNode.id, type: 'main', index: 0 }]]
    },
    [determineStrategyNode.id]: {
      main: [[{ node: switchNode.id, type: 'main', index: 0 }]]
    },
    [switchNode.id]: {
      main: [
        [{ node: playwrightNode.id, type: 'main', index: 0 }], // Dynamic Web
        [{ node: cheerioNode.id, type: 'main', index: 0 }],    // Static Web
        [{ node: apiNode.id, type: 'main', index: 0 }],        // API
        [{ node: aiNode.id, type: 'main', index: 0 }]          // AI
      ]
    },
    [playwrightNode.id]: {
      main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
    },
    [cheerioNode.id]: {
      main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
    },
    [apiNode.id]: {
      main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
    },
    [aiNode.id]: {
      main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
    }
  };

  // Create the workflow
  return manager.createWorkflow(
    'Web Scrape Operation',
    nodes,
    connections
  );
}

module.exports = { buildWorkflow };
```

### Creating Utilities

Utilities are tools that help create, manage, and test workflows. Here's how to create one:

1. **Define the Utility Purpose**:
   - What problem does this utility solve?
   - What interface should it provide?

2. **Implement the Utility**:
   - As a class, function, or module
   - With clear documentation

3. **Place the Utility File**:
   - In the appropriate directory under `utils`
   - Using descriptive naming

#### Example: Creating a Node Builder Utility

```javascript
// utils/generators/node-builder.js

/**
 * Helper class to build properly formatted n8n nodes
 */
class NodeBuilder {
  /**
   * Create a manual trigger node
   */
  static createTriggerNode(type = 'manual') {
    const id = `${type}_trigger_${Date.now()}`;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} Trigger`;

    switch (type) {
      case 'manual':
        return {
          id,
          name,
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [250, 300]
        };
      case 'webhook':
        return this.createWebhookNode({ id, name });
      case 'schedule':
        return this.createScheduleTriggerNode({ id, name });
      default:
        throw new Error(`Unknown trigger type: ${type}`);
    }
  }

  /**
   * Create a webhook trigger node
   */
  static createWebhookNode({ id, name, parameters = {} }) {
    return {
      id: id || `webhook_trigger_${Date.now()}`,
      name: name || 'Webhook Trigger',
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [250, 300],
      webhookId: parameters.path || `webhook-${Date.now()}`,
      parameters: {
        path: parameters.path || `webhook-${Date.now()}`,
        responseMode: parameters.responseMode || 'onReceived',
        responseData: parameters.responseData || 'noData',
        options: parameters.options || {}
      }
    };
  }

  /**
   * Create a schedule trigger node
   */
  static createScheduleTriggerNode({ id, name, parameters = {} }) {
    return {
      id: id || `schedule_trigger_${Date.now()}`,
      name: name || 'Schedule Trigger',
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1,
      position: [250, 300],
      parameters: {
        interval: parameters.interval || [
          {
            field: "minutes",
            minutesInterval: parameters.minutes || 30
          }
        ]
      }
    };
  }

  /**
   * Create an Airtable node
   */
  static createAirtableNode({ id, name, operation, parameters }) {
    return {
      id: id || `airtable_${operation}_${Date.now()}`,
      name: name || `Airtable ${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
      type: "n8n-nodes-base.airtable",
      typeVersion: 1,
      position: [500, 300],
      parameters: {
        application: parameters.application || process.env.AIRTABLE_BASE_ID,
        table: parameters.table,
        operation,
        ...this.getAirtableParametersForOperation(operation, parameters)
      }
    };
  }

  /**
   * Get Airtable parameters based on operation
   */
  static getAirtableParametersForOperation(operation, params) {
    switch(operation) {
      case "read":
        return {
          id: params.id
        };
      case "search":
        return {
          filterByFormula: params.filterByFormula
        };
      case "create":
        return {
          options: params.options || {},
          fields: params.fields
        };
      case "update":
        return {
          id: params.id,
          options: params.options || {},
          fields: params.fields
        };
      default:
        return {};
    }
  }

  /**
   * Create a function node
   */
  static createFunctionNode({ id, name, functionCode }) {
    return {
      id: id || `function_${Date.now()}`,
      name: name || 'Function',
      type: "n8n-nodes-base.function",
      typeVersion: 1,
      position: [750, 300],
      parameters: {
        functionCode: functionCode || "return $input.item;"
      }
    };
  }

  /**
   * Create a switch node
   */
  static createSwitchNode({ id, name, typeVersion = 3.2, parameters }) {
    return {
      id: id || `switch_${Date.now()}`,
      name: name || 'Switch',
      type: "n8n-nodes-base.switch",
      typeVersion,
      position: [1000, 300],
      parameters: parameters || {
        rules: {
          values: [
            {
              outputKey: 'Option A',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                },
                combinator: 'and',
                conditions: [
                  {
                    operator: {
                      type: 'string',
                      operation: 'equals'
                    },
                    leftValue: '={{ $json.someField }}',
                    rightValue: 'someValue'
                  }
                ]
              },
              renameOutput: true
            },
            {
              outputKey: 'Default',
              conditions: {
                options: {
                  version: 2,
                  leftValue: '',
                  caseSensitive: true,
                  typeValidation: 'strict'
                },
                combinator: 'and',
                conditions: []
              },
              renameOutput: true
            }
          ]
        },
        options: {}
      }
    };
  }

  /**
   * Create a HTTP request node
   */
  static createHttpRequestNode({ id, name, parameters }) {
    return {
      id: id || `http_request_${Date.now()}`,
      name: name || 'HTTP Request',
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 1,
      position: [1250, 300],
      parameters: parameters || {
        url: 'https://example.com',
        method: 'GET',
        options: {}
      }
    };
  }

  /**
   * Create an Execute Workflow node
   */
  static createExecuteWorkflowNode({ id, name, parameters }) {
    return {
      id: id || `execute_workflow_${Date.now()}`,
      name: name || 'Execute Workflow',
      type: "n8n-nodes-base.executeWorkflow",
      typeVersion: 1,
      position: [1500, 300],
      parameters: parameters || {
        workflowId: "1",
        options: {}
      }
    };
  }

  /**
   * Create a NoOp node (for merging branches)
   */
  static createNoOpNode({ id, name }) {
    return {
      id: id || `noop_${Date.now()}`,
      name: name || 'Merge',
      type: "n8n-nodes-base.noOp",
      typeVersion: 1,
      position: [1750, 300],
      parameters: {}
    };
  }
}

module.exports = NodeBuilder;
```

## Leveraging Existing Nodes

n8n comes with a wide variety of built-in nodes that you can use in your workflows.

### Finding the Right Node

To find the appropriate node for a specific task:

1. **Use the Node Finder Utility**:
   ```javascript
   const NodeFinder = require('../utils/node-reference/node-finder');

   const finder = new NodeFinder();

   // Find all HTTP-related nodes
   const httpNodes = finder.findNodeTypes('http');
   console.log('Available HTTP nodes:', httpNodes.map(n => n.name));

   // Find Airtable operations
   const airtableNodes = finder.findNodeTypes('airtable');
   console.log('Airtable operations:', airtableNodes[0]?.operations);
   ```

2. **Look at the n8n Documentation**:
   - Visit the n8n documentation to see all available nodes: https://docs.n8n.io/integrations/builtin/
   - Check the examples for each node

3. **Inspect the Source Code**:
   - Check the source implementation in `packages/nodes-base/nodes/[NODE_TYPE]/`
   - Look at the parameter formats in the implementation files

### Common Node Types

Here are some common node types you'll use:

#### Airtable

```javascript
const airtableNode = NodeBuilder.createAirtableNode({
  id: 'get_records',
  name: 'Get Airtable Records',
  operation: 'search',
  parameters: {
    application: 'yourBaseId',
    table: 'Foreclosures',
    filterByFormula: {
      __rl: true,
      __dl: {
        mode: "expression",
        value: '{Status}="New"'
      }
    }
  }
});
```

#### HTTP Request

```javascript
const httpNode = NodeBuilder.createHttpRequestNode({
  id: 'fetch_data',
  name: 'Fetch External Data',
  parameters: {
    url: 'https://api.example.com/data',
    method: 'GET',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    options: {
      headerParameters: {
        parameter: [
          {
            name: 'API-Key',
            value: '{{ $env.EXAMPLE_API_KEY }}'
          }
        ]
      }
    }
  }
});
```

#### Function

```javascript
const functionNode = NodeBuilder.createFunctionNode({
  id: 'process_data',
  name: 'Process Data',
  functionCode: `
    // Get input data
    const data = $input.item.json;

    // Process the data
    const result = {
      id: data.id,
      name: data.name.toUpperCase(),
      createdAt: new Date().toISOString()
    };

    // Return the processed data
    return {
      json: result
    };
  `
});
```

#### Switch

```javascript
const switchNode = NodeBuilder.createSwitchNode({
  id: 'route_by_status',
  name: 'Route by Status',
  parameters: {
    rules: {
      values: [
        {
          outputKey: 'New',
          conditions: {
            options: {
              version: 2,
              caseSensitive: true,
              typeValidation: 'strict'
            },
            combinator: 'and',
            conditions: [
              {
                operator: {
                  type: 'string',
                  operation: 'equals'
                },
                leftValue: '={{ $json.status }}',
                rightValue: 'new'
              }
            ]
          },
          renameOutput: true
        },
        {
          outputKey: 'Default',
          conditions: {
            options: {
              version: 2,
              caseSensitive: true,
              typeValidation: 'strict'
            },
            combinator: 'and',
            conditions: []
          },
          renameOutput: true
        }
      ]
    },
    options: {}
  }
});
```

## Testing and Debugging

### Testing Workflows

To test your workflows:

1. **Run the Development Script**:
   ```bash
   node scripts/test-workflow.js workflow-templates/processes/foreclosure/enrich-foreclosure.js
   ```

2. **Use the n8n UI**:
   - Deploy the workflow to n8n
   - Use the "Execute Workflow" button in the UI
   - View execution details

3. **Add Debug Nodes**:
   - Insert "Set" nodes with debug information
   - Use console.log in Function nodes

### Debugging Techniques

Common debugging techniques:

1. **Log Data between Nodes**:
   ```javascript
   const debugNode = NodeBuilder.createFunctionNode({
     id: 'debug_data',
     name: 'Debug Data',
     functionCode: `
       console.log('Debug Data:', JSON.stringify($input.item.json, null, 2));
       return $input.item;
     `
   });
   ```

2. **Save Workflow State to File**:
   ```javascript
   const saveToFileNode = NodeBuilder.createFunctionNode({
     id: 'save_state',
     name: 'Save State',
     functionCode: `
       const fs = require('fs');
       fs.writeFileSync(
         'debug-data.json',
         JSON.stringify($input.item.json, null, 2)
       );
       return $input.item;
     `
   });
   ```

3. **Check Workflow Connections**:
   ```javascript
   console.log('Verifying connections:');
   Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
     if (connections.main) {
       connections.main.forEach((outputs, outputIndex) => {
         outputs.forEach((connection) => {
           console.log(
             `- ${sourceId} (output ${outputIndex}) -> ${connection.node} (input ${connection.index})`
           );
         });
       });
     }
   });
   ```

## Deployment and Version Control

### Deploying Workflows

To deploy workflows:

1. **Using the WorkflowManager**:
   ```javascript
   const WorkflowManager = require('./utils/managers/workflow-manager');

   async function deployWorkflow(templatePath) {
     // Import the workflow builder
     const { buildWorkflow } = require(templatePath);

     // Build and deploy the workflow
     const workflow = await buildWorkflow();

     console.log(`Deployed workflow: ${workflow.name} (ID: ${workflow.id})`);
     return workflow;
   }

   deployWorkflow('./workflow-templates/triggers/airtable/foreclosure-created.js');
   ```

2. **Using n8n CLI**:
   ```bash
   # Export the workflow
   n8n export:workflow --id=123 --output=my-workflow.json

   # Import the workflow
   n8n import:workflow --input=my-workflow.json
   ```

### Version Control Strategy

Best practices for version control:

1. **Save Generated Workflows**:
   ```javascript
   const fs = require('fs');

   // After creating or updating a workflow
   fs.writeFileSync(
     `generated/${workflow.name.replace(/\s+/g, '-').toLowerCase()}.json`,
     JSON.stringify(workflow, null, 2)
   );
   ```

2. **Commit Both Code and Generated JSON**:
   ```bash
   git add workflow-templates/ generated/
   git commit -m "Add foreclosure enrichment workflow"
   ```

3. **Use Semantic Versioning**:
   - Include version numbers in workflow names for deployed instances
   - Update version when making changes

## Best Practices

1. **Consistent Naming**:
   - Use descriptive names for workflows and nodes
   - Follow established naming conventions
   - Include purpose and entity in workflow names

2. **Error Handling**:
   - Add error handling at critical points
   - Log errors with sufficient context
   - Implement retry mechanisms for transient failures

3. **Documentation**:
   - Document input/output requirements for each workflow
   - Add notes to complex nodes
   - Use meaningful variable names

4. **Incremental Development**:
   - Start with simple workflows and add complexity incrementally
   - Test each addition before proceeding
   - Refactor common patterns into operations

5. **Configuration Management**:
   - Store connection details in environment variables
   - Use environment-specific configuration files
   - Keep sensitive information out of the codebase

## Conclusion

This implementation guide provides practical steps for creating n8n workflows using our architecture. By following these patterns and best practices, you can create maintainable, robust workflows that handle the complexity of tax surplus recovery processes.

Remember to:
- Start simple and add complexity incrementally
- Reuse operations for common tasks
- Test thoroughly at each step
- Document your workflows for future reference

For more specific examples and patterns, refer to the `examples` directory in the codebase.
