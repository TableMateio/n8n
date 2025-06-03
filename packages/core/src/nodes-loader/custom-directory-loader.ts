import glob from 'fast-glob';

import { DirectoryLoader } from './directory-loader';

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = 'CUSTOM';

	override async loadAll() {
		console.log(`DEBUG CUSTOM LOADER: Loading all from directory ${this.directory}`);

		const nodes = await glob('**/*.node.js', {
			cwd: this.directory,
			absolute: true,
		});

		console.log(`DEBUG CUSTOM LOADER: Found ${nodes.length} node files:`, nodes);

		for (const nodePath of nodes) {
			console.log(`DEBUG CUSTOM LOADER: Loading node from ${nodePath}`);
			try {
				this.loadNodeFromFile(nodePath);
				console.log(`DEBUG CUSTOM LOADER: Successfully loaded node from ${nodePath}`);
			} catch (error) {
				console.error(`DEBUG CUSTOM LOADER: Error loading node from ${nodePath}:`, error);
			}
		}

		const credentials = await glob('**/*.credentials.js', {
			cwd: this.directory,
			absolute: true,
		});

		console.log(`DEBUG CUSTOM LOADER: Found ${credentials.length} credential files:`, credentials);

		for (const credentialPath of credentials) {
			console.log(`DEBUG CUSTOM LOADER: Loading credential from ${credentialPath}`);
			try {
				this.loadCredentialFromFile(credentialPath);
				console.log(`DEBUG CUSTOM LOADER: Successfully loaded credential from ${credentialPath}`);
			} catch (error) {
				console.error(
					`DEBUG CUSTOM LOADER: Error loading credential from ${credentialPath}:`,
					error,
				);
			}
		}
	}
}
