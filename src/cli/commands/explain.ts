import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { explainAssetOptimization, explainCommandIntent, type CommandDecision } from '../../core/command-explanation.js';
import { readCommandContract, readMustflowConfigIfExists } from '../../core/config-loading.js';
import {
	explainManagedMarkdownAuthority,
	type AuthorityDecision,
} from '../../core/authority-resolution.js';
import { explainRetentionPolicy, type RetentionDecision } from '../../core/retention-explanation.js';
import { explainSkillRoute, type SkillRouteDecision } from '../../core/skill-route-explanation.js';
import {
	explainSkillRouteAlignment,
	type SkillRouteAlignmentDecision,
} from '../../core/skill-route-alignment.js';
import { explainPublicSurface, type PublicSurfaceDecision } from '../../core/public-surface-explanation.js';
import { checkMustflowProject } from '../lib/validation.js';

const EXPLAIN_SCHEMA_VERSION = '1';

type ExplainTopic = 'asset-optimization' | 'authority' | 'command' | 'retention' | 'skill' | 'skills' | 'surface';
type ExplainDecision =
	| AuthorityDecision
	| CommandDecision
	| RetentionDecision
	| SkillRouteDecision
	| SkillRouteAlignmentDecision
	| PublicSurfaceDecision;

interface ExplainOutput {
	readonly schema_version: string;
	readonly command: 'explain';
	readonly topic: ExplainTopic;
	readonly mustflow_root: string;
	readonly decision: ExplainDecision;
}

export function getExplainHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf explain <topic> [target] [options]',
			summary: t(lang, 'explain.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf explain authority',
				'mf explain authority AGENTS.md',
				'mf explain asset-optimization',
				'mf explain asset-optimization --json',
				'mf explain command test',
				'mf explain command lint --json',
				'mf explain retention',
				'mf explain retention --json',
				'mf explain skill code-review',
				'mf explain skill mustflow.core.code-review --json',
				'mf explain skills',
				'mf explain skills --json',
				'mf explain surface README.md',
				'mf explain surface templates/default/manifest.toml --json',
				'mf explain authority .mustflow/skills/INDEX.md --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'explain.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function getAuthorityExplainOutput(projectRoot: string, pathArg: string | undefined): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'authority',
		mustflow_root: projectRoot,
		decision: explainManagedMarkdownAuthority(pathArg),
	};
}

function getAssetOptimizationExplainOutput(projectRoot: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'asset-optimization',
		mustflow_root: projectRoot,
		decision: explainAssetOptimization(readCommandContract(projectRoot)),
	};
}

function getCommandExplainOutput(projectRoot: string, commandName: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'command',
		mustflow_root: projectRoot,
		decision: explainCommandIntent(readCommandContract(projectRoot), commandName),
	};
}

function getRetentionExplainOutput(projectRoot: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'retention',
		mustflow_root: projectRoot,
		decision: explainRetentionPolicy(readMustflowConfigIfExists(projectRoot)),
	};
}

function getSkillsExplainOutput(projectRoot: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'skills',
		mustflow_root: projectRoot,
		decision: explainSkillRouteAlignment(checkMustflowProject(projectRoot, { strict: true })),
	};
}

function getSkillExplainOutput(projectRoot: string, skillName: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'skill',
		mustflow_root: projectRoot,
		decision: explainSkillRoute(projectRoot, skillName),
	};
}

function getSurfaceExplainOutput(projectRoot: string, pathArg: string | undefined): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'surface',
		mustflow_root: projectRoot,
		decision: explainPublicSurface(pathArg),
	};
}

function formatNullable(value: string | number | boolean | null, lang: CliLang): string {
	if (value === null) {
		return t(lang, 'value.none');
	}

	if (typeof value === 'boolean') {
		return value ? t(lang, 'value.yes') : t(lang, 'value.no');
	}

	return String(value);
}

