#!/usr/bin/env node

/**
 * Create Basic N8N Workflow
 *
 * This script creates the simplest possible workflow with just two nodes
 * to establish a baseline of what works correctly.
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

/**
 * Utility to display a highly visible refresh notification
 */
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

/**
 * Creates the most basic workflow possible to establish a baseline
 */
async function createBasicWorkflow() {
	try {
		// Define the most basic workflow with just a trigger and HTTP request
		const workflow = {
			name: 'Basic Test Workflow',
			nodes: [
				{
					parameters: {},
					id: '3fa0917e-ae9c-4e6e-af8b-d24a4a125d0c', // Using fixed IDs from example
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
				},
				{
					parameters: {
						url: 'https://jsonplaceholder.typicode.com/todos/1',
						options: {},
					},
					id: '8f37a7d2-2424-4a30-b9d2-2cd448fa2299', // Using fixed IDs from example
					name: 'Get Todo',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [450, 300],
				},
			],
			connections: {
				// Including BOTH ID-based and name-based connections to match example
				'3fa0917e-ae9c-4e6e-af8b-d24a4a125d0c': {
					main: [
						[
							{
								node: '8f37a7d2-2424-4a30-b9d2-2cd448fa2299',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				Start: {
					main: [
						[
							{
								node: 'Get Todo',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
			active: false,
			settings: {
				executionOrder: 'v1',
			},
			// Include additional properties from the example JSON
			meta: {
				instanceId: '4dba8cd386ae3944b2fc7eaa8a1fd4bf66504415151768c62f3b476b5123f76d',
			},
			tags: [],
		};

		// Create the workflow
		console.log('Creating the most basic workflow possible...');
		const createdWorkflow = await manager.createWorkflow(
			workflow.name,
			workflow.nodes,
			workflow.connections,
		);

		// Log the full created workflow for debugging
		console.log('Created workflow ID:', createdWorkflow.id);
		console.log('Created workflow has', createdWorkflow.nodes.length, 'nodes');

		// Let's retrieve the workflow to see exactly what n8n stored
		console.log('\nRetrieving the workflow to examine its structure...');
		const retrievedWorkflow = await manager.getWorkflow(createdWorkflow.id);

		// Log key properties to examine the structure
		console.log('Retrieved workflow name:', retrievedWorkflow.name);
		console.log('Retrieved workflow ID:', retrievedWorkflow.id);
		console.log('Retrieved node count:', retrievedWorkflow.nodes.length);

		// Log node IDs and names
		console.log('\nNode details:');
		retrievedWorkflow.nodes.forEach((node) => {
			console.log(`- Node: ${node.name}, ID: ${node.id}, Type: ${node.type}`);
		});

		// Log connection details
		console.log('\nConnection details:');
		Object.entries(retrievedWorkflow.connections).forEach(([sourceId, connections]) => {
			if (connections.main) {
				connections.main.forEach((outputs, outputIndex) => {
					outputs.forEach((connection) => {
						console.log(
							`- ${sourceId} -> ${connection.node} (output ${outputIndex} to input ${connection.index})`,
						);
					});
				});
			}
		});

		showRefreshNotification();

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating basic workflow:', error.message);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of a minimal baseline workflow...');

		const workflow = await createBasicWorkflow();

		console.log('\nBasic workflow created successfully!');
		console.log('This minimal workflow should establish what structure works properly.');
		console.log('Please check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
