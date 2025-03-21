/**
 * This script demonstrates how to properly handle Airtable linked fields in n8n
 * It shows both incorrect approaches (searching by field name) and correct approaches (using record IDs)
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');
const AIRTABLE_REFERENCE = require('../../scripts/airtable-reference');

async function debugAirtableLinkedFields() {
	try {
		console.log('Creating test workflow to debug Airtable linked fields handling...');

		// Initialize workflow manager
		const workflowManager = new WorkflowManager(
			'https://127.0.0.1:5678',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
		);

		// Define test nodes
		const nodes = [
			// Manual Trigger
			{
				parameters: {},
				id: 'manual_trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
			},
			// Set Sample Auction ID
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
				id: 'set_sample_id',
				name: 'Set Sample Auction ID',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [450, 300],
			},
			// Get Auction Details (Same for both approaches)
			{
				parameters: {
					resource: 'record',
					operation: 'search',
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
					// Use field name in filter formula
					filterByFormula: `={Auction} = '{{$json.auction_id}}'`,
					options: {},
				},
				id: 'get_auction',
				name: 'Get Auction Details',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 300],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes: 'Gets the auction details by auction ID using a search operation',
			},
			// Debug Auction Output
			{
				parameters: {},
				id: 'debug_auction',
				name: 'Debug Auction Output',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [850, 200],
				notes:
					'View the JSON output of the auction details to see the structure - especially notice that the "County" field contains an array of record IDs',
			},
			// INCORRECT: Get County by Search with Field Name
			{
				parameters: {
					resource: 'record',
					operation: 'search',
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
						value: AIRTABLE_REFERENCE.TABLES.COUNTIES,
						mode: 'list',
						cachedResultName: 'Counties',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.COUNTIES}`,
					},
					// INCORRECT - This won't work because it's trying to match a field name with a record ID
					filterByFormula: `={County} = '{{$node["Get Auction Details"].json.County[0]}}'`,
					options: {},
				},
				id: 'county_incorrect',
				name: 'INCORRECT: Get County by Search',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [850, 300],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'THIS APPROACH IS INCORRECT - It tries to search for a county where the County field equals the record ID, which will not work',
			},
			// CORRECT: Get County by Record ID
			{
				parameters: {
					resource: 'record',
					operation: 'get',
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
						value: AIRTABLE_REFERENCE.TABLES.COUNTIES,
						mode: 'list',
						cachedResultName: 'Counties',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.COUNTIES}`,
					},
					// CORRECT - This will work because it uses the record ID directly
					id: '={{$node["Get Auction Details"].json.County[0]}}',
					options: {},
				},
				id: 'county_correct',
				name: 'CORRECT: Get County by Record ID',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [850, 450],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'THIS APPROACH IS CORRECT - It uses the "get" operation with the record ID directly to fetch the county record',
			},
			// Debug County Outputs
			{
				parameters: {},
				id: 'debug_counties',
				name: 'Debug County Outputs',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1050, 300],
				notes: 'Compare the outputs from the incorrect and correct approaches',
			},
		];

		// Define connections
		const connections = {
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
							node: 'Get Auction Details',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Auction Details': {
				main: [
					[
						{
							node: 'Debug Auction Output',
							type: 'main',
							index: 0,
						},
						{
							node: 'INCORRECT: Get County by Search',
							type: 'main',
							index: 0,
						},
						{
							node: 'CORRECT: Get County by Record ID',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'INCORRECT: Get County by Search': {
				main: [
					[
						{
							node: 'Debug County Outputs',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'CORRECT: Get County by Record ID': {
				main: [
					[
						{
							node: 'Debug County Outputs',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the test workflow
		console.log('Creating test workflow...');
		const testWorkflow = await workflowManager.createWorkflow(
			'Airtable Linked Fields Debug',
			nodes,
			connections,
		);

		console.log(`Test workflow created with ID: ${testWorkflow.id}`);

		// Save the test workflow for reference
		const testWorkflowPath = path.join(__dirname, 'airtable-linked-fields-debug.json');
		fs.writeFileSync(testWorkflowPath, JSON.stringify(testWorkflow, null, 2));
		console.log(`Test workflow saved to ${testWorkflowPath}`);

		console.log('\nTEST STEPS TO UNDERSTAND AIRTABLE LINKED FIELDS:');
		console.log('1. The "Get Auction Details" node fetches an auction record using its ID');
		console.log(
			'2. The County field in this record contains an ARRAY of record IDs, not field values',
		);
		console.log(
			'3. The INCORRECT approach tries to search Counties by matching the name field with a record ID (will fail)',
		);
		console.log('4. The CORRECT approach directly uses the record ID with the "get" operation');
		console.log('\nIMPORTANT LESSONS:');
		console.log('• Linked fields in Airtable return RECORD IDs, not field values');
		console.log('• When you have a record ID, use the "get" operation with the ID parameter');
		console.log('• Do NOT try to search using a field value when you have a record ID');
		console.log('\nPlease run this workflow and check the results in the n8n interface at:');
		console.log(`https://127.0.0.1:5678/workflow/${testWorkflow.id}`);
	} catch (error) {
		console.error('Error debugging Airtable linked fields:', error);
	}
}

// Run the script
debugAirtableLinkedFields().catch((error) => {
	console.error('Error running the debug script:', error);
});
