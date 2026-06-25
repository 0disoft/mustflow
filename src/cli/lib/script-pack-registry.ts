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
		id: 'code',
		summaryKey: 'scriptPack.pack.code.summary',
		scripts: [
			{
				packId: 'code',
				id: 'outline',
				ref: scriptRef('code', 'outline'),
				usage: 'mf script-pack run code/outline scan <path...> [options]',
				summaryKey: 'scriptPack.script.codeOutline.summary',
				actions: ['scan'],
				useWhen: [
					'Scan supported source files for symbol headers and source anchors before reading large files chunk by chunk.',
					'Build a bounded source outline with file paths, language metadata, line ranges, signatures, ' +
						'export flags, source-anchor metadata, and content hashes for codebase orientation.',
				],
				phases: ['before_change', 'during_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes'],
				outputs: ['human_summary', 'json_report', 'symbol_outline', 'source_anchors'],
				relatedSkills: [
					'codebase-orientation',
					'javascript-code-change',
					'module-boundary-review',
					'pattern-scout',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'code-outline-report.schema.json',
				loadRunner: async () => (await import('../script-packs/code-outline.js')).runCodeOutlineScript,
			},
			{
				packId: 'code',
				id: 'dependency-graph',
				ref: scriptRef('code', 'dependency-graph'),
				usage: 'mf script-pack run code/dependency-graph scan <path...> [options]',
				summaryKey: 'scriptPack.script.codeDependencyGraph.summary',
				actions: ['scan'],
				useWhen: [
					'Trace relative TypeScript and JavaScript import, export, require, and dynamic import edges before changing a module.',
					'Build a bounded dependency graph with nodes, edges, depth, importer counts, import counts, and cycle hints for source impact orientation.',
				],
				phases: ['before_change', 'during_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes', 'max_depth', 'max_nodes', 'max_edges'],
				outputs: ['human_summary', 'json_report', 'dependency_graph', 'cycle_hints'],
				relatedSkills: [
					'change-blast-radius-review',
					'codebase-orientation',
					'javascript-code-change',
					'module-boundary-review',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'dependency-graph-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/code-dependency-graph.js')).runCodeDependencyGraphScript,
			},
			{
				packId: 'code',
				id: 'change-impact',
				ref: scriptRef('code', 'change-impact'),
				usage: 'mf script-pack run code/change-impact analyze [path...] [options]',
				summaryKey: 'scriptPack.script.codeChangeImpact.summary',
				actions: ['analyze'],
				useWhen: [
					'Analyze current git changes and produce bounded file, script-pack, and verification hints after a change.',
					'Classify changed source, test, docs, schema, package, template, and workflow surfaces before choosing follow-up checks.',
				],
				phases: ['after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'base_ref', 'head_ref', 'max_files', 'max_impacts', 'max_file_bytes'],
				outputs: ['human_summary', 'json_report', 'changed_files', 'impact_candidates', 'verification_hints'],
				relatedSkills: [
					'change-blast-radius-review',
					'completion-evidence-gate',
					'javascript-code-change',
					'public-json-contract-change',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'change-impact-report.schema.json',
				loadRunner: async () => (await import('../script-packs/code-change-impact.js')).runCodeChangeImpactScript,
			},
			{
				packId: 'code',
				id: 'symbol-read',
				ref: scriptRef('code', 'symbol-read'),
				usage: 'mf script-pack run code/symbol-read read (<path> --start-line <line> | --anchor <id>) [options]',
				summaryKey: 'scriptPack.script.codeSymbolRead.summary',
				actions: ['read'],
				useWhen: [
					'Read only the resolved symbol range, source-anchor target, or explicit bounded line range after a code outline identifies the relevant location.',
					'Fetch a focused source snippet with path, anchor, line, symbol, and content-hash metadata instead of repeatedly paging through a whole file.',
				],
				phases: ['before_change', 'during_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'anchor_id', 'start_line', 'end_line', 'context_lines', 'max_file_bytes', 'max_snippet_lines'],
				outputs: ['human_summary', 'json_report', 'source_snippet'],
				relatedSkills: [
					'codebase-orientation',
					'javascript-code-change',
					'module-boundary-review',
					'pattern-scout',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'code-symbol-read-report.schema.json',
				loadRunner: async () => (await import('../script-packs/code-outline.js')).runCodeSymbolReadScript,
			},
			{
				packId: 'code',
				id: 'route-outline',
				ref: scriptRef('code', 'route-outline'),
				usage: 'mf script-pack run code/route-outline scan <path...> [options]',
				summaryKey: 'scriptPack.script.codeRouteOutline.summary',
				actions: ['scan'],
				useWhen: [
					'Scan Hono, Elysia, Axum, and NestJS route source files for method, path, framework, lifecycle, handler, and line metadata before reading whole modules.',
					'Build a bounded first-pass route outline with paths, line ranges, lifecycle calls, and content hashes for HTTP route orientation.',
				],
				phases: ['before_change', 'during_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes'],
				outputs: ['human_summary', 'json_report', 'route_outline', 'route_lifecycle'],
				relatedSkills: [
					'api-contract-change',
					'backend-reliability-change',
					'axum-code-change',
					'elysia-code-change',
					'hono-code-change',
					'nestjs-code-change',
					'http-delivery-streaming',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'route-outline-report.schema.json',
				loadRunner: async () => (await import('../script-packs/code-route-outline.js')).runCodeRouteOutlineScript,
			},
			{
				packId: 'code',
				id: 'export-diff',
				ref: scriptRef('code', 'export-diff'),
				usage: 'mf script-pack run code/export-diff compare [path...] [options]',
				summaryKey: 'scriptPack.script.codeExportDiff.summary',
				actions: ['compare'],
				useWhen: [
					'Compare exported TypeScript and JavaScript declaration signatures, return metadata, and package surface hints across a git base and head.',
					'Review public-ish API changes after source edits without reading every changed file from top to bottom.',
				],
				phases: ['after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['base_ref', 'head_ref', 'path', 'max_files', 'max_file_bytes'],
				outputs: ['human_summary', 'json_report', 'export_diff', 'return_type_changes', 'package_surface'],
				relatedSkills: [
					'api-contract-change',
					'dependency-upgrade-review',
					'javascript-code-change',
					'public-json-contract-change',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'export-diff-report.schema.json',
				loadRunner: async () => (await import('../script-packs/code-export-diff.js')).runCodeExportDiffScript,
			},
		],
	},
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
		id: 'docs',
		summaryKey: 'scriptPack.pack.docs.summary',
		scripts: [
			{
				packId: 'docs',
				id: 'reference-drift',
				ref: scriptRef('docs', 'reference-drift'),
				usage: 'mf script-pack run docs/reference-drift check [path...] [options]',
				summaryKey: 'scriptPack.script.referenceDrift.summary',
				actions: ['check'],
				useWhen: [
					'Check documentation references to mf commands, script-pack refs, schema files, and repository paths against current local surfaces.',
					'Review docs after CLI, schema, script-pack, or repository structure changes before claiming references are synchronized.',
				],
				phases: ['after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes'],
				outputs: ['human_summary', 'json_report', 'reference_drift', 'stale_reference_findings'],
				relatedSkills: [
					'cli-output-contract-review',
					'docs-prose-review',
					'public-json-contract-change',
					'readme-authoring',
					'release-notes-authoring',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'reference-drift-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/docs-reference-drift.js')).runDocsReferenceDriftScript,
			},
		],
	},
	{
		id: 'test',
		summaryKey: 'scriptPack.pack.test.summary',
		scripts: [
			{
				packId: 'test',
				id: 'performance-report',
				ref: scriptRef('test', 'performance-report'),
				usage: 'mf script-pack run test/performance-report summarize [options]',
				summaryKey: 'scriptPack.script.testPerformanceReport.summary',
				actions: ['summarize'],
				useWhen: [
					'Summarize retained mf run performance evidence, selected-test fallbacks, slow intents, timeout pressure, and phase bottlenecks.',
					'Review local verification-loop performance before changing test scheduling, profiling, caching, or command-contract timeout policy.',
				],
				phases: ['after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['max_samples', 'max_intents', 'max_findings', 'slow_ms', 'timeout_ratio', 'phase_ms'],
				outputs: ['human_summary', 'json_report', 'performance_samples', 'intent_timings', 'phase_timings'],
				relatedSkills: ['test-suite-performance-review', 'test-maintenance', 'completion-evidence-gate'],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'test-performance-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/test-performance-report.js')).runTestPerformanceReportScript,
			},
			{
				packId: 'test',
				id: 'regression-selector',
				ref: scriptRef('test', 'regression-selector'),
				usage: 'mf script-pack run test/regression-selector select [path...] [options]',
				summaryKey: 'scriptPack.script.testRegressionSelector.summary',
				actions: ['select'],
				useWhen: [
					'Select likely regression tests from changed files while reporting unsafe surfaces that require fallback verification.',
					'Review source, test, package, schema, workflow, and config changes before relying on a related-test shortcut.',
				],
				phases: ['after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'base_ref', 'head_ref', 'max_files', 'max_tests'],
				outputs: ['human_summary', 'json_report', 'changed_files', 'selected_tests', 'fallbacks'],
				relatedSkills: ['test-suite-performance-review', 'test-maintenance', 'change-blast-radius-review'],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'test-regression-selector-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/test-regression-selector.js')).runTestRegressionSelectorScript,
			},
		],
	},
	{
		id: 'repo',
		summaryKey: 'scriptPack.pack.repo.summary',
		scripts: [
			{
				packId: 'repo',
				id: 'config-chain',
				ref: scriptRef('repo', 'config-chain'),
				usage: 'mf script-pack run repo/config-chain inspect <path...> [options]',
				summaryKey: 'scriptPack.script.configChain.summary',
				actions: ['inspect'],
				useWhen: [
					'Inspect nearby tsconfig, package, ESLint, Prettier, Vite, Vitest, Tailwind, Jest, and Playwright config files before assuming effective rules.',
					'Build a read-only config chain with extends, references, workspaces, dynamic-config findings, and source path context.',
				],
				phases: ['before_change', 'during_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_configs', 'max_file_bytes'],
				outputs: ['human_summary', 'json_report', 'config_chain', 'config_edges'],
				relatedSkills: [
					'bun-code-change',
					'config-env-change',
					'dependency-reality-check',
					'tailwind-code-change',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'config-chain-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/repo-config-chain.js')).runRepoConfigChainScript,
			},
			{
				packId: 'repo',
				id: 'env-contract',
				ref: scriptRef('repo', 'env-contract'),
				usage: 'mf script-pack run repo/env-contract scan [path...] [options]',
				summaryKey: 'scriptPack.script.envContract.summary',
				actions: ['scan'],
				useWhen: [
					'Scan code, CI, docs, and env example files for environment variable contract drift without reading real secret env files.',
					'Review env keys that are used in code, declared in examples, referenced in CI, documented, missing from examples, or public-prefix secret-like names.',
				],
				phases: ['before_change', 'during_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes', 'max_keys'],
				outputs: ['human_summary', 'json_report', 'env_keys', 'env_contract_findings'],
				relatedSkills: [
					'config-env-change',
					'public-json-contract-change',
					'security-privacy-review',
					'typescript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'env-contract-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/repo-env-contract.js')).runRepoEnvContractScript,
			},
			{
				packId: 'repo',
				id: 'secret-risk-scan',
				ref: scriptRef('repo', 'secret-risk-scan'),
				usage: 'mf script-pack run repo/secret-risk-scan scan [path...] [options]',
				summaryKey: 'scriptPack.script.secretRiskScan.summary',
				actions: ['scan'],
				useWhen: [
					'Scan code, docs, config, CI, and examples for plausible hardcoded secrets without printing secret values.',
					'Review provider token prefixes, Bearer tokens, private key markers, secret-like assignments, and realistic env-example values.',
				],
				phases: ['before_change', 'during_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes', 'max_findings'],
				outputs: ['human_summary', 'json_report', 'secret_risk_findings', 'redacted_fingerprints'],
				relatedSkills: [
					'config-env-change',
					'public-json-contract-change',
					'security-privacy-review',
					'typescript-code-change',
				],
				riskLevel: 'medium',
				cost: 'low',
				reportSchemaFile: 'secret-risk-scan-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/repo-secret-risk-scan.js')).runRepoSecretRiskScanScript,
			},
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
			{
				packId: 'repo',
				id: 'related-files',
				ref: scriptRef('repo', 'related-files'),
				usage: 'mf script-pack run repo/related-files map <path...> [options]',
				summaryKey: 'scriptPack.script.relatedFiles.summary',
				actions: ['map'],
				useWhen: [
					'Map direct imports, importers, sibling tests, sibling docs, sibling styles, type siblings, ' +
						'and nearby config files for a source path before widening context reads.',
					'Review likely adjacent files after a partial implementation without treating the result as verification scope or completeness proof.',
				],
				phases: ['before_change', 'during_change', 'after_change', 'review'],
				readOnly: true,
				mutates: false,
				network: false,
				inputs: ['path', 'max_files', 'max_file_bytes', 'max_candidates'],
				outputs: ['human_summary', 'json_report', 'related_file_candidates'],
				relatedSkills: [
					'codebase-orientation',
					'heuristic-candidate-selection',
					'module-boundary-review',
					'typescript-code-change',
					'javascript-code-change',
				],
				riskLevel: 'low',
				cost: 'low',
				reportSchemaFile: 'related-files-report.schema.json',
				loadRunner: async () =>
					(await import('../script-packs/repo-related-files.js')).runRepoRelatedFilesScript,
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
