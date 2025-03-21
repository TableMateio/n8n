#!/usr/bin/env node

/**
 * Fix Workflow Connections
 *
 * This script repairs the connections in our Airtable configuration workflows.
 * It addresses two issues:
 * 1. Connections not being properly formed in n8n
 * 2. Manual trigger node not working correctly
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
 * Fix a workflow's connections and manual trigger
 */
async function fixWorkflow(workflowId, workflowName) {
	try {
		console.log(`Starting to fix workflow: "${workflowName}" (ID: ${workflowId})`);

		// Get the current workflow
		const workflow = await manager.getWorkflow(workflowId);

		if (!workflow) {
			throw new Error(`Workflow with ID ${workflowId} not found`);
		}

		// Fix the manual trigger node if it exists
		const updatedNodes = workflow.nodes.map((node) => {
			// Fix the manual trigger node
			if (node.type === 'n8n-nodes-base.manualTrigger') {
				return {
					...node,
					typeVersion: 1,
					parameters: {},
				};
			}
			return node;
		});

		// Build node connections properly - this is the key fix
		// n8n requires connections by both ID and name
		const updatedConnections = {};

		// Add ID-based connections
		Object.entries(workflow.connections || {}).forEach(([sourceNodeId, connectionData]) => {
			updatedConnections[sourceNodeId] = connectionData;

			// Find the node with this ID to get its name
			const sourceNode = workflow.nodes.find((node) => node.id === sourceNodeId);
			if (sourceNode && sourceNode.name) {
				// Also add a name-based connection entry
				updatedConnections[sourceNode.name] = connectionData;
			}
		});

		// Create connections based on node names as well
		workflow.nodes.forEach((sourceNode) => {
			const sourceNodeId = sourceNode.id;
			const sourceNodeName = sourceNode.name;

			// Skip if this node has no outgoing connections
			if (!workflow.connections?.[sourceNodeId]?.main?.[0]?.length) return;

			// Get connections for this source node
			const nodeConnections = workflow.connections[sourceNodeId].main;

			// Create the named entry if it doesn't exist
			if (!updatedConnections[sourceNodeName]) {
				updatedConnections[sourceNodeName] = { main: [] };
			}

			// Add connections by name
			nodeConnections.forEach((outputConnections, outputIndex) => {
				if (!updatedConnections[sourceNodeName].main[outputIndex]) {
					updatedConnections[sourceNodeName].main[outputIndex] = [];
				}

				outputConnections.forEach((conn) => {
					// Find target node name from its ID
					const targetNode = workflow.nodes.find((node) => node.id === conn.node);
					if (targetNode && targetNode.name) {
						// Add a connection using the node name instead of ID
						updatedConnections[sourceNodeName].main[outputIndex].push({
							node: targetNode.name,
							type: conn.type,
							index: conn.index,
						});
					}
				});
			});
		});

		// Update the workflow
		const updatedWorkflow = {
			...workflow,
			nodes: updatedNodes,
			connections: updatedConnections,
		};

		// Update the workflow in n8n
		await manager.updateWorkflow(workflowId, updatedWorkflow);

		console.log(`Successfully fixed workflow: "${workflowName}"`);
		return true;
	} catch (error) {
		console.error(`Error fixing workflow ${workflowName}:`, error.message);
		console.error(error.stack);
		return false;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting workflow connection fixes...');

		// Fix the main Airtable workflow
		const mainResult = await fixWorkflow(
			'SlR4PULINjXn4p11', // The full Airtable workflow ID
			'Dynamic Airtable Configuration',
		);

		// Fix the simplified Airtable workflow
		const simpleResult = await fixWorkflow(
			'u6oc3b67KOxFoK9p', // The simplified Airtable workflow ID
			'Simple Airtable Config Example',
		);

		if (mainResult && simpleResult) {
			console.log('\nSuccessfully fixed all workflow connections');
			console.log('\nTo test the fixed workflows:');
			console.log('1. Go to the n8n UI and refresh');
			console.log('2. Open either of the Airtable configuration workflows');
			console.log('3. The Manual Trigger should now work correctly');
			console.log('4. No need to manually connect the nodes anymore');

			console.log('\n' + '='.repeat(50));
			console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
			console.log('='.repeat(50) + '\n');
		} else {
			console.error('Failed to fix one or both workflows');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