function renderExplainDecision(output: ExplainOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'explain.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'explain.label.topic')}: ${output.topic}`,
		`${t(lang, 'explain.label.decision')}: ${output.decision.decision}`,
		`${t(lang, 'explain.label.reason')}: ${output.decision.reason}`,
		`${t(lang, 'explain.label.effectiveAction')}: ${output.decision.effectiveAction}`,
		`${t(lang, 'explain.label.countsAsMustflowVerification')}: ${output.decision.countsAsMustflowVerification ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
		'',
		t(lang, 'explain.label.sourceFiles'),
		...output.decision.sourceFiles.map((sourceFile) => `- ${sourceFile}`),
	];

	if ('expectation' in output.decision && output.decision.expectation) {
		lines.push(
			'',
			t(lang, 'explain.label.expectedFrontmatter'),
			`- mustflow_doc: ${output.decision.expectation.docId}`,
			`- authority: ${output.decision.expectation.authority}`,
			`- lifecycle: ${output.decision.expectation.lifecycle}`,
		);
	}

	if ('boundary' in output.decision) {
		lines.push('', t(lang, 'explain.label.authorityBoundary'), `- role: ${output.decision.boundary.role}`);

		if (output.decision.boundary.canDefine.length > 0) {
			lines.push(`- ${t(lang, 'explain.label.canDefine')}:`);
			for (const item of output.decision.boundary.canDefine) {
				lines.push(`  - ${item}`);
			}
		}

		if (output.decision.boundary.cannotDefine.length > 0) {
			lines.push(`- ${t(lang, 'explain.label.cannotDefine')}:`);
			for (const item of output.decision.boundary.cannotDefine) {
				lines.push(`  - ${item}`);
			}
		}
	}

	if ('intent' in output.decision && output.decision.intent) {
		const intent = output.decision.intent;
		lines.push(
			'',
			t(lang, 'explain.label.commandIntent'),
			`- ${t(lang, 'explain.label.commandName')}: ${intent.name}`,
			`- status: ${intent.status ?? t(lang, 'value.none')}`,
			`- lifecycle: ${intent.lifecycle ?? t(lang, 'value.none')}`,
			`- run_policy: ${intent.runPolicy ?? t(lang, 'value.none')}`,
			`- stdin: ${intent.stdin ?? t(lang, 'value.none')}`,
			`- timeout_seconds: ${intent.timeoutSeconds ?? t(lang, 'value.none')}`,
			`- mode: ${intent.mode}`,
			`- cwd: ${intent.cwd ?? t(lang, 'value.none')}`,
			`- writes: ${intent.writes.join(', ') || t(lang, 'value.none')}`,
			`- network: ${formatNullable(intent.network, lang)}`,
			`- destructive: ${formatNullable(intent.destructive, lang)}`,
			`- success_exit_codes: ${intent.successExitCodes.join(', ') || t(lang, 'value.none')}`,
			`- required_after: ${intent.requiredAfter.join(', ') || t(lang, 'value.none')}`,
		);
	}

	if ('retention' in output.decision) {
		const retention = output.decision.retention;
		lines.push(
			'',
			t(lang, 'explain.label.retentionPolicy'),
			`- enabled: ${formatNullable(retention.enabled, lang)}`,
			`- raw_events.store: ${formatNullable(retention.rawEvents.store, lang)}`,
			`- raw_events.on_limit: ${formatNullable(retention.rawEvents.onLimit, lang)}`,
			`- run_receipts.store: ${retention.runReceipts.store}`,
			`- run_receipts.max_file_kb: ${retention.runReceipts.maxFileKb}`,
			`- run_receipts.max_items: ${retention.runReceipts.maxItems}`,
			`- run_receipts.keep_stdout_tail_bytes: ${retention.runReceipts.stdoutTailBytes}`,
			`- run_receipts.keep_stderr_tail_bytes: ${retention.runReceipts.stderrTailBytes}`,
			`- knowledge.enabled: ${formatNullable(retention.knowledge.enabled, lang)}`,
			`- context.max_file_kb: ${retention.context.maxFileKb}`,
			`- repo_map.max_file_kb: ${retention.repoMap.maxFileKb}`,
			`- repo_map.fail_if_larger: ${formatNullable(retention.repoMap.failIfLarger, lang)}`,
		);
	}

	if ('alignment' in output.decision) {
		const alignment = output.decision.alignment;
		lines.push(
			'',
			t(lang, 'explain.label.skillRoutes'),
			`- status: ${alignment.status}`,
			`- issue_count: ${alignment.issueCount}`,
			`- summary: ${alignment.summary}`,
			`- action: ${alignment.action ?? t(lang, 'value.none')}`,
		);

		if (alignment.issues.length > 0) {
			lines.push(`- ${t(lang, 'doctor.section.issueList')}`);
			for (const issue of alignment.issues) {
				lines.push(`  - ${issue}`);
			}
		}
	}

	if ('route' in output.decision) {
		const route = output.decision.route;
		lines.push('', t(lang, 'explain.label.skillRoute'));

		if (!route) {
			lines.push(`- ${t(lang, 'value.none')}`);
		} else {
			lines.push(
				`- skill: ${route.skill}`,
				`- path: ${route.skillPath}`,
				`- trigger: ${route.trigger}`,
				`- required_input: ${route.requiredInput}`,
				`- edit_scope: ${route.editScope}`,
				`- risk: ${route.risk}`,
				`- verification_intents: ${route.verificationIntents.join(', ') || t(lang, 'value.none')}`,
				`- declared_command_intents: ${route.declaredCommandIntents.join(', ') || t(lang, 'value.none')}`,
				`- expected_output: ${route.expectedOutput}`,
			);
		}
	}

	if ('surface' in output.decision) {
		const surface = output.decision.surface;
		lines.push(
			'',
			t(lang, 'explain.label.publicSurface'),
			`- kind: ${surface.kind}`,
			`- category: ${surface.category}`,
			`- is_public_surface: ${surface.isPublicSurface ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			`- ${t(lang, 'explain.label.validationReasons')}: ${surface.validationReasons.join(', ') || t(lang, 'value.none')}`,
			`- ${t(lang, 'explain.label.affectedContracts')}: ${surface.affectedContracts.join(', ') || t(lang, 'value.none')}`,
			`- ${t(lang, 'classify.label.updatePolicy')}: ${surface.updatePolicy}`,
			`- ${t(lang, 'classify.label.driftChecks')}: ${surface.driftChecks.join(', ') || t(lang, 'value.none')}`,
		);
	}

	return lines.join('\n');
}

