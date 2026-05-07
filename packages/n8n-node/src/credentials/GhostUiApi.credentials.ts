import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GhostUiApi implements ICredentialType {
	name = 'ghostUiApi';
	displayName = 'Ghost-UI API';
	documentationUrl = 'https://ghostui.xyz/docs/api';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://ghostui.onrender.com',
			description: 'The Ghost-UI API base URL',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your Ghost-UI API token (from Dashboard → Settings)',
		},
	];
}
