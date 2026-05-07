import { existsSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { getAgentContext } from '../lib/agent-context.js';
import type { CliLang } from '../lib/i18n.js';
import { getLocalIndexDatabasePath } from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { checkMustflowProject } from '../lib/validation.js';

const DOCTOR_SCHEMA_VERSION = '1';

interface DoctorCheckSummary {
	readonly ok: boolean;
	readonly issue_count: number;
	readonly issues: readonly string[];
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

type DoctorDiagnosticStatus = 'ok' | 'warn' | 'fail' | 'info';

interface DoctorDiagnostic {
	readonly id:
		| 'install'
		| 'validation'
		| 'commands'
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
	readonly diagnostics: readonly DoctorDiagnostic[];
	readonly next_steps: readonly string[];
}

type DoctorBaseOutput = Omit<DoctorOutput, 'diagnostics' | 'next_steps'>;

export function getDoctorHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf doctor [options]',
			summary:
				lang === 'ko'
					? '파일을 수정하지 않고 mustflow 루트 상태와 다음 작업 단서를 점검합니다.'
					: 'Inspect the mustflow root health and next work hints without modifying files.',
			options: [
				{
					label: '--json',
					description:
						lang === 'ko' ? '기계가 읽기 쉬운 JSON 진단 결과를 출력합니다' : 'Print machine-readable diagnostic JSON',
				},
				{
					label: '--strict',
					description:
						lang === 'ko'
							? '에이전트 안전성에 대한 추가 엄격 검사를 포함합니다'
							: 'Include additional strict checks for agent safety',
				},
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf doctor', 'mf doctor --json', 'mf doctor --strict --json'],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko' ? 'mustflow 상태를 확인했고 문제가 없습니다' : 'mustflow state was inspected and no issues were found',
				},
				{
					label: '1',
					description:
						lang === 'ko' ? '검증 문제 또는 잘못된 입력이 있었습니다' : 'Validation issues were found or input was invalid',
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

	diagnostics.push({
		id: 'install',
		status: output.installed ? 'ok' : 'fail',
		summary: output.installed ? 'installed' : 'not installed',
		action: output.installed ? null : 'mf init --dry-run',
	});

	diagnostics.push({
		id: 'validation',
		status: output.check.ok ? 'ok' : 'fail',
		summary: `${output.check.issue_count} ${pluralize(output.check.issue_count, 'issue', 'issues')}`,
		action: output.check.ok ? null : checkCommand,
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

function createDoctorOutput(strict: boolean): DoctorOutput {
	const mustflowRoot = resolveMustflowRoot();
	const context = getAgentContext(mustflowRoot);
	const issues = checkMustflowProject(mustflowRoot, { strict });
	const check = {
		ok: issues.length === 0,
		issue_count: issues.length,
		issues,
	};
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
	};
	const diagnostics = createDiagnostics(baseOutput);

	return {
		...baseOutput,
		diagnostics,
		next_steps: getNextSteps({ ...baseOutput, diagnostics }),
	};
}

function getDiagnosticLabel(id: DoctorDiagnostic['id'], lang: CliLang): string {
	if (lang === 'ko') {
		switch (id) {
			case 'install':
				return '설치';
			case 'validation':
				return '검증';
			case 'commands':
				return '명령 계약';
			case 'read_order':
				return '읽기 순서';
			case 'optional_read_order':
				return '선택 읽기 순서';
			case 'repo_map':
				return 'REPO_MAP.md';
			case 'local_index':
				return '로컬 색인';
			case 'latest_run':
				return '최근 실행';
		}
	}

	switch (id) {
		case 'install':
			return 'Install';
		case 'validation':
			return 'Validation';
		case 'commands':
			return 'Command contract';
		case 'read_order':
			return 'Read order';
		case 'optional_read_order':
			return 'Optional read order';
		case 'repo_map':
			return 'REPO_MAP.md';
		case 'local_index':
			return 'Local index';
		case 'latest_run':
			return 'Latest run';
	}
}

function renderDoctorOutput(output: DoctorOutput, lang: CliLang): string {
	const lines: string[] = [];

	lines.push(lang === 'ko' ? 'mustflow 진단' : 'mustflow doctor');
	lines.push(`${lang === 'ko' ? 'mustflow 루트' : 'mustflow root'}: ${output.mustflow_root}`);
	lines.push(`${lang === 'ko' ? '설치됨' : 'Installed'}: ${output.installed ? 'yes' : 'no'}`);
	lines.push(`${lang === 'ko' ? '엄격 검사' : 'Strict'}: ${output.strict ? 'yes' : 'no'}`);
	lines.push(`${lang === 'ko' ? '검사' : 'Check'}: ${output.check.ok ? 'passed' : 'failed'}`);
	lines.push(`${lang === 'ko' ? '문제' : 'Issues'}: ${output.check.issue_count}`);
	lines.push(`${lang === 'ko' ? '명령 계약' : 'Command contract'}: ${output.context.command_contract_exists ? 'present' : 'missing'}`);
	lines.push(`${lang === 'ko' ? '실행 가능한 의도' : 'Runnable intents'}: ${output.context.runnable_intents.length}`);

	lines.push('', lang === 'ko' ? '상태 점검:' : 'Health:');
	for (const diagnostic of output.diagnostics) {
		const action =
			diagnostic.action && diagnostic.status !== 'ok' ? ` (${lang === 'ko' ? '명령' : 'run'}: ${diagnostic.action})` : '';
		lines.push(`- [${diagnostic.status}] ${getDiagnosticLabel(diagnostic.id, lang)}: ${diagnostic.summary}${action}`);
	}

	if (output.check.issues.length > 0) {
		lines.push('', lang === 'ko' ? '문제 목록:' : 'Issue list:');
		for (const issue of output.check.issues) {
			lines.push(`- ${issue}`);
		}
	}

	lines.push('', lang === 'ko' ? '추천 명령:' : 'Suggested commands:');
	for (const step of output.next_steps) {
		lines.push(`- ${step}`);
	}

	lines.push('', lang === 'ko' ? '파일을 쓰지 않았습니다.' : 'No files were written.');

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
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf doctor --help', getDoctorHelp(lang), lang);
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
