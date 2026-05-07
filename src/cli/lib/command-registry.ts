import type { MessageKey } from '../i18n/en.js';

export interface CommandDefinition {
	readonly id: string;
	readonly usage: string;
	readonly summaryKey: MessageKey;
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
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
		id: 'map',
		usage: 'mf map',
		summaryKey: 'command.map.summary',
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
		id: 'help',
		usage: 'mf help',
		summaryKey: 'command.help.summary',
	},
];
