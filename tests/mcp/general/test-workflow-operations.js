#!/usr/bin/env node

/**
 * Advanced workflow operations test
 *
 * This script demonstrates the following operations:
 * 1. Creating a basic workflow
 * 2. Adding nodes to an existing workflow
 * 3. Connecting nodes in different ways
 * 4. Updating a workflow
 * 5. Activating and deactivating a workflow
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

// Utility function to generate unique node IDs
function generateNodeId(type) {
	return `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// Create a workflow manager instance
const manager = new WorkflowManager(config.url, config.apiKey);

/**
 * Step 1: Create a basic workflow with just a manual trigger
 */
async function createBasicWorkflow() {
	console.log('Step 1: Creating a basic workflow with just a manual trigger');

	const triggerNodeId = generateNodeId('trigger');

	const triggerNode = {
		parameters: {},
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [250, 300],
		id: triggerNodeId,
		name: 'Start Workflow',
	};

	const workflow = await manager.createWorkflow('Advanced Workflow Test', [triggerNode], {});

	console.log(`Created workflow: ${workflow.name} (ID: ${workflow.id})`);
	console.log(`Initial node count: ${workflow.nodes.length}`);

	return { workflow, triggerNodeId };
}

/**
 * Step 2: Add nodes to the workflow
 */
async function addNodesToWorkflow(workflow, triggerNodeId) {
	console.log('\nStep 2: Adding nodes to the workflow');

	// Generate node IDs
	const httpNodeId = generateNodeId('http');
	const splitNodeId = generateNodeId('splitInBatches');
	const setNode1Id = generateNodeId('set1');
	const setNode2Id = generateNodeId('set2');
	const mergeNodeId = generateNodeId('merge');

	// Create HTTP Request node
	const httpNode = {
		parameters: {
			url: 'https://jsonplaceholder.typicode.com/users',
			method: 'GET',
			authentication: 'none',
			responseFormat: 'json',
		},
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [450, 300],
		id: httpNodeId,
		name: 'Fetch Users',
	};

	// Create Split In Batches node (to demonstrate branching)
	const splitNode = {
		parameters: {
			batchSize: 5,
			options: {},
		},
		type: 'n8n-nodes-base.splitInBatches',
		typeVersion: 1,
		position: [650, 300],
		id: splitNodeId,
		name: 'Split Users',
	};

	// Create Set node for first branch
	const setNode1 = {
		parameters: {
			values: {
				string: [
					{
						name: 'branch',
						value: 'first_batch',
					},
				],
			},
		},
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [850, 200],
		id: setNode1Id,
		name: 'Process First Batch',
	};

	// Create Set node for second branch
	const setNode2 = {
		parameters: {
			values: {
				string: [
					{
						name: 'branch',
						value: 'next_batch',
					},
				],
			},
		},
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [850, 400],
		id: setNode2Id,
		name: 'Process Next Batch',
	};

	// Create Merge node
	const mergeNode = {
		parameters: {},
		type: 'n8n-nodes-base.merge',
		typeVersion: 2,
		position: [1050, 300],
		id: mergeNodeId,
		name: 'Merge Results',
	};

	// Add all nodes to the workflow
	const nodes = [...workflow.nodes, httpNode, splitNode, setNode1, setNode2, mergeNode];

	// Update the workflow with new nodes
	const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
		name: workflow.name,
		nodes,
		connections: workflow.connections || {},
		settings: workflow.settings || { executionOrder: 'v1' },
	});

	console.log(`Added nodes. New node count: ${updatedWorkflow.nodes.length}`);

	return {
		workflow: updatedWorkflow,
		nodeIds: {
			trigger: triggerNodeId,
			http: httpNodeId,
			split: splitNodeId,
			set1: setNode1Id,
			set2: setNode2Id,
			merge: mergeNodeId,
		},
	};
}

/**
 * Step 3: Connect the nodes
 */
