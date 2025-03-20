/**
 * This script updates the Dynamic Airtable Configuration workflow with proper Airtable filtering
 * to ensure it retrieves the correct records based on auction_id
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');

async function fixAirtableFiltering() {
	console.log('Fixing the Airtable filtering in the Dynamic Airtable Configuration workflow...');

	// Initialize workflow manager with proper parameters
	const workflowManager = new WorkflowManager(
		'https://127.0.0.1:5678',
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
	);

	// Target the specific workflow by ID
	const workflowId = 'SlR4PULINjXn4p11'; // Dynamic Airtable Configuration ID
	console.log(`Targeting workflow with ID: ${workflowId}`);

	// Get full workflow details
	const workflowDetails = await workflowManager.getWorkflow(workflowId);

	if (!workflowDetails) {
		console.error(`Could not find workflow with ID: ${workflowId}`);
		return;
	}

	console.log(`Found workflow: ${workflowDetails.name} (ID: ${workflowDetails.id})`);

	// Save original workflow for reference
	const originalFilePath = path.join(__dirname, 'original-workflow-before-airtable-fix.json');
	fs.writeFileSync(originalFilePath, JSON.stringify(workflowDetails, null, 2));
	console.log(`Original workflow saved to: ${originalFilePath}`);

	// Create a copy of the workflow to modify
	const fixedWorkflow = JSON.parse(JSON.stringify(workflowDetails));

	// Update all Airtable nodes to use the new credential and add filtering
	let updated = false;

	// 1. Fix Get Auction Details node
	const getAuctionNode = fixedWorkflow.nodes.find((n) => n.name === 'Get Auction Details');
	if (getAuctionNode) {
		// Update to add filtering by auction_id
		getAuctionNode.parameters.additionalOptions = {
			filterByFormula: "{fld7zoOS3uQg4tiyh} = '{{$json.auction_id}}'",
		};

		// Update credentials if needed
		if (getAuctionNode.credentials && getAuctionNode.credentials.airtableApi) {
			getAuctionNode.credentials.airtableApi = {
				id: 'Airtable',
				name: 'Airtable account',
			};
		}

		console.log(`Updated "Get Auction Details" node with proper filtering`);
		updated = true;
	}

	// 2. Fix Get County Information node
	const getCountyNode = fixedWorkflow.nodes.find((n) => n.name === 'Get County Information');
	if (getCountyNode) {
		// Update to add filtering by county ID from auction
		getCountyNode.parameters.additionalOptions = {
			filterByFormula:
				'{fldQ7BCXWtcTh4tFV} = \'{{$node["Get Auction Details"].json["fldMokcnoIWJTFCbC"][0]}}\'',
		};

		// Update credentials if needed
		if (getCountyNode.credentials && getCountyNode.credentials.airtableApi) {
			getCountyNode.credentials.airtableApi = {
				id: 'Airtable',
				name: 'Airtable account',
			};
		}

		console.log(`Updated "Get County Information" node with proper filtering`);
		updated = true;
	}

	// 3. Fix Get Auction System node
	const getSystemNode = fixedWorkflow.nodes.find((n) => n.name === 'Get Auction System');
	if (getSystemNode) {
		// Update to add filtering by system ID from county
		getSystemNode.parameters.additionalOptions = {
			filterByFormula:
				'{fld3NcywWUhW2DkAa} = \'{{$node["Get County Information"].json["fldaPTtDb8cKT9EzC"][0]}}\'',
		};

		// Update credentials if needed
		if (getSystemNode.credentials && getSystemNode.credentials.airtableApi) {
			getSystemNode.credentials.airtableApi = {
				id: 'Airtable',
				name: 'Airtable account',
			};
		}

		console.log(`Updated "Get Auction System" node with proper filtering`);
		updated = true;
	}

	// 4. Fix Get Configuration Values node
	const getConfigNode = fixedWorkflow.nodes.find((n) => n.name === 'Get Configuration Values');
	if (getConfigNode) {
		// Update to add filtering for API config values
		// Not adding specific filtering here as we want all config values

		// Update credentials if needed
		if (getConfigNode.credentials && getConfigNode.credentials.airtableApi) {
			getConfigNode.credentials.airtableApi = {
				id: 'Airtable',
				name: 'Airtable account',
			};
		}

		console.log(`Updated "Get Configuration Values" node credentials`);
		updated = true;
	}

	// Save fixed workflow to file for reference
	const fixedFilePath = path.join(__dirname, 'fixed-workflow-with-airtable-filtering.json');
	fs.writeFileSync(fixedFilePath, JSON.stringify(fixedWorkflow, null, 2));
	console.log(`Fixed workflow saved to: ${fixedFilePath}`);

	if (!updated) {
		console.log('No changes were needed for Airtable nodes');
		return;
	}

	// Update the workflow in n8n
	try {
		const result = await workflowManager.updateWorkflow(workflowId, fixedWorkflow);
		console.log(`Successfully updated workflow with ID: ${result.id}`);
		console.log('Please refresh your n8n browser tab to see the changes');
	} catch (error) {
		console.error('Error updating workflow:', error);
		console.log('You can manually import the fixed workflow from the JSON file');
	}

	return fixedWorkflow;
}

// Execute the function
fixAirtableFiltering().catch((error) => {
	console.error('Error running the script:', error);
});
