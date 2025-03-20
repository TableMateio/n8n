/**
 * Airtable reference file
 *
 * Contains constants for Airtable Bases, Tables, and Field IDs to use in scripts
 * that interact with Airtable.
 */

/**
 * Airtable reference IDs for Tax Surplus
 */
const AIRTABLE_REFERENCE = {
	// Tax Surplus Base ID
	BASE_ID: 'appWxxzsTHMY0MZHu',
	BASE_NAME: 'Tax Surplus',

	// Table IDs
	TABLES: {
		AUCTIONS: 'tblteK8SeHqZ8xQxV',
		COUNTIES: 'tblgJ8IbhYrpIqXq4',
		SYSTEMS: 'tbl3tOZ5GZNBr1dV1',
		CONFIG: 'tblLq0PQKTj9XsYnr',
		FEES: 'tbljHQGUbx56PBTgq',
		MOTIONS: 'tblPVx97YuGM2YqTF',
		CLAIMS: 'tbl3E2HJiWsrZMczB',
		PROPERTIES: 'tblpXcZkLDuQNrQXn',
		USERS: 'tblpXcZkLDuQNrQXn',
		CONTACTS: 'tblqcysYQ2KEtaw6s',
		FORECLOSURES: 'tblhq8mn3e6u4Ta39',
		DELIVERABLES: 'tbluIIx0i7ht3TrOj',
		SERVICES: 'tbl9rYrJIeXk8knaw',
		CUSTOMERS: 'tbl0fn1v3W3J0vNqb',
		FIELDS: 'tblnWImY9xmEIhQSR',
	},

	// Table Name to ID mapping
	TABLE_NAMES: {
		Auctions: 'tblteK8SeHqZ8xQxV',
		Counties: 'tblgJ8IbhYrpIqXq4',
		'Auction Systems': 'tbl3tOZ5GZNBr1dV1',
		Configuration: 'tblLq0PQKTj9XsYnr',
	},

	// Common Field IDs, categorized by table
	FIELD_IDS: {
		// Auction table field IDs
		AUCTION: {
			PRIMARY_FIELD: 'fld7zoOS3uQg4tiyh', // auction_id
			COUNTY: 'fldQM9eGzadxpJujs', // county
			DATE: 'fldEQKvECtLk93jUT', // date
			STATUS: 'fld6qz9DYZ1k7PeuV', // status
			COUNTY_LINK: 'fldMokcnoIWJTFCbC',
		},

		// County table field IDs
		COUNTY: {
			PRIMARY_FIELD: 'fldHigOlHwCUr6WiI', // county_name
			STATE: 'fldt5wSXEG6Dq89Lb', // state
			SYSTEM: 'fldscDHfQSUBCzPCK', // system
			SYSTEM_LINK: 'fldaPTtDb8cKT9EzC',
		},

		// System table field IDs
		SYSTEM: {
			PRIMARY_FIELD: 'fldJRPLl1k5U6uVjx', // system_name
			TYPE: 'fldABZGvlWPo7yQsb', // type
		},

		// Configuration table field IDs
		CONFIG: {
			PRIMARY_FIELD: 'fldcLQE6i2Ij9MTAD', // name
			SCOPE: 'fldiT7GZmQKsLK5x7', // scope
			SCOPE_ID: 'fldhNqFyJ3prk6cD2', // scope_id
			VALUE: 'fldIrCYXY8thcMTKn', // value
		},
	},

	// Field ID to Name mapping
	FIELD_NAMES: {
		// Auction table field names
		AUCTION: {
			fld7zoOS3uQg4tiyh: 'Auction', // PRIMARY_FIELD
			fldQM9eGzadxpJujs: 'County', // COUNTY
			fldEQKvECtLk93jUT: 'Date', // DATE
			fld6qz9DYZ1k7PeuV: 'Status', // STATUS
			fldMokcnoIWJTFCbC: 'County Link',
		},

		// County table field names
		COUNTY: {
			fldHigOlHwCUr6WiI: 'County Name', // PRIMARY_FIELD
			fldt5wSXEG6Dq89Lb: 'State', // STATE
			fldscDHfQSUBCzPCK: 'System', // SYSTEM
			fldaPTtDb8cKT9EzC: 'System Link',
		},

		// System table field names
		SYSTEM: {
			fldJRPLl1k5U6uVjx: 'System Name', // PRIMARY_FIELD
			fldABZGvlWPo7yQsb: 'Type', // TYPE
		},

		// Configuration table field names
		CONFIG: {
			fldcLQE6i2Ij9MTAD: 'Name', // PRIMARY_FIELD
			fldiT7GZmQKsLK5x7: 'Scope', // SCOPE
			fldhNqFyJ3prk6cD2: 'Scope ID', // SCOPE_ID
			fldIrCYXY8thcMTKn: 'Value', // VALUE
		},
	},

	/**
	 * Helper function to get field name from field ID
	 * @param {string} tableType - Table type (e.g., 'AUCTION', 'COUNTY')
	 * @param {string} fieldId - Field ID to look up
	 * @returns {string} Field name or the original ID if not found
	 */
	getFieldName(tableType, fieldId) {
		if (this.FIELD_NAMES[tableType] && this.FIELD_NAMES[tableType][fieldId]) {
			return this.FIELD_NAMES[tableType][fieldId];
		}
		// Return original if not found
		return fieldId;
	},

	/**
	 * Creates a filter formula using field names instead of IDs
	 * @param {string} tableType - Table type (e.g., 'AUCTION', 'COUNTY')
	 * @param {string} fieldId - Field ID to use in filter
	 * @param {string} value - Value to filter by (can include n8n expressions)
	 * @returns {string} Properly formatted filter formula
	 */
	createFilterFormula(tableType, fieldId, value) {
		const fieldName = this.getFieldName(tableType, fieldId);
		return `{${fieldName}} = '${value}'`;
	},
};

module.exports = AIRTABLE_REFERENCE;
