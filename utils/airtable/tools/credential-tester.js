/**
 * Airtable Credential Tester
 *
 * A tool for testing Airtable API credentials and base access.
 * Extracts relevant functionality from test-airtable-credentials.js
 */

const https = require('https');
const AIRTABLE_REFERENCE = require('../reference');

/**
 * Test Airtable credentials by attempting to access a base
 *
 * @param {Object} options Test options
 * @param {string} options.apiKey Airtable API key
 * @param {string} options.baseId Base ID (defaults to AIRTABLE_REFERENCE.BASE_ID)
 * @param {string} options.tableId Table ID to test (defaults to first table in reference)
 * @returns {Promise<Object>} Test result object
 */
async function testCredentials(options = {}) {
	const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
	const baseId = options.baseId || AIRTABLE_REFERENCE.BASE_ID;
	const tableId = options.tableId || Object.values(AIRTABLE_REFERENCE.TABLES)[0];

	if (!apiKey) {
		return {
			success: false,
			error: 'No API key provided',
			details:
				'Please provide an API key via options.apiKey or AIRTABLE_API_KEY environment variable',
		};
	}

	return new Promise((resolve) => {
		try {
			const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

			const requestOptions = {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			};

			const req = https.request(url, requestOptions, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode === 200) {
						// Success
						resolve({
							success: true,
							statusCode: 200,
							baseId,
							tableId,
						});
					} else if (res.statusCode === 401 || res.statusCode === 403) {
						// Authentication error
						resolve({
							success: false,
							statusCode: res.statusCode,
							error: 'Authentication error',
							details: 'Invalid API key or insufficient permissions',
						});
					} else if (res.statusCode === 404) {
						// Base or table not found
						resolve({
							success: false,
							statusCode: 404,
							error: 'Not found',
							details: 'Base or table not found. Check baseId and tableId',
						});
					} else {
						// Other error
						try {
							const parsedData = JSON.parse(data);
							resolve({
								success: false,
								statusCode: res.statusCode,
								error: parsedData.error?.type || 'Unknown error',
								details: parsedData.error?.message || 'Unknown error occurred',
							});
						} catch (e) {
							resolve({
								success: false,
								statusCode: res.statusCode,
								error: 'Unknown error',
								details: data || 'No error details available',
							});
						}
					}
				});
			});

			req.on('error', (error) => {
				resolve({
					success: false,
					error: 'Network error',
					details: error.message,
				});
			});

			req.end();
		} catch (error) {
			resolve({
				success: false,
				error: 'Exception',
				details: error.message,
			});
		}
	});
}

/**
 * Run the credential test from the command line
 */
async function runTest() {
	const apiKey = process.env.AIRTABLE_API_KEY;

	console.log('Testing Airtable credentials...');
	console.log(`Base ID: ${AIRTABLE_REFERENCE.BASE_ID}`);
	console.log(`API Key: ${apiKey ? '*****' + apiKey.slice(-5) : 'Not set'}`);

	const result = await testCredentials({ apiKey });

	if (result.success) {
		console.log('✅ Credentials are valid!');
		console.log(`Successfully connected to base: ${result.baseId}`);
		console.log(`Test table: ${result.tableId}`);
	} else {
		console.error('❌ Credential test failed:');
		console.error(`Error: ${result.error}`);
		console.error(`Details: ${result.details}`);

		if (result.statusCode) {
			console.error(`Status Code: ${result.statusCode}`);
		}
	}

	return result;
}

// Run the test if this file is executed directly
if (require.main === module) {
	runTest().catch(console.error);
}

module.exports = {
	testCredentials,
	runTest,
};
