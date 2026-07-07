import type { MessageKey } from '../i18n/en.js';
import type { CliLang } from './i18n.js';
import type { Reporter } from './reporter.js';

export type CommandRunner = (
	args: string[],
	reporter: Reporter,
	lang: CliLang,
) => number | Promise<number>;

export type CommandOutputMode = 'text' | 'json' | 'jsonl' | 'file';

export interface CommandContractMetadata {
	readonly outputModes: readonly CommandOutputMode[];
	readonly exitCodes: readonly number[];
	readonly publicJsonSchemaIds: readonly string[];
}

export interface CommandDefinition {
	readonly id: string;
	readonly usage: string;
	readonly summaryKey: MessageKey;
	readonly contract: CommandContractMetadata;
	readonly loadRunner: () => Promise<CommandRunner>;
}

const TEXT_OUTPUT = ['text'] as const satisfies readonly CommandOutputMode[];
const TEXT_JSON_OUTPUT = ['text', 'json'] as const satisfies readonly CommandOutputMode[];
const TEXT_JSONL_OUTPUT = ['text', 'json', 'jsonl'] as const satisfies readonly CommandOutputMode[];
const TEXT_JSON_FILE_OUTPUT = ['text', 'json', 'file'] as const satisfies readonly CommandOutputMode[];
const DEFAULT_EXIT_CODES = [0, 1] as const;

