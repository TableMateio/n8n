import { INodeType } from 'n8n-workflow';
import { ICredentialType } from 'n8n-workflow';

// Import the nodes and credentials
import { Ventriloquist } from './packages/nodes-base/nodes/Ventriloquist/Ventriloquist.node';
import { BrightDataApi } from './packages/nodes-base/credentials/BrightDataApi.credentials';

// Export the node and credential classes
export class VentriloquistNode implements INodeType {
	description = new Ventriloquist().description;
}

export class BrightDataApiCredentials implements ICredentialType {
	name = new BrightDataApi().name;
	displayName = new BrightDataApi().displayName;
	documentationUrl = new BrightDataApi().documentationUrl;
	properties = new BrightDataApi().properties;
}
