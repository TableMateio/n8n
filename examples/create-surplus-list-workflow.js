#!/usr/bin/env node

/**
 * Surplus List Processing Workflow Creator
 *
 * This script creates a workflow that:
 * 1. Detects when an Auction record in Airtable is updated with a Surplus List attachment
 * 2. Downloads and extracts data from the PDF
 * 3. Creates Foreclosure records from the extracted data
 *
 * This demonstrates how to build a complex workflow using the WorkflowBuilder utility.
 */

require('dotenv').config({ path: '.env.mcp' });
const WorkflowBuilder = require('../utils/generators/workflow-builder');
const NodeFactory = require('../utils/generators/node-factory');

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load environment variables
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_AUCTION_TABLE_ID = process.env.AIRTABLE_AUCTION_TABLE_ID;
const AIRTABLE_FORECLOSURE_TABLE_ID = process.env.AIRTABLE_FORECLOSURE_TABLE_ID;

if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
	console.error('Error: Airtable environment variables are not set.');
	console.error('Please set AIRTABLE_BASE_ID and AIRTABLE_API_KEY in your .env.mcp file.');
	process.exit(1);
}

/**
 * Utility to display a highly visible refresh notification
 */
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

/**
 * Creates the Surplus List processing workflow
 */
async function createSurplusListWorkflow() {
	try {
		console.log('Creating Surplus List processing workflow...');

		// Create a new workflow builder instance
		const builder = new WorkflowBuilder();

		// Set workflow properties
		builder.setName('Surplus List Processor');
		builder.setActive(false); // Set to false initially for testing
		builder.addTags(['airtable', 'pdf', 'foreclosure']);

		// 1. Add Airtable trigger node
		const triggerId = builder.addNode({
			name: 'Airtable Trigger',
			type: 'n8n-nodes-base.airtableTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {
				application: AIRTABLE_BASE_ID,
				table: AIRTABLE_AUCTION_TABLE_ID,
				operation: 'update',
				typeOperation: 'recordUpdated',
			},
		});

		// 2. Add a Function node to check if Surplus List field was updated
		const checkSurplusListId = builder.addNode({
			name: 'Check Surplus List Update',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [450, 300],
			parameters: {
				functionCode: `
// Check if the Surplus List field was updated
const record = $input.item.json;
const surplusList = record.fields["Surplus List"];

// If there's no attachment or the Surplus List field is empty, skip this record
if (!surplusList || surplusList.length === 0) {
  console.log('No Surplus List attachment found, skipping record');
  return [];
}

// Otherwise, return the record with attachment info
console.log('Found Surplus List attachment, processing record');
return {
  json: {
    recordId: record.id,
    attachments: surplusList,
    firstAttachment: surplusList[0],
    auctionName: record.fields["Auction Name"] || "Unknown Auction",
    auctionDate: record.fields["Auction Date"] || null,
    county: record.fields["County"] || "Unknown County"
  }
};`,
			},
		});

		// 3. Add a Switch node to handle cases with or without attachments
		const switchId = builder.addNode({
			name: 'Has Attachment?',
			type: 'n8n-nodes-base.switch',
			typeVersion: 3.2, // Use the latest version
			position: [650, 300],
			parameters: {
				rules: {
					values: [
						{
							outputKey: 'Has Attachment',
							conditions: {
								options: {
									version: 2,
									caseSensitive: true,
									typeValidation: 'strict',
								},
								combinator: 'and',
								conditions: [
									{
										operator: {
											type: 'arrayLength',
											operation: 'largerEqual',
										},
										leftValue: '={{ $json.attachments ? $json.attachments.length : 0 }}',
										rightValue: 1,
									},
								],
							},
							renameOutput: true,
						},
						{
							outputKey: 'No Attachment',
							conditions: {
								options: {
									version: 2,
									caseSensitive: true,
								},
								combinator: 'and',
								conditions: [], // Empty conditions for default case
							},
							renameOutput: true,
						},
					],
				},
				options: {},
			},
		});

		// 4. Add HTTP Request node to download the PDF
		const downloadPdfId = builder.addNode({
			name: 'Download PDF',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [850, 200],
			parameters: {
				url: '={{ $json.firstAttachment.url }}',
				method: 'GET',
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'airtableApi',
				responseFormat: 'file',
			},
		});

		// 5. Add PDF Extract node
		const pdfExtractId = builder.addNode({
			name: 'Extract PDF Text',
			type: 'n8n-nodes-base.pdfExtract',
			typeVersion: 1,
			position: [1050, 200],
			parameters: {
				dataPropertyName: 'data',
			},
		});

		// 6. Add Function node to parse the PDF content
		const parsePdfId = builder.addNode({
			name: 'Parse PDF Content',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [1250, 200],
			parameters: {
				functionCode: `
// Get the PDF text content
const pdfText = $input.item.json.text;

// Create regular expressions for the data we want to extract
const parcelRegex = /Parcel(?:ID|\\s#|\\sNumber)?:?\\s*([A-Z0-9-]+)/i;
const addressRegex = /(\\d+\\s+[^,]+,\\s*[^,]+,\\s*[A-Z]{2}\\s*\\d{5})/i;
const ownerRegex = /Owner(?:'s)?\\s*Name:?\\s*([^\\n]+)/i;
const amountRegex = /\\$\\s*(\\d{1,3}(?:,\\d{3})*\\.?\\d*)/;

// Function to extract data using regex
function extractWithRegex(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// Process each page of text
const lines = pdfText.split('\\n');
const foreclosures = [];
let currentForeclosure = {};

for (const line of lines) {
  // Check for a parcel ID - usually indicates a new property
  const parcelMatch = line.match(parcelRegex);
  if (parcelMatch) {
    // If we have data for the previous property, save it
    if (currentForeclosure.parcelId) {
      foreclosures.push({...currentForeclosure});
    }

    // Start a new property
    currentForeclosure = {
      parcelId: parcelMatch[1].trim(),
      auctionId: $input.item.json.recordId,
      auctionName: $input.item.json.auctionName,
      auctionDate: $input.item.json.auctionDate,
      county: $input.item.json.county,
      surplusListUrl: $input.item.json.firstAttachment.url
    };
  }

  // Extract other details
  if (!currentForeclosure.address) {
    const addressMatch = line.match(addressRegex);
    if (addressMatch) {
      currentForeclosure.address = addressMatch[1].trim();
    }
  }

  if (!currentForeclosure.owner) {
    const ownerMatch = line.match(ownerRegex);
    if (ownerMatch) {
      currentForeclosure.owner = ownerMatch[1].trim();
    }
  }

  if (!currentForeclosure.amount) {
    const amountMatch = line.match(amountRegex);
    if (amountMatch) {
      currentForeclosure.amount = amountMatch[1].trim();
    }
  }
}

// Don't forget the last property
if (currentForeclosure.parcelId) {
  foreclosures.push({...currentForeclosure});
}

// If we found foreclosures, return them
if (foreclosures.length > 0) {
  console.log(\`Found \${foreclosures.length} foreclosures in the PDF\`);
  return foreclosures.map(f => ({ json: f }));
} else {
  console.log('No foreclosures found in the PDF');
  return { json: { error: 'No foreclosures found in PDF' } };
}`,
			},
		});

		// 7. Add Airtable node to create Foreclosure records
		const createForeclosuresId = builder.addNode({
			name: 'Create Foreclosure Records',
			type: 'n8n-nodes-base.airtable',
			typeVersion: 1,
			position: [1450, 200],
			parameters: {
				application: AIRTABLE_BASE_ID,
				table: AIRTABLE_FORECLOSURE_TABLE_ID,
				operation: 'create',
				fields: {
					'Parcel ID': '={{ $json.parcelId }}',
					Address: '={{ $json.address }}',
					Owner: '={{ $json.owner }}',
					Amount: '={{ $json.amount }}',
					Auction: '={{ [$json.auctionId] }}',
					County: '={{ $json.county }}',
					Source: 'Surplus List PDF',
					Status: 'New',
				},
			},
		});

		// 8. Add a final No Operation node for the "No Attachment" branch
		const noOpId = builder.addNode({
			name: 'No Action Needed',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [850, 400],
			parameters: {},
		});

		// Connect the nodes
		// Main flow
		builder.connectNodes({ sourceNode: triggerId, targetNode: checkSurplusListId });
		builder.connectNodes({ sourceNode: checkSurplusListId, targetNode: switchId });

		// Branch 1: Has attachment - Process the PDF
		builder.connectNodes({ sourceNode: switchId, targetNode: downloadPdfId, sourceOutput: 0 });
		builder.connectNodes({ sourceNode: downloadPdfId, targetNode: pdfExtractId });
		builder.connectNodes({ sourceNode: pdfExtractId, targetNode: parsePdfId });
		builder.connectNodes({ sourceNode: parsePdfId, targetNode: createForeclosuresId });

		// Branch 2: No attachment - No action needed
		builder.connectNodes({ sourceNode: switchId, targetNode: noOpId, sourceOutput: 1 });

		// Create the workflow
		const workflow = await builder.createWorkflow();

		console.log(`Created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Node count: ${workflow.nodes.length}`);

		// Log node details
		console.log('\nNode details:');
		workflow.nodes.forEach((node) => {
			console.log(`- ${node.name} (${node.type})`);
		});

		console.log('\nWorkflow created successfully!');
		console.log(
			'Note: You will need to create Airtable API credentials in n8n to use this workflow.',
		);

		showRefreshNotification();
		return workflow;
	} catch (error) {
		console.error('Error creating Surplus List workflow:', error.message);
		if (error.response && error.response.data) {
			console.error('Server response:', JSON.stringify(error.response.data, null, 2));
		}
		throw error;
	}
}

/**
 * Run the creator
 */
async function run() {
	try {
		console.log('Starting Surplus List workflow creation...');

		// Create the workflow
		await createSurplusListWorkflow();

		console.log('\nWorkflow creation completed!');
		console.log('Please review the workflow in n8n and set up any necessary credentials.');

		showRefreshNotification();
	} catch (error) {
		console.error('Error running workflow creator:', error.message);
		console.error(error.stack);
	}
}

// Run the creator
run();