export function runExplain(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getExplainHelp(lang));
		return 0;
	}

	const json = args.includes('--json');
	const unsupported = args.filter((arg) => arg.startsWith('-') && arg !== '--json');

	if (unsupported.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unknownOption', { option: unsupported[0] }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	const positional = args.filter((arg) => arg !== '--json');
	const [topic, targetArg, ...rest] = positional;

	if (
		topic !== 'asset-optimization' &&
		topic !== 'authority' &&
		topic !== 'command' &&
		topic !== 'retention' &&
		topic !== 'skill' &&
		topic !== 'skills' &&
		topic !== 'surface'
	) {
		printUsageError(
			reporter,
			t(lang, topic ? 'explain.error.unknownTopic' : 'explain.error.missingTopic', { topic: topic ?? '' }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'command' && !targetArg) {
		printUsageError(
			reporter,
			t(lang, 'explain.error.missingCommand'),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'skill' && !targetArg) {
		printUsageError(
			reporter,
			t(lang, 'explain.error.missingSkill'),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'retention' && targetArg) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: targetArg }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'asset-optimization' && targetArg) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: targetArg }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'skills' && targetArg) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: targetArg }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (rest.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: rest[0] }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	let output: ExplainOutput;

	switch (topic) {
		case 'asset-optimization':
			output = getAssetOptimizationExplainOutput(projectRoot);
			break;
		case 'authority':
			output = getAuthorityExplainOutput(projectRoot, targetArg);
			break;
		case 'command':
			output = getCommandExplainOutput(projectRoot, targetArg);
			break;
		case 'retention':
			output = getRetentionExplainOutput(projectRoot);
			break;
		case 'skill':
			output = getSkillExplainOutput(projectRoot, targetArg);
			break;
		case 'surface':
			output = getSurfaceExplainOutput(projectRoot, targetArg);
			break;
		case 'skills':
			output = getSkillsExplainOutput(projectRoot);
			break;
	}

	if (json) {
		reporter.stdout(JSON.stringify(output, null, 2));
		return 0;
	}

	reporter.stdout(renderExplainDecision(output, lang));
	return 0;
}
