#!/usr/bin/env node

/**
 * Airtable Exporter
 *
 * Utility for exporting data from Airtable tables to various formats.
 * Supports CSV, JSON, and Excel exports with filtering and field selection.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const AirtableManager = require('../manager');
const AIRTABLE_REFERENCE = require('../reference');

class AirtableExporter {
	constructor(options = {}) {
		this.apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
		this.baseId = options.baseId || AIRTABLE_REFERENCE.BASE_ID;
		this.manager = new AirtableManager(options);
		this.outputDir = options.outputDir || './exports';
		this.debug = options.debug || false;
	}

	/**
	 * Export a table to a file
	 * @param {Object} options - Export options
	 * @returns {Promise<string>} Path to the exported file
	 */
	async exportTable(options) {
		const {
			table,
			format = 'json',
			filename,
			filter,
			fields,
			limit = 0, // 0 means all records
			sortField,
			sortDirection = 'asc',
			view,
		} = options;

		this.log(`Exporting table ${table} to ${format} format`);

		try {
			// Get table ID from name if needed
			const tableId = this.resolveTableId(table);

			// Prepare URL with filters and options
			let url = `https://api.airtable.com/v0/${this.baseId}/${tableId}?`;

			// Add view if specified
			if (view) {
				url += `view=${encodeURIComponent(view)}&`;
			}

			// Add filter if specified
			if (filter) {
				url += `filterByFormula=${encodeURIComponent(filter)}&`;
			}

			// Add sort if specified
			if (sortField) {
				const fieldId = this.resolveFieldId(tableId, sortField);
				url += `sort[0][field]=${encodeURIComponent(fieldId)}&sort[0][direction]=${sortDirection}&`;
			}

			// Add fields if specified
			if (fields && Array.isArray(fields) && fields.length > 0) {
				fields.forEach((field, index) => {
					const fieldId = this.resolveFieldId(tableId, field);
					url += `fields[${index}]=${encodeURIComponent(fieldId)}&`;
				});
			}

			// Add record limit if specified
			if (limit > 0) {
				url += `maxRecords=${limit}&`;
			}

			// Fetch records from Airtable
			const records = await this.fetchAllRecords(url);
			this.log(`Fetched ${records.length} records from ${table}`);

			// Ensure output directory exists
			if (!fs.existsSync(this.outputDir)) {
				fs.mkdirSync(this.outputDir, { recursive: true });
			}

			// Generate filename if not provided
			const outputFilename =
				filename ||
				`${this.tableNameFromId(tableId)}_export_${new Date().toISOString().replace(/[:.]/g, '-')}`;

			// Export to specified format
			let outputPath;
			switch (format.toLowerCase()) {
				case 'csv':
					outputPath = path.join(this.outputDir, `${outputFilename}.csv`);
					await this.exportToCsv(records, outputPath);
					break;
				case 'excel':
				case 'xlsx':
					outputPath = path.join(this.outputDir, `${outputFilename}.xlsx`);
					await this.exportToExcel(records, outputPath);
					break;
				case 'json':
				default:
					outputPath = path.join(this.outputDir, `${outputFilename}.json`);
					await this.exportToJson(records, outputPath);
					break;
			}

			this.log(`Export complete: ${outputPath}`);
			return outputPath;
		} catch (error) {
			console.error('Export failed:', error);
			throw error;
		}
	}

	/**
	 * Fetch all records from an Airtable table with pagination
	 * @param {string} baseUrl - API URL with filters
	 * @returns {Promise<Array>} All records
	 */
	fetchAllRecords(baseUrl) {
		return new Promise((resolve, reject) => {
			const allRecords = [];

			const fetchPage = (url) => {
				this.log(`Fetching page: ${url}`);

				const options = {
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json',
					},
				};

				https
					.get(url, options, (response) => {
						let data = '';

						response.on('data', (chunk) => {
							data += chunk;
						});

						response.on('end', () => {
							try {
								if (response.statusCode !== 200) {
									this.log(`Error status code: ${response.statusCode}`);
									return reject(
										new Error(`API request failed with status ${response.statusCode}: ${data}`),
									);
								}

								const result = JSON.parse(data);

								// Add records to our collection
								if (result.records && Array.isArray(result.records)) {
									allRecords.push(...result.records);
									this.log(`Added ${result.records.length} records, total: ${allRecords.length}`);
								}

								// Check for more pages
								if (result.offset) {
									// Construct URL for the next page
									const nextPageUrl = `${baseUrl}offset=${result.offset}`;
									fetchPage(nextPageUrl);
								} else {
									// No more pages, return all records
									resolve(allRecords);
								}
							} catch (error) {
								reject(error);
							}
						});
					})
					.on('error', (error) => {
						reject(error);
					});
			};

			// Start with the first page
			fetchPage(baseUrl);
		});
	}

	/**
	 * Export records to JSON format
	 * @param {Array} records - Records to export
	 * @param {string} outputPath - Path to save the file
	 * @returns {Promise<void>}
	 */
	async exportToJson(records, outputPath) {
		try {
			// Process records to a more friendly format
			const processedRecords = records.map((record) => {
				const result = {
					id: record.id,
					...record.fields,
				};
				return result;
			});

			// Write to file
			fs.writeFileSync(outputPath, JSON.stringify(processedRecords, null, 2), 'utf8');
			this.log(`JSON export saved to ${outputPath}`);
		} catch (error) {
			console.error('Error exporting to JSON:', error);
			throw error;
		}
	}

	/**
	 * Export records to CSV format
	 * @param {Array} records - Records to export
	 * @param {string} outputPath - Path to save the file
	 * @returns {Promise<void>}
	 */
	async exportToCsv(records, outputPath) {
		try {
			if (records.length === 0) {
				fs.writeFileSync(outputPath, '', 'utf8');
				this.log('No records to export to CSV');
				return;
			}

			// Get all unique fields from all records
			const fields = new Set();
			records.forEach((record) => {
				Object.keys(record.fields).forEach((field) => fields.add(field));
			});

			// Convert Set to Array and add 'id' field at the beginning
			const headerFields = ['id', ...Array.from(fields)];

			// Create CSV header
			let csv = headerFields.map((field) => `"${field.replace(/"/g, '""')}"`).join(',') + '\n';

			// Add records
			records.forEach((record) => {
				const row = headerFields
					.map((field) => {
						// For ID field, use record.id
						if (field === 'id') {
							return `"${record.id.replace(/"/g, '""')}"`;
						}

						// For other fields, use record.fields or empty string
						const value = record.fields[field] !== undefined ? record.fields[field] : '';

						// Format based on type
						if (value === null || value === undefined) {
							return '""';
						} else if (typeof value === 'string') {
							return `"${value.replace(/"/g, '""')}"`;
						} else if (Array.isArray(value)) {
							return `"${value.join(', ').replace(/"/g, '""')}"`;
						} else {
							return `"${String(value).replace(/"/g, '""')}"`;
						}
					})
					.join(',');

				csv += row + '\n';
			});

			// Write to file
			fs.writeFileSync(outputPath, csv, 'utf8');
			this.log(`CSV export saved to ${outputPath}`);
		} catch (error) {
			console.error('Error exporting to CSV:', error);
			throw error;
		}
	}

	/**
	 * Export records to Excel format
	 * @param {Array} records - Records to export
	 * @param {string} outputPath - Path to save the file
	 * @returns {Promise<void>}
	 */
	async exportToExcel(records, outputPath) {
		try {
			// Check if xlsx module is available
			let xlsx;
			try {
				xlsx = require('xlsx');
			} catch (e) {
				console.error('xlsx module not found. Please install it using: npm install xlsx');
				throw new Error('xlsx module not installed');
			}

			if (records.length === 0) {
				// Create an empty workbook
				const wb = xlsx.utils.book_new();
				const ws = xlsx.utils.aoa_to_sheet([['No records found']]);
				xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
				xlsx.writeFile(wb, outputPath);
				this.log('No records to export to Excel');
				return;
			}

			// Process records into a format suitable for Excel
			const processedRecords = records.map((record) => {
				const result = {
					id: record.id,
					...record.fields,
				};
				return result;
			});

			// Convert to worksheet
			const ws = xlsx.utils.json_to_sheet(processedRecords);

			// Create workbook and add worksheet
			const wb = xlsx.utils.book_new();
			xlsx.utils.book_append_sheet(wb, ws, 'Airtable Export');

			// Save to file
			xlsx.writeFile(wb, outputPath);
			this.log(`Excel export saved to ${outputPath}`);
		} catch (error) {
			console.error('Error exporting to Excel:', error);
			throw error;
		}
	}

	/**
	 * Resolve a table ID from name
	 * @param {string} table - Table name or ID
	 * @returns {string} Table ID
	 */
	resolveTableId(table) {
		// If already an ID (starts with 'tbl'), return as is
		if (typeof table === 'string' && table.startsWith('tbl')) {
			return table;
		}

		// Check reference object for table ID
		if (AIRTABLE_REFERENCE.TABLES && AIRTABLE_REFERENCE.TABLES[table]) {
			return AIRTABLE_REFERENCE.TABLES[table];
		}

		// If not found in reference, return as is (might be a table name)
		return table;
	}

	/**
	 * Get table name from ID
	 * @param {string} tableId - Table ID
	 * @returns {string} Table name or ID if not found
	 */
	tableNameFromId(tableId) {
		// Look up in reference
		for (const [name, id] of Object.entries(AIRTABLE_REFERENCE.TABLES || {})) {
			if (id === tableId) {
				return name.toLowerCase();
			}
		}

		// If not found, return the ID
		return tableId;
	}

	/**
	 * Resolve a field ID from name
	 * @param {string} tableId - Table ID
	 * @param {string} field - Field name or ID
	 * @returns {string} Field ID
	 */
	resolveFieldId(tableId, field) {
		// If already an ID (starts with 'fld'), return as is
		if (typeof field === 'string' && field.startsWith('fld')) {
			return field;
		}

		// Try to find table name from ID
		let tableName = null;
		for (const [name, id] of Object.entries(AIRTABLE_REFERENCE.TABLES || {})) {
			if (id === tableId) {
				tableName = name;
				break;
			}
		}

		// If table name found, look up field ID
		if (tableName && AIRTABLE_REFERENCE.FIELD_IDS && AIRTABLE_REFERENCE.FIELD_IDS[tableName]) {
			const fieldId = AIRTABLE_REFERENCE.FIELD_IDS[tableName][field.toUpperCase()];
			if (fieldId) {
				return fieldId;
			}
		}

		// If not found, return as is (might be a field name)
		return field;
	}

	/**
	 * Log message if debug is enabled
	 * @param {string} message - Message to log
	 */
	log(message) {
		if (this.debug) {
			console.log(`[Exporter] ${message}`);
		}
	}
}

