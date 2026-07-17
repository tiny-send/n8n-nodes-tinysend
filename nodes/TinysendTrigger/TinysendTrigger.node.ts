import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

// Webhook trigger. tinysend webhooks are project-scoped and filtered by event
// type: POST /v1/webhooks { url, events } → { id }, DELETE /v1/webhooks/:id.
// Each n8n trigger registers its own subscription against its unique webhook URL.
// Deliveries arrive as { id, type, created_at, data: {...} }.
export class TinysendTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'tinysend Trigger',
		name: 'tinysendTrigger',
		icon: 'file:tinysend.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow on a tinysend event (new subscriber, inbound email, send, …)',
		defaults: { name: 'tinysend Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'tinysendApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'subscriber.created',
				options: [
					{ name: 'New Subscriber', value: 'subscriber.created' },
					{ name: 'Subscriber Unsubscribed', value: 'subscriber.unsubscribed' },
					{ name: 'Post Sent', value: 'post.sent' },
					{ name: 'Post Delivered', value: 'post.delivered' },
					{ name: 'Inbound Email Received', value: 'email.received' },
					{ name: 'Email Delivered', value: 'email.delivered' },
					{ name: 'Email Opened', value: 'email.opened' },
					{ name: 'Email Clicked', value: 'email.clicked' },
					{ name: 'Email Bounced', value: 'email.bounced' },
					{ name: 'Email Replied', value: 'email.replied' },
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// tinysend has no "get webhook by url" endpoint; rely on stored id.
				const webhookData = this.getWorkflowStaticData('node');
				return typeof webhookData.webhookId === 'string';
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const event = this.getNodeParameter('event') as string;
				const credentials = await this.getCredentials('tinysendApi');
				const baseUrl = (credentials.baseUrl as string) || 'https://api.tinysend.com/v1';
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'tinysendApi', {
					method: 'POST',
					url: `${baseUrl}/webhooks`,
					body: { url: webhookUrl, events: [event] },
					json: true,
				})) as IDataObject;
				if (!response.id) return false;
				this.getWorkflowStaticData('node').webhookId = response.id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const id = webhookData.webhookId as string | undefined;
				if (!id) return true;
				const credentials = await this.getCredentials('tinysendApi');
				const baseUrl = (credentials.baseUrl as string) || 'https://api.tinysend.com/v1';
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'tinysendApi', {
						method: 'DELETE',
						url: `${baseUrl}/webhooks/${id}`,
						json: true,
					});
				} catch {
					// already gone — treat as deleted
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		// Ignore probes / empty deliveries.
		if (!body || !body.id) {
			return { noWebhookResponse: true };
		}
		const data = (body.data as IDataObject) || {};
		return {
			workflowData: [
				this.helpers.returnJsonArray([
					{ id: body.id, type: body.type, created_at: body.created_at, ...data },
				]),
			],
		};
	}
}
