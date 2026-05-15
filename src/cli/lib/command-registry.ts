import type { MessageKey } from '../i18n/en.js';

export interface CommandDefinition {
	readonly id: string;
	readonly usage: string;
	readonly summaryKey: MessageKey;
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
	{
		id: 'adapters',
		usage: 'mf adapters',
		summaryKey: 'command.adapters.summary',
	},
	{
		id: 'init',
		usage: 'mf init',
		summaryKey: 'command.init.summary',
	},
	{
		id: 'check',
		usage: 'mf check',
		summaryKey: 'command.check.summary',
	},
	{
		id: 'classify',
		usage: 'mf classify',
		summaryKey: 'command.classify.summary',
	},
	{
		id: 'contract-lint',
		usage: 'mf contract-lint',
		summaryKey: 'command.contractLint.summary',
	},
	{
		id: 'status',
		usage: 'mf status',
		summaryKey: 'command.status.summary',
	},
	{
		id: 'update',
		usage: 'mf update',
		summaryKey: 'command.update.summary',
	},
	{
		id: 'upgrade',
		usage: 'mf upgrade',
		summaryKey: 'command.upgrade.summary',
	},
	{
		id: 'map',
		usage: 'mf map',
		summaryKey: 'command.map.summary',
	},
	{
		id: 'line-endings',
		usage: 'mf line-endings',
		summaryKey: 'command.lineEndings.summary',
	},
	{
		id: 'run',
		usage: 'mf run',
		summaryKey: 'command.run.summary',
	},
	{
		id: 'context',
		usage: 'mf context',
		summaryKey: 'command.context.summary',
	},
	{
		id: 'doctor',
		usage: 'mf doctor',
		summaryKey: 'command.doctor.summary',
	},
	{
		id: 'docs',
		usage: 'mf docs',
		summaryKey: 'command.docs.summary',
	},
	{
		id: 'handoff',
		usage: 'mf handoff',
		summaryKey: 'command.handoff.summary',
	},
	{
		id: 'index',
		usage: 'mf index',
		summaryKey: 'command.index.summary',
	},
	{
		id: 'search',
		usage: 'mf search',
		summaryKey: 'command.search.summary',
	},
	{
		id: 'dashboard',
		usage: 'mf dashboard',
		summaryKey: 'command.dashboard.summary',
	},
	{
		id: 'version',
		usage: 'mf version',
		summaryKey: 'command.version.summary',
	},
	{
		id: 'version-sources',
		usage: 'mf version-sources',
		summaryKey: 'command.versionSources.summary',
	},
	{
		id: 'verify',
		usage: 'mf verify',
		summaryKey: 'command.verify.summary',
	},
	{
		id: 'explain',
		usage: 'mf explain',
		summaryKey: 'command.explain.summary',
	},
	{
		id: 'impact',
		usage: 'mf impact',
		summaryKey: 'command.impact.summary',
	},
	{
		id: 'help',
		usage: 'mf help',
		summaryKey: 'command.help.summary',
	},
];
