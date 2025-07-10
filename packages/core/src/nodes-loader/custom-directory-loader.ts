import glob from 'fast-glob';

import { DirectoryLoader } from './directory-loader';

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = 'CUSTOM';

	override async loadAll() {
		const nodes = await glob('**/*.node.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const nodePath of nodes) {
			try {
				this.loadNodeFromFile(nodePath);
			} catch (error) {
				console.error(`Error loading node from ${nodePath}:`, error);
			}
		}

		const credentials = await glob('**/*.credentials.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const credentialPath of credentials) {
			try {
				this.loadCredentialFromFile(credentialPath);
			} catch (error) {
				console.error(`Error loading credential from ${credentialPath}:`, error);
			}
		}
	}
}
