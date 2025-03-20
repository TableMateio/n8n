/**
 * This script helps debug different Airtable filter formula formats
 * to find the correct one that works with n8n Airtable nodes
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');

// Reference the Airtable IDs
const AIRTABLE = {
	BASE_ID: 'appWxxzsTHMY0MZHu',
	TABLES: {
		AUCTIONS: 'tblteK8SeHqZ8xQxV',
	},
	FIELD_IDS: {
		AUCTION: {
			PRIMARY_FIELD: 'fld7zoOS3uQg4tiyh',
		},
	},
};

async function testFilterFormats() {
	console.log('Testing different filter formula formats for Airtable nodes...');

	// Initialize workflow manager with proper parameters
	const workflowManager = new WorkflowManager(
		'https://127.0.0.1:5678',
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
	);

	// Create a test workflow with multiple Airtable nodes testing different filter formats
	const testWorkflow = {
		name: 'Airtable Filter Formula Test',
		nodes: [
			// Manual trigger node
			{
				parameters: {},
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
			},
			// Set sample auction ID
			{
				parameters: {
					mode: 'manual',
					includeOtherFields: true,
					include: 'all',
					assignments: {
						assignments: [
							{
								name: 'auction_id',
								type: 'string',
								value: '24-10-onondaga-ny',
							},
						],
					},
				},
				name: 'Set Sample Auction ID',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [450, 300],
			},
			// Test 1: Format with string literals
			{
				parameters: {
					operation: 'search',
					base: {
						__rl: true,
						value: AIRTABLE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}/${AIRTABLE.TABLES.AUCTIONS}`,
					},
					filterByFormula: "{fld7zoOS3uQg4tiyh} = '24-10-onondaga-ny'",
					options: {},
				},
				name: 'Test 1: Static Value',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 200],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
			},
			// Test 2: Format with expression
			{
				parameters: {
					operation: 'search',
					base: {
						__rl: true,
						value: AIRTABLE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}/${AIRTABLE.TABLES.AUCTIONS}`,
					},
					filterByFormula: "{fld7zoOS3uQg4tiyh} = '{{$json.auction_id}}'",
					options: {},
				},
				name: 'Test 2: Expression',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 300],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
			},
			// Test 3: Format with quoted expression
			{
				parameters: {
					operation: 'search',
					base: {
						__rl: true,
						value: AIRTABLE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}/${AIRTABLE.TABLES.AUCTIONS}`,
					},
					filterByFormula: `\"{fld7zoOS3uQg4tiyh} = '{{$json.auction_id}}'\"`,
					options: {},
				},
				name: 'Test 3: Quoted Formula',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 400],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
			},
			// Test 4: Format using =SEARCH() formula
			{
				parameters: {
					operation: 'search',
					base: {
						__rl: true,
						value: AIRTABLE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}/${AIRTABLE.TABLES.AUCTIONS}`,
					},
					filterByFormula: `SEARCH("{{$json.auction_id}}", {fld7zoOS3uQg4tiyh})`,
					options: {},
				},
				name: 'Test 4: SEARCH Function',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 500],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
			},
			// Test 5: Format with direct n8n formula
			{
				parameters: {
					operation: 'search',
					base: {
						__rl: true,
						value: AIRTABLE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}/${AIRTABLE.TABLES.AUCTIONS}`,
					},
					filterByFormula: `="FIND('24-10-onondaga-ny', {fld7zoOS3uQg4tiyh})"`,
					options: {},
				},
				name: 'Test 5: Direct Formula',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 600],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [
					[
						{
							node: 'Set Sample Auction ID',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Set Sample Auction ID': {
				main: [
					[
						{
							node: 'Test 1: Static Value',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 2: Expression',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 3: Quoted Formula',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 4: SEARCH Function',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 5: Direct Formula',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		},
	};

	try {
		// Create the test workflow
		console.log('Creating test workflow...');
		const createdWorkflow = await workflowManager.createWorkflow(
			testWorkflow.name,
			testWorkflow.nodes,
			testWorkflow.connections,
		);

		console.log(`Test workflow created with ID: ${createdWorkflow.id}`);
		console.log('Please open this workflow in the n8n UI and test which filter format works best.');
		console.log('Workflow URL: https://127.0.0.1:5678/workflow/' + createdWorkflow.id);

		// Save the workflow details to file
		const filePath = path.join(__dirname, 'airtable-filter-test-workflow.json');
		fs.writeFileSync(filePath, JSON.stringify(createdWorkflow, null, 2));
		console.log(`Test workflow saved to: ${filePath}`);

		return createdWorkflow.id;
	} catch (error) {
		console.error('Error creating test workflow:', error);
	}
}

// Execute the function
testFilterFormats().catch((error) => {
	console.error('Error running the script:', error);
});
