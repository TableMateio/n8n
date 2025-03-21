#!/usr/bin/env node

/**
 * Airtable Node Generator
 *
 * A utility for generating Airtable nodes for n8n workflows programmatically.
 * This tool helps create consistent Airtable nodes with proper configuration.
 */

const AIRTABLE_REFERENCE = require('../reference');
const AirtableManager = require('../manager');

class AirtableNodeGenerator {
	constructor(options = {}) {
		this.manager = new AirtableManager(options);
		this.baseId = options.baseId || AIRTABLE_REFERENCE.BASE_ID;
		this.debug = options.debug || false;
	}

	/**
	 * Create a basic Airtable node structure
	 * @param {Object} options - Node configuration options
	 * @returns {Object} Configured node object
	 */
	createNode(options) {
		const {
			id = `airtable_${Date.now()}`,
			name = 'Airtable',
			position = [0, 0],
			operation = 'list',
			table,
			credentials = '1',
			continueOnFail = false,
		} = options;

		// Resolve table ID if table name provided
		const tableId = this.resolveTableId(table);

		// Create basic node structure
		const node = {
			id,
			name,
			type: 'n8n-nodes-base.airtable',
			typeVersion: 1,
			position,
			executeOnce: false,
			alwaysOutputData: false,
			continueOnFail,
			credentials: {
				airtableApi: credentials,
			},
			parameters: {
				application: this.baseId,
				table: tableId,
				operation,
			},
		};

		// Configure operation-specific parameters
		switch (operation) {
			case 'list':
				this.configureListOperation(node, options);
				break;
			case 'read':
				this.configureReadOperation(node, options);
				break;
			case 'create':
				this.configureCreateOperation(node, options);
				break;
			case 'update':
				this.configureUpdateOperation(node, options);
				break;
			case 'append':
				this.configureAppendOperation(node, options);
				break;
			case 'delete':
				this.configureDeleteOperation(node, options);
				break;
		}

		return node;
	}

	/**
	 * Configure a List operation
	 * @param {Object} node - Node object to configure
	 * @param {Object} options - Configuration options
	 */
	configureListOperation(node, options) {
		const {
			filterByFormula,
			viewId,
			fields = [],
			returnAll = false,
			limit = 100,
			sort = [],
		} = options;

		// Set filter if provided
		if (filterByFormula) {
			node.parameters.filterByFormula = filterByFormula;
		}

		// Set view if provided
		if (viewId) {
			node.parameters.view = viewId;
		}

		// Configure field selection
		if (fields.length > 0) {
			node.parameters.options = node.parameters.options || {};
			node.parameters.options.fields = {
				fields: this.resolveFieldIds(node.parameters.table, fields),
			};
		}

		// Set sort options
		if (sort.length > 0) {
			node.parameters.options = node.parameters.options || {};
			node.parameters.options.sort = {
				sort: sort.map((sortOption) => {
					// If sort option is a string, convert to object with default ascending direction
					if (typeof sortOption === 'string') {
						return {
							field: this.resolveFieldId(node.parameters.table, sortOption),
							direction: 'asc',
						};
					}
					// Otherwise, it should be an object with field and direction
					return {
						field: this.resolveFieldId(node.parameters.table, sortOption.field),
						direction: sortOption.direction || 'asc',
					};
				}),
			};
		}

		// Configure pagination
		if (returnAll) {
			node.parameters.returnAll = true;
		} else {
			node.parameters.returnAll = false;
			node.parameters.limit = limit;
		}
	}

	/**
	 * Configure a Read operation
	 * @param {Object} node - Node object to configure
	 * @param {Object} options - Configuration options
	 */
	configureReadOperation(node, options) {
		const { recordId } = options;

		if (!recordId) {
			throw new Error('Record ID is required for Read operation');
		}

		node.parameters.id = recordId;
	}