/**
 * Run the exporter from the command line
 */
async function run() {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.log(`
Airtable Exporter

Usage:
  node exporter.js <table> <format> [options]

Arguments:
  table   - Table name or ID to export
  format  - Export format: json, csv, or excel

Options:
  --filter=<formula>        - Airtable formula for filtering records
  --fields=<field1,field2>  - Comma-separated list of fields to include
  --limit=<number>          - Maximum number of records to export
  --sort=<field>            - Field to sort by
  --direction=<asc|desc>    - Sort direction (default: asc)
  --view=<view>             - View name or ID to use
  --output=<path>           - Output file path
  --debug                   - Enable debug logging

Examples:
  node exporter.js AUCTIONS json --filter="{Status}='Active'"
  node exporter.js COUNTIES csv --fields=Name,State --output=counties.csv
`);
		process.exit(1);
	}

	const table = args[0];
	const format = args[1];

	// Parse options
	const options = {
		table,
		format,
		debug: args.includes('--debug'),
	};

	// Parse other arguments
	args.slice(2).forEach((arg) => {
		if (arg.startsWith('--filter=')) {
			options.filter = arg.substring('--filter='.length);
		} else if (arg.startsWith('--fields=')) {
			options.fields = arg.substring('--fields='.length).split(',');
		} else if (arg.startsWith('--limit=')) {
			options.limit = parseInt(arg.substring('--limit='.length), 10);
		} else if (arg.startsWith('--sort=')) {
			options.sortField = arg.substring('--sort='.length);
		} else if (arg.startsWith('--direction=')) {
			options.sortDirection = arg.substring('--direction='.length);
		} else if (arg.startsWith('--view=')) {
			options.view = arg.substring('--view='.length);
		} else if (arg.startsWith('--output=')) {
			options.filename = arg.substring('--output='.length);
		}
	});

	console.log(`Exporting ${table} to ${format} format`);
	if (options.filter) console.log(`Filter: ${options.filter}`);
	if (options.fields) console.log(`Fields: ${options.fields.join(', ')}`);
	if (options.limit) console.log(`Limit: ${options.limit} records`);

	try {
		const exporter = new AirtableExporter({ debug: options.debug });
		const outputPath = await exporter.exportTable(options);
		console.log(`Export complete: ${outputPath}`);
	} catch (error) {
		console.error('Export failed:', error.message);
		process.exit(1);
	}
}

// Allow running as script or importing as module
if (require.main === module) {
	run();
} else {
	module.exports = AirtableExporter;
}
