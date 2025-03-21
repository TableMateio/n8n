# n8n Implementation Guide

This guide provides step-by-step instructions for implementing workflows in our n8n architecture.

## Table of Contents

1. [Setup](#setup)
2. [Creating Routers](#creating-routers)
3. [Creating Processes](#creating-processes)
4. [Creating Operations](#creating-operations)
5. [Testing Workflows](#testing-workflows)
6. [Deploying Workflows](#deploying-workflows)
7. [Maintaining Workflows](#maintaining-workflows)

## Setup

### Environment Setup

Before you begin implementing workflows, set up your development environment:

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:your-company/n8n-workflows.git
   cd n8n-workflows
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Environment Variables**:
   Create a `.env` file with the following variables:
   ```
   N8N_ENDPOINT=http://localhost:5678
   N8N_API_KEY=your-api-key
   AIRTABLE_API_KEY=your-airtable-api-key
   AIRTABLE_BASE_ID=your-airtable-base-id
   ```

4. **Create Directory Structure**:
   Create the basic directory structure if it doesn't exist:
   ```bash
   mkdir -p workflows/{routers,processes,operations}
   ```

## Creating Routers

Routers serve as entry points to the system, detecting events and routing them to appropriate processes.

### Implementation Steps

1. **Create a New Router**:
   - Identify the event source (Airtable, schedule, webhook)
   - Place in the appropriate directory under `workflows/routers`
   - Use the naming convention: `[entity]-[event].js`

2. **Implement the Router**:
   ```javascript
   // workflows/routers/airtable/foreclosure-created.js
   const WorkflowManager = require('../../../utils/managers/workflow-manager');
   const NodeBuilder = require('../../../utils/generators/node-builder');

   async function buildWorkflow() {
     const manager = new WorkflowManager();

     // 1. Create the trigger node
     const triggerNode = NodeBuilder.createWebhookNode({
       id: 'webhook_trigger',
       name: 'Airtable Webhook',
       parameters: {
         path: 'airtable/foreclosure-created',
         responseMode: 'onReceived',
         options: {
           bodyParametersUi: {
             parameter: [
               {
                 name: 'tableId',
                 value: '={{ $env.AIRTABLE_FORECLOSURE_TABLE_ID }}'
               }
             ]
           }
         }
       }
     });

     // 2. Create a function node to validate the payload
     const validateNode = NodeBuilder.createFunctionNode({
       id: 'validate_payload',
       name: 'Validate Webhook Payload',
       functionCode: `
         // Get the webhook payload
         const payload = $input.item.json;

         // Validate required fields
         if (!payload.id) {
           return { json: { error: 'Missing required field: id' } };
         }

         // Extract record ID
         return { json: { recordId: payload.id } };
       `
     });

     // 3. Create a switch node to route based on criteria
     const switchNode = NodeBuilder.createSwitchNode({
       id: 'route_by_status',
       name: 'Route by Status',
       parameters: {
         // Switch node parameters for version 3.2+
         rules: {
           values: [
             {
               outputIndex: 0,
               conditions: {
                 conditions: [
                   {
                     id: 'status',
                     leftValue: '={{ $json.status }}',
                     rightValue: 'new',
                     operator: { type: 'string', operation: 'equals' }
                   }
                 ]
               }
             }
           ]
         }
       }
     });

     // 4. Create nodes to execute the target processes
     const executeEnrichNode = NodeBuilder.createExecuteWorkflowNode({
       id: 'execute_enrich',
       name: 'Enrich Foreclosure',
       parameters: {
         workflowId: '={{ $getWorkflowByName("processes/foreclosure/enrich-foreclosure") }}',
         options: {},
         inputData: {
           foreclosureId: '={{ $json.recordId }}'
         }
       }
     });

     // 5. Create connections between nodes
     const connections = {
       [triggerNode.id]: {
         main: [[{ node: validateNode.id, type: 'main', index: 0 }]]
       },
       [validateNode.id]: {
         main: [[{ node: switchNode.id, type: 'main', index: 0 }]]
       },
       [switchNode.id]: {
         main: [
           [{ node: executeEnrichNode.id, type: 'main', index: 0 }]
         ]
       }
     };

     // 6. Create the workflow
     return manager.createWorkflow(
       'ROUTER: Foreclosure - Created',
       [triggerNode, validateNode, switchNode, executeEnrichNode],
       connections,
       { active: true }
     );
   }

   module.exports = { buildWorkflow };
   ```

3. **Router Best Practices**:
   - Keep routing logic simple
   - Focus on detecting events and determining which process to call
   - Pass only necessary context to the target process
   - Handle validation of incoming data
   - Use standardized error handling

## Creating Processes

Processes implement business logic for specific domains, coordinating multiple operations.

### Implementation Steps

1. **Create a New Process**:
   - Identify the domain and specific process
   - Place in the appropriate directory under `workflows/processes`
   - Use the naming convention: `[action]-[entity].js`

2. **Implement the Process**:
   ```javascript
   // workflows/processes/foreclosure/enrich-foreclosure.js
   const WorkflowManager = require('../../../utils/managers/workflow-manager');
   const NodeBuilder = require('../../../utils/generators/node-builder');

   async function buildWorkflow() {
     const manager = new WorkflowManager();

     // 1. Create the trigger node
     const triggerNode = NodeBuilder.createTriggerNode({
       id: 'manual_trigger',
       name: 'Manual Trigger',
       parameters: {
         options: {
           triggerOnce: false
         }
       }
     });

     // 2. Create a function node to validate input
     const validateInputNode = NodeBuilder.createFunctionNode({
       id: 'validate_input',
       name: 'Validate Input',
       functionCode: `
         // Get input parameters
         const foreclosureId = $input.item.json.foreclosureId;

         // Validate required parameters
         if (!foreclosureId) {
           throw new Error('Missing required parameter: foreclosureId');
         }

         // Return validated input
         return { json: { foreclosureId } };
       `
     });

     // 3. Create a node to get the foreclosure record
     const getForeclosureNode = NodeBuilder.createAirtableNode({
       id: 'get_foreclosure',
       name: 'Get Foreclosure',
       operation: 'read',
       parameters: {
         application: '={{ $env.AIRTABLE_BASE_ID }}',
         table: 'Foreclosures',
         id: '={{ $json.foreclosureId }}'
       }
     });

     // 4. Create a node to execute the property search operation
     const searchPropertyNode = NodeBuilder.createExecuteWorkflowNode({
       id: 'search_property',
       name: 'Search Property Records',
       parameters: {
         workflowId: '={{ $getWorkflowByName("operations/property/search-records") }}',
         options: {},
         inputData: {
           county: '={{ $node["get_foreclosure"].json.County }}',
           parcelId: '={{ $node["get_foreclosure"].json["Parcel ID"] }}'
         }
       }
     });

     // 5. Create a node to update the foreclosure with property data
     const updateForeclosureNode = NodeBuilder.createAirtableNode({
       id: 'update_foreclosure',
       name: 'Update Foreclosure',
       operation: 'update',
       parameters: {
         application: '={{ $env.AIRTABLE_BASE_ID }}',
         table: 'Foreclosures',
         id: '={{ $json.foreclosureId }}',
         options: {
           fields: {
             'Property Value': '={{ $node["search_property"].json.value }}',
             'Owner Name': '={{ $node["search_property"].json.owner }}',
             'Last Updated': '={{ $today.format("YYYY-MM-DD") }}',
             'Status': 'Enriched'
           }
         }
       }
     });

     // 6. Create connections between nodes
     const connections = {
       [triggerNode.id]: {
         main: [[{ node: validateInputNode.id, type: 'main', index: 0 }]]
       },
       [validateInputNode.id]: {
         main: [[{ node: getForeclosureNode.id, type: 'main', index: 0 }]]
       },
       [getForeclosureNode.id]: {
         main: [[{ node: searchPropertyNode.id, type: 'main', index: 0 }]]
       },
       [searchPropertyNode.id]: {
         main: [[{ node: updateForeclosureNode.id, type: 'main', index: 0 }]]
       }
     };

     // 7. Create the workflow
     return manager.createWorkflow(
       'PROCESS: Foreclosure - Enrich',
       [triggerNode, validateInputNode, getForeclosureNode, searchPropertyNode, updateForeclosureNode],
       connections
     );
   }

   module.exports = { buildWorkflow };
   ```

3. **Process Best Practices**:
   - Structure around a specific business process
   - Use clear, descriptive node names
   - Implement comprehensive error handling
   - Validate all inputs at the beginning
   - Use operations for specialized tasks
   - Include logging for monitoring and debugging
   - Return standardized results

## Creating Operations

Operations are reusable, atomic functions that adapt to different environments.

### Implementation Steps

1. **Create a New Operation**:
   - Identify the specific operation and variations needed
   - Place in the appropriate directory under `workflows/operations`
   - Use the naming convention: `[action]-[object].js`

2. **Implement the Operation**:
   ```javascript
   // workflows/operations/web/scrape.js
   const WorkflowManager = require('../../../utils/managers/workflow-manager');
   const NodeBuilder = require('../../../utils/generators/node-builder');

   async function buildWorkflow() {
     const manager = new WorkflowManager();

     // 1. Create the trigger node
     const triggerNode = NodeBuilder.createTriggerNode({
       id: 'manual_trigger',
       name: 'Manual Trigger'
     });

     // 2. Create a function node to validate input
     const validateInputNode = NodeBuilder.createFunctionNode({
       id: 'validate_input',
       name: 'Validate Input',
       functionCode: `
         // Get input parameters
         const input = $input.item.json;

         // Required parameters
         const required = ['url', 'selector'];
         const missing = required.filter(param => !input[param]);

         if (missing.length > 0) {
           throw new Error(\`Missing required parameters: \${missing.join(', ')}\`);
         }

         // Determine environment type if not specified
         let environment = input.environment;
         if (!environment) {
           // Default to structured-web unless specified otherwise
           environment = 'structured-web';

           // If URL contains known dynamic sites, use dynamic-web
           if (input.url.includes('javascript-heavy-site.com')) {
             environment = 'dynamic-web';
           }

           // If selector mentions AI or unstructured, use that
           if (typeof input.selector === 'string' &&
               input.selector.toLowerCase().includes('unstructured')) {
             environment = 'unstructured';
           }
         }

         // Return validated and enriched input
         return {
           json: {
             ...input,
             environment
           }
         };
       `
     });

     // 3. Create a switch node to select the appropriate scraping strategy
     const strategySwitchNode = NodeBuilder.createSwitchNode({
       id: 'strategy_switch',
       name: 'Select Strategy',
       parameters: {
         rules: {
           values: [
             {
               // Dynamic Web (Playwright)
               outputIndex: 0,
               conditions: {
                 conditions: [
                   {
                     id: 'environment',
                     leftValue: '={{ $json.environment }}',
                     rightValue: 'dynamic-web',
                     operator: { type: 'string', operation: 'equals' }
                   }
                 ]
               }
             },
             {
               // Structured Web (HTTP + Cheerio)
               outputIndex: 1,
               conditions: {
                 conditions: [
                   {
                     id: 'environment',
                     leftValue: '={{ $json.environment }}',
                     rightValue: 'structured-web',
                     operator: { type: 'string', operation: 'equals' }
                   }
                 ]
               }
             },
             {
               // Unstructured (AI-based)
               outputIndex: 2,
               conditions: {
                 conditions: [
                   {
                     id: 'environment',
                     leftValue: '={{ $json.environment }}',
                     rightValue: 'unstructured',
                     operator: { type: 'string', operation: 'equals' }
                   }
                 ]
               }
             }
           ]
         }
       }
     });

     // 4. Create nodes for each strategy

     // Dynamic Web Strategy (Playwright)
     const playwrightNode = NodeBuilder.createPlaywrightNode({
       id: 'playwright_scrape',
       name: 'Dynamic Web Scraping',
       parameters: {
         url: '={{ $json.url }}',
         operation: 'evaluate',
         evaluateCode: `
           async () => {
             // Wait for content to load
             await page.waitForSelector('{{ $json.selector }}');

             // Extract data based on selector
             const data = await page.evaluate((selector) => {
               const element = document.querySelector(selector);
               return element ? element.textContent.trim() : null;
             }, '{{ $json.selector }}');

             return data;
           }
         `
       }
     });

     // Structured Web Strategy (HTTP + Cheerio)
     const httpNode = NodeBuilder.createHttpRequestNode({
       id: 'http_request',
       name: 'HTTP Request',
       parameters: {
         url: '={{ $json.url }}',
         method: 'GET',
         options: {
           redirect: { followRedirects: true }
         }
       }
     });

     const cheerioNode = NodeBuilder.createFunctionNode({
       id: 'cheerio_scrape',
       name: 'Parse HTML with Cheerio',
       functionCode: `
         // Get the HTML response
         const html = $input.item.json.body;

         // Load HTML with cheerio
         const cheerio = require('cheerio');
         const $ = cheerio.load(html);

         // Extract data using the selector
         const selector = $input.item.json.selector;
         const element = $(selector);

         // Get the text content
         const data = element.text().trim();

         return {
           json: {
             data,
             url: $input.item.json.url
           }
         };
       `
     });

     // Unstructured Strategy (AI-based)
     const aiNode = NodeBuilder.createHttpRequestNode({
       id: 'ai_extract',
       name: 'AI Extraction',
       parameters: {
         url: 'https://api.openai.com/v1/chat/completions',
         method: 'POST',
         authentication: 'genericCredentialType',
         genericAuthType: 'httpHeaderAuth',
         options: {
           headerParameters: {
             parameter: [
               {
                 name: 'Content-Type',
                 value: 'application/json'
               },
               {
                 name: 'Authorization',
                 value: 'Bearer {{ $env.OPENAI_API_KEY }}'
               }
             ]
           }
         },
         bodyParametersJson: `{
           "model": "gpt-3.5-turbo",
           "messages": [
             {
               "role": "system",
               "content": "You are a web scraping assistant. Extract the requested information from the HTML content."
             },
             {
               "role": "user",
               "content": "Extract the following from this HTML: {{ $json.selector }}\\n\\nHTML: {{ $json.html }}"
             }
           ]
         }`
       }
     });

     // 5. Create a merge node to combine results
     const mergeResultsNode = NodeBuilder.createNoOpNode({
       id: 'merge_results',
       name: 'Merge Results'
     });

     // 6. Create a function node to format the final results
     const formatResultsNode = NodeBuilder.createFunctionNode({
       id: 'format_results',
       name: 'Format Results',
       functionCode: `
         // Get the data from the appropriate strategy
         let data = null;

         if ($input.item.json.data) {
           // Direct data from cheerio or playwright
           data = $input.item.json.data;
         } else if ($input.item.json.choices) {
           // OpenAI API response
           data = $input.item.json.choices[0].message.content;
         }

         // Return standardized output
         return {
           json: {
             success: !!data,
             data,
             source: $input.item.json.url,
             environment: $input.item.json.environment,
             timestamp: new Date().toISOString()
           }
         };
       `
     });

     // 7. Create connections between nodes
     const connections = {
       [triggerNode.id]: {
         main: [[{ node: validateInputNode.id, type: 'main', index: 0 }]]
       },
       [validateInputNode.id]: {
         main: [[{ node: strategySwitchNode.id, type: 'main', index: 0 }]]
       },
       [strategySwitchNode.id]: {
         main: [
           [{ node: playwrightNode.id, type: 'main', index: 0 }],
           [{ node: httpNode.id, type: 'main', index: 0 }],
           [{ node: aiNode.id, type: 'main', index: 0 }]
         ]
       },
       [playwrightNode.id]: {
         main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
       },
       [httpNode.id]: {
         main: [[{ node: cheerioNode.id, type: 'main', index: 0 }]]
       },
       [cheerioNode.id]: {
         main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
       },
       [aiNode.id]: {
         main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]]
       },
       [mergeResultsNode.id]: {
         main: [[{ node: formatResultsNode.id, type: 'main', index: 0 }]]
       }
     };

     // 8. Create the workflow
     return manager.createWorkflow(
       'OPERATION: Web - Scrape',
       [
         triggerNode, validateInputNode, strategySwitchNode,
         playwrightNode, httpNode, cheerioNode, aiNode,
         mergeResultsNode, formatResultsNode
       ],
       connections
     );
   }

   module.exports = { buildWorkflow };
   ```

3. **Operation Best Practices**:
   - Focus on a single logical function
   - Implement different strategies based on environment
   - Use clear input validation
   - Return standardized output formats
   - Include comprehensive error handling
   - Optimize for reusability across different domains
   - Document input and output contracts

## Testing Workflows

Proper testing ensures workflows behave as expected in different scenarios.

### Local Testing

1. **Create a Testing Script**:
   ```javascript
   // scripts/test-workflow.js
   const path = require('path');
   const { WorkflowManager } = require('../utils/managers/workflow-manager');

   async function testWorkflow(workflowPath, testData = {}) {
     try {
       // Resolve the workflow path
       const resolvedPath = path.resolve(workflowPath);
       console.log(`Testing workflow: ${resolvedPath}`);

       // Import the workflow builder
       const { buildWorkflow } = require(resolvedPath);

       // Create a workflow manager
       const manager = new WorkflowManager();

       // Build the workflow
       const workflow = await buildWorkflow();
       console.log(`Built workflow: ${workflow.name}`);

       // Deploy the workflow temporarily
       const deployedWorkflow = await manager.createWorkflow(
         `TEST: ${workflow.name}`,
         workflow.nodes,
         workflow.connections
       );
       console.log(`Deployed test workflow with ID: ${deployedWorkflow.id}`);

       // Execute the workflow with test data
       console.log('Executing with test data:', testData);
       const execution = await manager.executeWorkflow(deployedWorkflow.id, testData);
       console.log('Execution result:', execution);

       // Clean up
       await manager.deleteWorkflow(deployedWorkflow.id);
       console.log('Test workflow deleted');

       return execution;
     } catch (error) {
       console.error('Test failed:', error);
       throw error;
     }
   }

   // Get the workflow path from command line arguments
   const workflowPath = process.argv[2];
   if (!workflowPath) {
     console.error('Please provide a workflow path');
     process.exit(1);
   }

   // Get test data if provided
   let testData = {};
   if (process.argv[3]) {
     try {
       testData = JSON.parse(process.argv[3]);
     } catch (error) {
       console.error('Invalid test data JSON:', error);
       process.exit(1);
     }
   }

   // Run the test
   testWorkflow(workflowPath, testData)
     .then(() => process.exit(0))
     .catch(() => process.exit(1));
   ```

2. **Run Tests**:
   ```bash
   node scripts/test-workflow.js workflows/processes/foreclosure/enrich-foreclosure.js '{"foreclosureId": "rec123"}'
   ```

### Automated Testing

1. **Create Test Cases**:
   ```javascript
   // tests/workflows/processes/foreclosure/enrich-foreclosure.test.js
   const { testWorkflow } = require('../../../../scripts/test-workflow');
   const path = require('path');

   describe('Enrich Foreclosure Process', () => {
     const workflowPath = path.resolve('workflows/processes/foreclosure/enrich-foreclosure.js');

     test('Enriches a foreclosure record with property data', async () => {
       // Mock Airtable responses
       mockAirtableResponses([
         {
           table: 'Foreclosures',
           id: 'rec123',
           data: {
             'County': 'Example County',
             'Parcel ID': '12-34-567-890'
           }
         }
       ]);

       // Execute the workflow
       const result = await testWorkflow(workflowPath, {
         foreclosureId: 'rec123'
       });

       // Assertions
       expect(result.success).toBe(true);
       expect(result.data).toHaveProperty('Property Value');
       expect(result.data).toHaveProperty('Owner Name');
     });

     test('Handles missing foreclosure ID', async () => {
       // Execute with missing ID
       try {
         await testWorkflow(workflowPath, {});
         fail('Should have thrown an error');
       } catch (error) {
         expect(error.message).toContain('Missing required parameter: foreclosureId');
       }
     });
   });

   function mockAirtableResponses(mocks) {
     // Implementation of Airtable API mocking
   }
   ```

2. **Run Automated Tests**:
   ```bash
   npm test
   ```

## Deploying Workflows

Deploy workflows to production after successful testing.

### Deployment Methods

1. **Direct Deployment**:
   ```javascript
   // scripts/deploy-workflow.js
   const path = require('path');
   const { WorkflowManager } = require('../utils/managers/workflow-manager');

   async function deployWorkflow(workflowPath, activate = true) {
     try {
       // Resolve the workflow path
       const resolvedPath = path.resolve(workflowPath);
       console.log(`Deploying workflow: ${resolvedPath}`);

       // Import the workflow builder
       const { buildWorkflow } = require(resolvedPath);

       // Create a workflow manager
       const manager = new WorkflowManager();

       // Build the workflow
       const workflow = await buildWorkflow();
       console.log(`Built workflow: ${workflow.name}`);

       // Check if a workflow with this name already exists
       const existingWorkflows = await manager.listWorkflows();
       const existingWorkflow = existingWorkflows.find(w => w.name === workflow.name);

       let deployedWorkflow;
       if (existingWorkflow) {
         // Update the existing workflow
         console.log(`Updating existing workflow with ID: ${existingWorkflow.id}`);
         deployedWorkflow = await manager.updateWorkflow(existingWorkflow.id, {
           nodes: workflow.nodes,
           connections: workflow.connections
         });
       } else {
         // Create a new workflow
         deployedWorkflow = await manager.createWorkflow(
           workflow.name,
           workflow.nodes,
           workflow.connections
         );
         console.log(`Created new workflow with ID: ${deployedWorkflow.id}`);
       }

       // Activate if requested
       if (activate) {
         await manager.activateWorkflow(deployedWorkflow.id);
         console.log(`Activated workflow: ${deployedWorkflow.name}`);
       }

       return deployedWorkflow;
     } catch (error) {
       console.error('Deployment failed:', error);
       throw error;
     }
   }

   // Get the workflow path from command line arguments
   const workflowPath = process.argv[2];
   if (!workflowPath) {
     console.error('Please provide a workflow path');
     process.exit(1);
   }

   // Get activate flag if provided
   const activate = process.argv[3] !== 'false';

   // Run the deployment
   deployWorkflow(workflowPath, activate)
     .then(() => process.exit(0))
     .catch(() => process.exit(1));
   ```

2. **Deploy Command**:
   ```bash
   node scripts/deploy-workflow.js workflows/routers/airtable/foreclosure-created.js
   ```

### Deployment Strategy

1. **Use Environment-Specific Configurations**:
   ```javascript
   const environments = {
     development: {
       baseUrl: 'http://localhost:5678',
       apiKey: 'dev-api-key'
     },
     staging: {
       baseUrl: 'https://staging.example.com:5678',
       apiKey: 'staging-api-key'
     },
     production: {
       baseUrl: 'https://production.example.com:5678',
       apiKey: 'production-api-key'
     }
   };

   // Use the appropriate environment
   const env = process.env.NODE_ENV || 'development';
   const config = environments[env];
   ```

2. **Version Control for Deployed Workflows**:
   - Export workflow JSONs after deployment
   - Commit to the repository with the source code
   ```javascript
   // Export workflow JSON
   const fs = require('fs');
   const path = require('path');

   async function exportWorkflowJson(workflowId, outputDir) {
     const manager = new WorkflowManager();
     const workflow = await manager.getWorkflow(workflowId);

     // Create filename based on workflow name
     const filename = workflow.name
       .replace(/[^a-z0-9]/gi, '-')
       .toLowerCase() + '.json';

     // Save to file
     const outputPath = path.join(outputDir, filename);
     fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));

     console.log(`Exported workflow JSON to: ${outputPath}`);
     return outputPath;
   }

   // Export after deployment
   deployWorkflow('./workflows/routers/airtable/foreclosure-created.js')
     .then(workflow => exportWorkflowJson(workflow.id, './generated/'))
     .then(() => console.log('Deployment and export complete'));
   ```

3. **Git Hooks for Automated Deployment**:
   ```bash
   # .git/hooks/post-merge
   #!/bin/bash

   # Check if workflows were changed
   if git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep "^workflows/" > /dev/null; then
     echo "Workflows changed, deploying updates..."
     node scripts/deploy-all-workflows.js
   fi
   ```

## Maintaining Workflows

Strategies for maintaining workflows over time.

### Documentation

1. **Create README Files in Each Directory**:
   ```markdown
   # Foreclosure Processes

   This directory contains processes related to foreclosure handling.

   ## Processes

   - `enrich-foreclosure.js`: Enriches a foreclosure record with property data
   - `calculate-surplus.js`: Calculates potential surplus for a foreclosure

   ## Input Contracts

   ### Enrich Foreclosure
   - `foreclosureId` (string): ID of the foreclosure record in Airtable

   ### Calculate Surplus
   - `foreclosureId` (string): ID of the foreclosure record in Airtable

   ## Output Contracts

   ### Enrich Foreclosure
   - `success` (boolean): Whether the enrichment was successful
   - `foreclosureId` (string): ID of the enriched foreclosure
   - `propertyValue` (number): Estimated property value

   ### Calculate Surplus
   - `success` (boolean): Whether the calculation was successful
   - `foreclosureId` (string): ID of the foreclosure
   - `surplus` (number): Calculated surplus amount
   - `confidence` (string): Confidence level (high, medium, low)
   ```

2. **Document Input and Output Contracts in Code**:
   ```javascript
   /**
    * Build a workflow to enrich foreclosure data
    *
    * @returns {Promise<Object>} Workflow object
    *
    * @input foreclosureId {string} ID of the foreclosure record in Airtable
    *
    * @output success {boolean} Whether the enrichment was successful
    * @output foreclosureId {string} ID of the enriched foreclosure
    * @output propertyValue {number} Estimated property value
    */
   async function buildWorkflow() {
     // ...
   }
   ```

### Monitoring and Troubleshooting

1. **Add Logging**:
   ```javascript
   // Add a logging node
   const logNode = NodeBuilder.createFunctionNode({
     id: 'log_execution',
     name: 'Log Execution',
     functionCode: `
       // Create log entry
       const logEntry = {
         workflow: '${workflow.name}',
         timestamp: new Date().toISOString(),
         input: $input.item.json,
         status: 'success'
       };

       // Log to console
       console.log(JSON.stringify(logEntry));

       // Pass through data
       return $input.item;
     `
   });
   ```

2. **Error Handling Pattern**:
   ```javascript
   // Error handling node
   const errorHandlerNode = NodeBuilder.createFunctionNode({
     id: 'handle_error',
     name: 'Handle Error',
     functionCode: `
       // Get the error from previous node
       const error = $input.item.json.error;

       // Log the error
       console.error({
         workflow: '${workflow.name}',
         timestamp: new Date().toISOString(),
         error
       });

       // Return standardized error response
       return {
         json: {
           success: false,
           error: {
             message: error.message || 'An unknown error occurred',
             code: error.code || 'UNKNOWN_ERROR',
             timestamp: new Date().toISOString()
           }
         }
       };
     `
   });
   ```

### Versioning

1. **Include Version in Workflow Name**:
   ```javascript
   // Create the workflow with version
   return manager.createWorkflow(
     'PROCESS: Foreclosure - Enrich v1.2.0',
     nodes,
     connections
   );
   ```

2. **Track Version History**:
   ```markdown
   # Version History

   ## v1.2.0 (2023-06-15)
   - Added support for commercial properties
   - Improved error handling for missing data

   ## v1.1.0 (2023-05-20)
   - Added property value estimation
   - Fixed bug with county lookup

   ## v1.0.0 (2023-04-10)
   - Initial implementation
   ```

## Conclusion

This implementation guide provides a structured approach to building workflows using our n8n architecture. By following these patterns and best practices, you can create maintainable, adaptable, and reliable workflows that integrate seamlessly with the overall system.

Remember to:
- Keep components focused on single responsibilities
- Use consistent naming and organization
- Document input and output contracts
- Implement comprehensive error handling
- Test thoroughly before deployment
- Version control both code and exported workflows
- Monitor and maintain workflows over time
