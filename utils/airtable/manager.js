/**
 * Airtable Manager
 *
 * A utility class for managing Airtable operations, providing:
 * - Standardized methods for common Airtable operations
 * - Consistent error handling and logging
 * - Helper functions for working with Airtable data
 */

const AIRTABLE_REFERENCE = require('./reference');

class AirtableManager {
	/**
	 * Create a new AirtableManager instance
	 *
	 * @param {Object} options Configuration options
	 * @param {string} options.apiKey Airtable API key
	 * @param {string} options.baseId Base ID (defaults to the one in reference)
	 */
	constructor(options = {}) {
		this.apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
		this.baseId = options.baseId || AIRTABLE_REFERENCE.BASE_ID;
		this.baseUrl = `https://api.airtable.com/v0/${this.baseId}`;
	}

	/**
	 * Generate standard headers for Airtable API requests
	 *
	 * @returns {Object} Headers object
	 */
	getHeaders() {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			'Content-Type': 'application/json',
		};
	}

	/**
	 * Create options for an HTTP request node
	 *
	 * @param {string} method HTTP method (GET, POST, PATCH, etc.)
	 * @param {Object} additionalOptions Additional request options
	 * @returns {Object} Options object for HTTP Request node
	 */
	createRequestOptions(method = 'GET', additionalOptions = {}) {
		return {
			headers: this.getHeaders(),
			method,
			...additionalOptions,
		};
	}

	/**
	 * Get the URL for a specific table
	 *
	 * @param {string} tableIdOrName Table ID or name
	 * @returns {string} Full URL for the table
	 */
	getTableUrl(tableIdOrName) {
		// Look up table ID if a name was provided
		let tableId = tableIdOrName;
		if (AIRTABLE_REFERENCE.TABLE_NAMES[tableIdOrName]) {
			tableId = AIRTABLE_REFERENCE.TABLE_NAMES[tableIdOrName];
		}

		return `${this.baseUrl}/${tableId}`;
	}

	/**
	 * Create a filter formula for an Airtable query
	 *
	 * @param {string} fieldName Field name
	 * @param {string} value Value to filter by
	 * @param {string} operator Operator to use (=, !=, >, etc.)
	 * @returns {string} Airtable filter formula
	 */
	createFilter(fieldName, value, operator = '=') {
		return `{${fieldName}} ${operator} '${value}'`;
	}

	/**
	 * Create an Airtable node configuration for n8n
	 *
	 * @param {Object} params Node configuration parameters
	 * @returns {Object} Node configuration object
	 */
	createAirtableNodeParams(params) {
		return {
			application: this.baseId,
			...params,
		};
	}

	/**
	 * Format data for creating an Airtable record
	 *
	 * @param {Object} data Record data
	 * @returns {Object} Formatted data for Airtable API
	 */
	formatRecordData(data) {
		return {
			fields: { ...data },
		};
	}

	/**
	 * Format multiple records for batch operations
	 *
	 * @param {Array} records Array of record objects
	 * @returns {Object} Formatted data for Airtable API
	 */
	formatBatchRecords(records) {
		return {
			records: records.map((record) => ({
				fields: { ...record },
			})),
		};
	}

	/**
	 * Extract records from Airtable API response
	 *
	 * @param {Object} response Airtable API response
	 * @returns {Array} Array of records
	 */
	extractRecords(response) {
		if (!response || !response.records) {
			return [];
		}

		return response.records.map((record) => ({
			id: record.id,
			...record.fields,
		}));
	}
}

module.exports = AirtableManager;
