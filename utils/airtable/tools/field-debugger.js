/**
 * Airtable Field Debugger
 *
 * A tool for debugging Airtable field issues by:
 * - Identifying field ID and name mismatches
 * - Resolving linked field references
 * - Validating field types and formats
 *
 * This tool extracts functionality from debug-airtable-field-names.js and
 * debug-airtable-linked-fields.js
 */

const https = require('https');
const AIRTABLE_REFERENCE = require('../reference');
const AirtableFieldMapper = require('../field-mapper');

class AirtableFieldDebugger {
	/**
	 * Create a new field debugger instance
	 *
	 * @param {Object} options Configuration options
	 * @param {string} options.apiKey Airtable API key
	 * @param {string} options.baseId Base ID (defaults to AIRTABLE_REFERENCE.BASE_ID)
	 */
	constructor(options = {}) {
		this.apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
		this.baseId = options.baseId || AIRTABLE_REFERENCE.BASE_ID;
		this.baseUrl = `https://api.airtable.com/v0/${this.baseId}`;
		this.fieldMapper = new AirtableFieldMapper();
	}

	/**
	 * Make a request to the Airtable API
	 *
	 * @param {string} url API URL
	 * @param {Object} options Request options
	 * @returns {Promise<Object>} Response data
	 */
	async makeRequest(url, options = {}) {
		return new Promise((resolve, reject) => {
			const requestOptions = {
				method: options.method || 'GET',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					...options.headers,
				},
				...options,
			};

			const req = https.request(url, requestOptions, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					try {
						if (res.statusCode >= 200 && res.statusCode < 300) {
							resolve(JSON.parse(data));
						} else {
							reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
						}
					} catch (error) {
						reject(new Error(`Failed to parse API response: ${error.message}`));
					}
				});
			});

			req.on('error', (error) => {
				reject(error);
			});

			if (options.body) {
				req.write(JSON.stringify(options.body));
			}

			req.end();
		});
	}

	/**
	 * Get metadata for a table
	 *
	 * @param {string} tableIdOrName Table ID or name
	 * @returns {Promise<Object>} Table metadata
	 */
	async getTableMetadata(tableIdOrName) {
		try {
			// Look up table ID if a name was provided
			let tableId = tableIdOrName;
			if (AIRTABLE_REFERENCE.TABLE_NAMES[tableIdOrName]) {
				tableId = AIRTABLE_REFERENCE.TABLE_NAMES[tableIdOrName];
			}

			// Get a small sample of records to analyze fields
			const url = `${this.baseUrl}/${tableId}?maxRecords=10`;
			const response = await this.makeRequest(url);

			if (!response.records || response.records.length === 0) {
				return {
					tableId,
					error: 'No records found in table',
					fields: [],
				};
			}

			// Analyze fields from the first record
			const firstRecord = response.records[0];
			const fields = Object.keys(firstRecord.fields).map((fieldName) => {
				const value = firstRecord.fields[fieldName];
				const type = this.detectFieldType(value);

				return {
					name: fieldName,
					type,
					sample: this.formatSampleValue(value),
				};
			});

			return {
				tableId,
				recordCount: response.records.length,
				fields,
			};
		} catch (error) {
			return {
				tableId: tableIdOrName,
				error: error.message,
			};
		}
	}

	/**
	 * Detect the type of a field value
	 *
	 * @param {*} value Field value
	 * @returns {string} Field type
	 */
	detectFieldType(value) {
		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return 'array';
			}

			// Check if it's an array of record IDs (linked records)
			if (value.every((item) => typeof item === 'string' && item.startsWith('rec'))) {
				return 'linkedRecords';
			}

			return 'array';
		}

		if (typeof value === 'object') {
			return 'object';
		}

		if (typeof value === 'number') {
			return 'number';
		}

		if (typeof value === 'boolean') {
			return 'boolean';
		}

		if (typeof value === 'string') {
			// Check if it's a date
			if (!isNaN(Date.parse(value)) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
				return 'date';
			}

			// Check if it's a record ID (linked record)
			if (value.startsWith('rec')) {
				return 'linkedRecord';
			}

			return 'string';
		}

		return 'unknown';
	}

	/**
	 * Format a sample value for display
	 *
	 * @param {*} value Field value
	 * @returns {string} Formatted value
	 */
	formatSampleValue(value) {
		if (value === null || value === undefined) {
			return 'null';
		}

		if (Array.isArray(value)) {
			if (value.length > 3) {
				return `Array(${value.length}) [${value.slice(0, 3).join(', ')}...]`;
			}
			return `Array(${value.length}) [${value.join(', ')}]`;
		}

		if (typeof value === 'object') {
			return (
				JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
			);
		}

		if (typeof value === 'string' && value.length > 50) {
			return value.substring(0, 50) + '...';
		}

		return String(value);
	}

	/**
	 * Find fields with mismatches between n8n workflow and Airtable
	 *
	 * @param {Object} workflowNode n8n workflow node with Airtable parameters
	 * @param {string} tableIdOrName Table ID or name
	 * @returns {Promise<Object>} Mismatch analysis
	 */
	async findFieldMismatches(workflowNode, tableIdOrName) {
		try {
			// Get node parameters
			const nodeParams = workflowNode.parameters || {};
			const nodeFields = this.extractNodeFields(nodeParams);

			// Get actual table fields
			const tableMetadata = await this.getTableMetadata(tableIdOrName);
			const tableFields = tableMetadata.fields.map((f) => f.name);

			// Find mismatches
			const notInTable = nodeFields.filter((f) => !tableFields.includes(f));
			const notInNode = tableFields.filter((f) => !nodeFields.includes(f));

			// Special case for linked fields
			const linkedFields = tableMetadata.fields
				.filter((f) => f.type === 'linkedRecords' || f.type === 'linkedRecord')
				.map((f) => f.name);

			return {
				tableId: tableMetadata.tableId,
				nodeFields,
				tableFields,
				mismatches: {
					notInTable,
					notInNode,
				},
				linkedFields,
			};
		} catch (error) {
			return {
				error: error.message,
			};
		}
	}

	/**
	 * Extract field names from an n8n Airtable node
	 *
	 * @param {Object} nodeParams Node parameters
	 * @returns {Array<string>} Field names used in the node
	 */
	extractNodeFields(nodeParams) {
		const fields = [];

		// Extract from common Airtable node parameters
		if (nodeParams.fields && nodeParams.fields.values) {
			fields.push(...nodeParams.fields.values.map((v) => v.field));
		}

		// Extract from old-style fields parameter
		if (nodeParams.fields && Array.isArray(nodeParams.fields)) {
			fields.push(...nodeParams.fields);
		}

		// Extract from filterByFormula
		if (nodeParams.filterByFormula) {
			const formula = nodeParams.filterByFormula.value || nodeParams.filterByFormula;
			const fieldMatches = formula.match(/{([^}]+)}/g);
			if (fieldMatches) {
				fields.push(...fieldMatches.map((m) => m.slice(1, -1)));
			}
		}

		// Return unique fields
		return [...new Set(fields)];
	}
}

