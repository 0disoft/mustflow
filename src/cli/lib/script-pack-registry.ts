import type { MessageKey } from '../i18n/en.js';
import type { CliLang } from './i18n.js';
import type { Reporter } from './reporter.js';

export type ScriptPackRunner = (
	args: string[],
	reporter: Reporter,
	lang: CliLang,
) => number | Promise<number>;

export interface ScriptPackScriptDefinition {
	readonly packId: string;
	readonly id: string;
	readonly ref: string;
	readonly usage: string;
	readonly summaryKey: MessageKey;
	readonly actions: readonly string[];
	readonly reportSchemaFile: string | null;
	readonly loadRunner: () => Promise<ScriptPackRunner>;
}

export interface ScriptPackDefinition {
	readonly id: string;
	readonly summaryKey: MessageKey;
	readonly scripts: readonly ScriptPackScriptDefinition[];
}

function scriptRef(packId: string, scriptId: string): string {
	return `${packId}/${scriptId}`;
}

export const SCRIPT_PACKS: readonly ScriptPackDefinition[] = [
	{
		id: 'core',
		summaryKey: 'scriptPack.pack.core.summary',
		scripts: [
			{
				packId: 'core',
				id: 'text-budget',
				ref: scriptRef('core', 'text-budget'),
				usage: 'mf script-pack run core/text-budget check <path...> [options]',
				summaryKey: 'scriptPack.script.textBudget.summary',
				actions: ['check'],
				reportSchemaFile: 'text-budget-report.schema.json',
				loadRunner: async () => (await import('../script-packs/core-text-budget.js')).runCoreTextBudgetScript,
			},
		],
	},
];

export function listScriptPackScripts(): readonly ScriptPackScriptDefinition[] {
	return SCRIPT_PACKS.flatMap((pack) => pack.scripts);
}

export function findScriptPackScript(ref: string): ScriptPackScriptDefinition | undefined {
	return listScriptPackScripts().find((script) => script.ref === ref);
}
