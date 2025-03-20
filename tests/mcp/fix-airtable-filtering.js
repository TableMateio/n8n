/**
 * This script updates the filter formulas in the existing Dynamic Airtable Configuration workflow
 * to use field names instead of field IDs for better readability and reliability.
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');
const AIRTABLE_REFERENCE = require('../../scripts/airtable-reference');

async function updateAirtableFiltering() {
	try {
		console.log('Updating Airtable filter formulas in the workflow...');

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

		// Find the existing workflow (using ID directly if available)
		console.log('Searching for the existing workflow...');
		const workflows = await workflowManager.listWorkflows();

		// Try to find the workflow by name
		let workflowId;
		const workflowName = 'Dynamic Airtable Configuration (Fixed)';

		for (const workflow of workflows) {
			if (workflow.name === workflowName) {
				workflowId = workflow.id;
				break;
			}
		}

		if (!workflowId) {
			console.error(`Workflow with name "${workflowName}" not found`);
			return;
		}

		console.log(`Found workflow with ID: ${workflowId}`);

		// Retrieve the workflow data
		const workflowData = await workflowManager.getWorkflow(workflowId);

		// Save the original workflow for reference
		const originalWorkflowPath = path.join(__dirname, 'original-workflow-before-airtable-fix.json');
		fs.writeFileSync(originalWorkflowPath, JSON.stringify(workflowData, null, 2));
		console.log(`Original workflow saved to ${originalWorkflowPath}`);

		// Create a copy of the workflow to modify
		const updatedWorkflow = JSON.parse(JSON.stringify(workflowData));

		// Update each Airtable node's filter formula
		let updated = false;

		for (const node of updatedWorkflow.nodes) {
			if (node.type === 'n8n-nodes-base.airtable' && node.parameters.operation === 'search') {
				console.log(`Updating filter formula for node: ${node.name}`);

				// Store the original filter formula for reference
				const originalFormula = node.parameters.filterByFormula;

				// Update filter formula based on the node name/purpose
				if (node.name === 'Get Auction Details') {
					// Use field name in filter formula with EXPRESSION MODE
					node.parameters.filterByFormula = `={${auctionFieldName}} = '{{$json.auction_id}}'`;
					node.notes =
						'Using field names from the Airtable UI for formulas instead of IDs:\n\nAuction - The primary field\nCounty - The county field';
					updated = true;
				} else if (node.name === 'Get County Information') {
					// Use field name in filter formula with EXPRESSION MODE
					node.parameters.filterByFormula = `={${countyFieldName}} = '{{$node["Get Auction Details"].json["fields"]["${auctionCountyFieldName}"]}}' `;
					node.notes =
						'Retrieves county information based on the auction county field. Using field names in the filter formula.';
					updated = true;
				} else if (node.name === 'Get Auction System') {
					// Use field name in filter formula with EXPRESSION MODE
					node.parameters.filterByFormula = `={${systemFieldName}} = '{{$node["Get County Information"].json["fields"]["${countySystemFieldName}"]}}' `;
					node.notes =
						'Retrieves system information based on the county system field. Using field names in the filter formula.';
					updated = true;
				} else if (node.name === 'Get Configuration Values') {
					// Use field names in filter formula with EXPRESSION MODE
					node.parameters.filterByFormula = `=AND(
                        {${scopeFieldName}} = 'global',
                        OR(
                            {${scopeIdFieldName}} = '',
                            {${scopeIdFieldName}} = '{{$node["Get Auction System"].json["fields"]["${systemFieldName}"]}}'
                        )
                    )`;
					node.notes =
						'Retrieves configuration values based on global scope and system name. Using field names in the filter formula.';
					updated = true;
				}

				// Log the changes if the formula was updated
				if (originalFormula !== node.parameters.filterByFormula) {
					console.log(`  - Original formula: ${originalFormula}`);
					console.log(`  - Updated formula: ${node.parameters.filterByFormula}`);
				}
			}
		}

		if (!updated) {
			console.log('No filter formulas needed updating.');
			return;
		}

		// Update the workflow
		console.log('\nUpdating the workflow...');
		await workflowManager.updateWorkflow(workflowId, updatedWorkflow);
		console.log(`✅ Workflow ${workflowId} updated successfully!`);

		// Save the updated workflow for reference
		const updatedWorkflowPath = path.join(__dirname, 'fixed-workflow-with-airtable-filtering.json');
		fs.writeFileSync(updatedWorkflowPath, JSON.stringify(updatedWorkflow, null, 2));
		console.log(`Updated workflow saved to ${updatedWorkflowPath}`);

		console.log('\nPlease refresh your n8n browser tab to see the updated workflow.');
	} catch (error) {
		console.error('Error updating workflow:', error);
	}
}

// Execute the function
updateAirtableFiltering().catch((error) => {
	console.error('Error running the script:', error);
});
