#!/usr/bin/env node

// Set environment variables
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Import modules
const https = require('https');
const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
	url: 'https://127.0.0.1:5678',
	apiKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
};

// Function to make requests to n8n API
async function makeN8nRequest(path, method = 'GET', body = null) {
	return new Promise((resolve, reject) => {
		try {
			// Ensure we have a valid URL by constructing it properly
			const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
			const apiPath = path.startsWith('/') ? path : `/${path}`;
			const fullUrl = baseUrl + '/api/v1' + apiPath;

			// Parse the URL for the request options
			const parsedUrl = new URL(fullUrl);

			// Set the request options
			const options = {
				hostname: parsedUrl.hostname,
				port: parsedUrl.port,
				path: parsedUrl.pathname + parsedUrl.search,
				method: method,
				headers: {
					'X-N8N-API-KEY': config.apiKey,
					Accept: 'application/json',
				},
				// These settings are needed for self-signed certificates
				rejectUnauthorized: false,
				requestCert: true,
				agent: false,
			};

			// Add the body if provided
			if (body) {
				const bodyData = JSON.stringify(body);
				options.headers['Content-Type'] = 'application/json';
				options.headers['Content-Length'] = Buffer.byteLength(bodyData);
			}

			// Choose the right protocol module
			const protocol = parsedUrl.protocol === 'https:' ? https : http;

			// Make the request
			const req = protocol.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						try {
							if (data && data.trim()) {
								resolve(JSON.parse(data));
							} else {
								resolve({});
							}
						} catch (error) {
							reject(new Error(`Failed to parse response: ${error.message}`));
						}
					} else {
						reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
					}
				});
			});

			req.on('error', (error) => {
				reject(error);
			});

			if (body) {
				req.write(JSON.stringify(body));
			}

			req.end();
		} catch (error) {
			reject(error);
		}
	});
}

