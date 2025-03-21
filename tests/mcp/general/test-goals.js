#!/usr/bin/env node

/**
 * N8N Test Goals
 *
 * This script implements a series of tests for n8n workflow operations:
 * 1. Create a single node
 * 2. Create two nodes strung together
 * 3. Update an existing workflow with an additional attached node at the end
 * 4. Update an existing workflow with an additional attached node in the middle
 * 5. Add a separate path within the same workflow
 * 6. Create a variety of key nodes in a workflow to understand how to use those important nodes
 * 7. A branch with two variations of the path based on a condition
 * 8. Triggering the workflow to run
 * 9. Adding a variable to a separate file and triggering the workflow to run with that variable
 * 10. Editing a workflow so that it triggers a second workflow
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

// ID of our Test HTTP Workflow
const TEST_WORKFLOW_ID = 'f5jNVRgWdDjTl3O0';

// Utility function to generate unique node IDs
function generateNodeId(type) {
	return `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Goal 1: Create a single node
 *
 * Adds a manual trigger node to the existing Test HTTP Workflow
 */
async function addSingleNode() {
	console.log('\n=== Goal 1: Create a single node ===');

	try {
		// First, get the current workflow
		const workflow = await manager.getWorkflow(TEST_WORKFLOW_ID);
		console.log(`Starting with workflow: ${workflow.name} (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes?.length || 0}`);

		// Create a manual trigger node
		const triggerNodeId = generateNodeId('trigger');
		const triggerNode = {
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			id: triggerNodeId,
			name: 'Start',
		};

		// Update the workflow with this node
		const nodes = workflow.nodes || [];
		nodes.push(triggerNode);

		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes,
		});

		console.log(`Updated workflow: ${updatedWorkflow.name}`);
		console.log(`New node count: ${updatedWorkflow.nodes.length}`);
		console.log(`Added node: ${triggerNode.name} (${triggerNode.id})`);

		return { workflow: updatedWorkflow, triggerNodeId };
	} catch (error) {
		console.error('Failed to add single node:', error.message);
		throw error;
	}
}

/**
 * Goal 2: Create two nodes strung together
 *
 * Adds an HTTP request node and connects it to the trigger node
 */
async function addConnectedNode(prevResult) {
	console.log('\n=== Goal 2: Create two nodes strung together ===');

	try {
		const { workflow, triggerNodeId } = prevResult;

		// Create an HTTP request node
		const httpNodeId = generateNodeId('http');
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
			id: httpNodeId,
			name: 'Get Todo',
		};

		// Add the node to the workflow
		const nodes = [...workflow.nodes, httpNode];

		// Create connections between trigger and HTTP node
		const connections = {
			[triggerNodeId]: {
				main: [
					[
						{
							node: httpNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Update the workflow
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			nodes,
			connections,
		});

		console.log(`Updated workflow with HTTP node`);
		console.log(`New node count: ${updatedWorkflow.nodes.length}`);
		console.log(`Connected ${updatedWorkflow.nodes[0].name} to ${httpNode.name}`);

		return { workflow: updatedWorkflow, triggerNodeId, httpNodeId };
	} catch (error) {
		console.error('Failed to add connected node:', error.message);
		throw error;
	}
}

/**
 * Run the test goals in sequence
 */
async function runTestGoals() {
	try {
		console.log('Starting N8N Test Goals');

		// Goal 1: Add a single node
		const goal1Result = await addSingleNode();

		// Goal 2: Add a connected node
		const goal2Result = await addConnectedNode(goal1Result);

		// More goals will be implemented in subsequent versions

		console.log('\nTest goals completed successfully!');
	} catch (error) {
		console.error('Test goals failed:', error.message);
		console.error(error.stack);
	}
}

// Run the tests
runTestGoals();
