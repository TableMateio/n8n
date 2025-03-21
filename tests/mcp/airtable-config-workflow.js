#!/usr/bin/env node

/**
 * Airtable Configuration Workflow Creator
 *
 * This script creates an n8n workflow that demonstrates how to:
 * 1. Receive an auction ID input
 * 2. Look up the auction details in Airtable
 * 3. Find the associated county
 * 4. Get the system(s) used by that county
 * 5. Fetch configuration values for that system
 * 6. Use the configuration in subsequent nodes
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');
const fs = require('fs');
const path = require('path');

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
 * Create an Airtable configuration workflow
 */
async function createAirtableConfigWorkflow() {
	try {
		const workflowName = 'Dynamic Airtable Configuration';
		console.log(`Creating workflow: "${workflowName}"...`);

		// Define workflow nodes
		const nodes = [
			// -------------------------------------------------------------------------
			// Start node - Manual trigger with auction ID input
			// -------------------------------------------------------------------------
			{
				id: 'start-node',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},

			// -------------------------------------------------------------------------
			// Set sample auction ID for testing
			// -------------------------------------------------------------------------
			{
				id: 'set-sample-id',
				name: 'Set Sample Auction ID',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					values: {
						string: [
							{
								name: 'auction_id',
								value: '24-10-onondaga-ny', // Example auction ID - replace with a real one
							},
						],
					},
				},
			},

			// -------------------------------------------------------------------------
			// Get auction details from Airtable
			// -------------------------------------------------------------------------
			{
				id: 'get-auction',
				name: 'Get Auction Details',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 1,
				position: [650, 300],
				credentials: {
					airtableApi: {
						id: 'airtable-api-credential',
						name: 'Airtable account',
					},
				},
				parameters: {
					application: '{{$env.AIRTABLE_BASE_ID}}',
					operation: 'list',
					table: 'Auctions',
					filterByFormula: `{fld7zoOS3uQg4tiyh} = '{{$json.auction_id}}'`,
					fields: {
						fields: [
							'fld7zoOS3uQg4tiyh', // Auction (Primary Field)
							'fldMokcnoIWJTFCbC', // County
						],
					},
					options: {},
				},
				notes:
					'Using field IDs from the AirtableFields.csv:\n\nfld7zoOS3uQg4tiyh - Auction (Primary Field)\nfldMokcnoIWJTFCbC - County',
			},

			// -------------------------------------------------------------------------
			// Debug Auction Result
			// -------------------------------------------------------------------------
			{
				id: 'debug-auction',
				name: 'Debug Auction',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [850, 200],
				parameters: {},
				notes: 'View the auction details retrieved from Airtable',
			},

			// -------------------------------------------------------------------------
			// Get county information from Airtable
			// -------------------------------------------------------------------------
			{
				id: 'get-county',
				name: 'Get County Information',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 1,
				position: [850, 400],
				credentials: {
					airtableApi: {
						id: 'airtable-api-credential',
						name: 'Airtable account',
					},
				},
				parameters: {
					application: '{{$env.AIRTABLE_BASE_ID}}',
					operation: 'list',
					table: 'Counties',
					filterByFormula: `{fldQ7BCXWtcTh4tFV} = '{{$node["Get Auction Details"].json["fldMokcnoIWJTFCbC"][0]}}'`,
					fields: {
						fields: [
							'fldQ7BCXWtcTh4tFV', // County (Primary Field)
							'fld0hrQJQp8iSIl8a', // Name
							'fldY2ffjVwpdk9HYw', // State
							'fldaPTtDb8cKT9EzC', // Auction System
							'fldrbZk8Kl4GWSwbu', // Clerk System
							'fldePJXHa2kviFwMA', // Property System
							'fldmWj2helazqxMFX', // Tax System
						],
					},
					options: {},
				},
				notes:
					'Using field IDs from the AirtableFields.csv:\n\nfldQ7BCXWtcTh4tFV - County (Primary Field)\nfld0hrQJQp8iSIl8a - Name\nfldY2ffjVwpdk9HYw - State\nfldaPTtDb8cKT9EzC - Auction System\nfldrbZk8Kl4GWSwbu - Clerk System\nfldePJXHa2kviFwMA - Property System\nfldmWj2helazqxMFX - Tax System',
			},

			// -------------------------------------------------------------------------
			// Debug County Result
			// -------------------------------------------------------------------------
			{
				id: 'debug-county',
				name: 'Debug County',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1050, 200],
				parameters: {},
				notes: 'View the county details retrieved from Airtable',
			},

			// -------------------------------------------------------------------------
			// Get auction system information from Airtable
			// -------------------------------------------------------------------------
			{
				id: 'get-auction-system',
				name: 'Get Auction System',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 1,
				position: [1050, 400],
				credentials: {
					airtableApi: {
						id: 'airtable-api-credential',
						name: 'Airtable account',
					},
				},
				parameters: {
					application: '{{$env.AIRTABLE_BASE_ID}}',
					operation: 'list',
					table: 'Systems',
					filterByFormula: `{fld3NcywWUhW2DkAa} = '{{$node["Get County Information"].json["fldaPTtDb8cKT9EzC"][0]}}'`,
					fields: {
						fields: [
							'fld3NcywWUhW2DkAa', // System (Primary Field)
							'fldWRx9pyJqovdtsf', // Name
							'fldhOpmEIeRgSIPfT', // Type
							'fldsoee9Ww6FN3nhq', // Website
						],
					},
					options: {},
				},
				notes:
					'Using field IDs from the AirtableFields.csv:\n\nfld3NcywWUhW2DkAa - System (Primary Field)\nfldWRx9pyJqovdtsf - Name\nfldhOpmEIeRgSIPfT - Type\nfldsoee9Ww6FN3nhq - Website',
			},

			// -------------------------------------------------------------------------
			// Debug System Result
			// -------------------------------------------------------------------------
			{
				id: 'debug-system',
				name: 'Debug System',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1250, 200],
				parameters: {},
				notes: 'View the system details retrieved from Airtable',
			},

			// -------------------------------------------------------------------------
			// Get configuration values from Airtable
			// -------------------------------------------------------------------------
			{
				id: 'get-config',
				name: 'Get Configuration Values',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 1,
				position: [1250, 400],
				credentials: {
					airtableApi: {
						id: 'airtable-api-credential',
						name: 'Airtable account',
					},
				},
				parameters: {
					application: '{{$env.AIRTABLE_BASE_ID}}',
					operation: 'list',
					table: 'Config',
					// This example gets all config values - in production you might want to filter
					// filterByFormula: `OR({fldPdiJS2Ax7ZU7NX} = 'API_ENDPOINT', {fldPdiJS2Ax7ZU7NX} = 'API_KEY')`,
					fields: {
						fields: [
							'fldTZZxBSjsIPt5Kp', // Configuration (Primary Field)
							'fldPdiJS2Ax7ZU7NX', // Name
							'fld0ollepo8UiFPb8', // Value
							'fldzGwrjnx6cJfDID', // Type
							'fldhvdK73kBUrdUop', // Environment
						],
					},
					options: {},
				},
				notes:
					'Using field IDs from the AirtableFields.csv:\n\nfldTZZxBSjsIPt5Kp - Configuration (Primary Field)\nfldPdiJS2Ax7ZU7NX - Name\nfld0ollepo8UiFPb8 - Value\nfldzGwrjnx6cJfDID - Type\nfldhvdK73kBUrdUop - Environment',
			},

			// -------------------------------------------------------------------------
			// Format Configuration
			// -------------------------------------------------------------------------
			{
				id: 'format-config',
				name: 'Format Configuration',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [1450, 400],
				parameters: {
					functionCode: `
// Process the configuration from Airtable
const configs = $input.all();
const formattedConfig = {};

// Transform array of config items into a single object
for (const item of configs) {
  const name = item.json.fldPdiJS2Ax7ZU7NX;
  const value = item.json.fld0ollepo8UiFPb8;
  const type = item.json.fldzGwrjnx6cJfDID;
  const env = item.json.fldhvdK73kBUrdUop;

  // Skip configs that don't match our environment (if specified)
  // Options are: "Production", "Development", "Both"
  const currentEnv = "Development"; // You can change this or make it dynamic
  if (env && env !== currentEnv && env !== "Both") {
    continue;
  }

  // Handle different value types
  if (type === "Number") {
    formattedConfig[name] = Number(value);
  } else if (type === "JSON") {
    try {
      formattedConfig[name] = JSON.parse(value);
    } catch (e) {
      formattedConfig[name] = value;
    }
  } else {
    formattedConfig[name] = value;
  }
}

// Add system information
if ($('Get Auction System').first().json) {
  // Add system data if available
  const system = $('Get Auction System').first().json;
  formattedConfig.systemName = system.fldWRx9pyJqovdtsf;
  formattedConfig.systemWebsite = system.fldsoee9Ww6FN3nhq;
  formattedConfig.systemType = system.fldhOpmEIeRgSIPfT;
}

// Add county information
if ($('Get County Information').first().json) {
  // Add county data if available
  const county = $('Get County Information').first().json;
  formattedConfig.countyName = county.fld0hrQJQp8iSIl8a;
  formattedConfig.countyState = county.fldY2ffjVwpdk9HYw;
}

// Add auction information
if ($('Get Auction Details').first().json) {
  // Add auction data if available
  const auction = $('Get Auction Details').first().json;
  formattedConfig.auctionId = auction.fld7zoOS3uQg4tiyh;
}

return { json: formattedConfig };
`,
				},
			},

			// -------------------------------------------------------------------------
			// Use Configuration (HTTP Request Example)
			// -------------------------------------------------------------------------
			{
				id: 'http-request',
				name: 'Example API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 3.1,
				position: [1650, 400],
				parameters: {
					url: '={{ $json.API_ENDPOINT || "https://example.com/api" }}',
					method: 'POST',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					options: {
						allowUnauthorizedCerts: true,
						redirect: {
							followRedirects: true,
						},
						response: {
							response: {
								fullResponse: true,
							},
						},
					},
					headers: {
						parameters: [
							{
								name: 'Content-Type',
								value: 'application/json',
							},
							{
								name: 'Authorization',
								value: '={{ "Bearer " + $json.API_KEY }}',
							},
						],
					},
					sendBody: true,
					contentType: 'json',
					body: {
						// Example of using the configuration in the request body
						systemName: '={{ $json.systemName }}',
						countyName: '={{ $json.countyName }}',
						auctionId: '={{ $json.auctionId }}',
						investabilityThreshold: '={{ $json.INVESTABILITY_THRESHOLD }}',
						environment: '={{ $json.ENVIRONMENT }}',
					},
				},
			},

			// -------------------------------------------------------------------------
			// Final Result
			// -------------------------------------------------------------------------
			{
				id: 'final-result',
				name: 'Final Result',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1850, 400],
				parameters: {},
				notes: 'This is the final step showing the complete workflow result',
			},
		];

		// Define connections between nodes
		const connections = {
			'start-node': {
				main: [
					[
						{
							node: 'set-sample-id',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'set-sample-id': {
				main: [
					[
						{
							node: 'get-auction',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'get-auction': {
				main: [
					[
						{
							node: 'debug-auction',
							type: 'main',
							index: 0,
						},
						{
							node: 'get-county',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'get-county': {
				main: [
					[
						{
							node: 'debug-county',
							type: 'main',
							index: 0,
						},
						{
							node: 'get-auction-system',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'get-auction-system': {
				main: [
					[
						{
							node: 'debug-system',
							type: 'main',
							index: 0,
						},
						{
							node: 'get-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'get-config': {
				main: [
					[
						{
							node: 'format-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'format-config': {
				main: [
					[
						{
							node: 'http-request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'http-request': {
				main: [
					[
						{
							node: 'final-result',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		const workflow = await manager.createWorkflow(workflowName, nodes, connections);

		// Save workflow structure to a file for reference
		const outputPath = path.join(__dirname, `airtable-config-workflow-${workflow.id}.json`);
		fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));

		console.log(`Created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Workflow structure saved to: ${outputPath}`);

		return workflow;
	} catch (error) {
		console.error('Error creating Airtable config workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Create a simplified example workflow for testing
 */
async function createSimplifiedConfigWorkflow() {
	try {
		const workflowName = 'Simple Airtable Config Example';
		console.log(`Creating simplified workflow: "${workflowName}"...`);

		// Define workflow nodes
		const nodes = [
			// Start node
			{
				id: 'start-node',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},

			// Simple code node to create sample configuration
			{
				id: 'sample-config',
				name: 'Sample Configuration',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					code: `
// This is a simplified example showing how to structure
// configuration data without requiring Airtable access for testing
return {
  json: {
    // System information
    systemName: "AARAuctions",
    systemWebsite: "https://aarauctions.com/auctions/tax-foreclosures",
    systemType: "Auction",

    // County information
    countyName: "Onondaga",
    countyState: "NY",

    // Auction information
    auctionId: "24-10-onondaga-ny",

    // Configuration values
    API_ENDPOINT: "https://api.example.com/v2",
    API_KEY: "sample-api-key-for-testing",
    INVESTABILITY_THRESHOLD: 5000,
    ENVIRONMENT: "Development",

    // Processing rules example (as would be stored in Airtable)
    PROCESSING_RULES: {
      uppercase: true,
      validateFields: ["name", "email"],
      maxRetries: 3
    }
  }
};
`,
				},
			},

			// HTTP Request example using the configuration
			{
				id: 'api-request',
				name: 'API Request with Config',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 3.1,
				position: [650, 300],
				parameters: {
					url: '={{ $json.API_ENDPOINT }}',
					method: 'POST',
					options: {},
					headers: {
						parameters: [
							{
								name: 'Content-Type',
								value: 'application/json',
							},
							{
								name: 'Authorization',
								value: '={{ "Bearer " + $json.API_KEY }}',
							},
						],
					},
					sendBody: true,
					contentType: 'json',
					body: {
						systemName: '={{ $json.systemName }}',
						countyName: '={{ $json.countyName }}',
						auctionId: '={{ $json.auctionId }}',
						processingRules: '={{ $json.PROCESSING_RULES }}',
						investabilityThreshold: '={{ $json.INVESTABILITY_THRESHOLD }}',
					},
				},
			},
		];

		// Define connections between nodes
		const connections = {
			'start-node': {
				main: [
					[
						{
							node: 'sample-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'sample-config': {
				main: [
					[
						{
							node: 'api-request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		const workflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created simplified workflow: "${workflow.name}" (ID: ${workflow.id})`);

		return workflow;
	} catch (error) {
		console.error('Error creating simplified workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting Airtable Configuration Workflow creation...');

		// Create the full workflow with Airtable integration
		const fullWorkflow = await createAirtableConfigWorkflow();

		// Create a simplified version for testing without Airtable credentials
		const simpleWorkflow = await createSimplifiedConfigWorkflow();

		if (fullWorkflow && simpleWorkflow) {
			console.log('\nSuccessfully created Airtable configuration workflows');
			console.log('\nTo test the workflows:');
			console.log('1. Go to the n8n UI and refresh');
			console.log('2. Set up your Airtable credentials in n8n if you have not already');
			console.log(
				'3. For quick testing without Airtable setup, use the "Simple Airtable Config Example" workflow',
			);
			console.log(
				'4. For the full Airtable integration, use the "Dynamic Airtable Configuration" workflow',
			);
			console.log('   - You will need to set the AIRTABLE_BASE_ID environment variable in n8n');
			console.log('   - The workflow uses the field IDs from your AirtableFields.csv');

			console.log('\nHow this works:');
			console.log('1. Start with an auction ID input');
			console.log('2. Look up the auction details in Airtable');
			console.log('3. Find the county associated with that auction');
			console.log('4. Get the auction system used by that county');
			console.log('5. Fetch all configuration values');
			console.log('6. Format the configuration into a usable structure');
			console.log('7. Use the configuration in an HTTP request (or any other node)');

			showRefreshNotification();
		} else {
			console.error('Failed to create one or both workflows');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