// Command handlers
const commands = {
	// Test the connection to n8n
	async test() {
		try {
			const data = await makeN8nRequest('/workflows');
			console.log('Connection successful!');
			return data;
		} catch (error) {
			console.error('Connection failed:', error.message);
			throw error;
		}
	},

	// List all workflows
	async list() {
		const data = await makeN8nRequest('/workflows');

		if (data.data && data.data.length > 0) {
			console.log(`Found ${data.data.length} workflows:`);

			data.data.forEach((workflow, index) => {
				console.log(
					`${index + 1}. ${workflow.name} (ID: ${workflow.id}, Active: ${workflow.active ? 'Yes' : 'No'})`,
				);
			});
		} else {
			console.log('No workflows found.');
		}

		return data;
	},

	// Get a specific workflow
	async get(id) {
		if (!id) {
			console.error('Error: Workflow ID is required');
			return;
		}

		const data = await makeN8nRequest(`/workflows/${id}`);
		console.log(`Workflow: ${data.name}`);
		console.log(`ID: ${data.id}`);
		console.log(`Active: ${data.active ? 'Yes' : 'No'}`);
		console.log(`Nodes: ${data.nodes ? data.nodes.length : 0}`);

		return data;
	},

	// Create a new workflow
	async create(name) {
		if (!name) {
			console.error('Error: Workflow name is required');
			return;
		}

		const workflowData = {
			name,
			nodes: [],
			connections: {},
			settings: {
				executionOrder: 'v1',
			},
		};

		const data = await makeN8nRequest('/workflows', 'POST', workflowData);
		console.log(`Created workflow "${data.name}" with ID ${data.id}`);

		return data;
	},

	// Create a new workflow with standardized naming convention
	async createNamed(componentType, entity, componentName) {
		// Validate required parameters
		if (!componentType || !entity) {
			console.error('Error: Component type and entity are required');
			console.log('Usage: create-named <componentType> <entity> [componentName]');
			console.log('Example: create-named OPERATION Airtable "Search Records"');
			return;
		}

		// Validate component type
		const validTypes = ['OPERATION', 'PROCESS', 'ROUTER'];
		if (!validTypes.includes(componentType.toUpperCase())) {
			console.error(`Error: Invalid component type: ${componentType}`);
			console.log(`Valid component types: ${validTypes.join(', ')}`);
			return;
		}

		// Format the workflow name according to the convention
		let name = `${componentType.toUpperCase()}: ${entity}`;
		if (componentName) {
			name += ` - ${componentName}`;
		}

		// Create the workflow with the formatted name
		const workflowData = {
			name,
			nodes: [],
			connections: {},
			settings: {
				executionOrder: 'v1',
			},
		};

		const data = await makeN8nRequest('/workflows', 'POST', workflowData);
		console.log(`Created workflow "${data.name}" with ID ${data.id}`);

		return data;
	},

	// Update a workflow
	async update(id, updates) {
		if (!id) {
			console.error('Error: Workflow ID is required');
			return;
		}

		// First get the current workflow
		const currentWorkflow = await makeN8nRequest(`/workflows/${id}`);

		// Apply updates
		const updatedWorkflow = {
			...currentWorkflow,
			...updates,
		};

		// Send the updated workflow
		const data = await makeN8nRequest(`/workflows/${id}`, 'PUT', updatedWorkflow);
		console.log(`Updated workflow "${data.name}"`);

		return data;
	},

	// Delete a workflow
	async delete(id) {
		if (!id) {
			console.error('Error: Workflow ID is required');
			return;
		}

		await makeN8nRequest(`/workflows/${id}`, 'DELETE');
		console.log(`Deleted workflow with ID ${id}`);

		return { success: true };
	},

	// Activate a workflow
	async activate(id) {
		if (!id) {
			console.error('Error: Workflow ID is required');
			return;
		}

		const data = await makeN8nRequest(`/workflows/${id}/activate`, 'POST');
		console.log(`Activated workflow "${data.name}"`);

		return data;
	},

	// Deactivate a workflow
	async deactivate(id) {
		if (!id) {
			console.error('Error: Workflow ID is required');
			return;
		}

		const data = await makeN8nRequest(`/workflows/${id}/deactivate`, 'POST');
		console.log(`Deactivated workflow "${data.name}"`);

		return data;
	},

	// Import/Push a workflow from a JSON file
	async pushJson(filePath) {
		if (!filePath) {
			console.error('Error: JSON file path is required');
			console.log('Usage: push-json <file-path>');
			console.log('Example: push-json workflows/routers/auctions.json');
			return;
		}

		try {
			// Read the workflow file
			console.log(`Reading workflow from ${filePath}...`);
			const workflowData = fs.readFileSync(path.resolve(filePath), 'utf8');
			const workflow = JSON.parse(workflowData);

			// Check if workflow has required fields
			if (!workflow.name) {
				// If no name is provided, generate one based on the filename
				const fileName = path.basename(filePath, '.json');
				const dirName = path.dirname(filePath).split('/').pop();

				// Determine component type from directory structure
				let componentType = 'UNKNOWN';
				if (filePath.includes('workflows/operations/')) {
					componentType = 'OPERATION';
				} else if (filePath.includes('workflows/processes/')) {
					componentType = 'PROCESS';
				} else if (filePath.includes('workflows/routers/')) {
					componentType = 'ROUTER';
				}

				workflow.name = `${componentType}: ${fileName}`;
				console.log(`No workflow name found, using generated name: "${workflow.name}"`);
			}

			// Ensure other required properties exist
			workflow.nodes = workflow.nodes || [];
			workflow.connections = workflow.connections || {};
			workflow.settings = workflow.settings || { executionOrder: 'v1' };

			// Search for existing workflow with the same name
			console.log(`Searching for existing workflow with name: "${workflow.name}"...`);
			const existingWorkflows = await makeN8nRequest('/workflows');
			const matchingWorkflow = existingWorkflows.data?.find((w) => w.name === workflow.name);

			let result;
			if (matchingWorkflow) {
				// Update existing workflow
				console.log(`Found existing workflow with ID ${matchingWorkflow.id}, updating...`);
				// We need to preserve the ID and other critical fields
				const updatedWorkflow = {
					...matchingWorkflow,
					nodes: workflow.nodes,
					connections: workflow.connections,
					settings: workflow.settings,
				};

				result = await makeN8nRequest(`/workflows/${matchingWorkflow.id}`, 'PUT', updatedWorkflow);
				console.log(`Updated workflow "${result.name}" with ID ${result.id}`);
			} else {
				// Create a new workflow
				console.log('No existing workflow found, creating new workflow...');
				result = await makeN8nRequest('/workflows', 'POST', workflow);
				console.log(`Created workflow "${result.name}" with ID ${result.id}`);
			}

			return result;
		} catch (error) {
			console.error(`Failed to import workflow: ${error.message}`);
			if (error.message.includes('ENOENT')) {
				console.error(`File not found: ${filePath}`);
			}
			throw error;
		}
	},

	// Import/Push all workflows from a directory
	async pushAll(directoryPath) {
		if (!directoryPath) {
			console.error('Error: Directory path is required');
			console.log('Usage: push-all <directory-path>');
			console.log('Example: push-all workflows/routers');
			return;
		}

		try {
			// Check if directory exists
			const dirPath = path.resolve(directoryPath);
			if (!fs.existsSync(dirPath)) {
				console.error(`Directory not found: ${dirPath}`);
				return;
			}

			console.log(`Scanning directory: ${dirPath} for JSON workflow files...`);

			// Get all JSON files in the directory and its subdirectories
			const findJsonFiles = (dir) => {
				let results = [];
				const items = fs.readdirSync(dir);

				for (const item of items) {
					const itemPath = path.join(dir, item);
					const stat = fs.statSync(itemPath);

					if (stat.isDirectory()) {
						// Recursively scan subdirectories
						results = results.concat(findJsonFiles(itemPath));
					} else if (item.endsWith('.json')) {
						// Add JSON files to results
						results.push(itemPath);
					}
				}

				return results;
			};

			const jsonFiles = findJsonFiles(dirPath);
			console.log(`Found ${jsonFiles.length} JSON files.`);

			if (jsonFiles.length === 0) {
				console.log('No JSON workflow files found.');
				return;
			}

			// Process each file
			const results = [];
			for (const file of jsonFiles) {
				console.log(`\nProcessing file: ${file}`);
				try {
					const result = await this.pushJson(file);
					results.push({ file, success: true, result });
				} catch (error) {
					console.error(`Failed to process ${file}: ${error.message}`);
					results.push({ file, success: false, error: error.message });
				}
			}

			// Summarize results
			console.log('\n--- Import Summary ---');
			const successCount = results.filter((r) => r.success).length;
			console.log(`Successfully imported: ${successCount}/${jsonFiles.length} workflows`);

			if (successCount < jsonFiles.length) {
				console.log('\nFailed imports:');
				results
					.filter((r) => !r.success)
					.forEach((r) => {
						console.log(`- ${path.basename(r.file)}: ${r.error}`);
					});
			}

			return results;
		} catch (error) {
			console.error(`Failed to import workflows: ${error.message}`);
			throw error;
		}
	},

	// Help command
	help() {
		console.log('Available commands:');
		console.log('  test                                      - Test connection to n8n');
		console.log('  list                                      - List all workflows');
		console.log('  get [id]                                  - Get workflow details by ID');
		console.log('  create [name]                             - Create a new workflow');
		console.log(
			'  create-named [componentType] [entity] [componentName] - Create a workflow with standard naming',
		);
		console.log(
			'                                              Example: create-named OPERATION Airtable "Search Records"',
		);
		console.log('  update [id] [name]                        - Update workflow name');
		console.log('  delete [id]                               - Delete a workflow');
		console.log('  activate [id]                             - Activate a workflow');
		console.log('  deactivate [id]                           - Deactivate a workflow');
		console.log(
			'  push-json [filePath]                      - Import/Push a workflow from a JSON file',
		);
		console.log(
			'  push-all [directoryPath]                  - Import/Push all JSON workflows from a directory',
		);
		console.log('  exit                                      - Exit the CLI');
	},
};

