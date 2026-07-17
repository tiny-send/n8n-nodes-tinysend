import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// tinysend uses Bearer API-key auth: `Authorization: Bearer sk_*`.
// The credential test hits GET /v1/usage — a cheap, always-available
// account-scoped endpoint; 200 means the key is valid.
export class TinysendApi implements ICredentialType {
	name = 'tinysendApi';

	displayName = 'tinysend API';

	documentationUrl = 'https://tinysend.com/developers';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Create an API key at id.tinysend.com. It starts with sk_.',
		},
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.tinysend.com/v1',
			description: 'Override only for staging. Leave as-is for production.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/usage',
			method: 'GET',
		},
	};
}
