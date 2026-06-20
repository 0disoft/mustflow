import type { MessageKey } from '../i18n/en.js';
import type { CliLang } from './i18n.js';
import type { Reporter } from './reporter.js';

export type CommandRunner = (
	args: string[],
	reporter: Reporter,
	lang: CliLang,
) => number | Promise<number>;

export interface CommandDefinition {
	readonly id: string;
	readonly usage: string;
	readonly summaryKey: MessageKey;
	readonly loadRunner: () => Promise<CommandRunner>;
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
	{
		id: 'api',
		usage: 'mf api',
		summaryKey: 'command.api.summary',
		loadRunner: async () => (await import('../commands/api.js')).runApi,
	},
	{
		id: 'adapters',
		usage: 'mf adapters',
		summaryKey: 'command.adapters.summary',
		loadRunner: async () => (await import('../commands/adapters.js')).runAdapters,
	},
	{
		id: 'init',
		usage: 'mf init',
		summaryKey: 'command.init.summary',
		loadRunner: async () => (await import('../commands/init.js')).runInit,
	},
	{
		id: 'check',
		usage: 'mf check',
		summaryKey: 'command.check.summary',
		loadRunner: async () => (await import('../commands/check.js')).runCheck,
	},
	{
		id: 'classify',
		usage: 'mf classify',
		summaryKey: 'command.classify.summary',
		loadRunner: async () => (await import('../commands/classify.js')).runClassify,
	},
	{
		id: 'contract-lint',
		usage: 'mf contract-lint',
		summaryKey: 'command.contractLint.summary',
		loadRunner: async () => (await import('../commands/contract-lint.js')).runContractLint,
	},
	{
		id: 'onboard',
		usage: 'mf onboard',
		summaryKey: 'command.onboard.summary',
		loadRunner: async () => (await import('../commands/onboard.js')).runOnboard,
	},
	{
		id: 'next',
		usage: 'mf next',
		summaryKey: 'command.next.summary',
		loadRunner: async () => (await import('../commands/next.js')).runNext,
	},
	{
		id: 'evidence',
		usage: 'mf evidence',
		summaryKey: 'command.evidence.summary',
		loadRunner: async () => (await import('../commands/evidence.js')).runEvidence,
	},
	{
		id: 'workspace',
		usage: 'mf workspace',
		summaryKey: 'command.workspace.summary',
		loadRunner: async () => (await import('../commands/workspace.js')).runWorkspace,
	},
	{
		id: 'status',
		usage: 'mf status',
		summaryKey: 'command.status.summary',
		loadRunner: async () => (await import('../commands/status.js')).runStatus,
	},
	{
		id: 'update',
		usage: 'mf update',
		summaryKey: 'command.update.summary',
		loadRunner: async () => (await import('../commands/update.js')).runUpdate,
	},
	{
		id: 'upgrade',
		usage: 'mf upgrade',
		summaryKey: 'command.upgrade.summary',
		loadRunner: async () => (await import('../commands/upgrade.js')).runUpgrade,
	},
	{
		id: 'map',
		usage: 'mf map',
		summaryKey: 'command.map.summary',
		loadRunner: async () => (await import('../commands/map.js')).runMap,
	},
	{
		id: 'line-endings',
		usage: 'mf line-endings',
		summaryKey: 'command.lineEndings.summary',
		loadRunner: async () => (await import('../commands/line-endings.js')).runLineEndings,
	},
	{
		id: 'quality',
		usage: 'mf quality',
		summaryKey: 'command.quality.summary',
		loadRunner: async () => (await import('../commands/quality.js')).runQuality,
	},
	{
		id: 'script-pack',
		usage: 'mf script-pack',
		summaryKey: 'command.scriptPack.summary',
		loadRunner: async () => (await import('../commands/script-pack.js')).runScriptPack,
	},
	{
		id: 'run',
		usage: 'mf run',
		summaryKey: 'command.run.summary',
		loadRunner: async () => (await import('../commands/run.js')).runRun,
	},
	{
		id: 'context',
		usage: 'mf context',
		summaryKey: 'command.context.summary',
		loadRunner: async () => (await import('../commands/context.js')).runContext,
	},
	{
		id: 'tech',
		usage: 'mf tech',
		summaryKey: 'command.tech.summary',
		loadRunner: async () => (await import('../commands/tech.js')).runTech,
	},
	{
		id: 'doctor',
		usage: 'mf doctor',
		summaryKey: 'command.doctor.summary',
		loadRunner: async () => (await import('../commands/doctor.js')).runDoctor,
	},
	{
		id: 'docs',
		usage: 'mf docs',
		summaryKey: 'command.docs.summary',
		loadRunner: async () => (await import('../commands/docs.js')).runDocs,
	},
	{
		id: 'handoff',
		usage: 'mf handoff',
		summaryKey: 'command.handoff.summary',
		loadRunner: async () => (await import('../commands/handoff.js')).runHandoff,
	},
	{
		id: 'index',
		usage: 'mf index',
		summaryKey: 'command.index.summary',
		loadRunner: async () => (await import('../commands/index.js')).runIndex,
	},
	{
		id: 'search',
		usage: 'mf search',
		summaryKey: 'command.search.summary',
		loadRunner: async () => (await import('../commands/search.js')).runSearch,
	},
	{
		id: 'skill',
		usage: 'mf skill',
		summaryKey: 'command.skill.summary',
		loadRunner: async () => (await import('../commands/skill.js')).runSkill,
	},
	{
		id: 'dashboard',
		usage: 'mf dashboard',
		summaryKey: 'command.dashboard.summary',
		loadRunner: async () => (await import('../commands/dashboard.js')).runDashboard,
	},
	{
		id: 'version',
		usage: 'mf version',
		summaryKey: 'command.version.summary',
		loadRunner: async () => (await import('../commands/version.js')).runVersion,
	},
	{
		id: 'version-sources',
		usage: 'mf version-sources',
		summaryKey: 'command.versionSources.summary',
		loadRunner: async () => (await import('../commands/version-sources.js')).runVersionSources,
	},
	{
		id: 'verify',
		usage: 'mf verify',
		summaryKey: 'command.verify.summary',
		loadRunner: async () => (await import('../commands/verify.js')).runVerify,
	},
	{
		id: 'explain',
		usage: 'mf explain',
		summaryKey: 'command.explain.summary',
		loadRunner: async () => (await import('../commands/explain.js')).runExplain,
	},
	{
		id: 'impact',
		usage: 'mf impact',
		summaryKey: 'command.impact.summary',
		loadRunner: async () => (await import('../commands/impact.js')).runImpact,
	},
	{
		id: 'help',
		usage: 'mf help',
		summaryKey: 'command.help.summary',
		loadRunner: async () => (await import('../commands/help.js')).runHelp,
	},
];

export function findCommandDefinition(command: string): CommandDefinition | undefined {
	return COMMAND_DEFINITIONS.find((definition) => definition.id === command);
}
