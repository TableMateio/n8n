#!/usr/bin/env node

/**
 * Fix Method 4 Set Node
 *
 * This script updates the Method 4 Set Node to use a two-step approach:
 * 1. Get the raw string from binary data
 * 2. Parse the JSON in a second node
 *
 * NOTE: This is a legacy script kept for reference. For new applications,
 * consider implementing similar functionality using the WorkflowFixer utility
 * in utils/generators/workflow-fixer.js, which provides a more general and
 * maintainable approach to fixing workflows.
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
 * Fix Method 4 in the workflow
 */
async function fixMethod4() {
	try {
		// Get the workflow ID
		const workflowId = 'ROWfPLkjLjvC6fIc';

		// Get the current workflow
		const workflow = await manager.getWorkflow(workflowId);

		if (!workflow) {
			console.error(`Workflow with ID ${workflowId} not found.`);
			return null;
		}

		console.log(`Fixing Method 4 in workflow: "${workflow.name}" (ID: ${workflowId})`);

		// Find the Method 4 Set Node
		const setNode = workflow.nodes.find((node) => node.id === 'set-node');

		if (!setNode) {
			console.error('Could not find Method 4 Set Node');
			return null;
		}

		console.log(`Found Method 4 Set Node: "${setNode.name}" (ID: ${setNode.id})`);

		// Create updated nodes and connections
		const updatedNodes = [...workflow.nodes];
		const updatedConnections = { ...workflow.connections };

		// Update the Set Node to only extract the string
		const setNodeIndex = updatedNodes.findIndex((node) => node.id === 'set-node');
		updatedNodes[setNodeIndex] = {
			...setNode,
			parameters: {
				values: {
					string: [
						{
							name: 'configString',
							value: '={{ $input.item.binary.data.toString() }}',
						},
					],
				},
				options: {},
			},
		};

		// Add a new Parse JSON node after the Set Node
		const parseJsonNode = {
			id: 'parse-json-node',
			name: 'Method 4: Parse JSON',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [800, 580],
			parameters: {
				functionCode:
					'// Parse the config string from the previous node\n' +
					'const configStr = $input.item.json.configString;\n' +
					'const config = JSON.parse(configStr);\n\n' +
					'// Return the parsed config with source info\n' +
					'return {\n' +
					'  json: {\n' +
					'    ...config,\n' +
					'    _source: "Set Node + Parse"\n' +
					'  }\n' +
					'};',
			},
		};

		// Add the new node
		updatedNodes.push(parseJsonNode);

		// Update connections
		// Remove the direct connection from set-node to http-request-4
		if (updatedConnections['set-node'] && updatedConnections['set-node'].main) {
			// Update with new connection to parse-json-node
			updatedConnections['set-node'] = {
				main: [
					[
						{
							node: 'parse-json-node',
							type: 'main',
							index: 0,
						},
					],
				],
			};
		}

		// Add connection from parse-json-node to http-request-4
		updatedConnections['parse-json-node'] = {
			main: [
				[
					{
						node: 'http-request-4',
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Also update name-based connections
		if (updatedConnections['Method 4: Set Node'] && updatedConnections['Method 4: Set Node'].main) {
			updatedConnections['Method 4: Set Node'] = {
				main: [
					[
						{
							node: 'Method 4: Parse JSON',
							type: 'main',
							index: 0,
						},
					],
				],
			};
		}

		updatedConnections['Method 4: Parse JSON'] = {
			main: [
				[
					{
						node: 'Method 4: API Request',
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

		return result;
	} catch (error) {
		console.error('Error fixing Method 4:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting fix for Method 4 Set Node...');

		// Fix Method 4
		const workflow = await fixMethod4();

		if (workflow) {
			console.log('\nSuccessfully fixed Method 4 Set Node');
			console.log('\nTo test the updated workflow:');
			console.log('1. Go to the n8n UI and refresh');
			console.log('2. Open the workflow "5 Methods, 1 Source"');
			console.log('3. Notice that Method 4 has been updated to use a two-step approach:');
			console.log('   a. First extract the raw string from binary data');
			console.log('   b. Then parse it as JSON in a separate Function node');
			console.log('4. Execute the workflow and observe if Method 4 now works correctly');

			showRefreshNotification();
		} else {
			console.error('Failed to fix Method 4');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
