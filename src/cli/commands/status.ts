import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Reporter } from '../lib/reporter.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { inspectManifestLock } from '../lib/manifest-lock.js';
import { resolveMustflowRoot } from '../lib/project-root.js';


interface StatusSnapshot {
	readonly installed: boolean;
	readonly manifestLock: 'missing' | 'invalid' | 'present';
	readonly trackedFiles: number;
	readonly changedFiles: readonly string[];
	readonly missingFiles: readonly string[];
	readonly issues: readonly string[];
	readonly template: { readonly id: string; readonly version: string } | null;
}

export function getStatusHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf status [options]',
			summary: t(lang, 'status.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf status', 'mf status --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'status.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function hasInstalledEntrypoints(projectRoot: string): boolean {
	return existsSync(path.join(projectRoot, 'AGENTS.md')) && existsSync(path.join(projectRoot, '.mustflow'));
}

function getStatusSnapshot(projectRoot: string): StatusSnapshot {
	const inspection = inspectManifestLock(projectRoot);
	const lock = inspection.readResult.kind === 'present' ? inspection.readResult.lock : undefined;

	return {
		installed: hasInstalledEntrypoints(projectRoot),
		manifestLock: inspection.readResult.kind,
		trackedFiles: lock?.files.length ?? 0,
		changedFiles: inspection.changedFiles,
		missingFiles: inspection.missingFiles,
		issues: inspection.issues,
		template: lock ? { id: lock.templateId, version: lock.templateVersion } : null,
	};
}

export function runStatus(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getStatusHelp(lang));
		return 0;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf status --help', getStatusHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	const status = getStatusSnapshot(projectRoot);

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(status, null, 2));
		return 0;
	}

	reporter.stdout(t(lang, 'status.title'));
	reporter.stdout(`${t(lang, 'label.installed')}: ${status.installed ? t(lang, 'value.yes') : t(lang, 'value.no')}`);
	reporter.stdout(`${t(lang, 'label.manifestLock')}: ${status.manifestLock}`);
	reporter.stdout(`${t(lang, 'label.trackedFiles')}: ${status.trackedFiles}`);
	reporter.stdout(`${t(lang, 'label.changedFiles')}: ${status.changedFiles.length}`);
	reporter.stdout(`${t(lang, 'label.missingFiles')}: ${status.missingFiles.length}`);

	for (const issue of status.issues) {
		reporter.stdout(`- ${issue.replace(/^Lock hash mismatch: /, '').replace(/^Locked file missing: /, '')}`);
	}

	return 0;
}
