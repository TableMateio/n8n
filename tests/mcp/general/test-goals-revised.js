#!/usr/bin/env node

/**
 * N8N Test Goals - Revised with better node connectivity
 *
 * This script implements a series of tests for n8n workflow operations
 * with improved node connectivity handling.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');

// Configuration
const config = {
	url: 'https://127.0.0.1:5678',
	apiKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
};

// Create a workflow manager instance
const manager = new WorkflowManager(config.url, config.apiKey);

// Create a fresh workflow for our tests
async function createTestWorkflow() {
	console.log('\n=== Creating a fresh test workflow ===');

	try {
		// Create a new workflow
		const workflow = await manager.createWorkflow('Connection Test Workflow', [], {});
		console.log(`Created new workflow: ${workflow.name} (ID: ${workflow.id})`);
		return workflow;
	} catch (error) {
		console.error('Failed to create test workflow:', error.message);
		throw error;
	}
}

/**
 * Create a single node
 */
async function addTriggerNode(workflow) {
	console.log('\n=== Adding trigger node ===');

	try {
		// Create a manual trigger node
		const triggerNode = {
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			id: 'triggerNode', // Use a fixed, simple ID for clarity
			name: 'Start',
		};

		// Add to the workflow
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes: [triggerNode],
			connections: {},
		});

		console.log(`Added trigger node to workflow`);
		console.log(`Node count: ${updatedWorkflow.nodes.length}`);

		// Log the actual node ID that n8n assigned
		const actualTriggerNode = updatedWorkflow.nodes.find((node) => node.name === 'Start');
		console.log(`Actual trigger node ID: ${actualTriggerNode.id}`);

		return { workflow: updatedWorkflow, triggerNodeId: actualTriggerNode.id };
	} catch (error) {
		console.error('Failed to add trigger node:', error.message);
		throw error;
	}
}

/**
 * Add an HTTP request node and connect it to the trigger
 */
async function addConnectedHttpNode(workflowData) {
	console.log('\n=== Adding HTTP node connected to trigger ===');

	try {
		const { workflow, triggerNodeId } = workflowData;

		// Create HTTP node
		const httpNode = {
			parameters: {
				url: 'https://jsonplaceholder.typicode.com/todos/1',
				method: 'GET',
				authentication: 'none',
				responseFormat: 'json',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [450, 300],
			id: 'httpNode', // Use a fixed, simple ID for clarity
			name: 'Get Todo',
		};

		// Get existing nodes and add the new one
		const nodes = [...workflow.nodes, httpNode];

		// Create explicit connections
		const connections = {
			[triggerNodeId]: {
				main: [
					[
						{
							node: 'httpNode',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Update the workflow
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes: nodes,
			connections: connections,
		});

		console.log(`Added HTTP node and connected it to trigger node`);
		console.log(`Node count: ${updatedWorkflow.nodes.length}`);

		// Log all node IDs for reference
		updatedWorkflow.nodes.forEach((node) => {
			console.log(`Node: ${node.name}, ID: ${node.id}`);
		});

		// Log connections for debugging
		console.log('Connections:', JSON.stringify(updatedWorkflow.connections, null, 2));

		return {
			workflow: updatedWorkflow,
			triggerNodeId,
			httpNodeId: updatedWorkflow.nodes.find((node) => node.name === 'Get Todo').id,
		};
	} catch (error) {
		console.error('Failed to add HTTP node:', error.message);
		throw error;
	}
}

/**
 * Add a Set node at the end of the workflow
 */
async function addNodeAtEnd(workflowData) {
	console.log('\n=== Adding a Set node at the end of the workflow ===');

	try {
		const { workflow, triggerNodeId, httpNodeId } = workflowData;

		// Create a Set node
		const setNode = {
			parameters: {
				values: {
					string: [
						{
							name: 'status',
							value: 'completed',
						},
					],
				},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [650, 300],
			id: 'setNode',
			name: 'Set Status',
		};

		// Add to existing nodes
		const nodes = [...workflow.nodes, setNode];

		// Create connections, preserving existing ones
		// We need to make sure we're referring to the actual node IDs
		const connections = {
			...workflow.connections, // Keep existing connections
			[httpNodeId]: {
				main: [
					[
						{
							node: 'setNode',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Update the workflow
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes: nodes,
			connections: connections,
		});

		console.log(`Added Set node at the end of the workflow`);
		console.log(`Node count: ${updatedWorkflow.nodes.length}`);

		// Log connections for debugging
		console.log('Connections:', JSON.stringify(updatedWorkflow.connections, null, 2));

		return {
			workflow: updatedWorkflow,
			triggerNodeId,
			httpNodeId,
			setNodeId: updatedWorkflow.nodes.find((node) => node.name === 'Set Status').id,
		};
	} catch (error) {
		console.error('Failed to add Set node:', error.message);
		throw error;
	}
}

/**
 * Run the test goals
 */
async function runTest() {
	try {
		console.log('Starting revised N8N connection test');

		// Create a fresh workflow
		const workflow = await createTestWorkflow();

		// Add trigger node
		const withTrigger = await addTriggerNode(workflow);

		// Add HTTP node connected to trigger
		const withHttp = await addConnectedHttpNode(withTrigger);

		// Add Set node at the end
		const withSet = await addNodeAtEnd(withHttp);

		console.log('\nTest completed successfully!');
		console.log(
			`Created workflow "${withSet.workflow.name}" with ${withSet.workflow.nodes.length} connected nodes`,
		);
		console.log(`Please refresh your n8n browser tab to see the changes.`);
	} catch (error) {
		console.error('Test failed:', error.message);
		console.error(error.stack);
	}
}

// Run the tests
runTest();