function commandContract(
	outputModes: readonly CommandOutputMode[],
	publicJsonSchemaIds: readonly string[] = [],
	exitCodes: readonly number[] = DEFAULT_EXIT_CODES,
): CommandContractMetadata {
	return {
		outputModes,
		exitCodes,
		publicJsonSchemaIds,
	};
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
	{
		id: 'api',
		usage: 'mf api',
		summaryKey: 'command.api.summary',
		contract: commandContract(TEXT_JSONL_OUTPUT, [
			'workspace-summary',
			'command-catalog',
			'verification-plan',
			'latest-evidence',
			'diff-risk',
			'health',
			'locks',
			'api-serve-response',
		]),
		loadRunner: async () => (await import('../commands/api.js')).runApi,
	},
	{
		id: 'adapters',
		usage: 'mf adapters',
		summaryKey: 'command.adapters.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['adapter-compatibility-report']),
		loadRunner: async () => (await import('../commands/adapters.js')).runAdapters,
	},
	{
		id: 'init',
		usage: 'mf init',
		summaryKey: 'command.init.summary',
		contract: commandContract(TEXT_OUTPUT),
		loadRunner: async () => (await import('../commands/init.js')).runInit,
	},
	{
		id: 'check',
		usage: 'mf check',
		summaryKey: 'command.check.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['check-report']),
		loadRunner: async () => (await import('../commands/check.js')).runCheck,
	},
	{
		id: 'classify',
		usage: 'mf classify',
		summaryKey: 'command.classify.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['classify-report']),
		loadRunner: async () => (await import('../commands/classify.js')).runClassify,
	},
	{
		id: 'contract-lint',
		usage: 'mf contract-lint',
		summaryKey: 'command.contractLint.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['contract-lint-report']),
		loadRunner: async () => (await import('../commands/contract-lint.js')).runContractLint,
	},
	{
		id: 'onboard',
		usage: 'mf onboard',
		summaryKey: 'command.onboard.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['onboard-commands-report']),
		loadRunner: async () => (await import('../commands/onboard.js')).runOnboard,
	},
	{
		id: 'next',
		usage: 'mf next',
		summaryKey: 'command.next.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['next-report']),
		loadRunner: async () => (await import('../commands/next.js')).runNext,
	},
	{
		id: 'evidence',
		usage: 'mf evidence',
		summaryKey: 'command.evidence.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['evidence-report']),
		loadRunner: async () => (await import('../commands/evidence.js')).runEvidence,
	},
	{
		id: 'workspace',
		usage: 'mf workspace',
		summaryKey: 'command.workspace.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, [
			'workspace-status',
			'workspace-command-catalog',
			'workspace-verification-plan',
		]),
		loadRunner: async () => (await import('../commands/workspace.js')).runWorkspace,
	},
	{
		id: 'status',
		usage: 'mf status',
		summaryKey: 'command.status.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['status-report']),
		loadRunner: async () => (await import('../commands/status.js')).runStatus,
	},
	{
		id: 'update',
		usage: 'mf update',
		summaryKey: 'command.update.summary',
		contract: commandContract(TEXT_JSON_OUTPUT),
		loadRunner: async () => (await import('../commands/update.js')).runUpdate,
	},
	{
		id: 'upgrade',
		usage: 'mf upgrade',
		summaryKey: 'command.upgrade.summary',
		contract: commandContract(TEXT_OUTPUT),
		loadRunner: async () => (await import('../commands/upgrade.js')).runUpgrade,
	},
	{
		id: 'map',
		usage: 'mf map',
		summaryKey: 'command.map.summary',
		contract: commandContract(TEXT_OUTPUT),
		loadRunner: async () => (await import('../commands/map.js')).runMap,
	},
	{
		id: 'flow',
		usage: 'mf flow',
		summaryKey: 'command.flow.summary',
		contract: commandContract(TEXT_OUTPUT),
		loadRunner: async () => (await import('../commands/flow.js')).runFlow,
	},
	{
		id: 'line-endings',
		usage: 'mf line-endings',
		summaryKey: 'command.lineEndings.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['line-endings-report']),
		loadRunner: async () => (await import('../commands/line-endings.js')).runLineEndings,
	},
	{
		id: 'quality',
		usage: 'mf quality',
		summaryKey: 'command.quality.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['quality-gaming-report']),
		loadRunner: async () => (await import('../commands/quality.js')).runQuality,
	},
	{
		id: 'script-pack',
		usage: 'mf script-pack',
		summaryKey: 'command.scriptPack.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, [
			'script-pack-catalog',
			'script-pack-suggestion-report',
			'code-outline-report',
			'dependency-graph-report',
			'import-cycle-report',
			'module-boundary-report',
			'change-impact-report',
			'code-symbol-read-report',
			'route-outline-report',
			'export-diff-report',
			'reference-drift-report',
			'link-integrity-report',
			'test-performance-report',
			'test-regression-selector-report',
			'text-budget-report',
			'generated-boundary-report',
			'repo-merge-conflict-scan-report',
			'repo-git-ignore-audit-report',
			'repo-manifest-lock-drift-report',
			'skill-route-audit-report',
			'repo-version-source-report',
			'repo-toolchain-provenance-report',
			'repo-automation-surface-report',
			'repo-dependency-surface-report',
			'repo-approval-gate-report',
			'repo-deploy-surface-report',
			'config-chain-report',
			'env-contract-report',
			'secret-risk-scan-report',
			'security-pattern-scan-report',
			'related-files-report',
		]),
		loadRunner: async () => (await import('../commands/script-pack.js')).runScriptPack,
	},
	{
		id: 'run',
		usage: 'mf run',
		summaryKey: 'command.run.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['run-receipt']),
		loadRunner: async () => (await import('../commands/run.js')).runRun,
	},
	{
		id: 'context',
		usage: 'mf context',
		summaryKey: 'command.context.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['context-report']),
		loadRunner: async () => (await import('../commands/context.js')).runContext,
	},
	{
		id: 'tech',
		usage: 'mf tech',
		summaryKey: 'command.tech.summary',
		contract: commandContract(TEXT_JSON_OUTPUT),
		loadRunner: async () => (await import('../commands/tech.js')).runTech,
	},
	{
		id: 'doctor',
		usage: 'mf doctor',
		summaryKey: 'command.doctor.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['doctor-report']),
		loadRunner: async () => (await import('../commands/doctor.js')).runDoctor,
	},
	{
		id: 'docs',
		usage: 'mf docs',
		summaryKey: 'command.docs.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['docs-review-list']),
		loadRunner: async () => (await import('../commands/docs.js')).runDocs,
	},
	{
		id: 'handoff',
		usage: 'mf handoff',
		summaryKey: 'command.handoff.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['handoff-validation-report']),
		loadRunner: async () => (await import('../commands/handoff.js')).runHandoff,
	},
	{
		id: 'index',
		usage: 'mf index',
		summaryKey: 'command.index.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['index-report']),
		loadRunner: async () => (await import('../commands/index.js')).runIndex,
	},
	{
		id: 'search',
		usage: 'mf search',
		summaryKey: 'command.search.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['search-report']),
		loadRunner: async () => (await import('../commands/search.js')).runSearch,
	},
	{
		id: 'skill',
		usage: 'mf skill',
		summaryKey: 'command.skill.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['skill-route-report', 'skill-import-report', 'skill-update-report']),
		loadRunner: async () => (await import('../commands/skill.js')).runSkill,
	},
	{
		id: 'dashboard',
		usage: 'mf dashboard',
		summaryKey: 'command.dashboard.summary',
		contract: commandContract(TEXT_JSON_FILE_OUTPUT, ['dashboard-export']),
		loadRunner: async () => (await import('../commands/dashboard.js')).runDashboard,
	},
	{
		id: 'version',
		usage: 'mf version',
		summaryKey: 'command.version.summary',
		contract: commandContract(TEXT_OUTPUT),
		loadRunner: async () => (await import('../commands/version.js')).runVersion,
	},
	{
		id: 'version-sources',
		usage: 'mf version-sources',
		summaryKey: 'command.versionSources.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['version-sources-report']),
		loadRunner: async () => (await import('../commands/version-sources.js')).runVersionSources,
	},
	{
		id: 'verify',
		usage: 'mf verify',
		summaryKey: 'command.verify.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, [
			'verify-report',
			'change-verification-report',
			'verify-run-manifest',
			'latest-run-pointer',
		]),
		loadRunner: async () => (await import('../commands/verify.js')).runVerify,
	},
	{
		id: 'explain',
		usage: 'mf explain',
		summaryKey: 'command.explain.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['explain-report']),
		loadRunner: async () => (await import('../commands/explain.js')).runExplain,
	},
	{
		id: 'impact',
		usage: 'mf impact',
		summaryKey: 'command.impact.summary',
		contract: commandContract(TEXT_JSON_OUTPUT, ['impact-report']),
		loadRunner: async () => (await import('../commands/impact.js')).runImpact,
	},
	{
		id: 'help',
		usage: 'mf help',
		summaryKey: 'command.help.summary',
		contract: commandContract(TEXT_OUTPUT),
		loadRunner: async () => (await import('../commands/help.js')).runHelp,
	},
];

export function findCommandDefinition(command: string): CommandDefinition | undefined {
	return COMMAND_DEFINITIONS.find((definition) => definition.id === command);
}