	/**
	 * Configure a Create operation
	 * @param {Object} node - Node object to configure
	 * @param {Object} options - Configuration options
	 */
	configureCreateOperation(node, options) {
		const { fields = {} } = options;

		if (Object.keys(fields).length === 0) {
			throw new Error('At least one field is required for Create operation');
		}

		// Convert field names to IDs if needed and format values
		node.parameters.additionalFields = {};
		for (const [fieldName, value] of Object.entries(fields)) {
			const fieldId = this.resolveFieldId(node.parameters.table, fieldName);
			node.parameters.additionalFields[fieldId] = value;
		}
	}

	/**
	 * Configure an Update operation
	 * @param {Object} node - Node object to configure
	 * @param {Object} options - Configuration options
	 */
	configureUpdateOperation(node, options) {
		const { recordId, fields = {} } = options;

		if (!recordId) {
			throw new Error('Record ID is required for Update operation');
		}

		if (Object.keys(fields).length === 0) {
			throw new Error('At least one field is required for Update operation');
		}

		node.parameters.id = recordId;

		// Convert field names to IDs if needed and format values
		node.parameters.additionalFields = {};
		for (const [fieldName, value] of Object.entries(fields)) {
			const fieldId = this.resolveFieldId(node.parameters.table, fieldName);
			node.parameters.additionalFields[fieldId] = value;
		}
	}

	/**
	 * Configure an Append operation
	 * @param {Object} node - Node object to configure
	 * @param {Object} options - Configuration options
	 */
	configureAppendOperation(node, options) {
		const { fields = {} } = options;

		if (Object.keys(fields).length === 0) {
			throw new Error('At least one field is required for Append operation');
		}

		// Convert field names to IDs if needed and format values
		node.parameters.additionalFields = {};
		for (const [fieldName, value] of Object.entries(fields)) {
			const fieldId = this.resolveFieldId(node.parameters.table, fieldName);
			node.parameters.additionalFields[fieldId] = value;
		}
	}

	/**
	 * Configure a Delete operation
	 * @param {Object} node - Node object to configure
	 * @param {Object} options - Configuration options
	 */
	configureDeleteOperation(node, options) {
		const { recordId } = options;

		if (!recordId) {
			throw new Error('Record ID is required for Delete operation');
		}

		node.parameters.id = recordId;
	}

	/**
	 * Create a List Records node
	 * @param {Object} options - Node configuration
	 * @returns {Object} Configured node
	 */
	createListNode(options) {
		return this.createNode({
			...options,
			operation: 'list',
		});
	}

	/**
	 * Create a Read Record node
	 * @param {Object} options - Node configuration
	 * @returns {Object} Configured node
	 */
	createReadNode(options) {
		return this.createNode({
			...options,
			operation: 'read',
		});
	}

	/**
	 * Create a Create Record node
	 * @param {Object} options - Node configuration
	 * @returns {Object} Configured node
	 */
	createCreateNode(options) {
		return this.createNode({
			...options,
			operation: 'create',
		});
	}

	/**
	 * Create an Update Record node
	 * @param {Object} options - Node configuration
	 * @returns {Object} Configured node
	 */
	createUpdateNode(options) {
		return this.createNode({
			...options,
			operation: 'update',
		});
	}

	/**
	 * Create an Append Record node
	 * @param {Object} options - Node configuration
	 * @returns {Object} Configured node
	 */
	createAppendNode(options) {
		return this.createNode({
			...options,
			operation: 'append',
		});
	}

	/**
	 * Create a Delete Record node
	 * @param {Object} options - Node configuration
	 * @returns {Object} Configured node
	 */
	createDeleteNode(options) {
		return this.createNode({
			...options,
			operation: 'delete',
		});
	}

	/**
	 * Convert a list of field names to field IDs
	 * @param {string} tableId - Table ID to look up fields in
	 * @param {string[]} fieldNames - Field names to convert
	 * @returns {string[]} Field IDs
	 */
	resolveFieldIds(tableId, fieldNames) {
		return fieldNames.map((field) => this.resolveFieldId(tableId, field));
	}

