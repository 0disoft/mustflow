import type { MessageKey } from '../i18n/en.js';
import type { CliLang } from './i18n.js';
import type { Reporter } from './reporter.js';

export type ScriptPackRunner = (
	args: string[],
	reporter: Reporter,
	lang: CliLang,
) => number | Promise<number>;

export type ScriptPackPhase = 'before_change' | 'during_change' | 'after_change' | 'review';
export type ScriptPackRiskLevel = 'low' | 'medium' | 'high';
export type ScriptPackCost = 'low' | 'medium' | 'high';

export interface ScriptPackScriptDefinition {
	readonly packId: string;
	readonly id: string;
	readonly ref: string;
	readonly usage: string;
	readonly summaryKey: MessageKey;
	readonly actions: readonly string[];
	readonly useWhen: readonly string[];
	readonly phases: readonly ScriptPackPhase[];
	readonly readOnly: boolean;
	readonly mutates: boolean;
	readonly network: boolean;
	readonly inputs: readonly string[];
	readonly outputs: readonly string[];
	readonly relatedSkills: readonly string[];
	readonly riskLevel: ScriptPackRiskLevel;
	readonly cost: ScriptPackCost;
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
				useWhen: [
					'Check exact text budgets for docs, package metadata, prompts, release notes, or user-facing copy.',
					'Inspect a JSON string field by JSON Pointer when a public description, label, or summary has a length contract.',
				],
				phases: ['before_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'json_pointer', 'budget', 'unit'],
				outputs: ['human_summary', 'json_report'],
				relatedSkills: [
					'docs-prose-review',
					'public-json-contract-change',
					'readme-authoring',
					'release-notes-authoring',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'text-budget-report.schema.json',
				loadRunner: async () => (await import('../script-packs/core-text-budget.js')).runCoreTextBudgetScript,
			},
		],
	},
	{
		id: 'repo',
		summaryKey: 'scriptPack.pack.repo.summary',
		scripts: [
			{
				packId: 'repo',
				id: 'generated-boundary',
				ref: scriptRef('repo', 'generated-boundary'),
				usage: 'mf script-pack run repo/generated-boundary check <path...> [options]',
				summaryKey: 'scriptPack.script.generatedBoundary.summary',
				actions: ['check'],
				useWhen: [
					'Check candidate edit paths before changing files that may be generated, ignored, protected, vendor, or cache output.',
					'Review changed paths after implementation when generated or protected-file drift would make completion evidence misleading.',
				],
				phases: ['before_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path'],
				outputs: ['human_summary', 'json_report'],
				relatedSkills: [
					'completion-evidence-gate',
					'proactive-risk-surfacing',
					'quality-gaming-guard',
					'repo-improvement-loop',
					'template-install-surface-sync',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'generated-boundary-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/repo-generated-boundary.js')).runRepoGeneratedBoundaryScript,
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
