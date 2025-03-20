#!/usr/bin/env node

// Set environment variables
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.log(`NODE_TLS_REJECT_UNAUTHORIZED=${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);

// Import modules
const https = require('https');

// Test URL and API key
const url = 'https://127.0.0.1:5678';
const apiKey =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU';

console.log(`Testing connection to: ${url}`);
console.log(`Using API key: ${apiKey.substring(0, 15)}...`);

// Parse URL
const parsedUrl = new URL('/api/v1/workflows', url);

// Setup request options
const options = {
	hostname: parsedUrl.hostname,
	port: parsedUrl.port,
	path: parsedUrl.pathname,
	method: 'GET',
	headers: {
		'X-N8N-API-KEY': apiKey,
		Accept: 'application/json',
	},
	rejectUnauthorized: false,
	requestCert: true,
	agent: false,
};

console.log('Request options:', JSON.stringify(options, null, 2));

// Make the request
const req = https.request(options, (res) => {
	console.log(`Status code: ${res.statusCode}`);
	console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

	let data = '';

	res.on('data', (chunk) => {
		data += chunk;
		console.log(`Received chunk of ${chunk.length} bytes`);
	});

	res.on('end', () => {
		console.log('Response completed');

		if (data) {
			try {
				const parsedData = JSON.parse(data);
				console.log('Parsed data:', JSON.stringify(parsedData, null, 2).substring(0, 500) + '...');
			} catch (e) {
				console.log('Raw data (could not parse as JSON):', data.substring(0, 500) + '...');
			}
		} else {
			console.log('No data received');
		}

		console.log('Test completed successfully');
	});
});

// Handle errors
req.on('error', (error) => {
	console.error('Error making request:', error);
	console.error('Error details:', {
		message: error.message,
		code: error.code,
		stack: error.stack,
	});
});

// End the request
req.end();

console.log('Request sent, waiting for response...');
