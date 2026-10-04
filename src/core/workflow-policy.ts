export const WORKFLOW_MODES = ['simple', 'strict'] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

export interface WorkflowPolicy {
	readonly mode: WorkflowMode;
	readonly inferProjectCommands: boolean;
	readonly requireManifestLock: boolean;
	readonly requiredReadPaths: readonly string[];
}

function isTable(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveWorkflowPolicy(config: unknown): WorkflowPolicy {
	const value = isTable(config) ? config.workflow : undefined;
	if (value !== undefined && !isTable(value)) throw new Error('[workflow] must be a TOML table');
	const mode = isTable(value) ? value.mode ?? 'strict' : 'strict';
	if (!WORKFLOW_MODES.includes(mode as WorkflowMode)) throw new Error('[workflow].mode must be simple or strict');
	return {
		mode: mode as WorkflowMode,
		inferProjectCommands: mode === 'simple',
		requireManifestLock: mode === 'strict',
		requiredReadPaths: mode === 'simple' ? ['AGENTS.md'] : [
			'AGENTS.md', '.mustflow/docs/agent-workflow.md', '.mustflow/config/mustflow.toml',
			'.mustflow/config/commands.toml', '.mustflow/config/preferences.toml', '.mustflow/skills/router.toml',
		],
	};
}
