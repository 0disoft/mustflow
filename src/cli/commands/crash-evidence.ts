import { lstatSync } from 'node:fs';
import path from 'node:path';

import { runDeterministicRaceScenario, type DeterministicRaceReport } from '../../core/deterministic-race-harness.js';
import {
	MAX_NATIVE_CRASH_EVIDENCE_BYTES,
	summarizeNativeCrashEvidence,
	validateNativeCrashEvidence,
	validateNativeCrashEvidenceJson,
	type NativeCrashEvidenceIssue,
	type NativeCrashEvidenceReadiness,
	type NativeCrashEvidenceSummary,
} from '../../core/native-crash-evidence.js';
import {
	collectNativeCrashEvidence,
	type NativeCrashCollectorAdapter,
} from '../../core/native-crash-collectors.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import {
	ensureFileTargetInsideWithoutSymlinks,
	ensureInsideWithoutSymlinks,
	readFileInsideWithoutSymlinks,
	readUtf8FileInsideWithoutSymlinks,
	writeUtf8FileInsideWithoutSymlinks,
} from '../lib/filesystem.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const VALIDATE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const COLLECT_OPTIONS = [
	{ name: '--adapter', kind: 'string' }, { name: '--output', kind: 'string' },
	{ name: '--binary', kind: 'string' }, { name: '--overwrite', kind: 'boolean' }, { name: '--json', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];
const RACE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const COLLECTORS = new Set<NativeCrashCollectorAdapter>(['windows-minidump', 'linux-core', 'sanitizer']);
const MAX_CRASH_ARTIFACT_BYTES = 256 * 1024 * 1024;
const MAX_BINARY_BYTES = 512 * 1024 * 1024;

interface ParsedArgs {
	readonly action: 'validate' | 'collect' | 'race';
	readonly path?: string;
	readonly json: boolean;
	readonly adapter?: NativeCrashCollectorAdapter;
	readonly output?: string;
	readonly binary?: string;
	readonly overwrite?: boolean;
	readonly error?: string;
}

export interface NativeCrashEvidenceValidationReport {
	readonly schema_version: '1'; readonly command: 'crash_evidence_validate'; readonly ok: boolean;
	readonly readiness: NativeCrashEvidenceReadiness; readonly mustflow_root: string; readonly path: string;
	readonly summary: NativeCrashEvidenceSummary; readonly issues: readonly NativeCrashEvidenceIssue[];
}

export interface NativeCrashEvidenceCollectionReport {
	readonly schema_version: '1'; readonly command: 'crash_evidence_collect'; readonly ok: boolean;
	readonly adapter: NativeCrashCollectorAdapter; readonly input_path: string; readonly binary_path: string | null;
	readonly output_path: string; readonly wrote: boolean; readonly readiness: NativeCrashEvidenceReadiness;
	readonly summary: NativeCrashEvidenceSummary; readonly warnings: readonly string[]; readonly issues: readonly NativeCrashEvidenceIssue[];
}

const EMPTY_SUMMARY: NativeCrashEvidenceSummary = { module_count: 0, thread_count: 0, frame_count: 0, error_count: 1, warning_count: 0 };

export function getCrashEvidenceHelp(lang: CliLang = 'en'): string {
	return renderHelp({
		usage: 'mf crash-evidence <validate|collect|race> <path> [options]', summary: t(lang, 'crashEvidence.help.summary'),
		options: [
			{ label: '--adapter <name>', description: 'Collector: windows-minidump, linux-core, or sanitizer' },
			{ label: '--output <path>', description: 'Write collected evidence inside the mustflow root' },
			{ label: '--binary <path>', description: 'Bind an optional exact binary by SHA-256' },
			{ label: '--overwrite', description: 'Replace an existing output file' },
			{ label: '--json', description: t(lang, 'cli.option.json') },
			{ label: '-h, --help', description: t(lang, 'cli.option.help') },
		],
		examples: [
			'mf crash-evidence validate crash-evidence.json --json',
			'mf crash-evidence collect crash.dmp --adapter windows-minidump --output evidence.json --json',
			'mf crash-evidence race race-scenario.json --json',
		],
		exitCodes: [
			{ label: '0', description: t(lang, 'crashEvidence.help.exit.ok') },
			{ label: '1', description: t(lang, 'crashEvidence.help.exit.fail') },
		],
	}, lang);
}

