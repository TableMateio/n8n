#!/usr/bin/env node

/**
 * N8N Workflow Layout Adjustment
 *
 * This script adjusts the positions of nodes in the workflow
 * to create a better visual layout with proper spacing.
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

// Workflow ID to update
const WORKFLOW_ID = 'f5jNVRgWdDjTl3O0'; // Test HTTP Workflow

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
 * Adjusts the positions of nodes in the workflow for better spacing
 */
async function adjustNodeLayout() {
	try {
		console.log(`Fetching workflow with ID: ${WORKFLOW_ID}`);

		// First, get the current workflow
		const workflow = await manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes.length}`);

		// Map nodes by name for easier reference
		const nodeMap = workflow.nodes.reduce((map, node) => {
			map[node.name] = node;
			return map;
		}, {});

		// Define the node order sequence
		const nodeSequence = [
			'Start', // Manual trigger node
			'Get Todo', // HTTP Request node
			'Transform Data', // Function node
			'Set Status', // Set node
			'Process Data', // Code node
		];

		// Define the optimal spacing between nodes
		const X_SPACING = 250; // Horizontal spacing between nodes
		const BASE_X = 240; // Starting X position
		const BASE_Y = 300; // Base Y position (vertical position of the main flow)

		// Create updated nodes with adjusted positions
		const updatedNodes = workflow.nodes.map((node) => {
			// Find the position in the sequence
			const sequenceIndex = nodeSequence.indexOf(node.name);

			if (sequenceIndex >= 0) {
				// Calculate new position based on sequence
				const newX = BASE_X + sequenceIndex * X_SPACING;
				return {
					...node,
					position: [newX, BASE_Y],
				};
			}

			// For nodes not in the main sequence, keep original position
			return node;
		});

		// Update the workflow with adjusted node positions
		// The connections remain the same
		console.log('Updating workflow with adjusted node positions...');
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes: updatedNodes,
			connections: workflow.connections,
		});

		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);

		// Print the original and updated positions for comparison
		console.log('\nNode position adjustments:');
		workflow.nodes.forEach((originalNode) => {
			const updatedNode = updatedNodes.find((n) => n.id === originalNode.id);
			console.log(
				`- ${originalNode.name}: ${JSON.stringify(originalNode.position)} -> ${JSON.stringify(updatedNode.position)}`,
			);
		});

		showRefreshNotification();

		return updatedWorkflow;
	} catch (error) {
		console.error('Error adjusting node layout:', error.message);
		throw error;
	}
}

/**
 * Run the layout adjustment
 */
async function run() {
	try {
		console.log('Starting workflow layout adjustment...');

		const workflow = await adjustNodeLayout();

		console.log('\nWorkflow layout adjusted successfully!');
		console.log('The nodes have been repositioned for better visual spacing.');
		console.log('IMPORTANT: Please refresh your browser to see the updated layout!');

		showRefreshNotification();
	} catch (error) {
		console.error('Layout adjustment failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
