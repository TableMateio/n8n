/**
 * This script helps debug different Airtable filter formula formats
 * It includes several test cases with different filter formats to determine
 * which one works correctly with the Airtable API through n8n
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');

// Constants for Airtable IDs
const BASE_ID = 'appAFwvoSRiOQc2pP';
const AUCTIONS_TABLE_ID = 'tblvlBDwuCE7CmThU';
const AUCTION_PRIMARY_FIELD_ID = 'fldvL5TXKDTOmYiPB'; // Field ID for Auction field

// Initialize workflow manager
const workflowManager = new WorkflowManager(
	'https://127.0.0.1:5678',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
);

async function testFilterFormats() {
	try {
		console.log('Testing different Airtable filter formats...');

		// Define test nodes
		const testNodes = [
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
			// Test 1: Fixed value - NOT using expression mode
			{
				parameters: {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AUCTIONS_TABLE_ID,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${BASE_ID}/${AUCTIONS_TABLE_ID}`,
					},
					filterByFormula: `{Auction} = '24-10-onondaga-ny'`,
					options: {},
				},
				id: 'test_1_fixed',
				name: 'Test 1: Fixed Value',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [650, 200],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes: 'Using a fixed value directly - NOT using expression mode',
			},
			// Test 2: Expression mode with field name - Uses a dynamic value
			{
				parameters: {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AUCTIONS_TABLE_ID,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${BASE_ID}/${AUCTIONS_TABLE_ID}`,
					},
					filterByFormula: `={Auction} = '{{$json.auction_id}}'`,
					options: {},
				},
				id: 'test_2_expression',
				name: 'Test 2: Expression with Field Name',
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
					'Using an expression with field name and dynamic value\nNote the "=" prefix to force expression mode',
			},
			// Test 3: Field ID expression - Common approach but field ID doesn't work in formula
			{
				parameters: {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AUCTIONS_TABLE_ID,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${BASE_ID}/${AUCTIONS_TABLE_ID}`,
					},
					filterByFormula: `={${AUCTION_PRIMARY_FIELD_ID}} = '{{$json.auction_id}}'`,
					options: {},
				},
				id: 'test_3_field_id',
				name: "Test 3: Field ID (Doesn't Work)",
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [850, 200],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'Using field ID in formula - This DOES NOT work in Airtable\nNote the "=" prefix to force expression mode',
			},
			// Test 4: SEARCH function - Alternative approach
			{
				parameters: {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AUCTIONS_TABLE_ID,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${BASE_ID}/${AUCTIONS_TABLE_ID}`,
					},
					filterByFormula: `=SEARCH('{{$json.auction_id}}', {Auction})`,
					options: {},
				},
				id: 'test_4_search',
				name: 'Test 4: SEARCH Function',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [850, 400],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'Using SEARCH function as an alternative\nNote the "=" prefix to force expression mode',
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
							node: 'Test 1: Fixed Value',
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 2: Expression with Field Name',
							type: 'main',
							index: 0,
						},
						{
							node: "Test 3: Field ID (Doesn't Work)",
							type: 'main',
							index: 0,
						},
						{
							node: 'Test 4: SEARCH Function',
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
			'Airtable Filter Formula Test',
			testNodes,
			connections,
		);

		console.log(`Test workflow created with ID: ${testWorkflow.id}`);

		// Save the test workflow for reference
		const testWorkflowPath = path.join(__dirname, 'airtable-field-name-test-workflow.json');
		fs.writeFileSync(testWorkflowPath, JSON.stringify(testWorkflow, null, 2));
		console.log(`Test workflow saved to ${testWorkflowPath}`);

		// Execute the test workflow to check which formats work
		console.log('\nExecuting test workflow...');
		const execution = await workflowManager.executeWorkflow(testWorkflow.id);
		console.log(`Execution started with ID: ${execution.id}`);

		console.log('\nTest complete! Please check the results in the n8n interface.');
		console.log(`https://127.0.0.1:5678/workflow/${testWorkflow.id}`);
	} catch (error) {
		console.error('Error testing filter formats:', error);
	}
}

// Run the tests
testFilterFormats();
