import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { Reporter } from '../lib/reporter.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	acquireActiveCommandLock,
	REPO_FLOW_WRITE_EFFECTS,
	reportActiveCommandLockConflict,
} from '../lib/active-command-lock.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { generateRepoFlow, getExpectedRepoFlowSourceFingerprint, writeRepoFlow } from '../lib/repo-flow.js';
import { parseSimpleFrontmatter } from '../lib/validation/frontmatter.js';

const FLOW_OPTIONS = [
	{ name: '--stdout', kind: 'boolean' },
	{ name: '--write', kind: 'boolean' },
	{ name: '--check', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

export function getFlowHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf flow [options]',
			summary: t(lang, 'flow.help.summary'),
			options: [
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
				{ label: '--stdout', description: t(lang, 'flow.help.option.stdout') },
				{ label: '--write', description: t(lang, 'flow.help.option.write') },
				{ label: '--check', description: t(lang, 'flow.help.option.check') },
			],
			examples: ['mf flow --stdout', 'mf flow --write', 'mf flow --check'],
			exitCodes: [
				{ label: '0', description: t(lang, 'flow.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function checkRepoFlow(projectRoot: string, reporter: Reporter, lang: CliLang): number {
	const repoFlowPath = path.join(projectRoot, 'REPO_FLOW.md');

	if (!existsSync(repoFlowPath)) {
		reporter.stderr(t(lang, 'flow.check.missing'));
		return 1;
	}

	const content = readFileSync(repoFlowPath, 'utf8');
	const frontmatter = parseSimpleFrontmatter(content);
	const expectedFingerprint = getExpectedRepoFlowSourceFingerprint(projectRoot);

	if (frontmatter.source_fingerprint !== expectedFingerprint) {
		reporter.stderr(t(lang, 'flow.check.stale'));
		return 1;
	}

	reporter.stdout(t(lang, 'flow.check.current'));
	return 0;
}

export function runFlow(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getFlowHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, FLOW_OPTIONS);

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf flow --help', getFlowHelp(lang), lang);
		return 1;
	}

	let shouldPrint = hasParsedCliOption(parsed, '--stdout');
	const shouldWrite = hasParsedCliOption(parsed, '--write');
	const shouldCheck = hasParsedCliOption(parsed, '--check');

	if (shouldCheck && (shouldPrint || shouldWrite)) {
		printUsageError(reporter, t(lang, 'flow.error.checkConflict'), 'mf flow --help', getFlowHelp(lang), lang);
		return 1;
	}

	if (!shouldPrint && !shouldWrite && !shouldCheck) {
		shouldPrint = true;
	}

	const projectRoot = resolveMustflowRoot();

	if (shouldCheck) {
		return checkRepoFlow(projectRoot, reporter, lang);
	}

	const activeLock = shouldWrite ? acquireActiveCommandLock(projectRoot, 'mf flow --write', REPO_FLOW_WRITE_EFFECTS) : null;

	if (activeLock && !activeLock.ok) {
		reportActiveCommandLockConflict(reporter, 'mf flow --write', activeLock.conflicts, 'mf flow --help', lang);
		return 1;
	}

	try {
		const content = generateRepoFlow(projectRoot);

		if (shouldWrite) {
			writeRepoFlow(projectRoot, content);
			reporter.stdout(t(lang, 'flow.wrote'));
		}

		if (shouldPrint) {
			reporter.stdout(content);
		}

		return 0;
	} finally {
		if (activeLock?.ok) {
			activeLock.handle.release();
		}
	}
}