// Run a simple test if executed directly
if (require.main === module) {
	async function runTest() {
		const apiKey = process.env.AIRTABLE_API_KEY;
		if (!apiKey) {
			console.error('Please set AIRTABLE_API_KEY environment variable');
			process.exit(1);
		}

		const fieldDebugger = new AirtableFieldDebugger({ apiKey });
		const tableName = process.argv[2] || 'Auctions';

		console.log(`Analyzing fields for table: ${tableName}`);
		const result = await fieldDebugger.getTableMetadata(tableName);

		if (result.error) {
			console.error(`Error: ${result.error}`);
			process.exit(1);
		}

		console.log(`Found ${result.fields.length} fields in table ${result.tableId}:`);
		console.log('-------------------------------------------------------');
		console.log('Name                                | Type          | Sample Value');
		console.log('-------------------------------------------------------');

		result.fields.forEach((field) => {
			const name = field.name.padEnd(35).substring(0, 35);
			const type = field.type.padEnd(14).substring(0, 14);
			console.log(`${name}| ${type}| ${field.sample}`);
		});

		// Show linked fields
		const linkedFields = result.fields.filter(
			(f) => f.type === 'linkedRecords' || f.type === 'linkedRecord',
		);

		if (linkedFields.length > 0) {
			console.log('\nLinked Fields:');
			linkedFields.forEach((field) => {
				console.log(`- ${field.name} (${field.type}): ${field.sample}`);
			});
		}
	}

	runTest().catch(console.error);
}

module.exports = AirtableFieldDebugger;
