#!/usr/bin/env node

/**
 * Add Switch Node to Simple Linear Workflow
 *
 * This script updates the existing Simple Linear Workflow by adding a Switch node
 * between the Set Status and Process Data nodes.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');
const fs = require('fs');

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
 * Updates the Simple Linear Workflow by adding a Switch node
 */
async function addSwitchNode() {
	try {
		// First, list all workflows to find the Simple Linear Workflow
		console.log('Finding the Simple Linear Workflow...');
		const workflows = await manager.listWorkflows();

		// Find the Simple Linear Workflow by name
		const simpleWorkflow = workflows.find((w) => w.name === 'Simple Linear Workflow');

		if (!simpleWorkflow) {
			throw new Error(
				'Simple Linear Workflow not found. Please run create-simple-working-workflow.js first.',
			);
		}

		console.log(`Found Simple Linear Workflow with ID: ${simpleWorkflow.id}`);

		// Get the full workflow
		const workflow = await manager.getWorkflow(simpleWorkflow.id);
		console.log(`Retrieved workflow with ${workflow.nodes.length} nodes`);

		// Save the original workflow for reference
		fs.writeFileSync(`original-workflow-${workflow.id}.json`, JSON.stringify(workflow, null, 2));

		// Find the Set Status and Process Data nodes
		const setNode = workflow.nodes.find((n) => n.name === 'Set Status');
		const processNode = workflow.nodes.find((n) => n.name === 'Process Data');

		if (!setNode || !processNode) {
			throw new Error('Required nodes not found in the workflow.');
		}

		console.log(
			`Found Set Status node (ID: ${setNode.id}) and Process Data node (ID: ${processNode.id})`,
		);

		// Generate a UUID for the new Switch node
		// Using stable UUID format but with a memorable value
		const switchNodeId = 'dddddddd-0000-1111-2222-333333333333';

		// Create a new Switch node
		const switchNode = {
			parameters: {
				// Using direct value comparison format based on the screenshot
				dataType: 'string',
				rules: {
					mode: 'single',
					rules: [
						{
							value1: '={{$json["status"]}}',
							operation: 'equal',
							value2: 'completed',
						},
					],
				},
				fallbackOutput: '1', // Default output if no rules match
				options: {},
			},
			id: switchNodeId,
			name: 'Status Switch',
			type: 'n8n-nodes-base.switch',
			typeVersion: 1,
			position: [
				// Position it between Set Status and Process Data
				(setNode.position[0] + processNode.position[0]) / 2,
				(setNode.position[1] + processNode.position[1]) / 2,
			],
		};

		// Add the Switch node to the workflow
		workflow.nodes.push(switchNode);
		console.log('Added Switch node to workflow');

		// Update connections
		// 1. Redirect connections from Set Status to Switch instead of Process Data
		// 2. Add new connections from Switch to Process Data

		// First, create a copy of the connections object
		const newConnections = { ...workflow.connections };

		// Find Set Status connections (both by ID and by name)
		if (newConnections[setNode.id] && newConnections[setNode.id].main) {
			// Replace the target node in ID-based connections
			newConnections[setNode.id].main[0] = [
				{
					node: switchNodeId,
					type: 'main',
					index: 0,
				},
			];
		}

		if (newConnections['Set Status'] && newConnections['Set Status'].main) {
			// Replace the target node in name-based connections
			newConnections['Set Status'].main[0] = [
				{
					node: 'Status Switch',
					type: 'main',
					index: 0,
				},
			];
		}

		// Add new connections from Switch to Process Data (both by ID and by name)
		newConnections[switchNodeId] = {
			main: [
				[
					{
						node: processNode.id,
						type: 'main',
						index: 0,
					},
				],
				[
					// Add a second output that also goes to the Process Data node
					// This is to demonstrate both paths from the Switch
					{
						node: processNode.id,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Also add name-based connections
		newConnections['Status Switch'] = {
			main: [
				[
					{
						node: 'Process Data',
						type: 'main',
						index: 0,
					},
				],
				[
					// Add a second output that also goes to the Process Data node
					{
						node: 'Process Data',
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Update the workflow with the new connections
		console.log('Updating connections to include Switch node in the flow');

		// Create the updated workflow
		const updateData = {
			nodes: workflow.nodes,
			connections: newConnections,
		};

		// Update the workflow
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, updateData);
		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`Node count: ${updatedWorkflow.nodes.length} (added 1 Switch node)`);

		// Save the updated workflow structure for inspection
		const filename = `updated-workflow-with-switch-${updatedWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(updatedWorkflow, null, 2));
		console.log(`\nSaved updated workflow structure to: ${filename}`);

		// Log connection structure
		console.log('\nVerifying workflow connections:');
		Object.entries(updatedWorkflow.connections).forEach(([sourceId, connections]) => {
			if (connections.main) {
				connections.main.forEach((outputs, outputIndex) => {
					outputs.forEach((connection) => {
						const sourceNode = updatedWorkflow.nodes.find((n) => n.id === sourceId) || {
							name: sourceId,
						};
						const targetNode = updatedWorkflow.nodes.find((n) => n.id === connection.node) || {
							name: connection.node,
						};
						const sourceName = sourceNode.name || sourceId;
						const targetName = targetNode.name || connection.node;

						console.log(
							`- ${sourceName} (output ${outputIndex}) -> ${targetName} (input ${connection.index})`,
						);
					});
				});
			}
		});

		showRefreshNotification();

		return updatedWorkflow;
	} catch (error) {
		console.error('Error updating workflow with Switch node:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting update of Simple Linear Workflow to add a Switch node...');

		const workflow = await addSwitchNode();

		console.log('\nWorkflow updated successfully!');
		console.log('Added a Switch node between Set Status and Process Data nodes.');
		console.log('Both paths from the Switch node lead to the Process Data node.');
		console.log('Please check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
