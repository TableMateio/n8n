/**
 * Parse Foreclosures Operation
 *
 * This operation parses raw text data from surplus lists to extract foreclosure information.
 * It adapts to different formats and structures to reliably extract case numbers, property addresses,
 * owner names, parcel IDs, and sale amounts.
 */

/**
 * Builds the workflow for parsing foreclosure data from various text formats
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

	// Clean and normalize the extracted text
	const normalizeTextNode = {
		id: 'normalize_text',
		name: 'Normalize Text',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [450, 300],
		parameters: {
			functionCode: `
        // Get the input text or data from the incoming workflow
        let textContent = '';

        // Handle different input formats
        if ($input.item.json.data) {
          // Excel or CSV data might come as structured data
          return {
            json: {
              inputType: 'structured',
              data: $input.item.json.data,
              auctionInfo: $input.item.json.auctionInfo || {}
            }
          };
        } else if ($input.item.json.text) {
          // Text content from PDF
          textContent = $input.item.json.text;
        } else if ($input.item.json.body && typeof $input.item.json.body === 'string') {
          // Raw response body
          textContent = $input.item.json.body;
        } else if ($input.item.json.data && typeof $input.item.json.data === 'string') {
          // Another possible field name
          textContent = $input.item.json.data;
        } else {
          // Try to find any string property that might contain the text
          for (const key in $input.item.json) {
            if (typeof $input.item.json[key] === 'string' && $input.item.json[key].length > 100) {
              textContent = $input.item.json[key];
              break;
            }
          }
        }

        // Clean up the text
        textContent = textContent
          .replace(/\\r\\n/g, '\\n')  // Normalize line endings
          .replace(/\\t/g, ' ')       // Replace tabs with spaces
          .replace(/\\s+/g, ' ')      // Replace multiple spaces with single space
          .replace(/\\n\\s+/g, '\\n')  // Remove leading spaces after newlines
          .trim();                    // Trim excess whitespace

        return {
          json: {
            inputType: 'text',
            text: textContent,
            auctionInfo: $input.item.json.auctionInfo || {}
          }
        };
      `,
		},
	};

	// Branch based on input type
	const branchByInputNode = {
		id: 'branch_by_input_type',
		name: 'Branch By Input Type',
		type: 'n8n-nodes-base.if',
		typeVersion: 1,
		position: [650, 300],
		parameters: {
			conditions: [
				{
					id: '1',
					name: 'structured',
					type: 'string',
					value1: '={{ $json.inputType }}',
					operation: 'equal',
					value2: 'structured',
				},
			],
		},
	};

	// Handle structured data (Excel/CSV)
	const parseStructuredDataNode = {
		id: 'parse_structured_data',
		name: 'Parse Structured Data',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 200],
		parameters: {
			functionCode: `
        const data = $input.item.json.data;
        const auctionInfo = $input.item.json.auctionInfo || {};
        const foreclosures = [];

        // Detect the structure - try to identify header row and column structure
        if (Array.isArray(data) && data.length > 0) {
          // Attempt to find column indexes of important fields
          let headers = data[0];
          let headerIndexes = {};

          // Define possible column names for each field type
          const fieldNameMappings = {
            caseNumber: ['case number', 'case #', 'case no', 'case', 'number', 'file number'],
            propertyAddress: ['property address', 'address', 'location', 'property location'],
            ownerName: ['owner', 'owner name', 'name', 'defendant', 'borrower'],
            parcelId: ['parcel', 'parcel id', 'tax id', 'tax number', 'pin', 'property id'],
            saleAmount: ['sale amount', 'amount', 'final bid', 'bid amount', 'sale price']
          };

          // Find the index for each field
          if (Array.isArray(headers)) {
            Object.keys(fieldNameMappings).forEach(fieldType => {
              const possibleNames = fieldNameMappings[fieldType];
              for (let i = 0; i < headers.length; i++) {
                if (headers[i] && typeof headers[i] === 'string') {
                  const headerText = headers[i].toLowerCase().trim();
                  if (possibleNames.some(name => headerText.includes(name))) {
                    headerIndexes[fieldType] = i;
                    break;
                  }
                }
              }
            });
          }

          // Process each row
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.every(cell => !cell)) continue; // Skip empty rows

            const foreclosure = {};

            // Extract fields using detected indexes
            Object.keys(headerIndexes).forEach(fieldType => {
              const index = headerIndexes[fieldType];
              if (index !== undefined && row[index]) {
                foreclosure[fieldType] = row[index].toString().trim();
              }
            });

            // If we found any data, add to foreclosures
            if (Object.keys(foreclosure).length > 0) {
              // Try to extrapolate missing fields
              if (!foreclosure.caseNumber && row.some(cell => cell && /\\d{2}-?[A-Z]{2}-?\\d{3,6}/i.test(cell))) {
                foreclosure.caseNumber = row.find(cell => cell && /\\d{2}-?[A-Z]{2}-?\\d{3,6}/i.test(cell));
              }

              foreclosures.push(foreclosure);
            }
          }
        }

        return {
          json: {
            foreclosures,
            recordId: auctionInfo.id,
            auctionName: auctionInfo.name,
            county: auctionInfo.county,
            date: auctionInfo.date,
            count: foreclosures.length
          }
        };
      `,
		},
	};

	// Parse text data (PDF)
	const parseTextDataNode = {
		id: 'parse_text_data',
		name: 'Parse Text Data',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 400],
		parameters: {
			functionCode: `
        const text = $input.item.json.text;
        const auctionInfo = $input.item.json.auctionInfo || {};
        const foreclosures = [];

        // Try to determine the format of the text

        // Format 1: Table-like structure with columns
        // Look for clear sections with headers
        if (text.match(/case.+address.+owner|property.+case.+amount/i)) {
          // Split into lines and process
          const lines = text.split('\\n');
          let currentForeclosure = null;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Check if this looks like a header line
            if (line.match(/case|number|property|address|owner|amount/i) &&
                !line.match(/\\d{5,}|\\$\\d+/)) {
              continue; // Skip header lines
            }

            // Check if this looks like the start of a new foreclosure entry
            if (line.match(/\\d{2}-[A-Z]{2}-\\d{3,6}|\\d{4}[A-Z]{2}\\d{3,6}/i)) {
              // If we were building a foreclosure before, add it to the list
              if (currentForeclosure && Object.keys(currentForeclosure).length > 0) {
                foreclosures.push(currentForeclosure);
              }

              // Start a new foreclosure
              currentForeclosure = {};

              // Try to extract case number
              const caseNumberMatch = line.match(/(\\d{2}-[A-Z]{2}-\\d{3,6}|\\d{4}[A-Z]{2}\\d{3,6})/i);
              if (caseNumberMatch) {
                currentForeclosure.caseNumber = caseNumberMatch[0];
              }

              // The rest of the line may have address and/or owner
              const remainingText = line.replace(caseNumberMatch ? caseNumberMatch[0] : '', '').trim();

              // Try to identify if it contains an address
              if (remainingText.match(/\\d+.+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd)/i)) {
                currentForeclosure.propertyAddress = remainingText;
              } else if (remainingText.match(/[A-Z][a-z]+ [A-Z][a-z]+/)) {
                currentForeclosure.ownerName = remainingText;
              }
            }
            // If we're already working on a foreclosure, try to fill in missing fields
            else if (currentForeclosure) {
              // Check for property address
              if (!currentForeclosure.propertyAddress &&
                  line.match(/\\d+.+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd)/i)) {
                currentForeclosure.propertyAddress = line;
              }
              // Check for owner name - typically names are capitalized words without numbers
              else if (!currentForeclosure.ownerName &&
                       line.match(/^[A-Z][a-z]+ [A-Z][a-z]+/) &&
                       !line.match(/\\d+/)) {
                currentForeclosure.ownerName = line;
              }
              // Check for parcel ID - typically numbers with dashes or dots
              else if (!currentForeclosure.parcelId &&
                       line.match(/\\d{2,3}[-.\\s]\\d{2,3}[-.\\s]\\d{2,3}/)) {
                currentForeclosure.parcelId = line;
              }
              // Check for sale amount - typically has dollar sign and numbers
              else if (!currentForeclosure.saleAmount &&
                       line.match(/\\$\\s*\\d+[,\\d]*\\.?\\d*/)) {
                const amountMatch = line.match(/(\\$\\s*\\d+[,\\d]*\\.?\\d*)/);
                if (amountMatch) {
                  currentForeclosure.saleAmount = amountMatch[0];
                }
              }
            }
          }

          // Add the last foreclosure if we were working on one
          if (currentForeclosure && Object.keys(currentForeclosure).length > 0) {
            foreclosures.push(currentForeclosure);
          }
        }

        // Format 2: Section blocks for each foreclosure
        else if (text.match(/case\\s+no.+:\\s+\\d|property\\s+address\\s*:/i)) {
          // Identify sections divided by consistent patterns
          const sections = text.split(/(?:^|\\n)(?=case\\s+no|property\\s*:|parcel|sale date)/im);

          for (const section of sections) {
            if (!section.trim()) continue;

            const foreclosure = {};

            // Extract case number
            const caseMatch = section.match(/case\\s+(?:no|number)[.:]?\\s*(\\d{2}[-\\s]?[A-Z]{2}[-\\s]?\\d{3,6})/i);
            if (caseMatch) {
              foreclosure.caseNumber = caseMatch[1];
            }

            // Extract property address
            const addressMatch = section.match(/property\\s+address[.:]?\\s*(.+?)(?=\\n|$)/i);
            if (addressMatch) {
              foreclosure.propertyAddress = addressMatch[1].trim();
            }

            // Extract owner name
            const ownerMatch = section.match(/(?:owner|defendant)[.:]?\\s*(.+?)(?=\\n|$)/i);
            if (ownerMatch) {
              foreclosure.ownerName = ownerMatch[1].trim();
            }

            // Extract parcel ID
            const parcelMatch = section.match(/(?:parcel|tax)[\\s.:](?:id|number)?[.:]?\\s*([\\d\\-\\.]+)/i);
            if (parcelMatch) {
              foreclosure.parcelId = parcelMatch[1].trim();
            }

            // Extract sale amount
            const amountMatch = section.match(/(?:amount|sale price|final bid)[.:]?\\s*(\\$\\s*\\d+[,\\d]*\\.?\\d*)/i);
            if (amountMatch) {
              foreclosure.saleAmount = amountMatch[1].trim();
            }

            // If we found any data, add to foreclosures
            if (Object.keys(foreclosure).length > 0) {
              foreclosures.push(foreclosure);
            }
          }
        }

        // Format 3: Try to find case numbers and context around them
        else {
          // Find case numbers and context
          const caseMatches = [...text.matchAll(/(\\d{2}[-\\s]?[A-Z]{2}[-\\s]?\\d{3,6})/gi)];

          for (const match of caseMatches) {
            const caseNumber = match[1];
            const index = match.index;

            // Get surrounding context - about 200 chars before and after
            const startIndex = Math.max(0, index - 200);
            const endIndex = Math.min(text.length, index + 200);
            const context = text.substring(startIndex, endIndex);

            const foreclosure = {
              caseNumber: caseNumber.replace(/\\s+/g, '-')
            };

            // Try to find address in context
            const addressMatch = context.match(/\\d+[^\\n.]{5,50}(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd)/i);
            if (addressMatch) {
              foreclosure.propertyAddress = addressMatch[0].trim();
            }

            // Try to find owner name
            const ownerMatch = context.match(/(?:owner|defendant)[\\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/i);
            if (ownerMatch) {
              foreclosure.ownerName = ownerMatch[1].trim();
            }

            // Try to find parcel ID
            const parcelMatch = context.match(/(?:parcel|tax)[\\s.:](?:id|number)?[.:]?\\s*([\\d\\-\\.]+)/i);
            if (parcelMatch) {
              foreclosure.parcelId = parcelMatch[1].trim();
            }

            // Try to find sale amount
            const amountMatch = context.match(/(?:amount|sale price|bid)[.:]?\\s*(\\$\\s*\\d+[,\\d]*\\.?\\d*)/i);
            if (amountMatch) {
              foreclosure.saleAmount = amountMatch[1].trim();
            }

            foreclosures.push(foreclosure);
          }
        }

        return {
          json: {
            foreclosures,
            recordId: auctionInfo.id,
            auctionName: auctionInfo.name,
            county: auctionInfo.county,
            date: auctionInfo.date,
            count: foreclosures.length
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
		position: [1050, 300],
		parameters: {
			mode: 'mergeByPosition',
		},
	};

	// Clean and validate extracted data
	const cleanDataNode = {
		id: 'clean_data',
		name: 'Clean & Validate Data',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1250, 300],
		parameters: {
			functionCode: `
        const data = $input.item.json;
        const foreclosures = data.foreclosures || [];

        // Clean and validate each foreclosure
        const cleanedForeclosures = foreclosures.map(foreclosure => {
          // Standardize case number format
          if (foreclosure.caseNumber) {
            foreclosure.caseNumber = foreclosure.caseNumber
              .replace(/\\s+/g, '-')  // Replace spaces with hyphens
              .toUpperCase();         // Convert to uppercase
          }

          // Standardize property address
          if (foreclosure.propertyAddress) {
            foreclosure.propertyAddress = foreclosure.propertyAddress
              .replace(/\\s+/g, ' ')  // Replace multiple spaces with single space
              .trim();                // Trim any excess whitespace
          }

          // Standardize owner name
          if (foreclosure.ownerName) {
            foreclosure.ownerName = foreclosure.ownerName
              .replace(/\\s+/g, ' ')  // Replace multiple spaces with single space
              .trim();                // Trim any excess whitespace

            // Add title case formatting
            foreclosure.ownerName = foreclosure.ownerName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }

          // Standardize parcel ID
          if (foreclosure.parcelId) {
            foreclosure.parcelId = foreclosure.parcelId
              .replace(/\\s+/g, '')   // Remove all spaces
              .trim();                // Trim any excess whitespace
          }

          // Standardize sale amount
          if (foreclosure.saleAmount) {
            // Extract numeric value from sale amount
            const numericMatch = foreclosure.saleAmount.match(/(\\d+[,\\d]*\\.?\\d*)/);
            if (numericMatch) {
              // Remove commas and convert to number
              foreclosure.saleAmountNumeric = Number(numericMatch[1].replace(/,/g, ''));
              foreclosure.saleAmount = foreclosure.saleAmount.trim();
            }
          }

          return foreclosure;
        })
        // Filter out entries that don't have at least a case number or property address
        .filter(foreclosure => foreclosure.caseNumber || foreclosure.propertyAddress);

        // Remove duplicates based on case number
        const uniqueForeclosures = [];
        const caseNumbers = new Set();

        for (const foreclosure of cleanedForeclosures) {
          if (foreclosure.caseNumber && caseNumbers.has(foreclosure.caseNumber)) {
            continue; // Skip duplicate case numbers
          }

          if (foreclosure.caseNumber) {
            caseNumbers.add(foreclosure.caseNumber);
          }

          uniqueForeclosures.push(foreclosure);
        }

        return {
          json: {
            foreclosures: uniqueForeclosures,
            recordId: data.recordId,
            auctionName: data.auctionName,
            county: data.county,
            date: data.date,
            count: uniqueForeclosures.length
          }
        };
      `,
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: normalizeTextNode.id, type: 'main', index: 0 }]],
		},
		[normalizeTextNode.id]: {
			main: [[{ node: branchByInputNode.id, type: 'main', index: 0 }]],
		},
		[branchByInputNode.id]: {
			main: [
				[{ node: parseStructuredDataNode.id, type: 'main', index: 0 }], // Structured data branch
				[{ node: parseTextDataNode.id, type: 'main', index: 0 }], // Text data branch
			],
		},
		[parseStructuredDataNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]],
		},
		[parseTextDataNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 1 }]],
		},
		[mergeResultsNode.id]: {
			main: [[{ node: cleanDataNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Parse Foreclosures',
		nodes: [
			triggerNode,
			normalizeTextNode,
			branchByInputNode,
			parseStructuredDataNode,
			parseTextDataNode,
			mergeResultsNode,
			cleanDataNode,
		],
		connections,
		active: false,
		settings: {
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
		},
		tags: ['operation', 'data', 'foreclosure'],
		triggerCount: 1,
	};
}

module.exports = { buildWorkflow };
