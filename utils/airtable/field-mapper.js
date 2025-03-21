/**
 * Airtable Field Mapper
 *
 * A utility for mapping and transforming Airtable fields, providing:
 * - Conversion between field IDs and names
 * - Transformation of field values
 * - Mapping between different field structures
 */

const AIRTABLE_REFERENCE = require('./reference');

class AirtableFieldMapper {
	/**
	 * Create a new field mapper instance
	 */
	constructor() {
		this.reference = AIRTABLE_REFERENCE;
	}

	/**
	 * Get a field name from its ID
	 *
	 * @param {string} tableType The table type (e.g., 'AUCTION', 'COUNTY')
	 * @param {string} fieldId The field ID
	 * @returns {string} The field name or the original ID if not found
	 */
	getFieldName(tableType, fieldId) {
		return this.reference.getFieldName(tableType, fieldId);
	}

	/**
	 * Get a field ID from its name (reverse lookup)
	 *
	 * @param {string} tableType The table type (e.g., 'AUCTION', 'COUNTY')
	 * @param {string} fieldName The field name
	 * @returns {string} The field ID or null if not found
	 */
	getFieldId(tableType, fieldName) {
		const fieldNames = this.reference.FIELD_NAMES[tableType];
		if (!fieldNames) return null;

		// Search for the field ID by name
		for (const [id, name] of Object.entries(fieldNames)) {
			if (name === fieldName) {
				return id;
			}
		}

		return null;
	}

	/**
	 * Map a record from field IDs to field names
	 *
	 * @param {string} tableType The table type (e.g., 'AUCTION', 'COUNTY')
	 * @param {Object} record Record with field IDs as keys
	 * @returns {Object} Record with field names as keys
	 */
	mapRecordToNames(tableType, record) {
		const result = {};

		Object.entries(record).forEach(([key, value]) => {
			const fieldName = this.getFieldName(tableType, key);
			result[fieldName] = value;
		});

		return result;
	}

	/**
	 * Map a record from field names to field IDs
	 *
	 * @param {string} tableType The table type (e.g., 'AUCTION', 'COUNTY')
	 * @param {Object} record Record with field names as keys
	 * @returns {Object} Record with field IDs as keys
	 */
	mapRecordToIds(tableType, record) {
		const result = {};

		Object.entries(record).forEach(([key, value]) => {
			const fieldId = this.getFieldId(tableType, key);
			if (fieldId) {
				result[fieldId] = value;
			} else {
				// Keep the original key if no mapping found
				result[key] = value;
			}
		});

		return result;
	}

	/**
	 * Transform a value based on field type
	 *
	 * @param {*} value The value to transform
	 * @param {string} fieldType The field type (e.g., 'text', 'number', 'date')
	 * @returns {*} The transformed value
	 */
	transformValue(value, fieldType) {
		if (value === null || value === undefined) {
			return value;
		}

		switch (fieldType) {
			case 'number':
				return Number(value);

			case 'boolean':
				if (typeof value === 'string') {
					return value.toLowerCase() === 'true' || value === '1';
				}
				return Boolean(value);

			case 'date':
				if (!(value instanceof Date)) {
					return new Date(value);
				}
				return value;

			case 'array':
				if (!Array.isArray(value)) {
					return [value];
				}
				return value;

			default:
				return value;
		}
	}

	/**
	 * Format a record for Airtable's API based on field definitions
	 *
	 * @param {Object} record The record to format
	 * @param {Object} fieldDefinitions Field definitions with types
	 * @returns {Object} Formatted record ready for Airtable
	 */
	formatRecordForApi(record, fieldDefinitions) {
		const formatted = {};

		Object.entries(record).forEach(([key, value]) => {
			if (fieldDefinitions[key]) {
				formatted[key] = this.transformValue(value, fieldDefinitions[key].type);
			} else {
				formatted[key] = value;
			}
		});

		return formatted;
	}

	/**
	 * Create a linked record reference
	 *
	 * @param {string|Array} recordId Record ID or array of record IDs
	 * @returns {Array} Array of record IDs formatted for Airtable linked records
	 */
	createLinkedRecordRef(recordId) {
		if (!recordId) return [];

		if (Array.isArray(recordId)) {
			return recordId;
		}

		return [recordId];
	}
}

module.exports = AirtableFieldMapper;
