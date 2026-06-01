import { existsSync } from 'node:fs';
import path from 'node:path';

import { lintCommandContract, type ContractLintReport } from '../../core/contract-lint.js';
import { readCommandContract, isRecord, type TomlTable } from '../../core/config-loading.js';
import { releaseVersioningIsEnabled } from '../../core/version-sources.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { readMustflowTomlFile } from '../lib/toml.js';

const CONTRACT_LINT_SCHEMA_VERSION = '1';
const CONTRACT_LINT_OPTIONS = [
	{ name: '--coverage', kind: 'boolean' },
	{ name: '--suggest', kind: 'boolean' },
	{ name: '--json', kind: 'boolean' },
] as const;

interface ContractLintOutput {
	readonly schema_version: string;
	readonly command: 'contract-lint';
	readonly mustflow_root: string;
	readonly report: ContractLintReport;
}

export function getContractLintHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf contract-lint [options]',
			summary: t(lang, 'contractLint.help.summary'),
			options: [
				{ label: '--coverage', description: t(lang, 'contractLint.help.option.coverage') },
				{ label: '--suggest', description: t(lang, 'contractLint.help.option.suggest') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf contract-lint', 'mf contract-lint --coverage', 'mf contract-lint --suggest', 'mf contract-lint --coverage --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'contractLint.help.exit.ok') },
				{ label: '1', description: t(lang, 'contractLint.help.exit.fail') },
			],
		},
		lang,
	);
}

function readPreferences(projectRoot: string): TomlTable | undefined {
	const preferencesPath = path.join(projectRoot, '.mustflow', 'config', 'preferences.toml');

	if (!existsSync(preferencesPath)) {
		return undefined;
	}

	const preferences = readMustflowTomlFile(projectRoot, '.mustflow/config/preferences.toml');
	return isRecord(preferences) ? preferences : undefined;
}

function createContractLintOutput(projectRoot: string, coverage: boolean, suggest: boolean): ContractLintOutput {
	return {
		schema_version: CONTRACT_LINT_SCHEMA_VERSION,
		command: 'contract-lint',
		mustflow_root: projectRoot,
		report: lintCommandContract(readCommandContract(projectRoot), {
			coverage,
			suggest,
			projectRoot,
			releaseVersioningEnabled: releaseVersioningIsEnabled(readPreferences(projectRoot)),
		}),
	};
}

function renderContractLintOutput(output: ContractLintOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'contractLint.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'contractLint.label.status')}: ${output.report.status}`,
		`${t(lang, 'contractLint.label.totalIntents')}: ${output.report.summary.totalIntents}`,
		`${t(lang, 'contractLint.label.configured')}: ${output.report.summary.configured}`,
		`${t(lang, 'contractLint.label.runnable')}: ${output.report.summary.runnable}`,
		`${t(lang, 'contractLint.label.manualOnly')}: ${output.report.summary.manualOnly}`,
		`${t(lang, 'contractLint.label.unknown')}: ${output.report.summary.unknown}`,
		`${t(lang, 'contractLint.label.errors')}: ${output.report.summary.errors}`,
		`${t(lang, 'contractLint.label.warnings')}: ${output.report.summary.warnings}`,
		'',
		t(lang, 'contractLint.label.sourceFiles'),
		...output.report.sourceFiles.map((sourceFile) => `- ${sourceFile}`),
	];

	if (output.report.coverage) {
		lines.push(
			'',
			t(lang, 'contractLint.label.coverage'),
			`${t(lang, 'contractLint.label.classificationReasons')}: ${output.report.coverage.knownClassificationReasons.length}`,
			`${t(lang, 'contractLint.label.requiredAfterReasons')}: ${output.report.coverage.requiredAfterReasons.length}`,
			`${t(lang, 'contractLint.label.runnableReasons')}: ${output.report.coverage.runnableReasons.length}`,
			`${t(lang, 'contractLint.label.coverageFindings')}: ${output.report.coverage.findings.length}`,
		);
	}

	if (output.report.suggestions) {
		lines.push('', t(lang, 'contractLint.label.suggestions'));
		for (const suggestion of output.report.suggestions) {
			lines.push(`- ${suggestion.sourceFile}:${suggestion.sourceName} -> ${suggestion.suggestedIntent}`);
			lines.push(...suggestion.snippet.split('\n').map((line) => `  ${line}`));
		}
	}

	if (output.report.issues.length > 0) {
		lines.push('', t(lang, 'contractLint.label.issues'));
		for (const issue of output.report.issues) {
			const intent = issue.intent ? `${issue.intent}: ` : '';
			lines.push(`- [${issue.severity}] ${intent}${issue.message}`);
		}
	}

	return lines.join('\n');
}

export function runContractLint(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getContractLintHelp(lang));
		return 0;
	}

	const options = parseCliOptions(args, CONTRACT_LINT_OPTIONS);
	if (options.error) {
		printUsageError(
			reporter,
			formatCliOptionParseError(options.error, lang),
			'mf contract-lint --help',
			getContractLintHelp(lang),
			lang,
		);
		return 1;
	}

	const output = createContractLintOutput(
		resolveMustflowRoot(),
		hasParsedCliOption(options, '--coverage'),
		hasParsedCliOption(options, '--suggest'),
	);

	if (hasParsedCliOption(options, '--json')) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderContractLintOutput(output, lang));
	}

	return output.report.summary.errors === 0 ? 0 : 1;
}
