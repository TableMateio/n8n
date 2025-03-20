#!/usr/bin/env node

/**
 * Remove Switch Node from Simple Linear Workflow
 *
 * This script reverts the changes made by add-switch-to-linear.js,
 * removing the Switch node and reconnecting Set Status directly to Process Data.
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
 * Removes the Switch node from the Simple Linear Workflow and restores direct connections
 */
async function removeSwitchNode() {
	try {
		// First, list all workflows to find the Simple Linear Workflow
		console.log('Finding the Simple Linear Workflow...');
		const workflows = await manager.listWorkflows();

		// Find the Simple Linear Workflow by name
		const simpleWorkflow = workflows.find((w) => w.name === 'Simple Linear Workflow');

		if (!simpleWorkflow) {
			throw new Error('Simple Linear Workflow not found.');
		}

		console.log(`Found Simple Linear Workflow with ID: ${simpleWorkflow.id}`);

		// Get the full workflow
		const workflow = await manager.getWorkflow(simpleWorkflow.id);
		console.log(`Retrieved workflow with ${workflow.nodes.length} nodes`);

		// Save the current workflow for reference
		fs.writeFileSync(
			`workflow-before-revert-${workflow.id}.json`,
			JSON.stringify(workflow, null, 2),
		);

		// Find the Set Status, Switch, and Process Data nodes
		const setNode = workflow.nodes.find((n) => n.name === 'Set Status');
		const switchNode = workflow.nodes.find((n) => n.name === 'Status Switch');
		const processNode = workflow.nodes.find((n) => n.name === 'Process Data');

		if (!setNode || !processNode) {
			throw new Error('Required nodes not found in the workflow.');
		}

		console.log(
			`Found Set Status node (ID: ${setNode.id}) and Process Data node (ID: ${processNode.id})`,
		);

		if (!switchNode) {
			console.log('Switch node not found. The workflow may already be in the original state.');
		} else {
			console.log(`Found Switch node (ID: ${switchNode.id}) - will remove it`);
		}

		// Create a new array of nodes without the Switch node
		const newNodes = workflow.nodes.filter((node) => node.name !== 'Status Switch');

		// Create a copy of the connections object
		const newConnections = { ...workflow.connections };

		// Update connections to go directly from Set Status to Process Data
		// For ID-based connections
		if (newConnections[setNode.id] && newConnections[setNode.id].main) {
			newConnections[setNode.id].main[0] = [
				{
					node: processNode.id,
					type: 'main',
					index: 0,
				},
			];
		}

		// For name-based connections
		if (newConnections['Set Status'] && newConnections['Set Status'].main) {
			newConnections['Set Status'].main[0] = [
				{
					node: 'Process Data',
					type: 'main',
					index: 0,
				},
			];
		}

		// Remove Switch node connections
		if (switchNode) {
			delete newConnections[switchNode.id];
			delete newConnections['Status Switch'];
		}

		// Create the updated workflow
		const updateData = {
			nodes: newNodes,
			connections: newConnections,
		};

		// Update the workflow
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, updateData);
		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`Node count: ${updatedWorkflow.nodes.length} (removed Switch node)`);

		// Save the updated workflow structure for inspection
		const filename = `restored-linear-workflow-${updatedWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(updatedWorkflow, null, 2));
		console.log(`\nSaved restored workflow structure to: ${filename}`);

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
		console.error('Error removing Switch node:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting restoration of Simple Linear Workflow...');

		const workflow = await removeSwitchNode();

		console.log('\nWorkflow restored successfully!');
		console.log('Removed the Switch node and reconnected Set Status directly to Process Data.');
		console.log('Please check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Restoration failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
