/**
 * This script tests using field names in Airtable filter formulas instead of field IDs
 * since Airtable formulas expect field names, not IDs
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');
const AIRTABLE_REFERENCE = require('../../scripts/airtable-reference');

async function testFieldNameFilters() {
	console.log('Testing Airtable filter formulas with field names instead of IDs...');

	// Initialize workflow manager
	const workflowManager = new WorkflowManager(
		'https://127.0.0.1:5678',
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
	);

	// Create a test workflow with two Airtable nodes - one using field ID and one using field name
	const testWorkflow = {
		name: 'Airtable Field Name vs ID Test',
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
			// Test 1: Using Field ID (doesn't work)
			{
				parameters: {
					operation: 'search',
					resource: 'record',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: AIRTABLE_REFERENCE.BASE_NAME,
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.AUCTIONS}`,
					},
					filterByFormula: `{${AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD}} = '{{$json.auction_id}}'`,
					options: {},
				},
				name: 'Test 1: Using Field ID',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 200],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes: `This node attempts to search using the field ID: ${AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD}\nThis approach doesn't work because Airtable formulas expect field names, not IDs`,
			},
			// Test 2: Using Field Name (works)
			{
				parameters: {
					operation: 'search',
					resource: 'record',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: AIRTABLE_REFERENCE.BASE_NAME,
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.AUCTIONS}`,
					},
					filterByFormula: `{${AIRTABLE_REFERENCE.FIELD_NAMES.AUCTION[AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD]}} = '{{$json.auction_id}}'`,
					options: {},
				},
				name: 'Test 2: Using Field Name',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 300],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes: `This node searches using the field name: ${AIRTABLE_REFERENCE.FIELD_NAMES.AUCTION[AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD]}\nThis approach works because Airtable formulas expect field names, not IDs`,
			},
			// Test 3: Using Helper Method (works and is cleaner)
			{
				parameters: {
					operation: 'search',
					resource: 'record',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: AIRTABLE_REFERENCE.BASE_NAME,
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.AUCTIONS}`,
					},
					filterByFormula: AIRTABLE_REFERENCE.createFilterFormula(
						'AUCTION',
						AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD,
						'{{$json.auction_id}}',
					),
					options: {},
				},
				name: 'Test 3: Using Helper Method',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 400],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'This node uses the helper method createFilterFormula() to generate the formula\nThis is the recommended approach as it handles the field name lookup for you',
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
							node: 'Test 1: Using Field ID',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 2: Using Field Name',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 3: Using Helper Method',
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
		console.log('Please open this workflow in the n8n UI and test the different approaches');
		console.log('Workflow URL: https://127.0.0.1:5678/workflow/' + createdWorkflow.id);

		// Save the workflow details to file
		const filePath = path.join(__dirname, 'airtable-field-name-test-workflow.json');
		fs.writeFileSync(filePath, JSON.stringify(createdWorkflow, null, 2));
		console.log(`Test workflow saved to: ${filePath}`);

		return createdWorkflow.id;
	} catch (error) {
		console.error('Error creating test workflow:', error);
	}
}

// Execute the function
testFieldNameFilters().catch((error) => {
	console.error('Error running the script:', error);
});
