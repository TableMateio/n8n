/**
 * Extract Surplus List Process
 *
 * This process extracts foreclosure information from a surplus list attachment
 * and creates Foreclosure records in Airtable.
 */

const AIRTABLE_REFERENCE = require('../../../utils/airtable/reference');

/**
 * Builds the process workflow
 */
async function buildWorkflow() {
	// In the future, this will use the WorkflowManager
	// const manager = new WorkflowManager();

	// For now, return the nodes and connections directly

	// Define the trigger node
	const triggerNode = {
		id: 'trigger',
		name: 'When Called By Another Workflow',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1,
		position: [250, 300],
	};

	// Get the auction attachment
	const getAttachmentNode = {
		id: 'get_attachment',
		name: 'Get Attachment',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 3,
		position: [450, 300],
		parameters: {
			url: '={{ $json.attachments[0].url }}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			options: {
				allowUnauthorizedCerts: true,
				redirect: {
					redirect: {
						followRedirects: true,
					},
				},
				response: {
					response: {
						fullResponse: true,
					},
				},
			},
		},
		credentials: {
			httpHeaderAuth: {
				id: '1',
				name: 'Airtable Auth',
			},
		},
	};

	// Identify the file type and extract text accordingly
	const identifyFileTypeNode = {
		id: 'identify_file_type',
		name: 'Identify File Type',
		type: 'n8n-nodes-base.switch',
		typeVersion: 1,
		position: [650, 300],
		parameters: {
			rules: {
				rules: [
					{
						conditions: [
							{
								id: '1',
								value1: '={{ $json.attachments[0].filename.toLowerCase().endsWith(".pdf") }}',
								operation: 'equal',
								value2: 'true',
								options: {},
							},
						],
					},
					{
						conditions: [
							{
								id: '2',
								value1:
									'={{ $json.attachments[0].filename.toLowerCase().endsWith(".xlsx") || $json.attachments[0].filename.toLowerCase().endsWith(".xls") }}',
								operation: 'equal',
								value2: 'true',
								options: {},
							},
						],
					},
					{
						conditions: [
							{
								id: '3',
								value1: '={{ $json.attachments[0].filename.toLowerCase().endsWith(".csv") }}',
								operation: 'equal',
								value2: 'true',
								options: {},
							},
						],
					},
				],
			},
			options: {
				fallbackOutput: '4', // Default branch for unsupported file types
			},
		},
	};

	// Extract text from PDF
	const extractPdfTextNode = {
		id: 'extract_pdf_text',
		name: 'Extract PDF Text',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [850, 200],
		parameters: {
			workflowId: '={{ $env.OPERATION_EXTRACT_PDF_TEXT_ID }}',
			dataType: 'entireJson',
		},
	};

	// Extract data from Excel
	const extractExcelDataNode = {
		id: 'extract_excel_data',
		name: 'Extract Excel Data',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [850, 300],
		parameters: {
			workflowId: '={{ $env.OPERATION_EXTRACT_EXCEL_DATA_ID }}',
			dataType: 'entireJson',
		},
	};

	// Parse CSV data
	const parseCsvDataNode = {
		id: 'parse_csv_data',
		name: 'Parse CSV Data',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [850, 400],
		parameters: {
			workflowId: '={{ $env.OPERATION_PARSE_CSV_DATA_ID }}',
			dataType: 'entireJson',
		},
	};

	// Handle unsupported file type
	const unsupportedFileTypeNode = {
		id: 'unsupported_file_type',
		name: 'Log Unsupported File Type',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 500],
		parameters: {
			functionCode: `
        // Log error for unsupported file type
        console.log('Unsupported file type:', $json.attachments[0].filename);

        // Return empty result
        return {
          json: {
            error: 'Unsupported file type',
            filename: $json.attachments[0].filename
          }
        };
      `,
		},
	};

	// Merge results from different file types
	const mergeResultsNode = {
		id: 'merge_results',
		name: 'Merge Results',
		type: 'n8n-nodes-base.merge',
		typeVersion: 2,
		position: [1050, 300],
		parameters: {
			mode: 'mergeByPosition',
		},
	};

	// Parse extracted data to identify foreclosures
	const parseForeclosuresNode = {
		id: 'parse_foreclosures',
		name: 'Parse Foreclosures',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [1250, 300],
		parameters: {
			workflowId: '={{ $env.OPERATION_PARSE_FORECLOSURES_ID }}',
			dataType: 'entireJson',
		},
	};

	// Transform data into Airtable format
	const formatForAirtableNode = {
		id: 'format_for_airtable',
		name: 'Format for Airtable',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1450, 300],
		parameters: {
			functionCode: `
        // Get the foreclosures data
        const foreclosures = $input.item.json.foreclosures;
        const auctionInfo = {
          id: $input.item.json.recordId,
          name: $input.item.json.auctionName,
          county: $input.item.json.county,
          date: $input.item.json.date
        };

        if (!foreclosures || !Array.isArray(foreclosures) || foreclosures.length === 0) {
          return {
            json: {
              success: false,
              message: 'No foreclosures found to process',
              auctionInfo
            }
          };
        }

        // Format each foreclosure for Airtable
        const formattedForeclosures = foreclosures.map(foreclosure => {
          return {
            // Map foreclosure fields to Airtable fields
            "Case Number": foreclosure.caseNumber,
            "Property Address": foreclosure.propertyAddress,
            "Owner Name": foreclosure.ownerName,
            "Parcel ID": foreclosure.parcelId,
            "Sale Amount": foreclosure.saleAmount,
            "Auction": [auctionInfo.id], // Link to the auction record
            "County": auctionInfo.county,
            "Status": "New",
            "Source": "Surplus List"
          };
        });

        return {
          json: {
            success: true,
            foreclosures: formattedForeclosures,
            count: formattedForeclosures.length,
            auctionInfo
          }
        };
      `,
		},
	};

	// Create foreclosures in Airtable
	const createForeclosuresNode = {
		id: 'create_foreclosures',
		name: 'Create Foreclosures',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 1,
		position: [1650, 300],
		parameters: {
			application: AIRTABLE_REFERENCE.BASE_ID,
			table: AIRTABLE_REFERENCE.TABLES.FORECLOSURES,
			operation: 'create',
			typecast: true,
		},
		credentials: {
			airtableApi: {
				id: '1',
				name: 'Airtable account',
			},
		},
		inputName: 'Create Many',
		inputsItem: {
			json: {
				additionalFields: {
					string: {
						rawValue: '={{ $json.foreclosures }}',
					},
				},
			},
		},
	};

	// Update auction record with processing status
	const updateAuctionNode = {
		id: 'update_auction',
		name: 'Update Auction Status',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 1,
		position: [1850, 300],
		parameters: {
			application: AIRTABLE_REFERENCE.BASE_ID,
			table: AIRTABLE_REFERENCE.TABLES.AUCTIONS,
			operation: 'update',
			id: '={{ $json.auctionInfo.id }}',
			additionalFields: {
				'Surplus List Processed': true,
				'Foreclosures Imported': '={{ $json.count }}',
				'Last Process Date': '={{ $now }}',
			},
		},
		credentials: {
			airtableApi: {
				id: '1',
				name: 'Airtable account',
			},
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: getAttachmentNode.id, type: 'main', index: 0 }]],
		},
		[getAttachmentNode.id]: {
			main: [[{ node: identifyFileTypeNode.id, type: 'main', index: 0 }]],
		},
		[identifyFileTypeNode.id]: {
			main: [
				[{ node: extractPdfTextNode.id, type: 'main', index: 0 }], // PDF branch
				[{ node: extractExcelDataNode.id, type: 'main', index: 0 }], // Excel branch
				[{ node: parseCsvDataNode.id, type: 'main', index: 0 }], // CSV branch
				[{ node: unsupportedFileTypeNode.id, type: 'main', index: 0 }], // Unsupported branch
			],
		},
		[extractPdfTextNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]],
		},
		[extractExcelDataNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 1 }]],
		},
		[parseCsvDataNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 2 }]],
		},
		[unsupportedFileTypeNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 3 }]],
		},
		[mergeResultsNode.id]: {
			main: [[{ node: parseForeclosuresNode.id, type: 'main', index: 0 }]],
		},
		[parseForeclosuresNode.id]: {
			main: [[{ node: formatForAirtableNode.id, type: 'main', index: 0 }]],
		},
		[formatForAirtableNode.id]: {
			main: [[{ node: createForeclosuresNode.id, type: 'main', index: 0 }]],
		},
		[createForeclosuresNode.id]: {
			main: [[{ node: updateAuctionNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Extract Surplus List',
		nodes: [
			triggerNode,
			getAttachmentNode,
			identifyFileTypeNode,
			extractPdfTextNode,
			extractExcelDataNode,
			parseCsvDataNode,
			unsupportedFileTypeNode,
			mergeResultsNode,
			parseForeclosuresNode,
			formatForAirtableNode,
			createForeclosuresNode,
			updateAuctionNode,
		],
		connections,
		active: false,
		settings: {
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
		},
		tags: ['process', 'auction', 'foreclosure'],
		triggerCount: 1,
	};
}

module.exports = { buildWorkflow };
