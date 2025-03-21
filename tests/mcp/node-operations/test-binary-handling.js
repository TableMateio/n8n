#!/usr/bin/env node

/**
 * Binary Data Handling Test Suite for n8n
 *
 * This script creates a workflow that tests different ways of accessing
 * binary data in n8n to document the most reliable approaches.
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
 * Create a binary data test workflow
 */
async function createBinaryDataTestWorkflow() {
	try {
		const workflowName = 'Binary Data Handling Test';
		console.log(`Creating workflow: "${workflowName}"...`);

		// Sample JSON data for testing
		const testData = {
			apiEndpoint: 'https://api.example.com/v2',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer test-token',
			},
			processingRules: {
				uppercase: true,
				validateFields: ['name', 'email'],
				maxRetries: 3,
			},
		};

		// Ensure test JSON file exists
		const testDataPath = path.join(__dirname, 'test-data.json');
		fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));

		// Define workflow nodes
		const nodes = [
			// Start node (manual trigger)
			{
				id: 'start-node',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},

			// Read Binary File node
			{
				id: 'read-file-node',
				name: 'Read Test JSON File',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					filePath: testDataPath,
				},
			},

			// Debug node to show raw binary data
			{
				id: 'debug-raw-node',
				name: '1. Debug Raw Binary Data',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [650, 100],
				parameters: {},
				notes: 'Examine the binary data structure directly in the output',
			},

			// Method 1: Function Node Approach
			{
				id: 'function-node',
				name: '2. Function Node Method',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					functionCode: `
// Access binary data and convert to string
const binaryData = $input.item.binary.data;
const configStr = binaryData.toString("utf8");

// Parse the JSON string
try {
  const config = JSON.parse(configStr);

  // Return the parsed data with a source identifier
  return {
    json: {
      ...config,
      _accessMethod: "Function Node: $input.item.binary.data.toString()"
    }
  };
} catch (error) {
  return {
    json: {
      error: error.message,
      _accessMethod: "Function Node: $input.item.binary.data.toString()"
    }
  };
}`,
				},
			},

			// Method 2: Set Node with Expression (Two-step approach)
			{
				id: 'set-string-node',
				name: '3A. Set Node: Extract String',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [650, 500],
				parameters: {
					values: {
						string: [
							{
								name: 'configString',
								value: '={{ $input.item.binary.data.toString() }}',
							},
							{
								name: '_accessMethod',
								value: 'Set Node: $input.item.binary.data.toString()',
							},
						],
					},
				},
			},

			// Parse JSON in a separate node
			{
				id: 'parse-json-node',
				name: '3B. Function Node: Parse String',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [850, 500],
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
      _accessMethod: $input.item.json._accessMethod + " + JSON.parse()"
    }
  };
} catch (error) {
  return {
    json: {
      error: error.message,
      _accessMethod: $input.item.json._accessMethod + " + JSON.parse() (failed)"
    }
  };
}`,
				},
			},

			// Method 3: Direct Set Node Expression
			{
				id: 'direct-set-node',
				name: '4. Set Node: Direct Parse (Often fails)',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [650, 700],
				parameters: {
					values: {
						string: [
							{
								name: 'apiEndpoint',
								value: '={{ JSON.parse($input.item.binary.data.toString()).apiEndpoint }}',
							},
							{
								name: '_accessMethod',
								value: 'Set Node: JSON.parse($input.item.binary.data.toString())',
							},
						],
					},
				},
			},

			// Method 4: Code Node (batch processing)
			{
				id: 'code-node',
				name: '5. Code Node Method',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [650, 900],
				parameters: {
					code: `
// Process all items
for (const item of $input.all()) {
  if (item.binary && item.binary.data) {
    // Convert binary to string and parse as JSON
    const configStr = item.binary.data.toString("utf8");
    try {
      const config = JSON.parse(configStr);
      // Set the result as JSON
      item.json = {
        ...config,
        _accessMethod: "Code Node: item.binary.data.toString()"
      };
    } catch (error) {
      item.json = {
        error: error.message,
        _accessMethod: "Code Node: item.binary.data.toString() (failed)"
      };
    }
  }
}

