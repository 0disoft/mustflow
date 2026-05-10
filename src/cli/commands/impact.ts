import path from 'node:path';

import { createChangeClassificationReport, type ChangeClassificationReport } from '../../core/change-classification.js';
import { summarizeVersionImpact, type VersionImpactSummary } from '../../core/version-impact.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { isRecord, type TomlTable } from '../lib/command-contract.js';
import { readGitChangedFiles } from '../lib/git-changes.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { readTomlFile } from '../lib/toml.js';
import {
	detectVersionSources,
	releaseVersioningIsEnabled,
	type VersionSource,
} from '../../core/version-sources.js';

const IMPACT_SCHEMA_VERSION = '1';

interface ImpactOutput {
	readonly schema_version: string;
	readonly command: 'impact';
	readonly mustflow_root: string;
	readonly source: ChangeClassificationReport['source'];
	readonly files: readonly string[];
	readonly versioning_enabled: boolean;
	readonly version_sources: readonly VersionSource[];
	readonly classification_summary: ChangeClassificationReport['summary'];
	readonly version_impact: VersionImpactSummary;
}

interface ParsedImpactArgs {
	readonly json: boolean;
	readonly changed: boolean;
	readonly paths: readonly string[];
	readonly error?: string;
}

export function getImpactHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf impact --changed [options] | mf impact <path...> [options]',
			summary: t(lang, 'impact.help.summary'),
			options: [
				{ label: '--changed', description: t(lang, 'impact.help.option.changed') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf impact --changed', 'mf impact package.json schemas/impact-report.schema.json --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'impact.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function parseImpactArgs(args: readonly string[]): ParsedImpactArgs {
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

function readPreferences(projectRoot: string): TomlTable | undefined {
	try {
		const preferences = readTomlFile(path.join(projectRoot, '.mustflow', 'config', 'preferences.toml'));
		return isRecord(preferences) ? preferences : undefined;
	} catch {
		return undefined;
	}
}

function createImpactOutput(projectRoot: string, parsed: ParsedImpactArgs): ImpactOutput {
	const source = parsed.changed ? 'changed' : 'paths';
	const files = parsed.changed ? readGitChangedFiles(projectRoot) : parsed.paths;
	const classificationReport = createChangeClassificationReport(source, files);
	const versionSources = detectVersionSources(projectRoot);

	return {
		schema_version: IMPACT_SCHEMA_VERSION,
		command: 'impact',
		mustflow_root: projectRoot,
		source,
		files: classificationReport.files,
		versioning_enabled: releaseVersioningIsEnabled(readPreferences(projectRoot)),
		version_sources: versionSources,
		classification_summary: classificationReport.summary,
		version_impact: summarizeVersionImpact(classificationReport, versionSources),
	};
}

function renderList(values: readonly string[], lang: CliLang): string {
	return values.length > 0 ? values.join(', ') : t(lang, 'value.none');
}

function renderImpactOutput(output: ImpactOutput, lang: CliLang): string {
	const sourceLabel = output.source === 'changed' ? t(lang, 'classify.source.changed') : t(lang, 'classify.source.paths');
	const lines = [
		t(lang, 'impact.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'classify.label.source')}: ${sourceLabel}`,
		`${t(lang, 'classify.label.files')}: ${output.files.length}`,
		`${t(lang, 'impact.label.versioning')}: ${output.versioning_enabled ? t(lang, 'versionSources.value.enabled') : t(lang, 'versionSources.value.disabled')}`,
		`${t(lang, 'impact.label.requiresVersionDecision')}: ${output.version_impact.requiresVersionDecision ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
		`${t(lang, 'impact.label.severity')}: ${output.version_impact.severity}`,
		`${t(lang, 'impact.label.suggestedBump')}: ${output.version_impact.suggestedBump ?? t(lang, 'value.none')}`,
		`${t(lang, 'impact.label.reasons')}: ${renderList(output.version_impact.reasons, lang)}`,
		`${t(lang, 'impact.label.versionSources')}: ${renderList(output.version_sources.map((source) => source.path), lang)}`,
		`${t(lang, 'impact.label.affectedVersionSources')}: ${renderList(output.version_impact.affectedVersionSources, lang)}`,
		`${t(lang, 'impact.label.affectedSurfaces')}: ${renderList(output.version_impact.affectedSurfaces, lang)}`,
	];

	return lines.join('\n');
}

export function runImpact(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getImpactHelp(lang));
		return 0;
	}

	const parsed = parseImpactArgs(args);

	if (parsed.error) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unknownOption', { option: parsed.error }),
			'mf impact --help',
			getImpactHelp(lang),
			lang,
		);
		return 1;
	}

	if (parsed.changed && parsed.paths.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: parsed.paths[0] }),
			'mf impact --help',
			getImpactHelp(lang),
			lang,
		);
		return 1;
	}

	if (!parsed.changed && parsed.paths.length === 0) {
		printUsageError(reporter, t(lang, 'impact.error.missingInput'), 'mf impact --help', getImpactHelp(lang), lang);
		return 1;
	}

	const output = createImpactOutput(resolveMustflowRoot(), parsed);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
		return 0;
	}

	reporter.stdout(renderImpactOutput(output, lang));
	return 0;
}
