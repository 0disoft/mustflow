import {
	createChangeClassificationReport,
	type ChangeClassificationReport,
} from '../../core/change-classification.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { readGitChangedFiles } from '../lib/git-changes.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const CLASSIFY_SCHEMA_VERSION = '1';

interface ClassifyOutput extends ChangeClassificationReport {
	readonly schema_version: string;
	readonly command: 'classify';
	readonly mustflow_root: string;
}

interface ParsedClassifyArgs {
	readonly json: boolean;
	readonly changed: boolean;
	readonly paths: readonly string[];
	readonly error?: string;
}

export function getClassifyHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf classify --changed [options] | mf classify <path...> [options]',
			summary: t(lang, 'classify.help.summary'),
			options: [
				{ label: '--changed', description: t(lang, 'classify.help.option.changed') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf classify --changed', 'mf classify README.md schemas/verify-report.schema.json --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'classify.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function parseClassifyArgs(args: readonly string[]): ParsedClassifyArgs {
	const paths: string[] = [];
	let json = false;
	let changed = false;

	for (const arg of args) {
		if (arg === '--json') {
			json = true;
			continue;
		}

		if (arg === '--changed') {
			changed = true;
			continue;
		}

		if (arg.startsWith('-')) {
			return { json, changed, paths, error: arg };
		}

		paths.push(arg);
	}

	return { json, changed, paths };
}

function getClassifyOutput(projectRoot: string, parsed: ParsedClassifyArgs): ClassifyOutput {
	const source = parsed.changed ? 'changed' : 'paths';
	const files = parsed.changed ? readGitChangedFiles(projectRoot) : parsed.paths;

	return {
		schema_version: CLASSIFY_SCHEMA_VERSION,
		command: 'classify',
		mustflow_root: projectRoot,
		...createChangeClassificationReport(source, files),
	};
}

function renderList(values: readonly string[], lang: CliLang): string {
	return values.length > 0 ? values.join(', ') : t(lang, 'value.none');
}

function renderClassifyOutput(output: ClassifyOutput, lang: CliLang): string {
	const sourceLabel = output.source === 'changed' ? t(lang, 'classify.source.changed') : t(lang, 'classify.source.paths');
	const lines = [
		t(lang, 'classify.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'classify.label.source')}: ${sourceLabel}`,
		`${t(lang, 'classify.label.files')}: ${output.summary.fileCount}`,
		`${t(lang, 'classify.label.publicSurfaces')}: ${output.summary.publicSurfaceCount}`,
		`${t(lang, 'classify.label.validationReasons')}: ${renderList(output.summary.validationReasons, lang)}`,
		'',
		t(lang, 'classify.label.classifications'),
	];

	if (output.classifications.length === 0) {
		lines.push(`- ${t(lang, 'value.none')}`);
		return lines.join('\n');
	}

	for (const classification of output.classifications) {
		lines.push(
			`- ${classification.path}: ${classification.surface.kind} / ${classification.surface.category}`,
			`  ${t(lang, 'classify.label.changeKinds')}: ${renderList(classification.changeKinds, lang)}`,
			`  ${t(lang, 'classify.label.validationReasons')}: ${renderList(classification.surface.validationReasons, lang)}`,
			`  ${t(lang, 'classify.label.updatePolicy')}: ${classification.surface.updatePolicy}`,
			`  ${t(lang, 'classify.label.driftChecks')}: ${renderList(classification.surface.driftChecks, lang)}`,
		);
	}

	return lines.join('\n');
}

export function runClassify(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getClassifyHelp(lang));
		return 0;
	}

	const parsed = parseClassifyArgs(args);

	if (parsed.error) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unknownOption', { option: parsed.error }),
			'mf classify --help',
			getClassifyHelp(lang),
			lang,
		);
		return 1;
	}

	if (parsed.changed && parsed.paths.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: parsed.paths[0] }),
			'mf classify --help',
			getClassifyHelp(lang),
			lang,
		);
		return 1;
	}

	if (!parsed.changed && parsed.paths.length === 0) {
		printUsageError(reporter, t(lang, 'classify.error.missingInput'), 'mf classify --help', getClassifyHelp(lang), lang);
		return 1;
	}

	const output = getClassifyOutput(resolveMustflowRoot(), parsed);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
		return 0;
	}

	reporter.stdout(renderClassifyOutput(output, lang));
	return 0;
}
