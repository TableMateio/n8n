import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BrightDataApi implements ICredentialType {
	name = 'brightDataApi';
	displayName = 'Bright Data API';
	documentationUrl = 'https://bright-data.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'WebSocket Endpoint',
			name: 'websocketEndpoint',
			type: 'string',
			default: '',
			placeholder: 'wss://brd-customer-xxxxx:yyyyy@brd.superproxy.io:9222',
			required: true,
			description: 'WebSocket endpoint for Bright Data Browser',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: false,
			description: 'Password for Bright Data Browser authentication (if required)',
		},
		{
			displayName: 'Domains For Authorization',
			name: 'authorizedDomains',
			type: 'string',
			default: '',
			placeholder: 'example.com, mydomain.org',
			required: false,
			description:
				'Comma-separated list of domains that are authorized for access. Use this to help BrightData know which domains your account has permission to access.',
		},
	];
}
