#!/usr/bin/env node

/**
 * Airtable Workflow Extractor
 *
 * This utility extracts Airtable node configurations from n8n workflows to
 * help create templates and analyze Airtable usage patterns.
 *
 * Features:
 * - Extracts all Airtable nodes from a workflow
 * - Identifies table IDs and operations used
 * - Extracts field mappings and formulas
 * - Generates templates for reusable Airtable operations
 */

const fs = require('fs');
const path = require('path');
const AIRTABLE_REFERENCE = require('../reference');
const AirtableFieldMapper = require('../field-mapper');

class AirtableWorkflowExtractor {
	constructor(options = {}) {
		this.fieldMapper = new AirtableFieldMapper();
		this.defaultOutputDir = options.outputDir || path.join(process.cwd(), 'extracted-templates');
		this.debug = options.debug || false;
	}

	/**
	 * Extract Airtable nodes from a workflow
	 * @param {Object|string} workflow - Workflow object or path to workflow JSON file
	 * @returns {Object[]} Array of extracted Airtable nodes
	 */
	extractAirtableNodes(workflow) {
		try {
			// Load workflow if string path provided
			if (typeof workflow === 'string') {
				const workflowPath = path.resolve(workflow);
				this.log(`Loading workflow from ${workflowPath}`);
				const workflowData = fs.readFileSync(workflowPath, 'utf8');
				workflow = JSON.parse(workflowData);
			}

			// Ensure workflow contains nodes
			if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
				throw new Error('Invalid workflow format: nodes array not found');
			}

			// Filter for Airtable nodes
			const airtableNodes = workflow.nodes.filter(
				(node) =>
					node.type === 'n8n-nodes-base.airtable' ||
					(node.type === 'n8n-nodes-base.httpRequest' && this.isAirtableHttpRequest(node)),
			);

			this.log(`Found ${airtableNodes.length} Airtable-related nodes`);

			return airtableNodes.map((node) => this.processNode(node, workflow));
		} catch (error) {
			console.error('Error extracting Airtable nodes:', error);
			return [];
		}
	}

	/**
	 * Process an individual node
	 * @param {Object} node - Node object from workflow
	 * @param {Object} workflow - Complete workflow object for context
	 * @returns {Object} Processed node with additional metadata
	 */
	processNode(node, workflow) {
		const processed = {
			id: node.id,
			name: node.name,
			type: node.type,
			position: node.position,
		};

		if (node.type === 'n8n-nodes-base.airtable') {
			// Process native Airtable node
			const { parameters } = node;
			processed.operation = parameters.operation;
			processed.table = this.resolveTableInfo(parameters.application, parameters.table);

			// Operation-specific processing
			switch (parameters.operation) {
				case 'list':
					processed.filter = parameters.filterByFormula;
					processed.fields = this.extractSelectedFields(parameters);
					break;
				case 'read':
					processed.recordId = parameters.id;
					break;
				case 'create':
				case 'update':
					processed.fieldsMapping = this.extractFieldsMapping(parameters);
					break;
			}
		} else if (this.isAirtableHttpRequest(node)) {
			// Process HTTP Request node targeting Airtable
			processed.isCustomRequest = true;
			processed.method = node.parameters.method;
			processed.url = node.parameters.url;
			processed.table = this.extractTableFromUrl(node.parameters.url);

			// Try to extract operation from method and URL pattern
			processed.operation = this.inferOperationFromHttpRequest(node);

			// Extract body parameters for POST/PATCH requests
			if (['POST', 'PATCH', 'PUT'].includes(node.parameters.method) && node.parameters.body) {
				try {
					const bodyData = JSON.parse(node.parameters.body);
					processed.fieldsMapping = this.processHttpRequestBody(bodyData);
				} catch (e) {
					processed.bodyError = 'Could not parse request body';
				}
			}
		}

		// Find connected nodes
		processed.connections = this.findConnections(node.id, workflow);

		return processed;
	}

	/**
	 * Resolve table information by ID
	 * @param {string} application - Base ID
	 * @param {string} tableId - Table ID
	 * @returns {Object} Table information
	 */
	resolveTableInfo(application, tableId) {
		// Attempt to find table name from reference
		let tableName = null;
		for (const [name, id] of Object.entries(AIRTABLE_REFERENCE.TABLES)) {
			if (id === tableId) {
				tableName = name;
				break;
			}
		}

		return {
			baseId: application,
			tableId,
			tableName,
		};
	}

	/**
	 * Extract selected fields from list operation
	 * @param {Object} parameters - Node parameters
	 * @returns {Object[]} Selected fields information
	 */
	extractSelectedFields(parameters) {
		if (!parameters.options || !parameters.options.fields || !parameters.options.fields.fields) {
			return null; // No field selection
		}

		return parameters.options.fields.fields.map((field) => {
			// Try to resolve field name from ID
			const fieldName = this.fieldMapper.getFieldName(parameters.table, field);
			return {
				id: field,
				name: fieldName || field,
			};
		});
	}

	/**
	 * Extract fields mapping from create/update operations
	 * @param {Object} parameters - Node parameters
	 * @returns {Object} Fields mapping
	 */
	extractFieldsMapping(parameters) {
		if (!parameters.additionalFields) {
			return null;
		}

		const mapping = {};
		for (const [key, value] of Object.entries(parameters.additionalFields)) {
			// Try to resolve field name from ID
			const fieldName = this.fieldMapper.getFieldName(parameters.table, key);
			mapping[key] = {
				id: key,
				name: fieldName || key,
				value: this.sanitizeValue(value),
			};
		}
		return mapping;
	}

	/**
	 * Process HTTP request body for field mapping
	 * @param {Object} body - Request body object
	 * @returns {Object} Processed fields mapping
	 */
	processHttpRequestBody(body) {
		if (!body.fields) {
			return null;
		}

		const mapping = {};
		for (const [key, value] of Object.entries(body.fields)) {
			mapping[key] = {
				id: key,
				// We don't know the table here to resolve the name
				value: this.sanitizeValue(value),
			};
		}
		return mapping;
	}

	/**
	 * Sanitize field value for display
	 * @param {any} value - Field value
	 * @returns {string} Sanitized value representation
	 */
	sanitizeValue(value) {
		if (value === null || value === undefined) {
			return null;
		}

		// Handle expression values (n8n expressions like {{ $json.field }})
		if (typeof value === 'string' && (value.includes('{{') || value.includes('{}'))) {
			return value; // Keep as is
		}

		// For objects and arrays, stringify
		if (typeof value === 'object') {
			try {
				return JSON.stringify(value);
			} catch (e) {
				return '[Complex Object]';
			}
		}

		return String(value);
	}

	/**
	 * Check if an HTTP Request node is targeting Airtable
	 * @param {Object} node - Node object
	 * @returns {boolean} Whether node targets Airtable
	 */
	isAirtableHttpRequest(node) {
		if (node.type !== 'n8n-nodes-base.httpRequest') {
			return false;
		}

		const url = node.parameters?.url || '';
		return url.includes('api.airtable.com');
	}

	/**
	 * Extract table information from Airtable API URL
	 * @param {string} url - Airtable API URL
	 * @returns {Object} Table information
	 */
	extractTableFromUrl(url) {
		try {
			// Extract base ID and table ID from URL
			// Format: https://api.airtable.com/v0/BASE_ID/TABLE_ID
			const match = url.match(/api\.airtable\.com\/v0\/([a-zA-Z0-9]+)\/([^/?]+)/);
			if (!match) {
				return { baseId: null, tableId: null, tableName: null };
			}

			const baseId = match[1];
			const tableIdOrName = match[2];

			// Try to resolve table name
			let tableName = null;
			let tableId = tableIdOrName;

			// Check if tableIdOrName is a name or ID
			if (AIRTABLE_REFERENCE.TABLE_NAMES && AIRTABLE_REFERENCE.TABLE_NAMES[tableIdOrName]) {
				// It's a name, get the ID
				tableId = AIRTABLE_REFERENCE.TABLE_NAMES[tableIdOrName];
				tableName = tableIdOrName;
			} else {
				// It might be an ID, try to get the name
				for (const [name, id] of Object.entries(AIRTABLE_REFERENCE.TABLES || {})) {
					if (id === tableIdOrName) {
						tableName = name;
						break;
					}
				}
			}

			return { baseId, tableId, tableName };
		} catch (error) {
			return { baseId: null, tableId: null, tableName: null };
		}
	}

	/**
	 * Infer operation type from HTTP request parameters
	 * @param {Object} node - HTTP Request node
	 * @returns {string} Inferred operation
	 */
	inferOperationFromHttpRequest(node) {
		const { method, url } = node.parameters;

		// Check for record ID in URL
		const hasRecordId = url.match(/\/rec[a-zA-Z0-9]+$/);

		switch (method) {
			case 'GET':
				return hasRecordId ? 'read' : 'list';
			case 'POST':
				return 'create';
			case 'PATCH':
			case 'PUT':
				return 'update';
			case 'DELETE':
				return 'delete';
			default:
				return 'unknown';
		}
	}

	/**
	 * Find connections to/from a node in the workflow
	 * @param {string} nodeId - Node ID to find connections for
	 * @param {Object} workflow - Workflow object
	 * @returns {Object} Input and output connections
	 */
	findConnections(nodeId, workflow) {
		const inputs = [];
		const outputs = [];

		if (!workflow.connections) {
			return { inputs, outputs };
		}

		// Find input connections (nodes that send data to this node)
		for (const [sourceNodeId, connections] of Object.entries(workflow.connections)) {
			if (connections && Array.isArray(connections.main)) {
				connections.main.forEach((outputs, sourceIndex) => {
					if (outputs && Array.isArray(outputs)) {
						outputs.forEach((output) => {
							if (output.node === nodeId) {
								// Find the node name
								const sourceNode = workflow.nodes.find((n) => n.id === sourceNodeId);
								inputs.push({
									id: sourceNodeId,
									name: sourceNode?.name || sourceNodeId,
									outputIndex: sourceIndex,
									inputIndex: output.index,
								});
							}
						});
					}
				});
			}
		}

		// Find output connections (nodes that this node sends data to)
		if (workflow.connections[nodeId] && Array.isArray(workflow.connections[nodeId].main)) {
			workflow.connections[nodeId].main.forEach((outputs, sourceIndex) => {
				if (outputs && Array.isArray(outputs)) {
					outputs.forEach((output) => {
						// Find the node name
						const targetNode = workflow.nodes.find((n) => n.id === output.node);
						outputs.push({
							id: output.node,
							name: targetNode?.name || output.node,
							inputIndex: output.index,
							outputIndex: sourceIndex,
						});
					});
				}
			});
		}

		return { inputs, outputs };
	}

	/**
	 * Generate a template from extracted nodes
	 * @param {Object[]} nodes - Extracted node information
	 * @param {string} name - Template name
	 * @returns {string} Generated template code
	 */
	generateTemplate(nodes, name) {
		const templateName = this.camelCase(name || 'airtableTemplate');

		let code = `/**
 * ${name || 'Airtable Template'}
 * Generated by AirtableWorkflowExtractor
 */

const AIRTABLE_REFERENCE = require('../reference');
const AirtableManager = require('../manager');

function ${templateName}() {
  const manager = new AirtableManager();
  const nodes = [];
`;

		// Generate nodes
		nodes.forEach((node, index) => {
			code += `\n  // ${node.name}\n`;

			if (node.type === 'n8n-nodes-base.airtable') {
				code += this.generateAirtableNodeCode(node, index);
			} else if (node.isCustomRequest) {
				code += this.generateHttpRequestNodeCode(node, index);
			}
		});

		// Generate connections
		code += `\n  // Define node connections\n`;
		code += `  const connections = {};\n`;

		// TODO: Add connection code

		code += `\n  return { nodes, connections };\n}\n\nmodule.exports = ${templateName};\n`;

		return code;
	}

	/**
	 * Generate code for an Airtable node
	 * @param {Object} node - Processed node
	 * @param {number} index - Node index
	 * @returns {string} Generated code
	 */
	generateAirtableNodeCode(node, index) {
		let code = `  const node${index} = {\n`;
		code += `    id: '${node.id}',\n`;
		code += `    name: '${node.name}',\n`;
		code += `    type: 'n8n-nodes-base.airtable',\n`;
		code += `    position: [${node.position[0]}, ${node.position[1]}],\n`;
		code += `    parameters: {\n`;
		code += `      operation: '${node.operation}',\n`;

		// If we have table info, use reference if possible
		if (node.table && node.table.tableName) {
			code += `      application: AIRTABLE_REFERENCE.BASE_ID,\n`;
			code += `      table: AIRTABLE_REFERENCE.TABLES.${node.table.tableName},\n`;
		} else if (node.table) {
			code += `      application: '${node.table.baseId || 'BASE_ID'}',\n`;
			code += `      table: '${node.table.tableId || 'TABLE_ID'}',\n`;
		}

		// Operation-specific parameters
		switch (node.operation) {
			case 'list':
				if (node.filter) {
					code += `      filterByFormula: '${node.filter.replace(/'/g, "\\'")}',\n`;
				}
				break;
			case 'read':
				if (node.recordId) {
					code += `      id: '${node.recordId}',\n`;
				}
				break;
			case 'create':
			case 'update':
				if (node.fieldsMapping) {
					code += `      additionalFields: {\n`;
					for (const [fieldId, field] of Object.entries(node.fieldsMapping)) {
						// If we can identify field by name, use const
						if (field.name && field.name !== fieldId) {
							code += `        [AIRTABLE_REFERENCE.FIELD_IDS.${node.table.tableName}.${field.name.toUpperCase()}]: `;
						} else {
							code += `        '${fieldId}': `;
						}

						// Format value based on type
						if (field.value && field.value.includes('{{')) {
							// Expression
							code += `'${field.value.replace(/'/g, "\\'")}',\n`;
						} else if (field.value === null) {
							code += `null,\n`;
						} else if (field.value && field.value.startsWith('[') && field.value.endsWith(']')) {
							// Array
							code += `${field.value},\n`;
						} else {
							// String/number
							code += `'${field.value?.replace(/'/g, "\\'")}',\n`;
						}
					}
					code += `      },\n`;
				}
				break;
		}

		code += `    },\n`;
		code += `  };\n`;
		code += `  nodes.push(node${index});\n`;

		return code;
	}

	/**
	 * Generate code for an HTTP Request node
	 * @param {Object} node - Processed node
	 * @param {number} index - Node index
	 * @returns {string} Generated code
	 */
	generateHttpRequestNodeCode(node, index) {
		let code = `  // Using manager to create an HTTP request for ${node.operation}\n`;

		if (node.table && node.table.tableName) {
			code += `  const tableUrl = manager.getTableUrl(AIRTABLE_REFERENCE.TABLES.${node.table.tableName});\n`;
		} else if (node.table && node.table.tableId) {
			code += `  const tableUrl = '${node.url}';\n`;
		} else {
			code += `  const tableUrl = '${node.url}';\n`;
		}

		code += `  const node${index} = {\n`;
		code += `    id: '${node.id}',\n`;
		code += `    name: '${node.name}',\n`;
		code += `    type: 'n8n-nodes-base.httpRequest',\n`;
		code += `    position: [${node.position[0]}, ${node.position[1]}],\n`;
		code += `    parameters: manager.createRequestOptions('${node.method}', {\n`;
		code += `      url: tableUrl,\n`;

		// Add body for POST/PATCH operations
		if (['POST', 'PATCH', 'PUT'].includes(node.method) && node.fieldsMapping) {
			code += `      body: JSON.stringify({\n`;
			code += `        fields: {\n`;
			for (const [fieldId, field] of Object.entries(node.fieldsMapping)) {
				if (field.name && field.name !== fieldId) {
					code += `          [AIRTABLE_REFERENCE.FIELD_IDS.${node.table.tableName}.${field.name.toUpperCase()}]: `;
				} else {
					code += `          '${fieldId}': `;
				}

				// Format value based on type
				if (field.value && field.value.includes('{{')) {
					// Expression
					code += `'${field.value.replace(/'/g, "\\'")}',\n`;
				} else if (field.value === null) {
					code += `null,\n`;
				} else if (field.value && field.value.startsWith('[') && field.value.endsWith(']')) {
					// Array
					code += `${field.value},\n`;
				} else {
					// String/number
					code += `'${field.value?.replace(/'/g, "\\'")}',\n`;
				}
			}
			code += `        },\n`;
			code += `      }),\n`;
		}

		code += `    }),\n`;
		code += `  };\n`;
		code += `  nodes.push(node${index});\n`;

		return code;
	}

	/**
	 * Save extracted data to files
	 * @param {Object[]} extractedNodes - Extracted node data
	 * @param {string} workflowName - Name of the workflow
	 * @param {string} outputDir - Output directory
	 */
	saveExtracted(extractedNodes, workflowName, outputDir = null) {
		const targetDir = outputDir || this.defaultOutputDir;

		// Create directory if it doesn't exist
		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		// Save full extraction as JSON
		fs.writeFileSync(
			path.join(targetDir, `${workflowName}-extracted.json`),
			JSON.stringify(extractedNodes, null, 2),
			'utf8',
		);

		// Generate and save template file
		const templateCode = this.generateTemplate(extractedNodes, workflowName);
		fs.writeFileSync(path.join(targetDir, `${workflowName}-template.js`), templateCode, 'utf8');

		this.log(`Saved extraction to ${targetDir}`);
	}

	/**
	 * Convert string to camelCase
	 * @param {string} str - Input string
	 * @returns {string} Camel-cased string
	 */
	camelCase(str) {
		return str
			.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
			.replace(/[^a-zA-Z0-9]+$/, '')
			.replace(/^[A-Z]/, (chr) => chr.toLowerCase());
	}

	/**
	 * Log message if debug is enabled
	 * @param {string} message - Message to log
	 */
	log(message) {
		if (this.debug) {
			console.log(`[Extractor] ${message}`);
		}
	}
}

