import { readFileSync } from 'node:fs';
import path from 'node:path';

import { runRun } from './run.js';
import { createVerificationPlan, type VerificationCandidate } from '../../core/verification-plan.js';
import { readCommandContract } from '../../core/config-loading.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang, type MessageKey } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const VERIFY_SCHEMA_VERSION = '1';

type VerificationStatus = 'passed' | 'partial' | 'failed' | 'blocked';
type VerificationResultStatus = 'passed' | 'failed' | 'timed_out' | 'start_failed' | 'skipped';

interface BufferedOutput {
	readonly reporter: Reporter;
	readonly stdout: () => string;
	readonly stderr: () => string;
}

interface VerificationResult {
	readonly intent: string | null;
	readonly status: VerificationResultStatus;
	readonly skipped: boolean;
	readonly reason: string | null;
	readonly detail: string | null;
	readonly exit_code: number | null;
	readonly receipt: Record<string, unknown> | null;
}

interface VerificationSummary {
	readonly matched: number;
	readonly ran: number;
	readonly passed: number;
	readonly failed: number;
	readonly skipped: number;
}

interface VerificationOutput {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly mustflow_root: string;
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly status: VerificationStatus;
	readonly summary: VerificationSummary;
	readonly results: readonly VerificationResult[];
}

function createBufferedOutput(): BufferedOutput {
	const stdout: string[] = [];
	const stderr: string[] = [];

	return {
		reporter: {
			stdout(message) {
				stdout.push(`${message}\n`);
			},
			stderr(message) {
				stderr.push(`${message}\n`);
			},
		},
		stdout() {
			return stdout.join('');
		},
		stderr() {
			return stderr.join('');
		},
	};
}

export function getVerifyHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf verify --reason <event> [options] | mf verify --from-plan <path> [options]',
			summary: t(lang, 'verify.help.summary'),
			options: [
				{ label: '--reason <event>', description: t(lang, 'verify.help.option.reason') },
				{ label: '--from-plan <path>', description: t(lang, 'verify.help.option.fromPlan') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf verify --reason code_change',
				'mf verify --reason docs_change --json',
				'mf verify --from-plan verify-plan.json --json',
				'mf verify --reason mustflow_docs_change',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'verify.help.exit.ok') },
				{ label: '1', description: t(lang, 'verify.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseVerifyArgs(args: readonly string[]): {
	json: boolean;
	reason?: string;
	fromPlan?: string;
	error?: string;
} {
	let reason: string | undefined;
	let fromPlan: string | undefined;
	let json = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--json') {
			json = true;
			continue;
		}

		if (arg === '--reason') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, reason, error: 'missing_reason_value' };
			}

			reason = value;
			index += 1;
			continue;
		}

		if (arg === '--from-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, reason, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--reason=')) {
			const value = arg.slice('--reason='.length);
			if (value.length === 0) {
				return { json, reason, error: 'missing_reason_value' };
			}

			reason = value;
			continue;
		}

		if (arg.startsWith('--from-plan=')) {
			const value = arg.slice('--from-plan='.length);
			if (value.length === 0) {
				return { json, reason, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			continue;
		}

		if (arg.startsWith('-')) {
			return { json, reason, error: arg };
		}

		return { json, reason, error: `unexpected:${arg}` };
	}

	return { json, reason, fromPlan };
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function readStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((item): item is string => typeof item === 'string');
}

function readPlanReasons(plan: unknown): string[] {
	if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
		return [];
	}

	const record = plan as Record<string, unknown>;
	const summary = record.summary;
	const classificationSummary = record.classification_summary;
	const verification = record.verification;
	const reasons = [
		typeof record.reason === 'string' ? record.reason : '',
		...readStringArray(record.reasons),
		...readStringArray(record.validationReasons),
		...(summary && typeof summary === 'object' && !Array.isArray(summary)
			? readStringArray((summary as Record<string, unknown>).validationReasons)
			: []),
		...(classificationSummary && typeof classificationSummary === 'object' && !Array.isArray(classificationSummary)
			? readStringArray((classificationSummary as Record<string, unknown>).validationReasons)
			: []),
		...(verification && typeof verification === 'object' && !Array.isArray(verification)
			? readStringArray((verification as Record<string, unknown>).reasons)
			: []),
	];

	return uniqueStrings(reasons);
}

function resolvePlanPath(projectRoot: string, inputPath: string): string {
	const resolved = path.resolve(projectRoot, inputPath);
	const relative = path.relative(projectRoot, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('plan_path_outside_root');
	}

	return resolved;
}

function readReasonsFromPlan(projectRoot: string, inputPath: string): string[] {
	let parsed: unknown;
	const planPath = resolvePlanPath(projectRoot, inputPath);

	try {
		parsed = JSON.parse(readFileSync(planPath, 'utf8'));
	} catch {
		throw new Error('invalid_plan_file');
	}

	const reasons = readPlanReasons(parsed);
	if (reasons.length === 0) {
		throw new Error('missing_plan_reasons');
	}

	return reasons;
}

function planErrorMessageKey(code: string): MessageKey {
	switch (code) {
		case 'plan_path_outside_root':
			return 'verify.error.plan_path_outside_root';
		case 'missing_plan_reasons':
			return 'verify.error.missing_plan_reasons';
		default:
			return 'verify.error.invalid_plan_file';
	}
}

function skippedResult(candidate: VerificationCandidate): VerificationResult {
	return {
		intent: candidate.intent || null,
		status: 'skipped',
		skipped: true,
		reason: candidate.reason,
		detail: candidate.detail,
		exit_code: null,
		receipt: null,
	};
}

