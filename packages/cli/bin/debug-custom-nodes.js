#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get custom extensions from environment
const customExtensions = process.env.N8N_CUSTOM_EXTENSIONS || '';
console.log('Custom Extensions Env:', customExtensions);

// Get user home directory and construct custom directory path
const userHome = os.homedir();
const customDir = path.join(userHome, '.n8n', 'custom');
console.log('Looking in custom dir:', customDir);

if (fs.existsSync(customDir)) {
	console.log('Custom directory exists!');

	// List files in custom directory
	const files = fs.readdirSync(customDir);
	console.log('Files in custom directory:', files);

	if (customExtensions) {
		const extensions = customExtensions.split(',');
		console.log('Extensions to look for:', extensions);

		for (const ext of extensions) {
			const extDir = path.join(customDir, ext.trim());
			console.log(`Checking for extension dir: ${extDir}`);

			if (fs.existsSync(extDir)) {
				console.log(`Extension dir exists: ${extDir}`);

				// Check for dist directory
				const distDir = path.join(extDir, 'dist');
				if (fs.existsSync(distDir)) {
					console.log(`Dist dir exists: ${distDir}`);

					// Check for nodes directory in dist
					const nodesDir = path.join(distDir, 'nodes');
					if (fs.existsSync(nodesDir)) {
						console.log(`Nodes dir exists: ${nodesDir}`);

						// List node files
						const nodeFiles = fs.readdirSync(nodesDir);
						console.log(`Node directories:`, nodeFiles);

						// Check if Ventriloquist exists
						const ventriloquistDir = path.join(nodesDir, 'Ventriloquist');
						if (fs.existsSync(ventriloquistDir)) {
							console.log(`Ventriloquist dir exists: ${ventriloquistDir}`);

							// List Ventriloquist node files
							const ventriloquistFiles = fs.readdirSync(ventriloquistDir);
							console.log(`Ventriloquist files:`, ventriloquistFiles);

							// Check for node.js file
							const nodeJsFile = path.join(ventriloquistDir, 'Ventriloquist.node.js');
							if (fs.existsSync(nodeJsFile)) {
								console.log(`Ventriloquist.node.js exists!`);
								console.log(`File size:`, fs.statSync(nodeJsFile).size, 'bytes');
								// Try to require the file
								try {
									console.log('Attempting to load Ventriloquist.node.js...');
									const ventriloquistNode = require(nodeJsFile);
									console.log('Successfully loaded module!', Object.keys(ventriloquistNode));
								} catch (error) {
									console.error('Error loading module:', error);
								}
							} else {
								console.log(`⚠️ Ventriloquist.node.js doesn't exist!`);
							}
						} else {
							console.log(`⚠️ Ventriloquist dir doesn't exist!`);
						}
					} else {
						console.log(`⚠️ Nodes dir doesn't exist!`);
					}
				} else {
					console.log(`⚠️ Dist dir doesn't exist!`);
				}
			} else {
				console.log(`⚠️ Extension dir doesn't exist: ${extDir}`);
			}
		}
	}
} else {
	console.log('⚠️ Custom directory does not exist!');
}