return $input.all();`,
				},
			},

			// Method 5: $binary shorthand
			{
				id: 'binary-shorthand-node',
				name: '6A. Set Node: $binary Shorthand',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [650, 1100],
				parameters: {
					values: {
						string: [
							{
								name: 'configString',
								value: '={{ $binary.data.toString() }}',
							},
							{
								name: '_accessMethod',
								value: 'Set Node: $binary.data.toString()',
							},
						],
					},
				},
			},

			// Parse JSON from $binary
			{
				id: 'parse-binary-shorthand-node',
				name: '6B. Function Node: Parse $binary String',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [850, 1100],
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
      _accessMethod: $input.item.json._accessMethod + " + JSON.parse()"
    }
  };
} catch (error) {
  return {
    json: {
      error: error.message,
      _accessMethod: $input.item.json._accessMethod + " + JSON.parse() (failed)"
    }
  };
}`,
				},
			},
		];

		// Define connections between nodes
		const connections = {
			'start-node': {
				main: [
					[
						{
							node: 'read-file-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'read-file-node': {
				main: [
					[
						{
							node: 'debug-raw-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'function-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'set-string-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'direct-set-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'code-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'binary-shorthand-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'set-string-node': {
				main: [
					[
						{
							node: 'parse-json-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'binary-shorthand-node': {
				main: [
					[
						{
							node: 'parse-binary-shorthand-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Add name-based connections
		const nameConnections = {
			'Manual Trigger': {
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
							node: '1. Debug Raw Binary Data',
							type: 'main',
							index: 0,
						},
						{
							node: '2. Function Node Method',
							type: 'main',
							index: 0,
						},
						{
							node: '3A. Set Node: Extract String',
							type: 'main',
							index: 0,
						},
						{
							node: '4. Set Node: Direct Parse (Often fails)',
							type: 'main',
							index: 0,
						},
						{
							node: '5. Code Node Method',
							type: 'main',
							index: 0,
						},
						{
							node: '6A. Set Node: $binary Shorthand',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'3A. Set Node: Extract String': {
				main: [
					[
						{
							node: '3B. Function Node: Parse String',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'6A. Set Node: $binary Shorthand': {
				main: [
					[
						{
							node: '6B. Function Node: Parse $binary String',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Merge ID and name-based connections
		const mergedConnections = { ...connections, ...nameConnections };

		// Create the workflow
		const workflow = await manager.createWorkflow(workflowName, nodes, mergedConnections);

		// Save workflow structure to a file for reference
		const outputPath = path.join(__dirname, `binary-test-workflow-${workflow.id}.json`);
		fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));

		console.log(`Created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Workflow structure saved to: ${outputPath}`);

		return workflow;
	} catch (error) {
		console.error('Error creating binary test workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting Binary Data Handling Test Workflow creation...');

		// Create the workflow
		const workflow = await createBinaryDataTestWorkflow();

		if (workflow) {
			console.log('\nSuccessfully created Binary Data Test Workflow');
			console.log('\nTo test different binary data handling approaches:');
			console.log('1. Go to the n8n UI and refresh');
			console.log('2. Open the "Binary Data Handling Test" workflow');
			console.log('3. Run the workflow from the "Manual Trigger" node');
			console.log('4. Compare the results from each approach');
			console.log('5. Note which approaches successfully parse the JSON data');

			console.log('\nThe workflow tests the following approaches:');
			console.log('1. Debug Raw Binary Data: View the raw binary structure');
			console.log('2. Function Node: Using $input.item.binary.data.toString()');
			console.log('3. Two-Step Approach: Extract string first, then parse');
			console.log('4. Direct Expression: Attempt direct JSON.parse in expression');
			console.log('5. Code Node: Processing with advanced code capabilities');
			console.log('6. $binary Shorthand: Using the $binary shorthand notation');

			showRefreshNotification();
		} else {
			console.error('Failed to create workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Check if test JSON file exists, if not create it
const testDataPath = path.join(__dirname, 'test-data.json');
if (!fs.existsSync(testDataPath)) {
	const testData = {
		apiEndpoint: 'https://api.example.com/v2',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-token',
		},
		processingRules: {
			uppercase: true,
			validateFields: ['name', 'email'],
			maxRetries: 3,
		},
	};
	fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
	console.log(`Created test data file: ${testDataPath}`);
}

// Run the script
run();