function runVerificationIntent(intent: string, lang: CliLang): VerificationResult {
	const output = createBufferedOutput();
	const exitCode = runRun([intent, '--json'], output.reporter, lang);
	const rawStdout = output.stdout().trim();
	let receipt: Record<string, unknown> | null = null;
	let status: VerificationResultStatus = exitCode === 0 ? 'passed' : 'failed';

	try {
		const parsed = JSON.parse(rawStdout) as Record<string, unknown>;
		receipt = parsed;
		const receiptStatus = parsed.status;
		if (
			receiptStatus === 'passed' ||
			receiptStatus === 'failed' ||
			receiptStatus === 'timed_out' ||
			receiptStatus === 'start_failed'
		) {
			status = receiptStatus;
		}
	} catch {
		status = 'failed';
	}

	return {
		intent,
		status,
		skipped: false,
		reason: exitCode === 0 ? null : 'run_failed',
		detail: output.stderr().trim() || null,
		exit_code: exitCode,
		receipt,
	};
}

function summarizeResults(results: readonly VerificationResult[]): VerificationSummary {
	const ran = results.filter((result) => !result.skipped).length;
	const passed = results.filter((result) => result.status === 'passed').length;
	const skipped = results.filter((result) => result.skipped).length;
	const failed = results.filter(
		(result) =>
			!result.skipped &&
			(result.status === 'failed' || result.status === 'timed_out' || result.status === 'start_failed'),
	).length;

	return {
		matched: results.filter((result) => result.intent !== null).length,
		ran,
		passed,
		failed,
		skipped,
	};
}

function getVerificationStatus(summary: VerificationSummary): VerificationStatus {
	if (summary.failed > 0) {
		return 'failed';
	}

	if (summary.ran === 0) {
		return 'blocked';
	}

	if (summary.skipped > 0) {
		return 'partial';
	}

	return 'passed';
}

function createVerifyOutput(
	reasons: readonly string[],
	planSource: string | null,
	projectRoot: string,
	lang: CliLang,
): VerificationOutput {
	const contract = readCommandContract(projectRoot);
	const candidatesByIntent = new Map<string, VerificationCandidate>();
	const unmatchedCandidates: VerificationCandidate[] = [];

	for (const reason of reasons) {
		const plan = createVerificationPlan(contract, reason);
		for (const candidate of plan.candidates) {
			if (!candidate.intent) {
				unmatchedCandidates.push(candidate);
				continue;
			}

			if (!candidatesByIntent.has(candidate.intent)) {
				candidatesByIntent.set(candidate.intent, candidate);
			}
		}
	}

	const candidates = [...candidatesByIntent.values(), ...unmatchedCandidates].sort((left, right) =>
		left.intent.localeCompare(right.intent),
	);
	const results = candidates.map((candidate) =>
		candidate.status === 'runnable' ? runVerificationIntent(candidate.intent, lang) : skippedResult(candidate),
	);
	const summary = summarizeResults(results);

	return {
		schema_version: VERIFY_SCHEMA_VERSION,
		command: 'verify',
		mustflow_root: projectRoot,
		reason: reasons.join(', '),
		reasons,
		plan_source: planSource,
		status: getVerificationStatus(summary),
		summary,
		results,
	};
}

function renderVerifyOutput(output: VerificationOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'verify.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'verify.label.reason')}: ${output.reason}`,
		`${t(lang, 'verify.label.planSource')}: ${output.plan_source ?? t(lang, 'value.none')}`,
		`${t(lang, 'verify.label.status')}: ${output.status}`,
		`matched: ${output.summary.matched}`,
		`ran: ${output.summary.ran}`,
		`passed: ${output.summary.passed}`,
		`failed: ${output.summary.failed}`,
		`skipped: ${output.summary.skipped}`,
		'',
		t(lang, 'verify.label.results'),
	];

	for (const result of output.results) {
		const intent = result.intent ?? t(lang, 'value.none');
		const reason = result.reason ? ` (${result.reason})` : '';
		lines.push(`- ${intent}: ${result.status}${reason}`);
	}

	return lines.join('\n');
}

export function runVerify(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getVerifyHelp(lang));
		return 0;
	}

	const parsed = parseVerifyArgs(args);

	if (parsed.error) {
		const message =
			parsed.error === 'missing_reason_value'
				? t(lang, 'cli.error.missingValue', { option: '--reason' })
				: parsed.error === 'missing_from_plan_value'
					? t(lang, 'cli.error.missingValue', { option: '--from-plan' })
				: parsed.error.startsWith('unexpected:')
					? t(lang, 'cli.error.unexpectedArgument', { argument: parsed.error.slice('unexpected:'.length) })
					: t(lang, 'cli.error.unknownOption', { option: parsed.error });
		printUsageError(reporter, message, 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.reason && parsed.fromPlan) {
		printUsageError(reporter, t(lang, 'verify.error.conflictingInputs'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (!parsed.reason && !parsed.fromPlan) {
		printUsageError(reporter, t(lang, 'verify.error.missingReason'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	let reasons: string[];

	try {
		reasons = parsed.fromPlan ? readReasonsFromPlan(projectRoot, parsed.fromPlan) : [parsed.reason as string];
	} catch (error) {
		const code = error instanceof Error ? error.message : 'invalid_plan_file';
		printUsageError(reporter, t(lang, planErrorMessageKey(code)), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	const output = createVerifyOutput(reasons, parsed.fromPlan ?? null, projectRoot, lang);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderVerifyOutput(output, lang));
	}

	return output.status === 'passed' ? 0 : 1;
}
