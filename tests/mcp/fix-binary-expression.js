#!/usr/bin/env node

/**
 * Fix Binary Expression Test
 *
 * This script updates the Set node in our binary handling test workflow
 * to use more reliable expression syntax
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
	url: 'https://127.0.0.1:5678',
	apiKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
};

// Create a workflow manager instance
const manager = new WorkflowManager(config.url, config.apiKey);

/**
 * Utility to display a highly visible refresh notification
 */
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

/**
 * Fix the binary expression in Method 4 Set Node
 */
async function fixBinaryExpression() {
	try {
		// Get the workflow ID from the test script output
		const workflowId = 'ezqJea1egGOcPv6a';

		// Get the current workflow
		const workflow = await manager.getWorkflow(workflowId);

		if (!workflow) {
			console.error(`Workflow with ID ${workflowId} not found.`);
			return null;
		}

		console.log(`Fixing Method 4 in workflow: "${workflow.name}" (ID: ${workflowId})`);

		// Find the Method 4 Set Node
		const setNode = workflow.nodes.find((node) => node.id === 'direct-set-node');

		if (!setNode) {
			console.error('Could not find Method 4 Set Node');
			return null;
		}

		console.log(`Found Method 4 Set Node: "${setNode.name}" (ID: ${setNode.id})`);

		// Create updated nodes
		const updatedNodes = [...workflow.nodes];

		// Update the Set Node to use a different approach
		const setNodeIndex = updatedNodes.findIndex((node) => node.id === 'direct-set-node');

		// Create updated parameters with the new expression
		updatedNodes[setNodeIndex] = {
			...setNode,
			parameters: {
				values: {
					string: [
						{
							name: 'configString',
							value: '={{ $binary.data ? $binary.data.toString() : "" }}',
						},
						{
							name: '_accessMethod',
							value: 'Set Node: Safe $binary.data access with conditional',
						},
					],
				},
			},
		};

		// Add a new Function node after the Set Node to parse the JSON
		const parseNode = {
			id: 'direct-parse-node',
			name: '4B. Function Node: Parse Direct String',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [850, 700],
			parameters: {
				functionCode: `
// Get the string from previous node
const configStr = $input.item.json.configString;

// Parse the JSON string
try {
  const config = JSON.parse(configStr);

  // Return the parsed data
  return {
    json: {
      ...config,
      _accessMethod: $input.item.json._accessMethod + " + Function node parsing"
    }
  };
} catch (error) {
  return {
    json: {
      error: error.message,
      _accessMethod: $input.item.json._accessMethod + " + Function node parsing (failed)"
    }
  };
}`,
			},
		};

		// Add the new node
		updatedNodes.push(parseNode);

		// Create updated connections
		const updatedConnections = { ...workflow.connections };

		// Add connection from direct-set-node to direct-parse-node
		updatedConnections['direct-set-node'] = {
			main: [
				[
					{
						node: 'direct-parse-node',
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Also update name-based connections
		updatedConnections['4. Set Node: Direct Parse (Often fails)'] = {
			main: [
				[
					{
						node: '4B. Function Node: Parse Direct String',
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Update the workflow
		const updatedWorkflow = {
			...workflow,
			nodes: updatedNodes,
			connections: updatedConnections,
		};

		// Save the updated workflow
		const result = await manager.updateWorkflow(workflowId, updatedWorkflow);

		console.log(`Updated workflow: "${result.name}"`);
		console.log(`Workflow now contains ${result.nodes.length} nodes`);

		// Let's also try a different approach for Method 4
		// Create a new workflow with alternative approaches
		const alternativeWorkflowName = 'Binary Data Handling - Alternative Approaches';

		// Define alternative nodes
		const alternativeNodes = [
			// Start node (manual trigger)
			{
				id: 'alt-start-node',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},

			// Read Binary File node
			{
				id: 'alt-read-file-node',
				name: 'Read Test JSON File',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					filePath: path.join(__dirname, 'test-data.json'),
				},
			},

			// Method A: Binary using Buffer
			{
				id: 'alt-method-a',
				name: 'Method A: Using Buffer',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [650, 200],
				parameters: {
					functionCode: `
// Access binary data using Buffer
const binaryData = $input.item.binary.data;
let configStr;

// Try different methods of converting binary to string
try {
  // Method 1: Direct toString
  configStr = binaryData.toString();
  const config = JSON.parse(configStr);

  return {
    json: {
      ...config,
      _method: "Buffer direct toString"
    }
  };
} catch (error) {
  // If direct toString fails, try with encoding
  try {
    configStr = binaryData.toString('utf8');
    const config = JSON.parse(configStr);

    return {
      json: {
        ...config,
        _method: "Buffer toString with utf8 encoding"
      }
    };
  } catch (error) {
    return {
      json: {
        error: error.message,
        _method: "Both methods failed"
      }
    };
  }
}`,
				},
			},

			// Method B: Binary using getNodeParameter
			{
				id: 'alt-method-b',
				name: 'Method B: Using $json',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [650, 400],
				parameters: {
					values: {
						string: [
							{
								name: 'binaryKeys',
								value: '={{ Object.keys($json) }}',
							},
							{
								name: 'binaryDataKeys',
								value: '={{ $json.data ? Object.keys($json.data) : [] }}',
							},
							{
								name: 'itemKeys',
								value: '={{ Object.keys($item) }}',
							},
						],
					},
				},
			},

			// Method C: Alternative expression syntax
			{
				id: 'alt-method-c',
				name: 'Method C: Using $items',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [650, 600],
				parameters: {
					values: {
						string: [
							{
								name: 'dataString',
								value: '={{ $items(0).$binary.data ? $items(0).$binary.data.toString() : "" }}',
							},
						],
					},
				},
			},

			// Method D: Alternative using moveBinaryData
			{
				id: 'alt-method-d1',
				name: 'Method D1: Move Binary Data',
				type: 'n8n-nodes-base.moveBinaryData',
				typeVersion: 1,
				position: [650, 800],
				parameters: {
					mode: 'binaryToJson',
					convertAllData: true,
					sourceKey: 'data',
					options: {},
				},
			},

			// Parse from MoveBinaryData
			{
				id: 'alt-method-d2',
				name: 'Method D2: Parse Moved Data',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [850, 800],
				parameters: {
					functionCode: `
// At this point, binary data should be converted to JSON
const data = $input.item.json;

return {
  json: {
    ...data,
    _method: "MoveBinaryData + Function"
  }
};`,
				},
			},
		];

		// Define connections between nodes
		const alternativeConnections = {
			'alt-start-node': {
				main: [
					[
						{
							node: 'alt-read-file-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'alt-read-file-node': {
				main: [
					[
						{
							node: 'alt-method-a',
							type: 'main',
							index: 0,
						},
						{
							node: 'alt-method-b',
							type: 'main',
							index: 0,
						},
						{
							node: 'alt-method-c',
							type: 'main',
							index: 0,
						},
						{
							node: 'alt-method-d1',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'alt-method-d1': {
				main: [
					[
						{
							node: 'alt-method-d2',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Add name-based connections
		const altNameConnections = {
			Start: {
				main: [
					[
						{
							node: 'Read Test JSON File',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Read Test JSON File': {
				main: [
					[
						{
							node: 'Method A: Using Buffer',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method B: Using $json',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method C: Using $items',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method D1: Move Binary Data',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Method D1: Move Binary Data': {
				main: [
					[
						{
							node: 'Method D2: Parse Moved Data',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Merge ID and name-based connections
		const mergedAltConnections = { ...alternativeConnections, ...altNameConnections };

		// Create the alternative workflow
		const altWorkflow = await manager.createWorkflow(
			alternativeWorkflowName,
			alternativeNodes,
			mergedAltConnections,
		);

		console.log(`Created alternative workflow: "${altWorkflow.name}" (ID: ${altWorkflow.id})`);
		console.log(`Alternative workflow contains ${altWorkflow.nodes.length} nodes`);

		return {
			mainWorkflow: result,
			alternativeWorkflow: altWorkflow,
		};
	} catch (error) {
		console.error('Error fixing binary expression:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting binary expression fix...');

		// Fix the binary expression
		const result = await fixBinaryExpression();

		if (result) {
			console.log('\nSuccessfully updated binary data handling workflows');
			console.log('\nTo test the updated approaches:');
			console.log('1. Go to the n8n UI and refresh');
			console.log('2. Try both workflows:');
			console.log('   a. The original "Binary Data Handling Test" with the fixed Method 4');
			console.log('   b. The new "Binary Data Handling - Alternative Approaches" workflow');
			console.log('3. Compare which approaches successfully parse the binary data');

			console.log('\nAlternative approaches include:');
			console.log('• Method A: Using Buffer with different encoding options');
			console.log('• Method B: Exploring the structure of $json and $item');
			console.log('• Method C: Using $items(0) syntax');
			console.log('• Method D: Using Move Binary Data node to convert binary to JSON');

			showRefreshNotification();
		} else {
			console.error('Failed to update workflows');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
