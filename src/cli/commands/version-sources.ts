import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { isRecord, type TomlTable } from '../lib/command-contract.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { readMustflowTomlFile } from '../lib/toml.js';
import {
	detectVersionSources,
	releaseVersioningIsEnabled,
	type VersionSource,
} from '../../core/version-sources.js';

const VERSION_SOURCES_SCHEMA_VERSION = '1';

interface VersionSourcesOutput {
	readonly schema_version: string;
	readonly command: 'version-sources';
	readonly mustflow_root: string;
	readonly versioning_enabled: boolean;
	readonly sources: readonly VersionSource[];
}

export function getVersionSourcesHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf version-sources [options]',
			summary: t(lang, 'versionSources.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf version-sources', 'mf version-sources --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'versionSources.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function readPreferences(projectRoot: string): TomlTable | undefined {
	try {
		const preferences = readMustflowTomlFile(projectRoot, '.mustflow/config/preferences.toml');
		return isRecord(preferences) ? preferences : undefined;
	} catch {
		return undefined;
	}
}

function getVersionSourcesOutput(projectRoot: string): VersionSourcesOutput {
	const preferences = readPreferences(projectRoot);

	return {
		schema_version: VERSION_SOURCES_SCHEMA_VERSION,
		command: 'version-sources',
		mustflow_root: projectRoot,
		versioning_enabled: releaseVersioningIsEnabled(preferences),
		sources: detectVersionSources(projectRoot),
	};
}

function renderVersionSources(output: VersionSourcesOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'versionSources.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'versionSources.label.versioning')}: ${output.versioning_enabled ? t(lang, 'versionSources.value.enabled') : t(lang, 'versionSources.value.disabled')}`,
		'',
		t(lang, 'versionSources.label.sources'),
	];

	if (output.sources.length === 0) {
		lines.push(`- ${t(lang, 'versionSources.noSources')}`);
		return lines.join('\n');
	}

	for (const source of output.sources) {
		const metadata = [source.kind, source.declared ? 'declared' : undefined, source.authority].filter(Boolean).join(', ');
		lines.push(`- ${source.path} (${metadata})`);
	}

	return lines.join('\n');
}

export function runVersionSources(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getVersionSourcesHelp(lang));
		return 0;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unknownOption', { option: unsupported[0] }),
			'mf version-sources --help',
			getVersionSourcesHelp(lang),
			lang,
		);
		return 1;
	}

	const output = getVersionSourcesOutput(resolveMustflowRoot());

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(output, null, 2));
		return 0;
	}

	reporter.stdout(renderVersionSources(output, lang));
	return 0;
}
