import { lstatSync } from 'node:fs';
import path from 'node:path';

import {
	MAX_HANDOFF_RECORD_BYTES,
	validateHandoffRecordJson,
	type HandoffValidationReport,
} from '../../core/handoff-record.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { ensureInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks } from '../lib/filesystem.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const HANDOFF_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedHandoffArgs {
	readonly action: 'validate';
	readonly path?: string;
	readonly json: boolean;
	readonly error?: string;
}

export function getHandoffHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf handoff validate <path> [options]',
			summary: t(lang, 'handoff.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf handoff validate .mustflow/work-items/MF-0001.json',
				'mf handoff validate .mustflow/work-items/MF-0001.json --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'handoff.help.exit.ok') },
				{ label: '1', description: t(lang, 'handoff.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseHandoffArgs(args: readonly string[], lang: CliLang): ParsedHandoffArgs {
	const [action, ...rest] = args;

	if (!action) {
		return { action: 'validate', json: false, error: t(lang, 'handoff.error.missingAction') };
	}

	if (action !== 'validate') {
		return { action: 'validate', json: false, error: t(lang, 'handoff.error.unknownAction', { action }) };
	}

	const parsed = parseCliOptions(rest, HANDOFF_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const [recordPath, unexpectedArgument] = parsed.positionals;

	if (unexpectedArgument) {
		return { action, path: recordPath, json, error: t(lang, 'cli.error.unexpectedArgument', { argument: unexpectedArgument }) };
	}

	if (parsed.error) {
		return { action, path: recordPath, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	if (!recordPath) {
		return { action, json, error: t(lang, 'handoff.error.missingPath') };
	}

	return { action, path: recordPath, json };
}

function createReadFailureReport(
	mustflowRoot: string,
	recordPath: string,
	code: string,
	message: string,
): HandoffValidationReport {
	return {
		schema_version: '1',
		command: 'handoff_validate',
		ok: false,
		mustflow_root: mustflowRoot,
		path: recordPath,
		record_kind: null,
		task_id: null,
		summary: {
			scope_count: 0,
			acceptance_criteria_count: 0,
			source_ref_count: 0,
			verification_plan_count: 0,
			coverage_count: 0,
			remaining_risk_count: 0,
		},
		issues: [{ severity: 'error', code, path: '$', message }],
	};
}

function toRelativePosixPath(rootPath: string, targetPath: string): string {
	return path.relative(rootPath, targetPath).split(path.sep).join('/');
}

function renderHandoffReport(report: HandoffValidationReport, lang: CliLang): string {
	const lines = [
		t(lang, 'handoff.title'),
		`${t(lang, 'label.mustflowRoot')}: ${report.mustflow_root}`,
		`${t(lang, 'handoff.label.path')}: ${report.path}`,
		`${t(lang, 'handoff.label.status')}: ${report.ok ? t(lang, 'handoff.value.valid') : t(lang, 'handoff.value.invalid')}`,
		`${t(lang, 'handoff.label.kind')}: ${report.record_kind ?? t(lang, 'value.none')}`,
		`${t(lang, 'handoff.label.task')}: ${report.task_id ?? t(lang, 'value.none')}`,
		`${t(lang, 'handoff.label.issues')}: ${report.issues.length}`,
	];

	if (report.issues.length > 0) {
		lines.push('', t(lang, 'handoff.label.issues'));
		for (const issue of report.issues) {
			lines.push(`- [${issue.severity}] ${issue.code} ${issue.path}: ${issue.message}`);
		}
	}

	return lines.join('\n');
}

export function runHandoff(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	const helpText = getHandoffHelp(lang);

	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(helpText);
		return 0;
	}

	const options = parseHandoffArgs(args, lang);

	if (options.error || !options.path) {
		printUsageError(reporter, options.error ?? t(lang, 'handoff.error.missingPath'), 'mf handoff --help', helpText, lang);
		return 1;
	}

	const mustflowRoot = resolveMustflowRoot();
	const recordPath = path.resolve(mustflowRoot, options.path);

	let report: HandoffValidationReport;

	try {
		ensureInsideWithoutSymlinks(mustflowRoot, recordPath);
		const stats = lstatSync(recordPath);

		if (!stats.isFile()) {
			report = createReadFailureReport(
				mustflowRoot,
				toRelativePosixPath(mustflowRoot, recordPath),
				'record_not_regular_file',
				t(lang, 'handoff.error.notFile'),
			);
		} else if (stats.size > MAX_HANDOFF_RECORD_BYTES) {
			report = createReadFailureReport(
				mustflowRoot,
				toRelativePosixPath(mustflowRoot, recordPath),
				'record_too_large',
				t(lang, 'handoff.error.tooLarge'),
			);
		} else {
			const content = readUtf8FileInsideWithoutSymlinks(mustflowRoot, recordPath);
			report = validateHandoffRecordJson(content, {
				mustflowRoot,
				path: toRelativePosixPath(mustflowRoot, recordPath),
			});
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report = createReadFailureReport(
			mustflowRoot,
			options.path,
			'record_unreadable',
			t(lang, 'handoff.error.unreadable', { message }),
		);
	}

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderHandoffReport(report, lang));
	return report.ok ? 0 : 1;
}