	/**
	 * Convert a field name to a field ID
	 * @param {string} tableId - Table ID to look up field in
	 * @param {string} fieldName - Field name to convert
	 * @returns {string} Field ID
	 */
	resolveFieldId(tableId, fieldName) {
		// If field name is already an ID (starts with 'fld'), return as is
		if (typeof fieldName === 'string' && fieldName.startsWith('fld')) {
			return fieldName;
		}

		// Try to find table name from ID
		let tableName = null;
		for (const [name, id] of Object.entries(AIRTABLE_REFERENCE.TABLES)) {
			if (id === tableId) {
				tableName = name;
				break;
			}
		}

		if (!tableName) {
			this.log(`Table name not found for ID ${tableId}, returning field name as is`);
			return fieldName;
		}

		// Look up field ID in reference
		if (
			AIRTABLE_REFERENCE.FIELD_IDS &&
			AIRTABLE_REFERENCE.FIELD_IDS[tableName] &&
			AIRTABLE_REFERENCE.FIELD_IDS[tableName][fieldName.toUpperCase()]
		) {
			return AIRTABLE_REFERENCE.FIELD_IDS[tableName][fieldName.toUpperCase()];
		}

		// Field ID not found, return as is
		this.log(`Field ID not found for ${fieldName} in table ${tableName}, returning as is`);
		return fieldName;
	}

	/**
	 * Convert a table name to a table ID
	 * @param {string} tableName - Table name or ID
	 * @returns {string} Table ID
	 */
	resolveTableId(tableName) {
		// If tableName is already an ID (starts with 'tbl'), return as is
		if (typeof tableName === 'string' && tableName.startsWith('tbl')) {
			return tableName;
		}

		// Try to find table ID from name
		if (AIRTABLE_REFERENCE.TABLES && AIRTABLE_REFERENCE.TABLES[tableName]) {
			return AIRTABLE_REFERENCE.TABLES[tableName];
		}

		// Table ID not found, return as is
		this.log(`Table ID not found for ${tableName}, returning as is`);
		return tableName;
	}

	/**
	 * Create a filter formula for an equals condition
	 * @param {string} field - Field name
	 * @param {string|number|boolean} value - Value to compare
	 * @returns {string} Filter formula
	 */
	createEqualsFilter(field, value) {
		return AIRTABLE_REFERENCE.equals(field, value);
	}

	/**
	 * Create a filter formula for a contains condition
	 * @param {string} field - Field name
	 * @param {string} value - Value to check for containment
	 * @returns {string} Filter formula
	 */
	createContainsFilter(field, value) {
		return AIRTABLE_REFERENCE.contains(field, value);
	}

	/**
	 * Log message if debug is enabled
	 * @param {string} message - Message to log
	 */
	log(message) {
		if (this.debug) {
			console.log(`[NodeGenerator] ${message}`);
		}
	}
}

/**
 * Example usage
 */
function runExample() {
	const generator = new AirtableNodeGenerator({ debug: true });

	// Create a list node
	const listNode = generator.createListNode({
		name: 'Get Active Auctions',
		position: [250, 300],
		table: 'AUCTIONS',
		filterByFormula: AIRTABLE_REFERENCE.equals('Status', 'Active'),
		fields: ['Auction Name', 'County', 'Date'],
		sort: [{ field: 'Date', direction: 'desc' }, 'County'],
		limit: 50,
	});

	console.log('List Node:');
	console.log(JSON.stringify(listNode, null, 2));

	// Create an update node
	const updateNode = generator.createUpdateNode({
		name: 'Update Auction Status',
		position: [550, 300],
		table: 'AUCTIONS',
		recordId: '{{$json["id"]}}',
		fields: {
			Status: 'Completed',
			'Last Modified': '{{$now}}',
			Notes: '{{$json["notes"]}}',
		},
	});

	console.log('\nUpdate Node:');
	console.log(JSON.stringify(updateNode, null, 2));
}

// Allow running as script or importing as module
if (require.main === module) {
	runExample();
} else {
	module.exports = AirtableNodeGenerator;
}
