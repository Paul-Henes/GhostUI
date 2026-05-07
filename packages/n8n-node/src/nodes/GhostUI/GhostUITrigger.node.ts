import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class GhostUITrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ghost-UI Trigger',
		name: 'ghostUiTrigger',
		icon: 'file:ghostui.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Triggers workflow on Ghost-UI events (scan complete, new issue, tracking event)',
		defaults: {
			name: 'Ghost-UI Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'ghostUiApi',
				required: true,
			},
		],
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
				options: [
					{
						name: 'Scan Completed',
						value: 'scan.completed',
						description: 'Triggers when an accessibility scan completes',
					},
					{
						name: 'Scan Failed',
						value: 'scan.failed',
						description: 'Triggers when a scan fails',
					},
					{
						name: 'New Critical Issue',
						value: 'issue.critical',
						description: 'Triggers when a critical accessibility issue is found',
					},
					{
						name: 'Tracking Event',
						value: 'tracking.event',
						description: 'Triggers on any tracking event (pageview, click, etc.)',
					},
					{
						name: 'Accessibility Preference Changed',
						value: 'tracking.preference',
						description: 'Triggers when a user changes accessibility preferences',
					},
					{
						name: 'All Events',
						value: '*',
						description: 'Triggers on any Ghost-UI event',
					},
				],
				default: 'scan.completed',
				description: 'The event that triggers this workflow',
			},
			{
				displayName: 'Site ID Filter',
				name: 'siteIdFilter',
				type: 'string',
				default: '',
				placeholder: 'Leave empty for all sites',
				description: 'Only trigger for events from this site ID (optional)',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const credentials = await this.getCredentials('ghostUiApi');
				const apiUrl = credentials.apiUrl as string;
				const apiToken = credentials.apiToken as string;
				const event = this.getNodeParameter('event') as string;

				try {
					const response = await fetch(`${apiUrl}/api/webhooks`, {
						method: 'GET',
						headers: {
							'Authorization': `Bearer ${apiToken}`,
							'Content-Type': 'application/json',
						},
					});

					if (!response.ok) {
						return false;
					}

					const data = await response.json() as { data?: { webhooks?: Array<{ url: string; event: string }> } };
					const webhooks = data.data?.webhooks || [];
					
					return webhooks.some(
						(webhook) => webhook.url === webhookUrl && webhook.event === event
					);
				} catch (error) {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const credentials = await this.getCredentials('ghostUiApi');
				const apiUrl = credentials.apiUrl as string;
				const apiToken = credentials.apiToken as string;
				const event = this.getNodeParameter('event') as string;
				const siteIdFilter = this.getNodeParameter('siteIdFilter', '') as string;

				try {
					const response = await fetch(`${apiUrl}/api/webhooks`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${apiToken}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							url: webhookUrl,
							event,
							site_id: siteIdFilter || undefined,
							secret: this.getNode().id,
						}),
					});

					if (!response.ok) {
						const error = await response.text();
						throw new Error(`Failed to create webhook: ${error}`);
					}

					const data = await response.json() as { data?: { id: string } };
					const webhookData = this.getWorkflowStaticData('node');
					webhookData.webhookId = data.data?.id;

					return true;
				} catch (error) {
					throw error;
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('ghostUiApi');
				const apiUrl = credentials.apiUrl as string;
				const apiToken = credentials.apiToken as string;
				const webhookData = this.getWorkflowStaticData('node');
				const webhookId = webhookData.webhookId as string;

				if (!webhookId) {
					// Webhook was never created or already deleted
					return true;
				}

				try {
					await fetch(`${apiUrl}/api/webhooks/${webhookId}`, {
						method: 'DELETE',
						headers: {
							'Authorization': `Bearer ${apiToken}`,
						},
					});

					delete webhookData.webhookId;
					return true;
				} catch (error) {
					return false;
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData() as {
			event?: string;
			data?: Record<string, unknown>;
			timestamp?: string;
			site_id?: string;
		};

		// Verify the webhook signature (optional but recommended)
		const expectedSecret = this.getNode().id;
		const receivedSecret = req.headers['x-ghostui-secret'];
		
		if (receivedSecret && receivedSecret !== expectedSecret) {
			// Invalid signature - ignore this request
			return {
				webhookResponse: 'Invalid signature',
			};
		}

		// Filter by site ID if configured
		const siteIdFilter = this.getNodeParameter('siteIdFilter', '') as string;
		if (siteIdFilter && body.site_id !== siteIdFilter) {
			// Not for this site - ignore
			return {
				webhookResponse: 'Filtered out',
			};
		}

		// Return the event data
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					event: body.event,
					data: body.data,
					timestamp: body.timestamp || new Date().toISOString(),
					site_id: body.site_id,
				}),
			],
		};
	}
}
