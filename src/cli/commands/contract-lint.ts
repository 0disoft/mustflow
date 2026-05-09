import { lintCommandContract, type ContractLintReport } from '../../core/contract-lint.js';
import { readCommandContract } from '../../core/config-loading.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const CONTRACT_LINT_SCHEMA_VERSION = '1';

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
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf contract-lint', 'mf contract-lint --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'contractLint.help.exit.ok') },
				{ label: '1', description: t(lang, 'contractLint.help.exit.fail') },
			],
		},
		lang,
	);
}

function createContractLintOutput(projectRoot: string): ContractLintOutput {
	return {
		schema_version: CONTRACT_LINT_SCHEMA_VERSION,
		command: 'contract-lint',
		mustflow_root: projectRoot,
		report: lintCommandContract(readCommandContract(projectRoot)),
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
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getContractLintHelp(lang));
		return 0;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unknownOption', { option: unsupported[0] }),
			'mf contract-lint --help',
			getContractLintHelp(lang),
			lang,
		);
		return 1;
	}

	const output = createContractLintOutput(resolveMustflowRoot());

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderContractLintOutput(output, lang));
	}

	return output.report.summary.errors === 0 ? 0 : 1;
}
