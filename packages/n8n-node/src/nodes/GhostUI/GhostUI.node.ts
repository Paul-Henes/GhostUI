import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class GhostUI implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ghost-UI',
		name: 'ghostUi',
		icon: 'file:ghostui.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Accessibility scanning, compliance reporting & AI-powered fixes',
		defaults: {
			name: 'Ghost-UI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ghostUiApi',
				required: true,
			},
		],
		properties: [
			// Resource Selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Compliance Scan',
						value: 'scan',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Report',
						value: 'report',
					},
					{
						name: 'AI Agent',
						value: 'agent',
					},
					{
						name: 'Analytics',
						value: 'analytics',
					},
				],
				default: 'scan',
			},

			// ==========================================
			// SCAN Operations
			// ==========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['scan'],
					},
				},
				options: [
					{
						name: 'Start Scan',
						value: 'startScan',
						description: 'Start a new accessibility scan',
						action: 'Start a new accessibility scan',
					},
					{
						name: 'Get Scan Status',
						value: 'getScan',
						description: 'Get the status of a scan',
						action: 'Get scan status',
					},
					{
						name: 'Wait for Completion',
						value: 'waitForScan',
						description: 'Wait until a scan completes',
						action: 'Wait for scan to complete',
					},
					{
						name: 'Get Fix Script URL',
						value: 'getFixScript',
						description: 'Get the one-click fix script URL',
						action: 'Get fix script URL',
					},
				],
				default: 'startScan',
			},

			// Scan URL
			{
				displayName: 'Website URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['scan'],
						operation: ['startScan'],
					},
				},
				placeholder: 'https://example.com',
				description: 'The URL to scan for accessibility issues',
			},

			// Scan Options
			{
				displayName: 'Options',
				name: 'scanOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['scan'],
						operation: ['startScan'],
					},
				},
				options: [
					{
						displayName: 'Full Page Screenshot',
						name: 'fullPage',
						type: 'boolean',
						default: true,
						description: 'Whether to capture a full-page screenshot',
					},
					{
						displayName: 'Dismiss Cookie Banners',
						name: 'dismissCookieBanner',
						type: 'boolean',
						default: true,
						description: 'Whether to try dismissing cookie consent banners',
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 60000,
						description: 'Maximum time to wait for page load',
					},
				],
			},

			// Scan ID (for get/wait operations)
			{
				displayName: 'Scan ID',
				name: 'scanId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['scan'],
						operation: ['getScan', 'waitForScan', 'getFixScript'],
					},
				},
				description: 'The ID of the scan',
			},

			// Wait timeout
			{
				displayName: 'Max Wait Time (seconds)',
				name: 'maxWaitTime',
				type: 'number',
				default: 300,
				displayOptions: {
					show: {
						resource: ['scan'],
						operation: ['waitForScan'],
					},
				},
				description: 'Maximum time to wait for scan completion',
			},

			// ==========================================
			// ISSUE Operations
			// ==========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['issue'],
					},
				},
				options: [
					{
						name: 'Get All Issues',
						value: 'getIssues',
						description: 'Get all issues from a scan',
						action: 'Get all issues from a scan',
					},
					{
						name: 'Get Issue Details',
						value: 'getIssue',
						description: 'Get details of a specific issue',
						action: 'Get issue details',
					},
				],
				default: 'getIssues',
			},

			// Scan ID for issues
			{
				displayName: 'Scan ID',
				name: 'scanId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['issue'],
						operation: ['getIssues'],
					},
				},
				description: 'The ID of the scan to get issues from',
			},

			// Issue ID
			{
				displayName: 'Issue ID',
				name: 'issueId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['issue'],
						operation: ['getIssue'],
					},
				},
				description: 'The ID of the issue',
			},

			// Issue filters
			{
				displayName: 'Filters',
				name: 'issueFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['issue'],
						operation: ['getIssues'],
					},
				},
				options: [
					{
						displayName: 'Severity',
						name: 'severity',
						type: 'options',
						options: [
							{ name: 'All', value: '' },
							{ name: 'Critical', value: 'critical' },
							{ name: 'Serious', value: 'serious' },
							{ name: 'Moderate', value: 'moderate' },
							{ name: 'Minor', value: 'minor' },
						],
						default: '',
						description: 'Filter by severity level',
					},
				],
			},

			// ==========================================
			// REPORT Operations
			// ==========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['report'],
					},
				},
				options: [
					{
						name: 'Generate Audit Report',
						value: 'auditReport',
						description: 'Generate a PDF audit report',
						action: 'Generate audit report',
					},
					{
						name: 'Generate Accessibility Statement',
						value: 'statement',
						description: 'Generate a BFSG-compliant accessibility statement',
						action: 'Generate accessibility statement',
					},
				],
				default: 'auditReport',
			},

			// Scan ID for reports
			{
				displayName: 'Scan ID',
				name: 'scanId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['report'],
					},
				},
				description: 'The ID of the scan to generate report for',
			},

			// Statement options
			{
				displayName: 'Organization Name',
				name: 'organizationName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['statement'],
					},
				},
				description: 'Name of the organization',
			},
			{
				displayName: 'Contact Email',
				name: 'contactEmail',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['statement'],
					},
				},
				placeholder: 'accessibility@example.com',
				description: 'Contact email for accessibility feedback',
			},
			{
				displayName: 'Website URL',
				name: 'websiteUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['statement'],
					},
				},
				description: 'The website URL for the statement',
			},
			{
				displayName: 'Bundesland',
				name: 'bundesland',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['statement'],
					},
				},
				options: [
					{ name: 'Baden-Württemberg', value: 'baden-wuerttemberg' },
					{ name: 'Bayern', value: 'bayern' },
					{ name: 'Berlin', value: 'berlin' },
					{ name: 'Brandenburg', value: 'brandenburg' },
					{ name: 'Bremen', value: 'bremen' },
					{ name: 'Hamburg', value: 'hamburg' },
					{ name: 'Hessen', value: 'hessen' },
					{ name: 'Mecklenburg-Vorpommern', value: 'mecklenburg-vorpommern' },
					{ name: 'Niedersachsen', value: 'niedersachsen' },
					{ name: 'Nordrhein-Westfalen', value: 'nordrhein-westfalen' },
					{ name: 'Rheinland-Pfalz', value: 'rheinland-pfalz' },
					{ name: 'Saarland', value: 'saarland' },
					{ name: 'Sachsen', value: 'sachsen' },
					{ name: 'Sachsen-Anhalt', value: 'sachsen-anhalt' },
					{ name: 'Schleswig-Holstein', value: 'schleswig-holstein' },
					{ name: 'Thüringen', value: 'thueringen' },
				],
				default: 'berlin',
				description: 'German state for Schlichtungsstelle lookup',
			},

			// ==========================================
			// AGENT Operations
			// ==========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['agent'],
					},
				},
				options: [
					{
						name: 'Run Auditor',
						value: 'runAuditor',
						description: 'Run Gemini Vision accessibility auditor',
						action: 'Run auditor agent',
					},
					{
						name: 'Run Analyzer',
						value: 'runAnalyzer',
						description: 'Run UX analyzer agent',
						action: 'Run analyzer agent',
					},
					{
						name: 'Run Fixer',
						value: 'runFixer',
						description: 'Generate AI code fix for an issue',
						action: 'Run fixer agent',
					},
				],
				default: 'runAuditor',
			},

			// Agent URL
			{
				displayName: 'URL',
				name: 'agentUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['runAuditor', 'runAnalyzer'],
					},
				},
				placeholder: 'https://example.com',
				description: 'The URL to analyze',
			},

			// Fixer inputs
			{
				displayName: 'Code to Fix',
				name: 'code',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['runFixer'],
					},
				},
				placeholder: '<button></button>',
				description: 'The HTML/CSS/JS code with accessibility issues',
			},
			{
				displayName: 'Issue Description',
				name: 'issueDescription',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['runFixer'],
					},
				},
				placeholder: 'Button has no accessible name',
				description: 'Description of the accessibility issue',
			},
			{
				displayName: 'WCAG Criterion',
				name: 'wcagCriterion',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['runFixer'],
					},
				},
				placeholder: '4.1.2',
				description: 'The WCAG criterion being violated',
			},

			// ==========================================
			// ANALYTICS Operations
			// ==========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['analytics'],
					},
				},
				options: [
					{
						name: 'Get Analytics',
						value: 'getAnalytics',
						description: 'Get analytics data for a site',
						action: 'Get analytics data',
					},
				],
				default: 'getAnalytics',
			},

			// Analytics Site ID
			{
				displayName: 'Site ID',
				name: 'siteId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['analytics'],
					},
				},
				description: 'The site ID to get analytics for',
			},

			// Analytics period
			{
				displayName: 'Period',
				name: 'period',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['analytics'],
					},
				},
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Week', value: 'week' },
					{ name: 'Month', value: 'month' },
				],
				default: 'week',
				description: 'Time period for analytics',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('ghostUiApi');
		const apiUrl = credentials.apiUrl as string;
		const apiToken = credentials.apiToken as string;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Helper function for API calls
		const apiCall = async (
			method: string,
			endpoint: string,
			body?: object,
		): Promise<any> => {
			const options: RequestInit = {
				method,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiToken}`,
				},
			};
			if (body) {
				options.body = JSON.stringify(body);
			}

			const response = await fetch(`${apiUrl}${endpoint}`, options);
			const data = await response.json() as { error?: string; data?: any };

			if (!response.ok) {
				throw new NodeOperationError(
					this.getNode(),
					`API Error: ${data.error || response.statusText}`,
				);
			}

			return data;
		};

		// Helper to wait/poll
		const waitForScan = async (scanId: string, maxWaitTime: number): Promise<any> => {
			const startTime = Date.now();
			while (Date.now() - startTime < maxWaitTime * 1000) {
				const result = await apiCall('GET', `/api/compliance/scan/${scanId}`);
				if (result.data?.status === 'completed' || result.data?.status === 'failed') {
					return result;
				}
				// Wait 3 seconds before next poll
				await new Promise(resolve => setTimeout(resolve, 3000));
			}
			throw new NodeOperationError(this.getNode(), 'Scan timed out');
		};

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				// ==========================================
				// SCAN Operations
				// ==========================================
				if (resource === 'scan') {
					if (operation === 'startScan') {
						const url = this.getNodeParameter('url', i) as string;
						const options = this.getNodeParameter('scanOptions', i, {}) as {
							fullPage?: boolean;
							dismissCookieBanner?: boolean;
							timeout?: number;
						};

						responseData = await apiCall('POST', '/api/compliance/scan', {
							url,
							options: {
								fullPage: options.fullPage ?? true,
								dismissCookieBanner: options.dismissCookieBanner ?? true,
								timeout: options.timeout ?? 60000,
							},
						});
					} else if (operation === 'getScan') {
						const scanId = this.getNodeParameter('scanId', i) as string;
						responseData = await apiCall('GET', `/api/compliance/scan/${scanId}`);
					} else if (operation === 'waitForScan') {
						const scanId = this.getNodeParameter('scanId', i) as string;
						const maxWaitTime = this.getNodeParameter('maxWaitTime', i, 300) as number;
						responseData = await waitForScan(scanId, maxWaitTime);
					} else if (operation === 'getFixScript') {
						const scanId = this.getNodeParameter('scanId', i) as string;
						responseData = {
							success: true,
							data: {
								scanId,
								fixScriptUrl: `${apiUrl}/api/compliance/fix/${scanId}.js`,
								embedCode: `<script src="${apiUrl}/api/compliance/fix/${scanId}.js" async defer></script>`,
							},
						};
					}
				}

				// ==========================================
				// ISSUE Operations
				// ==========================================
				else if (resource === 'issue') {
					if (operation === 'getIssues') {
						const scanId = this.getNodeParameter('scanId', i) as string;
						const filters = this.getNodeParameter('issueFilters', i, {}) as {
							severity?: string;
						};

						let endpoint = `/api/compliance/scan/${scanId}/issues`;
						if (filters.severity) {
							endpoint += `?severity=${filters.severity}`;
						}

						responseData = await apiCall('GET', endpoint);
					} else if (operation === 'getIssue') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						responseData = await apiCall('GET', `/api/compliance/issue/${issueId}`);
					}
				}

				// ==========================================
				// REPORT Operations
				// ==========================================
				else if (resource === 'report') {
					const scanId = this.getNodeParameter('scanId', i) as string;

					if (operation === 'auditReport') {
						responseData = await apiCall('POST', '/api/compliance/audit-report', {
							scanId,
						});
					} else if (operation === 'statement') {
						const organizationName = this.getNodeParameter('organizationName', i) as string;
						const contactEmail = this.getNodeParameter('contactEmail', i) as string;
						const websiteUrl = this.getNodeParameter('websiteUrl', i) as string;
						const bundesland = this.getNodeParameter('bundesland', i) as string;

						responseData = await apiCall('POST', '/api/compliance/statement', {
							scanId,
							organizationName,
							organizationType: 'private',
							websiteUrl,
							contactEmail,
							bundesland,
						});
					}
				}

				// ==========================================
				// AGENT Operations
				// ==========================================
				else if (resource === 'agent') {
					if (operation === 'runAuditor') {
						const url = this.getNodeParameter('agentUrl', i) as string;
						responseData = await apiCall('POST', '/api/agents/auditor/run', { url });
					} else if (operation === 'runAnalyzer') {
						const url = this.getNodeParameter('agentUrl', i) as string;
						responseData = await apiCall('POST', '/api/agents/analyzer/run', { url });
					} else if (operation === 'runFixer') {
						const code = this.getNodeParameter('code', i) as string;
						const issueDescription = this.getNodeParameter('issueDescription', i) as string;
						const wcagCriterion = this.getNodeParameter('wcagCriterion', i) as string;

						responseData = await apiCall('POST', '/api/agents/fixer/run', {
							code,
							issue_description: issueDescription,
							wcag_criterion: wcagCriterion,
						});
					}
				}

				// ==========================================
				// ANALYTICS Operations
				// ==========================================
				else if (resource === 'analytics') {
					if (operation === 'getAnalytics') {
						const siteId = this.getNodeParameter('siteId', i) as string;
						const period = this.getNodeParameter('period', i, 'week') as string;

						responseData = await apiCall(
							'GET',
							`/api/tracking/analytics?site_id=${siteId}&period=${period}`,
						);
					}
				}

				// Add to return data
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData?.data || responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
