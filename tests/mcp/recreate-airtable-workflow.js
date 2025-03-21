/**
 * This script creates a new version of the Dynamic Airtable Configuration workflow
 * with a proper trigger node and correctly configured Airtable nodes
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');
const AIRTABLE_REFERENCE = require('../../scripts/airtable-reference');

async function recreateAirtableWorkflow() {
	try {
		console.log('Creating a new version of the Dynamic Airtable Configuration workflow...');

		// Initialize workflow manager
		const workflowManager = new WorkflowManager(
			'https://127.0.0.1:5678',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
		);

		// Get field name constants for clearer formulas
		const auctionFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.AUCTION[AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD];
		const countyFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.COUNTY[AIRTABLE_REFERENCE.FIELD_IDS.COUNTY.PRIMARY_FIELD];
		const systemFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.SYSTEM[AIRTABLE_REFERENCE.FIELD_IDS.SYSTEM.PRIMARY_FIELD];
		const scopeFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.CONFIG[AIRTABLE_REFERENCE.FIELD_IDS.CONFIG.SCOPE];
		const scopeIdFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.CONFIG[AIRTABLE_REFERENCE.FIELD_IDS.CONFIG.SCOPE_ID];

		// Get the county field name from auction table
		const auctionCountyFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.AUCTION[AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.COUNTY];

		// Get the system field name from county table
		const countySystemFieldName =
			AIRTABLE_REFERENCE.FIELD_NAMES.COUNTY[AIRTABLE_REFERENCE.FIELD_IDS.COUNTY.SYSTEM];

		// Define new nodes
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
			// Get Auction Details
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
					// Use field name in filter formula - USING EXPRESSION MODE
					filterByFormula: `={${auctionFieldName}} = '{{$json.auction_id}}'`,
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
				notes:
					'Using field names from the Airtable UI for formulas instead of IDs:\n\nAuction - The primary field\nCounty - The county field',
			},
			// Debug Auction
			{
				parameters: {},
				id: 'debug_auction',
				name: 'Debug Auction',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [850, 200],
				notes: 'View the auction details retrieved from Airtable',
			},
			// Get County Information
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
					// Use record ID from the County linked field in Auction
					id: '={{$node["Get Auction Details"].json.County[0]}}',
					options: {},
				},
				id: 'get_county',
				name: 'Get County Information',
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
					'Retrieves county information using the record ID from the linked County field in the Auction table. Using the "get" operation because we have the record ID directly.',
			},
			// Debug County
			{
				parameters: {},
				id: 'debug_county',
				name: 'Debug County',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1050, 200],
				notes: 'View the county details retrieved from Airtable',
			},
			// Get Auction System
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
						value: AIRTABLE_REFERENCE.TABLES.SYSTEMS,
						mode: 'list',
						cachedResultName: 'Auction Systems',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.SYSTEMS}`,
					},
					// Use record ID from the Auction System linked field in County
					id: '={{$node["Get County Information"].json["Auction System"][0]}}',
					options: {},
				},
				id: 'get_system',
				name: 'Get Auction System',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [1050, 400],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'Retrieves system information using the record ID from the linked Auction System field in the County record. Using the "get" operation because we have the record ID directly.',
			},
			// Debug System
			{
				parameters: {},
				id: 'debug_system',
				name: 'Debug System',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1250, 200],
				notes: 'View the system details retrieved from Airtable',
			},
			// Get Configuration Values
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
						value: AIRTABLE_REFERENCE.TABLES.CONFIG,
						mode: 'list',
						cachedResultName: 'Configurations',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.CONFIG}`,
					},
					// Updated filter formula to match actual fields
					filterByFormula: `=OR({System} = '', SEARCH('{{$node["Get Auction System"].json["Name"]}}', {System}))`,
					options: {},
				},
				id: 'get_config',
				name: 'Get Configuration Values',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [1250, 400],
				credentials: {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				},
				notes:
					'Retrieves configuration values that are either global (no system specified) or specific to the current auction system. Using SEARCH to find configurations linked to the current system by name.',
			},
			// Debug Config
			{
				parameters: {},
				id: 'debug_config',
				name: 'Debug Config',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1450, 200],
				notes: 'View the configuration values retrieved from Airtable',
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
							node: 'Debug Auction',
							type: 'main',
							index: 0,
						},
						{
							node: 'Get County Information',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get County Information': {
				main: [
					[
						{
							node: 'Debug County',
							type: 'main',
							index: 0,
						},
						{
							node: 'Get Auction System',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Auction System': {
				main: [
					[
						{
							node: 'Debug System',
							type: 'main',
							index: 0,
						},
						{
							node: 'Get Configuration Values',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Configuration Values': {
				main: [
					[
						{
							node: 'Debug Config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the new workflow
		console.log('Creating new workflow...');
		const newWorkflow = await workflowManager.createWorkflow(
			'Dynamic Airtable Configuration (Fixed)',
			nodes,
			connections,
		);

		console.log(`New workflow created with ID: ${newWorkflow.id}`);

		// Save the new workflow for reference
		const newWorkflowPath = path.join(__dirname, 'new-airtable-workflow.json');
		fs.writeFileSync(newWorkflowPath, JSON.stringify(newWorkflow, null, 2));
		console.log(`New workflow saved to ${newWorkflowPath}`);

		// Try to execute the new workflow with test data
		console.log('\nExecuting the new workflow to test it...');
		try {
			const testData = {
				data: {
					auction_id: '24-10-onondaga-ny',
				},
			};

			const execution = await workflowManager.executeWorkflow(newWorkflow.id, testData);
			console.log(`Execution started with ID: ${execution.id}`);

			// Poll for execution results
			console.log('Waiting for execution to complete...');
			let executionData;
			let attempts = 0;
			const maxAttempts = 10;

			while (attempts < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
				try {
					executionData = await workflowManager.getExecutionData(execution.id);
					if (executionData.finished) {
						break;
					}
				} catch (err) {
					console.log('Execution still in progress...');
				}
				attempts++;
			}

			if (!executionData || !executionData.finished) {
				console.error('Execution timed out or failed to complete');
				return;
			}

			// Check if there were any errors in the execution
			if (executionData.data.resultData.error) {
				console.error('Execution completed with errors:');
				console.error(executionData.data.resultData.error);
				return;
			}

			console.log('\n✅ Workflow executed successfully!');
			console.log('Please open the workflow in n8n at:');
			console.log(`https://127.0.0.1:5678/workflow/${newWorkflow.id}`);
		} catch (execError) {
			console.error('Error executing workflow:', execError);
		}
	} catch (error) {
		console.error('Error recreating workflow:', error);
	}
}

// Execute the function
recreateAirtableWorkflow().catch((error) => {
	console.error('Error running the script:', error);
});
