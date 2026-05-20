import { existsSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import {
	getAgentContext,
	type EffectivePolicyContext,
	type StatePolicyContext,
} from '../lib/agent-context.js';
import { t, type CliLang } from '../lib/i18n.js';
import { getLocalIndexDatabasePath } from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { checkMustflowProjectReport } from '../lib/validation.js';
import { findCommandEnvInheritanceWarnings } from '../../core/command-contract-validation.js';
import { readCommandContract } from '../../core/config-loading.js';
import { summarizeSkillRouteAlignment } from '../../core/skill-route-alignment.js';

const DOCTOR_SCHEMA_VERSION = '1';

interface DoctorCheckSummary {
	readonly ok: boolean;
	readonly issue_count: number;
	readonly issues: readonly string[];
	readonly warning_count: number;
	readonly warnings: readonly string[];
}

interface DoctorContextSummary {
	readonly manifest_lock: 'missing' | 'invalid' | 'present';
	readonly template: { readonly id: string; readonly version: string } | null;
	readonly command_contract_exists: boolean;
	readonly runnable_intents: readonly string[];
	readonly missing_read_order: readonly string[];
	readonly missing_optional_read_order: readonly string[];
	readonly latest_run_exists: boolean;
}

interface DoctorCommandEnvironmentSummary {
	readonly inherited_intents: readonly string[];
	readonly inherited_network_intents: readonly string[];
}

type DoctorDiagnosticStatus = 'ok' | 'warn' | 'fail' | 'info';

interface DoctorDiagnostic {
	readonly id:
		| 'install'
		| 'validation'
		| 'skill_routes'
		| 'commands'
		| 'environment'
		| 'read_order'
		| 'optional_read_order'
		| 'repo_map'
		| 'local_index'
		| 'latest_run';
	readonly status: DoctorDiagnosticStatus;
	readonly summary: string;
	readonly action: string | null;
}

interface DoctorOutput {
	readonly schema_version: string;
	readonly command: 'doctor';
	readonly mustflow_root: string;
	readonly installed: boolean;
	readonly strict: boolean;
	readonly ok: boolean;
	readonly check: DoctorCheckSummary;
	readonly context: DoctorContextSummary;
	readonly command_environment: DoctorCommandEnvironmentSummary;
	readonly effective_policy: EffectivePolicyContext;
	readonly state_policy: StatePolicyContext;
	readonly blocked_actions: readonly string[];
	readonly diagnostics: readonly DoctorDiagnostic[];
	readonly next_steps: readonly string[];
}

type DoctorBaseOutput = Omit<DoctorOutput, 'diagnostics' | 'next_steps'>;

export function getDoctorHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf doctor [options]',
			summary: t(lang, 'doctor.help.summary'),
			options: [
				{
					label: '--json',
					description: t(lang, 'doctor.help.option.json'),
				},
				{
					label: '--strict',
					description: t(lang, 'doctor.help.option.strict'),
				},
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf doctor', 'mf doctor --json', 'mf doctor --strict --json'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'doctor.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'doctor.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

function pluralize(count: number, singular: string, plural: string): string {
	return count === 1 ? singular : plural;
}

function createDiagnostics(output: DoctorBaseOutput): readonly DoctorDiagnostic[] {
	const diagnostics: DoctorDiagnostic[] = [];
	const checkCommand = output.strict ? 'mf check --strict' : 'mf check';
	const repoMapExists = existsSync(path.join(output.mustflow_root, 'REPO_MAP.md'));
	const localIndexExists = existsSync(getLocalIndexDatabasePath(output.mustflow_root));
	const runnableIntentCount = output.context.runnable_intents.length;
	const skillRouteAlignment = summarizeSkillRouteAlignment(output.check.issues);
	const inheritedEnvIntentCount = output.command_environment.inherited_intents.length;

	diagnostics.push({
		id: 'install',
		status: output.installed ? 'ok' : 'fail',
		summary: output.installed ? 'installed' : 'not installed',
		action: output.installed ? null : 'mf init --dry-run',
	});

	diagnostics.push({
		id: 'validation',
		status: output.check.ok ? 'ok' : 'fail',
		summary:
			output.check.warning_count === 0
				? `${output.check.issue_count} ${pluralize(output.check.issue_count, 'issue', 'issues')}`
				: `${output.check.issue_count} ${pluralize(output.check.issue_count, 'issue', 'issues')}, ${output.check.warning_count} ${pluralize(output.check.warning_count, 'warning', 'warnings')}`,
		action: output.check.ok ? null : checkCommand,
	});

	diagnostics.push({
		id: 'skill_routes',
		status: output.strict ? skillRouteAlignment.status : 'info',
		summary: output.strict ? skillRouteAlignment.summary : 'not evaluated; run strict doctor',
		action: output.strict ? skillRouteAlignment.action : 'mf doctor --strict --json',
	});

	diagnostics.push({
		id: 'commands',
		status: output.context.command_contract_exists ? (runnableIntentCount > 0 ? 'ok' : 'warn') : 'fail',
		summary: output.context.command_contract_exists
			? `present, ${runnableIntentCount} runnable ${pluralize(runnableIntentCount, 'intent', 'intents')}`
			: 'missing',
		action: output.context.command_contract_exists ? 'mf help commands' : 'mf init --dry-run',
	});

	diagnostics.push({
		id: 'environment',
		status: output.context.command_contract_exists ? (inheritedEnvIntentCount > 0 ? 'warn' : 'ok') : 'info',
		summary: output.context.command_contract_exists
			? inheritedEnvIntentCount === 0
				? 'no inherited host-environment intents'
				: `${inheritedEnvIntentCount} inherited host-environment ${pluralize(
						inheritedEnvIntentCount,
						'intent',
						'intents',
					)}: ${output.command_environment.inherited_intents.join(', ')}`
			: 'command contract missing',
		action: inheritedEnvIntentCount > 0 ? 'mf check --strict --json' : null,
	});

	diagnostics.push({
		id: 'read_order',
		status: output.context.missing_read_order.length === 0 ? 'ok' : 'fail',
		summary:
			output.context.missing_read_order.length === 0
				? 'all required files present'
				: `${output.context.missing_read_order.length} missing required ${pluralize(
						output.context.missing_read_order.length,
						'path',
						'paths',
					)}`,
		action: output.context.missing_read_order.length === 0 ? 'mf context --json' : checkCommand,
	});

	if (output.context.missing_optional_read_order.length > 0) {
		diagnostics.push({
			id: 'optional_read_order',
			status: 'info',
			summary: `${output.context.missing_optional_read_order.length} missing optional ${pluralize(
				output.context.missing_optional_read_order.length,
				'path',
				'paths',
			)}`,
			action: 'mf context --json',
		});
	}

	diagnostics.push({
		id: 'repo_map',
		status: repoMapExists ? 'ok' : 'info',
		summary: repoMapExists ? 'present' : 'not generated',
		action: repoMapExists ? 'mf map --stdout' : 'mf map --write',
	});

	diagnostics.push({
		id: 'local_index',
		status: localIndexExists ? 'ok' : 'info',
		summary: localIndexExists ? 'present' : 'not generated',
		action: localIndexExists ? 'mf search <query>' : 'mf index',
	});

	diagnostics.push({
		id: 'latest_run',
		status: output.context.latest_run_exists ? 'ok' : 'info',
		summary: output.context.latest_run_exists ? 'run receipt present' : 'no run receipt yet',
		action: output.context.latest_run_exists ? null : 'mf run <intent>',
	});

	return diagnostics;
}

function getNextSteps(output: Omit<DoctorOutput, 'next_steps'>): readonly string[] {
	if (!output.installed) {
		return ['mf init --dry-run', 'mf init --yes'];
	}

	if (!output.check.ok) {
		const checkCommand = output.strict ? 'mf check --strict' : 'mf check';
		return [checkCommand, 'mf status --json', 'mf update --dry-run'];
	}

	const nextSteps = ['mf help workflow', 'mf help commands', 'mf context --json', 'mf check --strict'];

	for (const diagnostic of output.diagnostics) {
		if (diagnostic.action && diagnostic.status !== 'ok' && !nextSteps.includes(diagnostic.action)) {
			nextSteps.push(diagnostic.action);
		}
	}

	return nextSteps;
}

function readCommandEnvironmentSummary(projectRoot: string): DoctorCommandEnvironmentSummary {
	try {
		const contract = readCommandContract(projectRoot);
		const warnings = findCommandEnvInheritanceWarnings(contract);

		return {
			inherited_intents: warnings.map((warning) => warning.intentName).sort((left, right) => left.localeCompare(right)),
			inherited_network_intents: warnings
				.filter((warning) => warning.network)
				.map((warning) => warning.intentName)
				.sort((left, right) => left.localeCompare(right)),
		};
	} catch {
		return {
			inherited_intents: [],
			inherited_network_intents: [],
		};
	}
}

function createDoctorOutput(strict: boolean): DoctorOutput {
	const mustflowRoot = resolveMustflowRoot();
	const context = getAgentContext(mustflowRoot);
	const checkReport = checkMustflowProjectReport(mustflowRoot, { strict });
	const check = {
		ok: checkReport.issues.length === 0,
		issue_count: checkReport.issues.length,
		issues: checkReport.issues,
		warning_count: checkReport.warnings.length,
		warnings: checkReport.warnings,
	};
	const commandEnvironment = readCommandEnvironmentSummary(mustflowRoot);
	const baseOutput: DoctorBaseOutput = {
		schema_version: DOCTOR_SCHEMA_VERSION,
		command: 'doctor',
		mustflow_root: mustflowRoot,
		installed: context.installed,
		strict,
		ok: context.installed && check.ok,
		check,
		context: {
			manifest_lock: context.manifest_lock,
			template: context.template,
			command_contract_exists: context.command_contract.exists,
			runnable_intents: context.command_contract.runnable_intents,
			missing_read_order: context.read_order.filter((entry) => !entry.exists).map((entry) => entry.path),
			missing_optional_read_order: context.optional_read_order.filter((entry) => !entry.exists).map((entry) => entry.path),
			latest_run_exists: context.latest_run.exists,
		},
		command_environment: commandEnvironment,
		effective_policy: context.effective_policy,
		state_policy: context.state_policy,
		blocked_actions: context.blocked_actions,
	};
	const diagnostics = createDiagnostics(baseOutput);

	return {
		...baseOutput,
		diagnostics,
		next_steps: getNextSteps({ ...baseOutput, diagnostics }),
	};
}

function getDiagnosticLabel(id: DoctorDiagnostic['id'], lang: CliLang): string {
	switch (id) {
		case 'install':
			return t(lang, 'doctor.diagnostic.install');
		case 'validation':
			return t(lang, 'doctor.diagnostic.validation');
		case 'skill_routes':
			return t(lang, 'doctor.diagnostic.skillRoutes');
		case 'commands':
			return t(lang, 'doctor.diagnostic.commands');
		case 'environment':
			return t(lang, 'doctor.diagnostic.environment');
		case 'read_order':
			return t(lang, 'doctor.diagnostic.readOrder');
		case 'optional_read_order':
			return t(lang, 'doctor.diagnostic.optionalReadOrder');
		case 'repo_map':
			return t(lang, 'doctor.diagnostic.repoMap');
		case 'local_index':
			return t(lang, 'doctor.diagnostic.localIndex');
		case 'latest_run':
			return t(lang, 'doctor.diagnostic.latestRun');
	}
}

function renderDoctorOutput(output: DoctorOutput, lang: CliLang): string {
	const lines: string[] = [];

	lines.push(t(lang, 'doctor.title'));
	lines.push(`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`);
	lines.push(`${t(lang, 'label.installed')}: ${output.installed ? 'yes' : 'no'}`);
	lines.push(`${t(lang, 'doctor.label.strict')}: ${output.strict ? 'yes' : 'no'}`);
	lines.push(`${t(lang, 'doctor.label.check')}: ${output.check.ok ? 'passed' : 'failed'}`);
	lines.push(`${t(lang, 'doctor.label.issues')}: ${output.check.issue_count}`);
	lines.push(`${t(lang, 'label.commandContract')}: ${output.context.command_contract_exists ? 'present' : 'missing'}`);
	lines.push(`${t(lang, 'label.runnableIntents')}: ${output.context.runnable_intents.length}`);

	lines.push('', t(lang, 'doctor.section.health'));
	for (const diagnostic of output.diagnostics) {
		const action =
			diagnostic.action && diagnostic.status !== 'ok' ? ` (${t(lang, 'doctor.actionLabel')}: ${diagnostic.action})` : '';
		lines.push(`- [${diagnostic.status}] ${getDiagnosticLabel(diagnostic.id, lang)}: ${diagnostic.summary}${action}`);
	}

	if (output.check.issues.length > 0) {
		lines.push('', t(lang, 'doctor.section.issueList'));
		for (const issue of output.check.issues) {
			lines.push(`- ${issue}`);
		}
	}

	lines.push('', t(lang, 'doctor.section.suggestedCommands'));
	for (const step of output.next_steps) {
		lines.push(`- ${step}`);
	}

	lines.push('', t(lang, 'update.plan.noFilesWritten'));

	return lines.join('\n');
}

export function runDoctor(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getDoctorHelp(lang));
		return 0;
	}

	const supported = new Set(['--json', '--strict']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf doctor --help', getDoctorHelp(lang), lang);
		return 1;
	}

	const output = createDoctorOutput(args.includes('--strict'));

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(output, null, 2));
		return output.ok ? 0 : 1;
	}

	reporter.stdout(renderDoctorOutput(output, lang));
	return output.ok ? 0 : 1;
}
