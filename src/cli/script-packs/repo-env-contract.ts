import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parsePositiveIntegerCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { ENV_CONTRACT_SCRIPT_REF, inspectEnvContract, type EnvContractReport } from '../../core/env-contract.js';

const ENV_CONTRACT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-keys', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedEnvContractOptions {
	readonly action: 'scan';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly maxKeys: number | null;
	readonly error?: string;
}

export function getRepoEnvContractHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/env-contract scan [path...] [options]',
			summary: t(lang, 'envContract.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'envContract.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'envContract.help.option.maxFileBytes') },
				{ label: '--max-keys <count>', description: t(lang, 'envContract.help.option.maxKeys') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/env-contract scan --json',
				'mf script-pack run repo/env-contract scan src .env.example --json',
				'mf script-pack run repo/env-contract scan .github/workflows README.md --max-keys 120 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'envContract.help.exit.ok') },
				{ label: '1', description: t(lang, 'envContract.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseEnvContractOptions(args: readonly string[], lang: CliLang): ParsedEnvContractOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, ENV_CONTRACT_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveIntegerCliOption(
		getParsedCliStringOption(parsed, '--max-files'),
		'--max-files',
		'envContract.error.invalidPositiveInteger',
		lang,
	);
	const maxFileBytes = parsePositiveIntegerCliOption(
		getParsedCliStringOption(parsed, '--max-file-bytes'),
		'--max-file-bytes',
		'envContract.error.invalidPositiveInteger',
		lang,
	);
	const maxKeys = parsePositiveIntegerCliOption(
		getParsedCliStringOption(parsed, '--max-keys'),
		'--max-keys',
		'envContract.error.invalidPositiveInteger',
		lang,
	);

	if (action !== 'scan') {
		return {
			action: 'scan',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxKeys: maxKeys.value,
			error: action ? t(lang, 'envContract.error.unknownAction', { action }) : t(lang, 'envContract.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxKeys: maxKeys.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxFiles, maxFileBytes, maxKeys]) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				maxKeys: maxKeys.value,
				error: candidate.error,
			};
		}
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
		maxKeys: maxKeys.value,
	};
}

function renderEnvContractSummary(report: EnvContractReport, lang: CliLang): string {
	const lines = [
		t(lang, 'envContract.title'),
		`${t(lang, 'scriptPack.label.script')}: ${ENV_CONTRACT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'envContract.label.files')}: ${report.summary.file_count}`,
		`${t(lang, 'envContract.label.keys')}: ${report.summary.key_count}`,
		`${t(lang, 'envContract.label.findings')}: ${report.findings.length}`,
		`${t(lang, 'envContract.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	for (const entry of report.keys.slice(0, 40)) {
		const flags = [
			entry.used_in_code ? 'code' : null,
			entry.declared_in_example ? 'example' : null,
			entry.documented ? 'docs' : null,
			entry.referenced_in_ci ? 'ci' : null,
			entry.secret_like ? 'secret-like' : null,
			entry.public_like ? 'public-like' : null,
		].filter((flag): flag is string => flag !== null);
		lines.push(`- ${entry.key}: ${flags.join(', ') || t(lang, 'value.none')} (${entry.source_count})`);
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'envContract.label.findings'));
		for (const finding of report.findings.slice(0, 40)) {
			const key = finding.key ? ` ${finding.key}` : '';
			lines.push(`- ${finding.path}:${key} ${finding.code} (${finding.message})`);
		}
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'envContract.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.keys.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'envContract.clean'));
	}
	return lines.join('\n');
}

export function runRepoEnvContractScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoEnvContractHelp(lang));
		return 0;
	}

	const options = parseEnvContractOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run repo/env-contract --help', getRepoEnvContractHelp(lang), lang);
		return 1;
	}

	const report = inspectEnvContract(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxKeys: options.maxKeys ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderEnvContractSummary(report, lang));
	return report.ok ? 0 : 1;
}
