#!/usr/bin/env node

// Set environment variables
process.env.N8N_HOST = 'https://127.0.0.1:5678';
process.env.N8N_API_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU';

// Disable certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Using https module instead of node-fetch
const https = require('https');

function testN8nConnection() {
	console.log('Testing direct connection to n8n API...');

	return new Promise((resolve, reject) => {
		const options = {
			hostname: '127.0.0.1',
			port: 5678,
			path: '/api/v1/workflows',
			method: 'GET',
			headers: {
				'X-N8N-API-KEY': process.env.N8N_API_KEY,
				Accept: 'application/json',
			},
		};

		const req = https.request(options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				if (res.statusCode !== 200) {
					console.error(`HTTP Error: ${res.statusCode}`);
					return resolve(false);
				}

				try {
					const parsedData = JSON.parse(data);
					console.log('Connection successful!');
					console.log(`Found ${parsedData.data.length} workflows:`);

					// Display workflow names and IDs
					parsedData.data.forEach((workflow, index) => {
						console.log(`${index + 1}. ${workflow.name} (ID: ${workflow.id})`);
					});

					resolve(true);
				} catch (error) {
					console.error('Error parsing JSON:', error.message);
					resolve(false);
				}
			});
		});

		req.on('error', (error) => {
			console.error('Connection failed:', error.message);
			resolve(false);
		});

		req.end();
	});
}

// Run the test
testN8nConnection().then((success) => {
	console.log(success ? 'Test completed successfully' : 'Test failed');
});
