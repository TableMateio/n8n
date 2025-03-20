/**
 * This script fixes the Airtable filtering in the Dynamic Airtable Configuration workflow
 *
 * It ensures all Airtable nodes have the proper structure and filtering parameters
 * based on the working format observed in n8n
 */

const WorkflowManager = require('./workflow-manager');
const AIRTABLE_REFERENCE = require('../../scripts/airtable-reference');

/**
 * Fixes Airtable filtering in the workflow
 */
async function fixAirtableFiltering() {
	// Initialize workflow manager
	const workflowManager = new WorkflowManager(
		'https://127.0.0.1:5678',
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
	);

	// Get the workflow ID (hard-coded based on previous runs)
	const workflowId = 'SlR4PULINjXn4p11';

	try {
		// Get the workflow
		console.log(`Getting workflow with ID ${workflowId}...`);
		const workflow = await workflowManager.getWorkflow(workflowId);
		console.log(`Found workflow: ${workflow.name}`);

		// Save original workflow for reference
		const fs = require('fs');
		const path = require('path');
		const originalWorkflowPath = path.join(__dirname, 'original-workflow-before-airtable-fix.json');
		fs.writeFileSync(originalWorkflowPath, JSON.stringify(workflow, null, 2));
		console.log(`Original workflow saved to ${originalWorkflowPath}`);

		// Update nodes with the proper structure
		const updatedNodes = workflow.nodes.map((node) => {
			if (node.type === 'n8n-nodes-base.airtable' && node.name === 'Get Auction Details') {
				console.log(`Updating node: ${node.name}`);
				node.parameters = {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.AUCTIONS}`,
					},
					// Use field name instead of ID in the filter formula
					filterByFormula: AIRTABLE_REFERENCE.createFilterFormula(
						'AUCTION',
						AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.PRIMARY_FIELD,
						'{{$json.auction_id}}',
					),
					options: {},
				};
				node.typeVersion = 2;
				node.credentials = {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				};
			} else if (
				node.type === 'n8n-nodes-base.airtable' &&
				node.name === 'Get County Information'
			) {
				console.log(`Updating node: ${node.name}`);

				// Get the field names for clearer formula
				const countyFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.COUNTY[AIRTABLE_REFERENCE.FIELD_IDS.COUNTY.PRIMARY_FIELD];
				const auctionCountyFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.AUCTION[AIRTABLE_REFERENCE.FIELD_IDS.AUCTION.COUNTY];

				node.parameters = {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.COUNTIES,
						mode: 'list',
						cachedResultName: 'Counties',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.COUNTIES}`,
					},
					// Use field names throughout the formula
					filterByFormula: `{${countyFieldName}} = '{{$node["Get Auction Details"].json["fields"]["${auctionCountyFieldName}"]}}' `,
					options: {},
				};
				node.typeVersion = 2;
				node.credentials = {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				};
			} else if (node.type === 'n8n-nodes-base.airtable' && node.name === 'Get Auction System') {
				console.log(`Updating node: ${node.name}`);

				// Get the field names for clearer formula
				const systemFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.SYSTEM[AIRTABLE_REFERENCE.FIELD_IDS.SYSTEM.PRIMARY_FIELD];
				const countySystemFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.COUNTY[AIRTABLE_REFERENCE.FIELD_IDS.COUNTY.SYSTEM];

				node.parameters = {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.SYSTEMS,
						mode: 'list',
						cachedResultName: 'Auction Systems',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.SYSTEMS}`,
					},
					// Use field names throughout the formula
					filterByFormula: `{${systemFieldName}} = '{{$node["Get County Information"].json["fields"]["${countySystemFieldName}"]}}' `,
					options: {},
				};
				node.typeVersion = 2;
				node.credentials = {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				};
			} else if (
				node.type === 'n8n-nodes-base.airtable' &&
				node.name === 'Get Configuration Values'
			) {
				console.log(`Updating node: ${node.name}`);

				// Get field names for config values filtering
				const scopeFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.CONFIG[AIRTABLE_REFERENCE.FIELD_IDS.CONFIG.SCOPE];
				const scopeIdFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.CONFIG[AIRTABLE_REFERENCE.FIELD_IDS.CONFIG.SCOPE_ID];
				const systemNameFieldName =
					AIRTABLE_REFERENCE.FIELD_NAMES.SYSTEM[AIRTABLE_REFERENCE.FIELD_IDS.SYSTEM.PRIMARY_FIELD];

				node.parameters = {
					resource: 'record',
					operation: 'search',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE_REFERENCE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE_REFERENCE.TABLES.CONFIG,
						mode: 'list',
						cachedResultName: 'Configuration',
						cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}/${AIRTABLE_REFERENCE.TABLES.CONFIG}`,
					},
					// Use field names throughout the formula
					filterByFormula: `AND(
						{${scopeFieldName}} = 'global',
						OR(
							{${scopeIdFieldName}} = '',
							{${scopeIdFieldName}} = '{{$node["Get Auction System"].json["fields"]["${systemNameFieldName}"]}}'
						)
					)`,
					options: {},
				};
				node.typeVersion = 2;
				node.credentials = {
					airtableTokenApi: {
						id: 'Airtable',
						name: 'Airtable',
					},
				};
			}
			return node;
		});

		// Update the workflow with the fixed nodes
		const updatedWorkflow = {
			...workflow,
			nodes: updatedNodes,
		};

		// Save fixed workflow for reference
		const fixedWorkflowPath = path.join(__dirname, 'fixed-workflow-with-airtable-filtering.json');
		fs.writeFileSync(fixedWorkflowPath, JSON.stringify(updatedWorkflow, null, 2));
		console.log(`Fixed workflow saved to ${fixedWorkflowPath}`);

		// Update the workflow in n8n
		console.log('Updating workflow in n8n...');
		await workflowManager.updateWorkflow(workflowId, updatedWorkflow);
		console.log(
			'Workflow updated successfully! Please refresh your n8n browser tab to see the changes.',
		);
	} catch (error) {
		console.error('Error fixing Airtable filtering:', error);
	}
}

// Execute the main function
fixAirtableFiltering();
