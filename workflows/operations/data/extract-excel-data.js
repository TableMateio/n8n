/**
 * Extract Excel Data Operation
 *
 * This operation extracts structured data from Excel files.
 * It parses multiple sheets and handles various Excel formats,
 * converting the data into a structured format for further processing.
 */

/**
 * Builds the workflow for Excel data extraction
 */
async function buildWorkflow() {
	// Define the trigger node
	const triggerNode = {
		id: 'trigger',
		name: 'When Called By Another Workflow',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1,
		position: [250, 300],
	};

	// Check Excel format
	const checkExcelFormatNode = {
		id: 'check_excel_format',
		name: 'Check Excel Format',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [450, 300],
		parameters: {
			functionCode: `
        // Extract attachment details from input
        const response = $input.item.json;
        const attachmentUrl = response.url;
        const filename = response.headers?.['content-disposition']
          ? response.headers['content-disposition'].match(/filename="(.+?)"/)?.[1]
          : response.attachments?.[0]?.filename;

        return {
          json: {
            originalResponse: response,
            attachmentUrl: attachmentUrl,
            filename: filename || 'unknown.xlsx',
            isXlsx: filename ? filename.toLowerCase().endsWith('.xlsx') : true,
            isOlderFormat: filename ? filename.toLowerCase().endsWith('.xls') : false,
            contentType: response.headers?.['content-type'] || '',
            auctionInfo: response.auctionInfo || {}
          }
        };
      `,
		},
	};

	// Download the Excel file
	const downloadFileNode = {
		id: 'download_file',
		name: 'Download Excel File',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 3,
		position: [650, 300],
		parameters: {
			url: '={{ $json.attachmentUrl }}',
			method: 'GET',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			options: {
				allowUnauthorizedCerts: true,
				response: {
					response: {
						fullResponse: true,
					},
				},
				redirect: {
					redirect: {
						followRedirects: true,
					},
				},
				proxy: {
					proxy: {
						enabled: false,
					},
				},
				returnFullResponse: true,
			},
			responseFormat: 'file',
		},
		credentials: {
			httpHeaderAuth: {
				id: '1',
				name: 'Airtable Auth',
			},
		},
	};

	// Convert Excel file
	const convertExcelNode = {
		id: 'convert_excel',
		name: 'Convert Excel to Data',
		type: 'n8n-nodes-base.spreadsheetFile',
		typeVersion: 1,
		position: [850, 300],
		parameters: {
			operation: 'fromFile',
			options: {
				headerRow: true,
				includeEmptyCells: false,
				readAsString: false,
			},
		},
	};

	// Process Excel data
	const processExcelDataNode = {
		id: 'process_excel_data',
		name: 'Process Excel Data',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 300],
		parameters: {
			functionCode: `
        // Get the converted data
        const sheets = $input.item.json.data || {};
        const auctionInfo = $json.auctionInfo || {};

        // Will store our final data
        let allData = [];

        // Process each sheet
        if (typeof sheets === 'object' && sheets !== null) {
          // Handle different structures:
          // 1. Multiple sheets as object with sheet names as keys
          if (Object.keys(sheets).length > 0 && Array.isArray(sheets[Object.keys(sheets)[0]])) {
            for (const sheetName in sheets) {
              const sheetData = sheets[sheetName];
              if (Array.isArray(sheetData) && sheetData.length > 0) {
                // Add sheet data to the combined data
                allData = allData.concat(sheetData);
              }
            }
          }
          // 2. Single sheet as array directly
          else if (Array.isArray(sheets)) {
            allData = sheets;
          }
          // 3. Array in "data" property
          else if (sheets.data && Array.isArray(sheets.data)) {
            allData = sheets.data;
          }
        }

        // If we still don't have data, check if the original response has a different structure
        if (allData.length === 0) {
          const response = $input.item.json;

          // Try to find data in other common locations
          if (response.sheet && Array.isArray(response.sheet)) {
            allData = response.sheet;
          } else if (response.items && Array.isArray(response.items)) {
            allData = response.items;
          } else if (response.rows && Array.isArray(response.rows)) {
            allData = response.rows;
          }
        }

        // Clean data: remove entirely empty rows and normalize data types
        const cleanedData = allData.filter(row => {
          // Skip if not an object
          if (!row || typeof row !== 'object') return false;

          // Check if any cell has a value
          return Object.values(row).some(cell => cell !== null && cell !== undefined && cell !== '');
        }).map(row => {
          // Convert any date objects to ISO strings
          const cleanedRow = {};
          for (const key in row) {
            let value = row[key];

            // Convert dates to strings
            if (value instanceof Date) {
              value = value.toISOString();
            }

            // Ensure numbers are recognized as numbers
            if (typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value))) {
              // Check if it's likely a number (not a case number, ID, etc)
              if (!key.toLowerCase().includes('case') &&
                  !key.toLowerCase().includes('number') &&
                  !key.toLowerCase().includes('id')) {
                value = parseFloat(value);
              }
            }

            cleanedRow[key] = value;
          }

          return cleanedRow;
        });

        return {
          json: {
            data: cleanedData,
            sheetCount: Object.keys(sheets).length,
            rowCount: cleanedData.length,
            auctionInfo
          }
        };
      `,
		},
	};

	// Handle special case of binary data
	const handleBinaryDataNode = {
		id: 'handle_binary_data',
		name: 'Handle Binary Data',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 450],
		parameters: {
			functionCode: `
        // In some cases, the Excel file might not be properly parsed
        // This is a fallback to extract data from the binary content

        const response = $input.item.json.originalResponse;
        const auctionInfo = $input.item.json.auctionInfo || {};

        // Mock data structure if we can't extract from Excel
        // This allows the process to continue with minimal data
        const fallbackData = [];

        // Try to extract basic info from the filename
        const filename = $input.item.json.filename || '';
        if (filename) {
          // Try to extract auction date from filename
          const dateMatch = filename.match(/(\\d{1,2}[_-]\\d{1,2}[_-]\\d{2,4}|\\d{4}[_-]\\d{1,2}[_-]\\d{1,2})/);
          const countyMatch = filename.match(/([A-Z][a-z]+)(?:\\s+County|\\s+Foreclosure|\\s+List)/i);

          if (dateMatch || countyMatch) {
            fallbackData.push({
              filename,
              possibleDate: dateMatch ? dateMatch[1] : '',
              possibleCounty: countyMatch ? countyMatch[1] : '',
              status: 'Extracted from filename only'
            });
          }
        }

        return {
          json: {
            data: fallbackData,
            status: 'fallback',
            message: 'Could not properly parse Excel file, using fallback data',
            auctionInfo
          }
        };
      `,
		},
	};

	// Error handling node
	const handleErrorNode = {
		id: 'handle_error',
		name: 'Handle Error',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 600],
		parameters: {
			functionCode: `
        // Get error information
        const error = $input.item.json.error || 'Unknown error';
        const auctionInfo = $input.prevItem?.json?.auctionInfo || {};

        return {
          json: {
            data: [],
            status: 'error',
            message: 'Failed to process Excel file: ' + error,
            auctionInfo
          }
        };
      `,
		},
	};

	// Merge results
	const mergeResultsNode = {
		id: 'merge_results',
		name: 'Merge Results',
		type: 'n8n-nodes-base.merge',
		typeVersion: 2,
		position: [1250, 300],
		parameters: {
			mode: 'mergeByPosition',
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: checkExcelFormatNode.id, type: 'main', index: 0 }]],
		},
		[checkExcelFormatNode.id]: {
			main: [[{ node: downloadFileNode.id, type: 'main', index: 0 }]],
		},
		[downloadFileNode.id]: {
			main: [[{ node: convertExcelNode.id, type: 'main', index: 0 }]],
			error: [[{ node: handleErrorNode.id, type: 'main', index: 0 }]],
		},
		[convertExcelNode.id]: {
			main: [[{ node: processExcelDataNode.id, type: 'main', index: 0 }]],
			error: [[{ node: handleBinaryDataNode.id, type: 'main', index: 0 }]],
		},
		[processExcelDataNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]],
		},
		[handleBinaryDataNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 1 }]],
		},
		[handleErrorNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 2 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Extract Excel Data',
		nodes: [
			triggerNode,
			checkExcelFormatNode,
			downloadFileNode,
			convertExcelNode,
			processExcelDataNode,
			handleBinaryDataNode,
			handleErrorNode,
			mergeResultsNode,
		],
		connections,
		active: false,
		settings: {
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
		},
		tags: ['operation', 'data', 'excel', 'spreadsheet'],
		triggerCount: 1,
	};
}

module.exports = { buildWorkflow };
