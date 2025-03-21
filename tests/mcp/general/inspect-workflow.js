#!/usr/bin/env node

/**
 * Inspect N8N Workflow Structure
 *
 * This script retrieves a workflow and dumps its entire structure
 * to help debug issues with workflow creation and updating.
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
 * Inspects a workflow structure
 */
async function inspectWorkflow(workflowId) {
	try {
		console.log(`Retrieving workflow with ID: ${workflowId}...`);

		// Get the workflow
		const workflow = await manager.getWorkflow(workflowId);

		console.log(`\nWorkflow found: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Active: ${workflow.active}`);
		console.log(`Node count: ${workflow.nodes.length}`);

		// Save the full workflow structure to a file
		const filename = `workflow-${workflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(workflow, null, 2));
		console.log(`\nSaved full workflow structure to: ${filename}`);

		// Log key workflow properties
		console.log('\nWorkflow Properties:');
		const keyProperties = Object.keys(workflow).filter(
			(key) => !['nodes', 'connections'].includes(key),
		);
		keyProperties.forEach((prop) => {
			console.log(
				`- ${prop}: ${typeof workflow[prop] === 'object' ? JSON.stringify(workflow[prop]) : workflow[prop]}`,
			);
		});

		// Log node details
		console.log('\nNode Details:');
		workflow.nodes.forEach((node) => {
			console.log(`\n- Node: ${node.name} (ID: ${node.id})`);
			console.log(`  Type: ${node.type}, TypeVersion: ${node.typeVersion}`);
			console.log(`  Position: [${node.position.join(', ')}]`);

			// Log node parameters if present
			if (Object.keys(node.parameters || {}).length > 0) {
				console.log(
					'  Parameters:',
					JSON.stringify(node.parameters, null, 2).substring(0, 100) + '...',
				);
			}
		});

		// Log connection structure
		console.log('\nConnection Structure:');
		const connectionTypes = new Set();
		Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
			Object.keys(connections).forEach((type) => connectionTypes.add(type));

			if (connections.main) {
				connections.main.forEach((outputs, outputIndex) => {
					outputs.forEach((connection) => {
						const sourceNode = workflow.nodes.find((n) => n.id === sourceId) || { name: sourceId };
						const targetNode = workflow.nodes.find((n) => n.id === connection.node) || {
							name: connection.node,
						};

						console.log(
							`- ${sourceNode.name || sourceId} -> ${targetNode.name || connection.node} (output ${outputIndex} to input ${connection.index})`,
						);
					});
				});
			}
		});

		console.log('\nConnection Types Found:', Array.from(connectionTypes));

		console.log('\nInspection complete! Check the JSON file for complete details.');
		return workflow;
	} catch (error) {
		console.error('Error inspecting workflow:', error.message);
		throw error;
	}
}

/**
 * List all workflows
 */
async function listWorkflows() {
	try {
		console.log('Listing all workflows...');

		// List workflows
		const workflows = await manager.listWorkflows();

		console.log(`\nFound ${workflows.length} workflows:`);
		workflows.forEach((workflow, index) => {
			console.log(
				`${index + 1}. ${workflow.name} (ID: ${workflow.id}, Active: ${workflow.active})`,
			);
		});

		return workflows;
	} catch (error) {
		console.error('Error listing workflows:', error.message);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		// First list all workflows
		const workflows = await listWorkflows();

		// Check if a workflow ID was provided as a command line argument
		const workflowId = process.argv[2];

		if (workflowId) {
			// If a specific workflow ID was provided, inspect it
			await inspectWorkflow(workflowId);
		} else if (workflows.length > 0) {
			// Otherwise, inspect the most recently created workflow
			// Sort workflows by creation date (descending)
			const sortedWorkflows = [...workflows].sort((a, b) => {
				return new Date(b.createdAt) - new Date(a.createdAt);
			});

			// Get the most recent one
			const mostRecentWorkflow = sortedWorkflows[0];
			console.log(
				`\nNo workflow ID provided. Inspecting most recent workflow: "${mostRecentWorkflow.name}" (${mostRecentWorkflow.id})`,
			);

			await inspectWorkflow(mostRecentWorkflow.id);
		} else {
			console.log('\nNo workflows found in your n8n instance.');
		}
	} catch (error) {
		console.error('Inspection failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