// Process command line arguments
async function processCommand(command, args) {
	try {
		switch (command) {
			case 'test':
				return await commands.test();
			case 'list':
				return await commands.list();
			case 'get':
				return await commands.get(args[0]);
			case 'create':
				return await commands.create(args[0]);
			case 'create-named':
				return await commands.createNamed(args[0], args[1], args[2]);
			case 'update':
				return await commands.update(args[0], { name: args[1] });
			case 'delete':
				return await commands.delete(args[0]);
			case 'activate':
				return await commands.activate(args[0]);
			case 'deactivate':
				return await commands.deactivate(args[0]);
			case 'push-json':
				return await commands.pushJson(args[0]);
			case 'push-all':
				return await commands.pushAll(args[0]);
			case 'help':
				return commands.help();
			case 'exit':
				console.log('Exiting...');
				process.exit(0);
			default:
				console.log(`Unknown command: ${command}`);
				commands.help();
				return null;
		}
	} catch (error) {
		console.error(`Error executing command: ${error.message}`);
		return null;
	}
}

// Main function
async function main() {
	// Check if command line arguments are provided
	if (process.argv.length > 2) {
		const command = process.argv[2];
		const args = process.argv.slice(3);

		await processCommand(command, args);
		process.exit(0);
	}

	// Interactive mode
	console.log('n8n CLI - Interactive Mode');
	console.log('Type "help" for available commands or "exit" to quit');

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: 'n8n> ',
	});

	rl.prompt();

	rl.on('line', async (line) => {
		const args = line.trim().split(' ');
		const command = args.shift();

		if (command) {
			await processCommand(command, args);
		}

		rl.prompt();
	}).on('close', () => {
		console.log('Exiting...');
		process.exit(0);
	});
}

// Start the CLI
main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