/**
 * Run the extractor from the command line
 */
async function run() {
	const args = process.argv.slice(2);

	if (args.length < 1) {
		console.log(`
Airtable Workflow Extractor

Usage:
  node workflow-extractor.js <workflow-file> [output-dir] [--debug]

Arguments:
  workflow-file  - Path to n8n workflow JSON file
  output-dir     - (Optional) Directory to save extracted data
  --debug        - (Optional) Enable debug logging

Example:
  node workflow-extractor.js workflows/my-workflow.json ./templates
`);
		process.exit(1);
	}

	const workflowPath = args[0];
	const outputDir = args.length > 1 && !args[1].startsWith('--') ? args[1] : null;
	const debug = args.includes('--debug');

	console.log(`Extracting Airtable nodes from ${workflowPath}`);

	const extractor = new AirtableWorkflowExtractor({
		outputDir,
		debug,
	});

	const extractedNodes = extractor.extractAirtableNodes(workflowPath);

	if (extractedNodes.length === 0) {
		console.log('No Airtable nodes found in workflow');
		process.exit(0);
	}

	console.log(`Found ${extractedNodes.length} Airtable nodes`);

	// Generate a workflow name from the file name
	const workflowName = path
		.basename(workflowPath, '.json')
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
		.replace(/[^a-zA-Z0-9]+$/, '')
		.replace(/^[A-Z]/, (chr) => chr.toLowerCase());

	extractor.saveExtracted(extractedNodes, workflowName, outputDir);
	console.log('Extraction complete');
}

// Allow running as script or importing as module
if (require.main === module) {
	run();
} else {
	module.exports = AirtableWorkflowExtractor;
}
