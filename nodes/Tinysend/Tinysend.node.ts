import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

// Thin wrapper over the tinysend public REST API (api.tinysend.com/v1).
// Auth (Bearer) + base URL come from the tinysendApi credential; here we just
// pick the path/method/body per resource+operation. Mirrors the zapier app.
async function tinysendRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('tinysendApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://api.tinysend.com/v1';
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'tinysendApi', {
			method,
			url: `${baseUrl}${path}`,
			body,
			json: true,
		});
	} catch (error) {
		// Surface tinysend's { error: { code, message } } envelope cleanly.
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export class Tinysend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'tinysend',
		name: 'tinysend',
		icon: 'file:tinysend.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send newsletters and transactional email, manage subscribers and agent mailboxes',
		defaults: { name: 'tinysend' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'tinysendApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Newsletter', value: 'newsletter' },
					{ name: 'Subscriber', value: 'subscriber' },
					{ name: 'Transactional Email', value: 'transactionalEmail' },
					{ name: 'Mailbox', value: 'mailbox' },
				],
				default: 'newsletter',
			},

			// ---- Newsletter ----
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['newsletter'] } },
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Create a post and broadcast it to the list',
						action: 'Send a newsletter to a list',
					},
					{
						name: 'Create Draft',
						value: 'createDraft',
						description: 'Create a post without sending it',
						action: 'Create a newsletter draft',
					},
				],
				default: 'send',
			},

			// ---- Subscriber ----
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['subscriber'] } },
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a subscriber to a list',
						action: 'Add a subscriber',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List subscribers on a list',
						action: 'Get many subscribers',
					},
				],
				default: 'add',
			},

			// ---- Transactional Email ----
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['transactionalEmail'] } },
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send a one-off email to a single recipient',
						action: 'Send a transactional email',
					},
				],
				default: 'send',
			},

			// ---- Mailbox ----
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['mailbox'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a mailbox (agent inbox or disposable)',
						action: 'Create a mailbox',
					},
					{
						name: 'Send Email',
						value: 'sendEmail',
						description: 'Send (or reply to) an email from a mailbox',
						action: 'Send an email from a mailbox',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List mailboxes',
						action: 'Get many mailboxes',
					},
				],
				default: 'sendEmail',
			},

			// ---- shared: list picker (newsletter + subscriber) ----
			{
				displayName: 'List Name or ID',
				name: 'listId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLists' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['newsletter', 'subscriber'],
					},
				},
			},

			// ---- newsletter: send / createDraft fields ----
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['newsletter'] } },
			},
			{
				displayName: 'Body (HTML)',
				name: 'bodyHtml',
				type: 'string',
				typeOptions: { rows: 6 },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['newsletter'] } },
			},
			{
				displayName: 'Body (Plain Text)',
				name: 'bodyText',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Optional plain-text fallback',
				displayOptions: { show: { resource: ['newsletter'] } },
			},

			// ---- subscriber: add fields ----
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@example.com',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['subscriber'], operation: ['add'] } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['subscriber'], operation: ['add'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { resource: ['subscriber'], operation: ['getAll'] } },
			},

			// ---- transactional email fields ----
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				placeholder: 'name@example.com',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['transactionalEmail'] } },
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: 'you@yourdomain.com',
				description:
					'Sending mailbox address. Optional with a mailbox-scoped key (defaults to its mailbox); required with a project-wide key. Must be an existing mailbox or verified domain.',
				displayOptions: { show: { resource: ['transactionalEmail'] } },
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['transactionalEmail'] } },
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				description: 'HTML body. Provide HTML or Text (or both).',
				displayOptions: { show: { resource: ['transactionalEmail'] } },
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Plain-text body. Provide HTML or Text (or both).',
				displayOptions: { show: { resource: ['transactionalEmail'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['transactionalEmail'] } },
				options: [
					{ displayName: 'Reply To', name: 'reply_to', type: 'string', default: '' },
					{
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
						default: '',
						description: 'Free-form tag, filterable',
					},
				],
			},

			// ---- mailbox: create fields ----
			{
				displayName: 'Type',
				name: 'mailboxType',
				type: 'options',
				options: [
					{ name: 'Standard', value: 'standard' },
					{ name: 'Disposable', value: 'disposable' },
				],
				default: 'standard',
				displayOptions: { show: { resource: ['mailbox'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'mailboxFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['mailbox'], operation: ['create'] } },
				options: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: 'Local part or full address. Auto-generated for disposable if omitted.',
					},
					{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{
						displayName: 'TTL (Seconds)',
						name: 'ttl',
						type: 'number',
						default: 0,
						description: 'For disposable mailboxes: seconds until it expires (0 = default)',
					},
				],
			},

			// ---- mailbox: sendEmail fields ----
			{
				displayName: 'Mailbox Name or ID',
				name: 'mailboxId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMailboxes' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['mailbox'], operation: ['sendEmail'] } },
			},
			{
				displayName: 'To',
				name: 'toAddress',
				type: 'string',
				placeholder: 'name@example.com',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['mailbox'], operation: ['sendEmail'] } },
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['mailbox'], operation: ['sendEmail'] } },
			},
			{
				displayName: 'HTML Body',
				name: 'htmlBody',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				displayOptions: { show: { resource: ['mailbox'], operation: ['sendEmail'] } },
			},
			{
				displayName: 'Text Body',
				name: 'textBody',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				displayOptions: { show: { resource: ['mailbox'], operation: ['sendEmail'] } },
			},
			{
				displayName: 'In Reply To',
				name: 'inReplyTo',
				type: 'string',
				default: '',
				description: 'Message-ID of the email being replied to (preserves threading)',
				displayOptions: { show: { resource: ['mailbox'], operation: ['sendEmail'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { resource: ['mailbox'], operation: ['getAll'] } },
			},
		],
	};

	methods = {
		loadOptions: {
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const lists = (await tinysendRequest.call(this, 'GET', '/lists')) as IDataObject[];
				return lists.map((l) => ({ name: (l.name as string) || (l.id as string), value: l.id as string }));
			},
			async getMailboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const boxes = (await tinysendRequest.call(this, 'GET', '/mailboxes')) as IDataObject[];
				return boxes.map((m) => ({
					name: (m.address as string) || (m.name as string) || (m.id as string),
					value: m.id as string,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};

				if (resource === 'newsletter') {
					const listId = this.getNodeParameter('listId', i) as string;
					const subject = this.getNodeParameter('subject', i) as string;
					const body_html = this.getNodeParameter('bodyHtml', i) as string;
					const body_text = this.getNodeParameter('bodyText', i, '') as string;
					const created = (await tinysendRequest.call(this, 'POST', `/lists/${listId}/posts`, {
						subject,
						body_html,
						...(body_text ? { body_text } : {}),
					})) as IDataObject;
					if (operation === 'createDraft') {
						responseData = { ...created, status: 'draft' };
					} else {
						const sent = (await tinysendRequest.call(
							this,
							'POST',
							`/lists/${listId}/posts/${created.id}/send`,
						)) as IDataObject;
						responseData = { ...created, ...sent };
					}
				} else if (resource === 'subscriber') {
					const listId = this.getNodeParameter('listId', i) as string;
					if (operation === 'add') {
						const email = this.getNodeParameter('email', i) as string;
						const name = this.getNodeParameter('name', i, '') as string;
						responseData = (await tinysendRequest.call(this, 'POST', `/lists/${listId}/subscribers`, {
							email,
							...(name ? { name } : {}),
						})) as IDataObject;
					} else {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						responseData = (await tinysendRequest.call(
							this,
							'GET',
							`/lists/${listId}/subscribers?limit=${limit}`,
						)) as IDataObject[];
					}
				} else if (resource === 'transactionalEmail') {
					const to = this.getNodeParameter('to', i) as string;
					const from = this.getNodeParameter('from', i, '') as string;
					const subject = this.getNodeParameter('subject', i) as string;
					const html = this.getNodeParameter('html', i, '') as string;
					const text = this.getNodeParameter('text', i, '') as string;
					const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					responseData = (await tinysendRequest.call(this, 'POST', '/emails', {
						to,
						subject,
						...(from ? { from } : {}),
						...(html ? { html } : {}),
						...(text ? { text } : {}),
						...additional,
					})) as IDataObject;
				} else if (resource === 'mailbox') {
					if (operation === 'create') {
						const type = this.getNodeParameter('mailboxType', i) as string;
						const extra = this.getNodeParameter('mailboxFields', i, {}) as IDataObject;
						const payload: IDataObject = { type };
						if (extra.address) payload.address = extra.address;
						if (extra.domain) payload.domain = extra.domain;
						if (extra.name) payload.name = extra.name;
						if (extra.ttl) payload.ttl = extra.ttl;
						responseData = (await tinysendRequest.call(this, 'POST', '/mailboxes', payload)) as IDataObject;
					} else if (operation === 'sendEmail') {
						const mailboxId = this.getNodeParameter('mailboxId', i) as string;
						const to_address = this.getNodeParameter('toAddress', i) as string;
						const subject = this.getNodeParameter('subject', i) as string;
						const html_body = this.getNodeParameter('htmlBody', i, '') as string;
						const text_body = this.getNodeParameter('textBody', i, '') as string;
						const in_reply_to = this.getNodeParameter('inReplyTo', i, '') as string;
						responseData = (await tinysendRequest.call(
							this,
							'POST',
							`/mailboxes/${mailboxId}/emails`,
							{
								to_address,
								subject,
								...(html_body ? { html_body } : {}),
								...(text_body ? { text_body } : {}),
								...(in_reply_to ? { in_reply_to } : {}),
							},
						)) as IDataObject;
					} else {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const boxes = (await tinysendRequest.call(this, 'GET', '/mailboxes')) as IDataObject[];
						responseData = boxes.slice(0, limit);
					}
				}

				const asArray = Array.isArray(responseData) ? responseData : [responseData];
				for (const entry of asArray) {
					returnData.push({ json: entry, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
