/**
 * Extract PDF Text Operation
 *
 * This operation extracts text content from PDF files using advanced OCR techniques.
 * It handles various PDF formats, including text-based and image-based PDFs,
 * and attempts to maintain structural information where possible.
 */

/**
 * Builds the workflow for PDF text extraction
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

	// Check PDF type
	const checkPdfTypeNode = {
		id: 'check_pdf_type',
		name: 'Check PDF Type',
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

        // Check if we have binary data from PDF
        const hasBinaryData = response.data || (response.body && response.body.length > 1000);

        // Check if the PDF likely contains text or is image-based
        const contentType = response.headers?.['content-type'] || '';
        const isImageBased = contentType.includes('image') ||
          (response.headers && Object.values(response.headers).some(v =>
            typeof v === 'string' && v.includes('image-based')));

        return {
          json: {
            originalResponse: response,
            hasBinaryData: !!hasBinaryData,
            isImageBased: isImageBased,
            attachmentUrl: attachmentUrl,
            filename: filename || 'unknown.pdf',
            auctionInfo: response.auctionInfo || {}
          }
        };
      `,
		},
	};

	// Branch based on PDF type
	const branchByPdfTypeNode = {
		id: 'branch_by_pdf_type',
		name: 'Branch By PDF Type',
		type: 'n8n-nodes-base.if',
		typeVersion: 1,
		position: [650, 300],
		parameters: {
			conditions: [
				{
					id: '1',
					name: 'isImageBased',
					type: 'string',
					value1: '={{ $json.isImageBased }}',
					operation: 'equal',
					value2: 'true',
				},
			],
		},
	};

	// Extract text from image-based PDF
	const extractFromImagePdfNode = {
		id: 'extract_from_image_pdf',
		name: 'Extract Text from Image PDF',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 3,
		position: [850, 200],
		parameters: {
			url: '={{ $env.OCR_API_ENDPOINT }}',
			method: 'POST',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			options: {
				allowUnauthorizedCerts: true,
				bodyContentType: 'multipart-form-data',
				splitIntoItems: false,
				redirect: {
					redirect: {
						followRedirects: true,
						maxRedirects: 5,
					},
				},
			},
			bodyParameters: {
				parameter: [
					{
						name: 'url',
						value: '={{ $json.attachmentUrl }}',
					},
					{
						name: 'language',
						value: 'eng',
					},
					{
						name: 'OCREngine',
						value: '2',
					},
					{
						name: 'filetype',
						value: 'pdf',
					},
				],
			},
			headers: {
				parameters: [
					{
						name: 'Accept',
						value: 'application/json',
					},
				],
			},
		},
		credentials: {
			httpHeaderAuth: {
				id: '1',
				name: 'OCR API Auth',
			},
		},
	};

	// Extract text from text-based PDF
	const extractFromTextPdfNode = {
		id: 'extract_from_text_pdf',
		name: 'Extract Text from Text PDF',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 3,
		position: [850, 400],
		parameters: {
			url: '={{ $env.PDF_TEXT_API_ENDPOINT }}',
			method: 'POST',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			options: {
				allowUnauthorizedCerts: true,
				bodyContentType: 'json',
				splitIntoItems: false,
			},
			bodyParameters: {
				parameter: [
					{
						name: 'url',
						value: '={{ $json.attachmentUrl }}',
					},
					{
						name: 'outputFormat',
						value: 'text',
					},
				],
			},
		},
		credentials: {
			httpHeaderAuth: {
				id: '1',
				name: 'PDF API Auth',
			},
		},
	};

	// Fallback extraction method
	const fallbackExtractionNode = {
		id: 'fallback_extraction',
		name: 'Fallback Extraction',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 600],
		parameters: {
			functionCode: `
        // Get the binary data from the response
        const response = $input.item.json.originalResponse;
        let extractedText = '';

        try {
          // Basic extraction from PDF binary data
          if (response.body) {
            // This is a very basic extraction and may not work well
            // It looks for text patterns in the binary data
            const body = typeof response.body === 'string' ? response.body : response.body.toString('utf-8');

            // Extract text using regex patterns common in PDFs
            const textMatches = body.match(/\\/(\\w+)\\s+\\d+\\s+Tf[^(]*\\(([^)]+)\\)/g) || [];
            extractedText = textMatches
              .map(m => {
                const textMatch = m.match(/\\(([^)]+)\\)/);
                return textMatch ? textMatch[1] : '';
              })
              .join(' ');

            // If that didn't work, try a simpler approach
            if (!extractedText) {
              // Look for any readable text between parentheses
              const simpleMatches = body.match(/\\(([A-Za-z0-9\\s.,;:'"-]+)\\)/g) || [];
              extractedText = simpleMatches
                .map(m => m.substring(1, m.length - 1))
                .join(' ');
            }
          }
        } catch (error) {
          extractedText = 'Failed to extract text: ' + error.message;
        }

        return {
          json: {
            text: extractedText || 'No text could be extracted from this PDF.',
            method: 'fallback',
            auctionInfo: $input.item.json.auctionInfo
          }
        };
      `,
		},
	};

	// Process OCR results
	const processOcrResultNode = {
		id: 'process_ocr_result',
		name: 'Process OCR Result',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 200],
		parameters: {
			functionCode: `
        // Get the OCR response
        const response = $input.item.json;
        let extractedText = '';

        // Handle different OCR API response formats
        if (response.ParsedResults && Array.isArray(response.ParsedResults)) {
          // Standard OCR API format
          extractedText = response.ParsedResults
            .map(result => result.ParsedText)
            .join('\\n');
        } else if (response.text) {
          // Direct text property
          extractedText = response.text;
        } else if (response.body && typeof response.body === 'string') {
          // Try to parse JSON from body
          try {
            const bodyObj = JSON.parse(response.body);
            if (bodyObj.ParsedResults && Array.isArray(bodyObj.ParsedResults)) {
              extractedText = bodyObj.ParsedResults
                .map(result => result.ParsedText)
                .join('\\n');
            } else if (bodyObj.text) {
              extractedText = bodyObj.text;
            }
          } catch (e) {
            // If not JSON, use the body as is
            extractedText = response.body;
          }
        }

        return {
          json: {
            text: extractedText,
            method: 'ocr',
            auctionInfo: $input.item.json.auctionInfo
          }
        };
      `,
		},
	};

	// Process text extraction results
	const processTextExtractionNode = {
		id: 'process_text_extraction',
		name: 'Process Text Extraction',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 400],
		parameters: {
			functionCode: `
        // Get the text extraction response
        const response = $input.item.json;
        let extractedText = '';

        // Handle different text extraction API response formats
        if (response.text) {
          // Direct text property
          extractedText = response.text;
        } else if (response.content) {
          // Content property
          extractedText = response.content;
        } else if (response.body) {
          // Try to parse JSON from body
          if (typeof response.body === 'string') {
            try {
              const bodyObj = JSON.parse(response.body);
              if (bodyObj.text) {
                extractedText = bodyObj.text;
              } else if (bodyObj.content) {
                extractedText = bodyObj.content;
              }
            } catch (e) {
              // If not JSON, use the body as is if it looks like text
              if (response.body.length < 10000 &&
                  !response.body.includes('\\u0000') &&
                  response.body.match(/[A-Za-z\\s.,;:'"\\-]{100,}/)) {
                extractedText = response.body;
              }
            }
          }
        }

        return {
          json: {
            text: extractedText,
            method: 'text-extraction',
            auctionInfo: $input.item.json.auctionInfo
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

	// Clean and structure the text
	const cleanTextNode = {
		id: 'clean_text',
		name: 'Clean & Structure Text',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1450, 300],
		parameters: {
			functionCode: `
        // Get the extracted text
        const extractionResult = $input.item.json;
        let text = extractionResult.text || '';

        // Basic cleaning
        text = text
          .replace(/\\r\\n/g, '\\n')           // Normalize line endings
          .replace(/\\t/g, ' ')                // Replace tabs with spaces
          .replace(/\\n{3,}/g, '\\n\\n')       // Replace 3+ consecutive newlines with just 2
          .replace(/\\s{2,}/g, ' ')           // Replace multiple spaces with single space
          .replace(/\\n\\s+/g, '\\n')          // Remove leading spaces after newlines
          .trim();                            // Trim excess whitespace

        // Try to identify document structure
        let structuredText = text;

        // Look for clear sections like tables
        if (text.match(/\\n[\\s-]*\\|.*\\|[\\s-]*\\n/)) {
          // Looks like it contains ASCII tables, preserve their structure
          structuredText = text
            .replace(/\\n{2,}/g, '\\n\\n')     // Keep paragraph breaks
            .replace(/([^\\n])\\n(?!\\n)(?!\\s*\\|)([^\\|])/g, '$1 $2'); // Join lines unless they're table rows
        } else {
          // Standard text document
          structuredText = text
            .replace(/\\n{2,}/g, '\\n\\n')     // Keep paragraph breaks
            .replace(/([^\\n])\\n(?!\\n)([^\\n])/g, '$1 $2'); // Join lines unless they're paragraph breaks
        }

        return {
          json: {
            text: structuredText,
            method: extractionResult.method,
            auctionInfo: extractionResult.auctionInfo
          }
        };
      `,
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: checkPdfTypeNode.id, type: 'main', index: 0 }]],
		},
		[checkPdfTypeNode.id]: {
			main: [[{ node: branchByPdfTypeNode.id, type: 'main', index: 0 }]],
		},
		[branchByPdfTypeNode.id]: {
			main: [
				[{ node: extractFromImagePdfNode.id, type: 'main', index: 0 }], // Image-based PDF branch
				[{ node: extractFromTextPdfNode.id, type: 'main', index: 0 }], // Text-based PDF branch
			],
		},
		[extractFromImagePdfNode.id]: {
			main: [[{ node: processOcrResultNode.id, type: 'main', index: 0 }]],
		},
		[extractFromTextPdfNode.id]: {
			main: [[{ node: processTextExtractionNode.id, type: 'main', index: 0 }]],
		},
		[processOcrResultNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]],
		},
		[processTextExtractionNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 1 }]],
		},
		[fallbackExtractionNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 2 }]],
		},
		[mergeResultsNode.id]: {
			main: [[{ node: cleanTextNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Extract PDF Text',
		nodes: [
			triggerNode,
			checkPdfTypeNode,
			branchByPdfTypeNode,
			extractFromImagePdfNode,
			extractFromTextPdfNode,
			fallbackExtractionNode,
			processOcrResultNode,
			processTextExtractionNode,
			mergeResultsNode,
			cleanTextNode,
		],
		connections,
		active: false,
		settings: {
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
		},
		tags: ['operation', 'data', 'pdf', 'text-extraction'],
		triggerCount: 1,
	};
}

module.exports = { buildWorkflow };
