#!/usr/bin/env node

/**
 * Test script for creating a workflow with WorkflowManager
 */

// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');

// Configuration
const config = {
	url: 'https://127.0.0.1:5678',
	apiKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
};

/**
 * Create a workflow that fetches data from JSONPlaceholder and processes it
 */
async function createJsonPlaceholderWorkflow() {
	try {
		const manager = new WorkflowManager(config.url, config.apiKey);

		// Generate node IDs
		const nodeIds = {
			trigger: `trigger_${Date.now()}`,
			http: `http_${Date.now() + 1}`,
			code: `code_${Date.now() + 2}`,
			set: `set_${Date.now() + 3}`,
		};

		// Create nodes
		const triggerNode = {
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			id: nodeIds.trigger,
			name: 'When clicking "Execute Workflow"',
		};

		const httpNode = {
			parameters: {
				url: 'https://jsonplaceholder.typicode.com/posts/1',
				method: 'GET',
				authentication: 'none',
				responseFormat: 'json',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [220, 0],
			id: nodeIds.http,
			name: 'Fetch Post Data',
		};

		const codeNode = {
			parameters: {
				jsCode: `
// Input data will be available in the "items" variable
const firstItem = items[0].json;

// Add some processing
firstItem.processedTitle = firstItem.title.toUpperCase();
firstItem.wordCount = firstItem.body.split(' ').length;
firstItem.processed = true;
firstItem.processedAt = new Date().toISOString();

// Always return items
return items;`,
			},
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [440, 0],
			id: nodeIds.code,
			name: 'Process Data',
		};

		const setNode = {
			parameters: {
				values: {
					string: [
						{
							name: 'status',
							value: 'success',
						},
					],
					number: [
						{
							name: 'statusCode',
							value: 200,
						},
					],
				},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [660, 0],
			id: nodeIds.set,
			name: 'Set Status',
		};

		// Define connections
		const connections = {
			[nodeIds.trigger]: {
				main: [[{ node: nodeIds.http, type: 'main', index: 0 }]],
			},
			[nodeIds.http]: {
				main: [[{ node: nodeIds.code, type: 'main', index: 0 }]],
			},
			[nodeIds.code]: {
				main: [[{ node: nodeIds.set, type: 'main', index: 0 }]],
			},
		};

		// Create workflow
		console.log('Creating new workflow...');
		const workflow = await manager.createWorkflow(
			'Process JSONPlaceholder Data',
			[triggerNode, httpNode, codeNode, setNode],
			connections,
		);

		console.log('Workflow created successfully:');
		console.log(`Name: ${workflow.name}`);
		console.log(`ID: ${workflow.id}`);
		console.log(`Nodes: ${workflow.nodes.length}`);

		return workflow;
	} catch (error) {
		console.error('Error creating workflow:', error.message);
		throw error;
	}
}

// Run the example
createJsonPlaceholderWorkflow()
	.then(() => console.log('Done!'))
	.catch((error) => console.error('Failed:', error));
