# N8N Workflow Management

This document describes the tools created for managing n8n workflows programmatically from our codebase.

## Background

We've been working on connecting n8n with Cursor's MCP Bridge to allow Claude to manage workflows. However, we've faced some challenges with the MCP protocol, primarily related to certificate validation.

As a solution, we've created a set of tools that can be used to manage n8n workflows programmatically:

1. A CLI tool for interactive workflow management
2. A JavaScript class for programmatically managing workflows

## Setup and Startup

### Prerequisites

- n8n installed and running locally
- Node.js (v14 or later)

### Starting the n8n Server

1. Make sure n8n is running on your local machine (default: https://localhost:5678)
2. Ensure you have a valid API key for authentication

### Starting the MCP Bridge

The MCP Bridge acts as a translation layer between Cursor's MCP protocol and the n8n API.

```bash
# Navigate to the project root
cd /path/to/project

# Make the script executable if needed
chmod +x run-mcp.sh

# Run the MCP bridge
./run-mcp.sh
```

The `run-mcp.sh` script:
- Sets environment variables for n8n connection
- Disables TLS certificate validation for localhost development
- Starts the custom MCP bridge script (mcp-bridge.js)

### Testing the Connection

After starting both servers, you can test the connection using:

```bash
cd tests/mcp
node test-connection.js
```

This should list the workflows available in your n8n instance.

### Using the Alternative Tools

If you encounter issues with the MCP bridge (such as certificate validation problems), you can use the alternative tools we've created:

1. Use the CLI tool directly:
   ```bash
   cd tests/mcp
   node n8n-cli.js list
   ```

2. Use the workflow-manager.js in your scripts:
   ```bash
   cd tests/mcp
   node test-create-workflow.js
   ```

These tools provide the same functionality as the MCP bridge but using a direct approach that may be more reliable in some environments.

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

## Working with Complex Node Types

Through extensive testing, we've discovered important details about working with specific node types in n8n, particularly those involving branching logic.

### Switch Node Best Practices

The Switch node is commonly used to create conditional branches in workflows but requires specific configuration to work correctly when created programmatically:

1. **Type Version**: Always use `typeVersion: 3.2` for Switch nodes
   ```javascript
   {
     id: 'switch-node-id',
     name: 'Status Switch',
     type: 'n8n-nodes-base.switch',
     typeVersion: 3.2,  // Required for newer switch nodes
     // ... other properties
   }
   ```

2. **Rule Structure**: Switch node rules must follow this structure:
   ```javascript
   parameters: {
     rules: {
       values: [
         {
           outputKey: 'Path Name',  // Name of this output path
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
                   operation: 'equals'  // or other operations
                 },
                 leftValue: '={{ $json["fieldName"] }}',  // Format is important
                 rightValue: 'expectedValue'
               }
             ]
           },
           renameOutput: true  // Label the output in the UI
         },
         // Additional rules follow the same pattern
       ]
     },
     options: {}
   }
   ```

3. **Connection Structure**: Each output from the Switch must connect to a different branch:
   ```javascript
   // Switch node connections
   [switchNodeId]: {
     main: [
       [  // First output (index 0)
         {
           node: 'path-a-node-id',
           type: 'main',
           index: 0
         }
       ],
       [  // Second output (index 1)
         {
           node: 'path-b-node-id',
           type: 'main',
           index: 0
         }
       ]
     ]
   }
   ```

4. **Always Include Name-Based Connections**: In addition to ID-based connections, including name-based connections improves reliability:
   ```javascript
   'Status Switch': {
     main: [
       [
         {
           node: 'Handle Completed',
           type: 'main',
           index: 0
         }
       ],
       [
         {
           node: 'Handle Not Completed',
           type: 'main',
           index: 0
         }
       ]
     ]
   }
   ```

### General Workflow Creation Best Practices

1. **Use UUID Format IDs**: Use consistent, memorable UUIDs for node IDs:
   ```javascript
   const nodeId = 'aaaaaaaa-1111-2222-3333-444444444444';
   ```

2. **Create vs Update**: It's often more reliable to create a new workflow than to update an existing one with complex changes

3. **Incremental Development**: Build workflows incrementally, testing each step:
   - Start with a simple workflow of 2-3 nodes
   - Add complexity one node at a time
   - Test each addition before proceeding

4. **Saving JSON for Debugging**: Always save created workflows to JSON files for debugging:
   ```javascript
   const filename = `workflow-${workflow.id}.json`;
   fs.writeFileSync(filename, JSON.stringify(workflow, null, 2));
   ```

5. **Connection Validation**: Always validate connections after creating or updating a workflow:
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

### Example Workflow with Switch Node

You can find a complete working example in `tests/mcp/create-working-switch-workflow.js` that demonstrates:
- Proper node structure
- Switch node configuration
- Connection handling for branching paths
- Merging branches back together

This example provides a template for creating other complex workflows with conditional branching.

### Creating Disconnected Flows in a Workflow

In n8n, a single workflow can contain multiple disconnected flows, each with its own trigger. This approach has several benefits:
- Keeping related functionality in one workflow
- Simplifying management of related processes
- Reducing the total number of workflows

To create disconnected flows within a single workflow:

1. **Use Separate ID Namespaces**: Use different ID patterns for nodes in each flow:
   ```javascript
   // First flow uses 1's pattern
   const flow1TriggerId = '11111111-0000-0000-0000-000000000001';
   const flow1NodeId = '11111111-0000-0000-0000-000000000002';

   // Second flow uses 2's pattern
   const flow2TriggerId = '22222222-0000-0000-0000-000000000001';
   const flow2NodeId = '22222222-0000-0000-0000-000000000002';
   ```

2. **Position Flows Separately**: Place each flow at a different y-coordinate:
   ```javascript
   // First flow at y=300
   {
     id: flow1TriggerId,
     // ... other properties
     position: [250, 300],
   }

   // Second flow at y=500
   {
     id: flow2TriggerId,
     // ... other properties
     position: [250, 500],
   }
   ```

3. **Separate Trigger Nodes**: Each flow needs its own trigger node (Manual, Webhook, Schedule, etc.)

4. **Independent Connection Structures**: Define connections for each flow separately:
   ```javascript
   // First flow connections
   const flow1Connections = {
     [flow1TriggerId]: {
       main: [[ { node: flow1NodeId, type: 'main', index: 0 } ]]
     }
     // ... more connections for flow 1
   };

   // Second flow connections
   const flow2Connections = {
     [flow2TriggerId]: {
       main: [[ { node: flow2NodeId, type: 'main', index: 0 } ]]
     }
     // ... more connections for flow 2
   };

   // Combine all connections
   const allConnections = { ...flow1Connections, ...flow2Connections };
   ```

5. **Include Name-Based Connections**: For better compatibility, add name-based connections:
   ```javascript
   'Manual Trigger': {
     main: [[ { node: 'First Node', type: 'main', index: 0 } ]]
   },
   'Webhook': {
     main: [[ { node: 'Process Webhook Data', type: 'main', index: 0 } ]]
   }
   ```

6. **Verify Flow Independence**: Ensure there are no connections between flows:
   ```javascript
   console.log('\nVerifying flow paths:');
   console.log('\nFirst Flow Path:');
   console.log('- Trigger -> Node1 -> Node2');
   console.log('\nSecond Flow Path:');
   console.log('- Trigger2 -> NodeA -> NodeB');
   ```

### Example: Workflow with Multiple Triggers

A complete example can be found in `tests/mcp/create-disconnected-flows.js` which demonstrates:
- A manual trigger flow for fetching and processing data
- A webhook trigger flow for handling incoming requests
- Proper positioning and organization of multiple flows
- Independent execution paths

This pattern is useful for creating complex systems where related but separate processes need to be grouped together.

### Calling One Workflow from Another

n8n provides the ability to create modular, reusable workflows by allowing one workflow to call another. This approach has several benefits:
- Promotes code reuse and modular design
- Simplifies maintenance by isolating functionality
- Enables building complex processes from smaller, testable components

To create a workflow that calls another workflow:

1. **Create the Callee Workflow First**: Create the workflow that will be called (the "callee"):
   ```javascript
   // Define callee workflow nodes
   const calleeNodes = [
     {
       id: "callee-trigger-id",
       name: "When Called",
       type: "n8n-nodes-base.manualTrigger",
       // ... other properties
     },
     // ... processing nodes
   ];

   const calleeWorkflow = await manager.createWorkflow("Reusable Process", calleeNodes, calleeConnections);
   ```

2. **Use the Execute Workflow Node**: In the caller workflow, use the `executeWorkflow` node type:
   ```javascript
   {
     id: "execute-workflow-node-id",
     name: "Execute Process Workflow",
     type: "n8n-nodes-base.executeWorkflow",
     typeVersion: 1,
     position: [650, 300],
     parameters: {
       workflowId: calleeWorkflowId,  // ID of the workflow to execute
       options: {}
     }
   }
   ```

3. **Pass Data to the Callee Workflow**: Data from the caller workflow is automatically passed to the callee:
   ```javascript
   // In a node before the Execute Workflow node
   {
     id: "prepare-data-node-id",
     name: "Prepare Data",
     type: "n8n-nodes-base.set",
     // ... other properties
     parameters: {
       values: {
         string: [
           {
             name: "dataForCallee",
             value: "This will be available in the callee workflow"
           }
         ]
       }
     }
   }
   ```

4. **Handle Results from the Callee**: The output from the callee workflow is returned to the caller:
   ```javascript
   // In a node after the Execute Workflow node
   {
     id: "result-handler-id",
     name: "Handle Result",
     type: "n8n-nodes-base.function",
     // ... other properties
     parameters: {
       functionCode:
         '// Access data returned from the callee\n' +
         'const calleeResult = $input.item.json;\n' +
         'return {\n' +
         '  json: {\n' +
         '    ...calleeResult,\n' +
         '    processedByCaller: true\n' +
         '  }\n' +
         '};'
     }
   }
   ```

5. **Workflow Execution Context**: The callee workflow runs in the context of the caller:
   - The execution is synchronous - the caller waits for the callee to complete
   - Error handling can be implemented in the caller
   - Data is passed seamlessly between workflows

### Example: Workflow Execution

A complete example can be found in `tests/mcp/create-workflow-execution-example.js` which demonstrates:
- A "callee" workflow that processes data and returns results
- A "caller" workflow that prepares data, calls the callee, and processes the results
- Proper data passing between workflows
- Error handling considerations

This pattern enables building complex systems with clean separation of concerns and promotes reuse of common functionality across multiple workflows.

### Creating Configurable Workflows with External Variables

n8n workflows often require configuration that may change over time. By storing variables in external files, you can:
- Separate configuration from workflow logic
- Enable non-technical users to modify workflow behavior
- Implement environment-specific settings
- Manage complex configuration in a structured way

To create a workflow that uses external configuration:

1. **Create a Configuration File**: Store your variables in a JSON file:
   ```json
   {
     "apiEndpoint": "https://api.example.com/data",
     "requestMethod": "GET",
     "statusField": "completed",
     "processingRules": {
       "assignTo": "user1",
       "priority": "high"
     }
   }
   ```

2. **Read the Configuration File**: Use the Read Binary File node to load the configuration:
   ```javascript
   {
     id: "read-config-node-id",
     name: "Read Configuration",
     type: "n8n-nodes-base.readBinaryFile",
     typeVersion: 1,
     parameters: {
       filePath: "/path/to/your/config.json",
       options: {
         encoding: "utf8"
       }
     }
   }
   ```

3. **Use Configuration Variables in Nodes**: Reference the config values in subsequent nodes:
   ```javascript
   {
     id: "http-request-node-id",
     name: "Make API Request",
     type: "n8n-nodes-base.httpRequest",
     typeVersion: 1,
     parameters: {
       // Access configuration by parsing the JSON string from the binary data
       url: "={{ JSON.parse($binary[\"data\"][\"toString\"](\"utf8\")).apiEndpoint }}",
       method: "={{ JSON.parse($binary[\"data\"][\"toString\"](\"utf8\")).requestMethod }}"
     }
   }
   ```

4. **Process Configuration in Function Nodes**: For more complex configuration handling:
   ```javascript
   // In a function node
   parameters: {
     functionCode:
       '// Parse the configuration file content\n' +
       'const rawData = $items[0].binary.data.toString("utf8");\n' +
       'const config = JSON.parse(rawData);\n\n' +
       '// Use configuration values\n' +
       'return {\n' +
       '  json: {\n' +
       '    assignee: config.processingRules.assignTo,\n' +
       '    priority: config.processingRules.priority,\n' +
       '    // ... other fields\n' +
       '  }\n' +
       '};'
   }
   ```

5. **Update Configuration Without Changing Workflows**: Making changes to the workflow behavior is as simple as editing the JSON file without modifying the workflow itself.

### Example: Configurable Workflow

A complete example can be found in `tests/mcp/create-configurable-workflow.js` which demonstrates:
- Creating and reading from a configuration file (`workflow-config.json`)
- Dynamically configuring HTTP requests based on external variables
- Processing data according to configurable rules
- Creating notification messages with configurable recipients and content

This approach enables more maintainable workflows by separating the configuration concerns from the workflow logic.
