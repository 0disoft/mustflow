export type ApiReportAction =
	| 'workspace-summary'
	| 'command-catalog'
	| 'verification-plan'
	| 'latest-evidence'
	| 'diff-risk'
	| 'health'
	| 'locks';

export interface ApiReportActionSpec {
	readonly action: ApiReportAction;
	readonly requiresChanged: boolean;
	readonly helpKey:
		| 'api.help.action.workspaceSummary'
		| 'api.help.action.commandCatalog'
		| 'api.help.action.verificationPlan'
		| 'api.help.action.latestEvidence'
		| 'api.help.action.diffRisk'
		| 'api.help.action.health'
		| 'api.help.action.locks';
	readonly example: string;
}

export const API_REPORT_ACTIONS: readonly ApiReportActionSpec[] = [
	{
		action: 'workspace-summary',
		requiresChanged: false,
		helpKey: 'api.help.action.workspaceSummary',
		example: 'mf api workspace-summary --json',
	},
	{
		action: 'command-catalog',
		requiresChanged: false,
		helpKey: 'api.help.action.commandCatalog',
		example: 'mf api command-catalog --json',
	},
	{
		action: 'verification-plan',
		requiresChanged: true,
		helpKey: 'api.help.action.verificationPlan',
		example: 'mf api verification-plan --changed --json',
	},
	{
		action: 'latest-evidence',
		requiresChanged: false,
		helpKey: 'api.help.action.latestEvidence',
		example: 'mf api latest-evidence --json',
	},
	{
		action: 'diff-risk',
		requiresChanged: true,
		helpKey: 'api.help.action.diffRisk',
		example: 'mf api diff-risk --changed --json',
	},
	{
		action: 'health',
		requiresChanged: false,
		helpKey: 'api.help.action.health',
		example: 'mf api health --json',
	},
	{
		action: 'locks',
		requiresChanged: false,
		helpKey: 'api.help.action.locks',
		example: 'mf api locks --json',
	},
];

const API_REPORT_ACTION_NAMES = new Set(API_REPORT_ACTIONS.map((spec) => spec.action));

export function isApiReportAction(value: string): value is ApiReportAction {
	return API_REPORT_ACTION_NAMES.has(value as ApiReportAction);
}

export function apiReportActionSpec(action: ApiReportAction): ApiReportActionSpec {
	const spec = API_REPORT_ACTIONS.find((candidate) => candidate.action === action);

	if (!spec) {
		throw new Error(`Unknown API report action: ${action}`);
	}

	return spec;
}