function parseArgs(args: readonly string[], lang: CliLang): ParsedArgs {
	const [rawAction, ...rest] = args;
	if (!rawAction) return { action: 'validate', json: false, error: t(lang, 'crashEvidence.error.missingAction') };
	if (rawAction !== 'validate' && rawAction !== 'collect' && rawAction !== 'race') return { action: 'validate', json: false, error: t(lang, 'crashEvidence.error.unknownAction', { action: rawAction }) };
	const action = rawAction;
	const specs = action === 'collect' ? COLLECT_OPTIONS : action === 'race' ? RACE_OPTIONS : VALIDATE_OPTIONS;
	const parsed = parseCliOptions(rest, specs, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const [inputPath, unexpected] = parsed.positionals;
	if (parsed.error) return { action, path: inputPath, json, error: formatCliOptionParseError(parsed.error, lang) };
	if (unexpected) return { action, path: inputPath, json, error: t(lang, 'cli.error.unexpectedArgument', { argument: unexpected }) };
	if (!inputPath) return { action, json, error: t(lang, 'crashEvidence.error.missingPath') };
	if (action !== 'collect') return { action, path: inputPath, json };
	const adapter = getParsedCliStringOption(parsed, '--adapter');
	const output = getParsedCliStringOption(parsed, '--output');
	if (!adapter || !COLLECTORS.has(adapter as NativeCrashCollectorAdapter)) return { action, path: inputPath, json, error: 'Specify --adapter windows-minidump, linux-core, or sanitizer.' };
	if (!output) return { action, path: inputPath, json, error: 'Missing required --output path.' };
	return { action, path: inputPath, json, adapter: adapter as NativeCrashCollectorAdapter, output, binary: getParsedCliStringOption(parsed, '--binary') ?? undefined, overwrite: hasParsedCliOption(parsed, '--overwrite') };
}

function relative(root: string, target: string): string {
	return path.relative(root, target).split(path.sep).join('/');
}

function validationFailure(root: string, evidencePath: string, code: string, message: string): NativeCrashEvidenceValidationReport {
	return { schema_version: '1', command: 'crash_evidence_validate', ok: false, readiness: 'rejected', mustflow_root: root, path: evidencePath, summary: EMPTY_SUMMARY, issues: [{ severity: 'error', code, path: '$', message }] };
}

function validateContent(root: string, evidencePath: string, content: string): NativeCrashEvidenceValidationReport {
	const validation = validateNativeCrashEvidenceJson(content);
	let parsed: unknown = null;
	try { parsed = JSON.parse(content); } catch { /* validator owns parse error */ }
	return { schema_version: '1', command: 'crash_evidence_validate', ok: validation.ok, readiness: validation.readiness, mustflow_root: root, path: evidencePath, summary: summarizeNativeCrashEvidence(parsed, validation.issues), issues: validation.issues };
}

function runValidate(options: ParsedArgs, root: string): NativeCrashEvidenceValidationReport {
	const absolutePath = path.resolve(root, options.path!);
	try {
		ensureInsideWithoutSymlinks(root, absolutePath);
		const stats = lstatSync(absolutePath);
		const relativePath = relative(root, absolutePath);
		if (!stats.isFile()) return validationFailure(root, relativePath, 'evidence_not_regular_file', 'Crash evidence path must be a regular file.');
		if (stats.size > MAX_NATIVE_CRASH_EVIDENCE_BYTES) return validationFailure(root, relativePath, 'evidence_too_large', 'Crash evidence exceeds the 4 MiB limit.');
		return validateContent(root, relativePath, readUtf8FileInsideWithoutSymlinks(root, absolutePath, { maxBytes: MAX_NATIVE_CRASH_EVIDENCE_BYTES }));
	} catch (error) {
		return validationFailure(root, options.path!, 'evidence_unreadable', `Could not read crash evidence: ${error instanceof Error ? error.message : String(error)}`);
	}
}

function collectionFailure(options: ParsedArgs, inputPath: string, outputPath: string, code: string, message: string): NativeCrashEvidenceCollectionReport {
	return { schema_version: '1', command: 'crash_evidence_collect', ok: false, adapter: options.adapter!, input_path: inputPath, binary_path: options.binary ?? null, output_path: outputPath, wrote: false, readiness: 'rejected', summary: EMPTY_SUMMARY, warnings: [], issues: [{ severity: 'error', code, path: '$', message }] };
}

function runCollect(options: ParsedArgs, root: string): NativeCrashEvidenceCollectionReport {
	const input = path.resolve(root, options.path!);
	const output = path.resolve(root, options.output!);
	const binary = options.binary ? path.resolve(root, options.binary) : null;
	const inputPath = relative(root, input);
	const outputPath = relative(root, output);
	try {
		const artifactBytes = readFileInsideWithoutSymlinks(root, input, { maxBytes: MAX_CRASH_ARTIFACT_BYTES });
		const binaryBytes = binary ? readFileInsideWithoutSymlinks(root, binary, { maxBytes: MAX_BINARY_BYTES }) : undefined;
		ensureFileTargetInsideWithoutSymlinks(root, output, { allowMissingLeaf: true });
		try {
			lstatSync(output);
			if (!options.overwrite) return collectionFailure(options, inputPath, outputPath, 'output_exists', 'Output exists; pass --overwrite to replace it.');
		} catch (error) {
			if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
		}
		const collected = collectNativeCrashEvidence(artifactBytes, {
			adapter: options.adapter!, originalName: path.basename(input), capturedAt: new Date().toISOString(),
			binaryName: binary ? path.basename(binary) : undefined, binaryPath: binary ? relative(root, binary) : undefined, binaryBytes,
		});
		const validation = validateNativeCrashEvidence(collected.evidence);
		const summary = summarizeNativeCrashEvidence(collected.evidence, validation.issues);
		if (!validation.ok) return { ...collectionFailure(options, inputPath, outputPath, 'collected_evidence_invalid', 'Collector output failed the native crash evidence contract.'), summary, warnings: collected.warnings, issues: validation.issues };
		writeUtf8FileInsideWithoutSymlinks(root, output, `${JSON.stringify(collected.evidence, null, 2)}\n`);
		return { schema_version: '1', command: 'crash_evidence_collect', ok: true, adapter: options.adapter!, input_path: inputPath, binary_path: binary ? relative(root, binary) : null, output_path: outputPath, wrote: true, readiness: validation.readiness, summary, warnings: collected.warnings, issues: validation.issues };
	} catch (error) {
		return collectionFailure(options, inputPath, outputPath, 'collection_failed', error instanceof Error ? error.message : String(error));
	}
}

function runRace(options: ParsedArgs, root: string): DeterministicRaceReport {
	try {
		const scenarioPath = path.resolve(root, options.path!);
		const text = readUtf8FileInsideWithoutSymlinks(root, scenarioPath, { maxBytes: MAX_NATIVE_CRASH_EVIDENCE_BYTES });
		return runDeterministicRaceScenario(JSON.parse(text));
	} catch (error) {
		return runDeterministicRaceScenario({ error: error instanceof Error ? error.message : String(error) });
	}
}

function renderValidation(report: NativeCrashEvidenceValidationReport, lang: CliLang): string {
	const lines = [t(lang, 'crashEvidence.title'), `${t(lang, 'label.mustflowRoot')}: ${report.mustflow_root}`, `${t(lang, 'crashEvidence.label.path')}: ${report.path}`, `${t(lang, 'crashEvidence.label.status')}: ${report.ok ? t(lang, 'crashEvidence.value.valid') : t(lang, 'crashEvidence.value.invalid')}`, `${t(lang, 'crashEvidence.label.readiness')}: ${report.readiness}`, `${t(lang, 'crashEvidence.label.modules')}: ${report.summary.module_count}`, `${t(lang, 'crashEvidence.label.threads')}: ${report.summary.thread_count}`, `${t(lang, 'crashEvidence.label.frames')}: ${report.summary.frame_count}`, `${t(lang, 'crashEvidence.label.issues')}: ${report.issues.length}`];
	for (const issue of report.issues) lines.push(`- [${issue.severity}] ${issue.code} ${issue.path}: ${issue.message}`);
	return lines.join('\n');
}

export function runCrashEvidence(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	const help = getCrashEvidenceHelp(lang);
	if (hasCliOptionToken(args, '--help', ['-h'])) { reporter.stdout(help); return 0; }
	const options = parseArgs(args, lang);
	if (options.error || !options.path) { printUsageError(reporter, options.error ?? t(lang, 'crashEvidence.error.missingPath'), 'mf crash-evidence --help', help, lang); return 1; }
	const root = resolveMustflowRoot();
	const report = options.action === 'collect' ? runCollect(options, root) : options.action === 'race' ? runRace(options, root) : runValidate(options, root);
	if (options.json || options.action !== 'validate') reporter.stdout(JSON.stringify(report, null, 2));
	else reporter.stdout(renderValidation(report as NativeCrashEvidenceValidationReport, lang));
	return report.ok ? 0 : 1;
}