async function connectNodes(workflow, nodeIds) {
	console.log('\nStep 3: Connecting nodes');

	// Create connections object
	const connections = {
		// Connect trigger to HTTP request
		[nodeIds.trigger]: {
			main: [
				[
					{
						node: nodeIds.http,
						type: 'main',
						index: 0,
					},
				],
			],
		},
		// Connect HTTP to Split
		[nodeIds.http]: {
			main: [
				[
					{
						node: nodeIds.split,
						type: 'main',
						index: 0,
					},
				],
			],
		},
		// Connect Split to both Set nodes
		[nodeIds.split]: {
			main: [
				[
					{
						node: nodeIds.set1,
						type: 'main',
						index: 0,
					},
				],
			],
			options: [
				[
					{
						node: nodeIds.set2,
						type: 'main',
						index: 0,
					},
				],
			],
		},
		// Connect both Set nodes to Merge
		[nodeIds.set1]: {
			main: [
				[
					{
						node: nodeIds.merge,
						type: 'main',
						index: 0,
					},
				],
			],
		},
		[nodeIds.set2]: {
			main: [
				[
					{
						node: nodeIds.merge,
						type: 'main',
						index: 1,
					},
				],
			],
		},
	};

	// Update the workflow with connections, being careful to only include allowed properties
	const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
		name: workflow.name,
		nodes: workflow.nodes,
		connections: connections,
		settings: workflow.settings || { executionOrder: 'v1' },
	});

	console.log('Connections created successfully');

	return updatedWorkflow;
}

/**
 * Step 4: Update the workflow name and settings
 */
async function updateWorkflowSettings(workflow) {
	console.log('\nStep 4: Updating workflow name and settings');

	// Get the current settings to ensure we don't add properties that aren't allowed
	const currentSettings = workflow.settings || { executionOrder: 'v1' };

	// Only include the properties we want to update
	const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
		name: `${workflow.name} - Updated`,
		settings: {
			...currentSettings,
			// Only include properties that are known to be valid
			executionOrder: 'v1',
		},
	});

	console.log(`Updated workflow name to: ${updatedWorkflow.name}`);
	console.log('Updated workflow settings');

	return updatedWorkflow;
}

/**
 * Step 5: Attempt to activate and deactivate the workflow
 * Note: This may fail if the workflow doesn't have a proper trigger node
 */
async function toggleWorkflowActivation(workflow) {
	console.log('\nStep 5: Testing activation/deactivation');

	try {
		// Attempt to activate
		console.log('Attempting to activate workflow...');
		const activatedWorkflow = await manager.activateWorkflow(workflow.id);
		console.log(`Workflow active: ${activatedWorkflow.active}`);

		// Wait a moment
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Deactivate
		console.log('Deactivating workflow...');
		const deactivatedWorkflow = await manager.deactivateWorkflow(workflow.id);
		console.log(`Workflow active: ${deactivatedWorkflow.active}`);

		return deactivatedWorkflow;
	} catch (error) {
		console.log(`Activation failed as expected: ${error.message}`);
		console.log("This is normal if the workflow doesn't have a proper trigger node.");

		// Return the original workflow since we couldn't activate/deactivate
		return workflow;
	}
}

/**
 * Run all steps in sequence
 */
async function runTest() {
	try {
		console.log('=== Starting Advanced Workflow Operations Test ===\n');

		// Step 1: Create basic workflow
		const { workflow, triggerNodeId } = await createBasicWorkflow();

		// Step 2: Add nodes
		const { workflow: updatedWorkflow, nodeIds } = await addNodesToWorkflow(
			workflow,
			triggerNodeId,
		);

		// Step 3: Connect nodes
		const connectedWorkflow = await connectNodes(updatedWorkflow, nodeIds);

		// Step 4: Update workflow settings
		const configuredWorkflow = await updateWorkflowSettings(connectedWorkflow);

		// Step 5: Test activation
		const finalWorkflow = await toggleWorkflowActivation(configuredWorkflow);

		console.log('\n=== Test completed successfully ===');
		console.log(`Final workflow: ${finalWorkflow.name} (ID: ${finalWorkflow.id})`);
		console.log(`Contains ${finalWorkflow.nodes.length} nodes`);

		// List all workflows as a final check
		const allWorkflows = await manager.listWorkflows();
		console.log(`\nTotal workflows in n8n: ${allWorkflows.length}`);
	} catch (error) {
		console.error('Test failed:', error.message);
		console.error(error.stack);
	}
}

// Run the test
runTest();
