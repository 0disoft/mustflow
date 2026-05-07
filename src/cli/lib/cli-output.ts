import type { Reporter } from './reporter.js';
import { HELP_HEADINGS, type CliLang } from './i18n.js';

export interface HelpEntry {
	readonly label: string;
	readonly description: string;
}

export interface HelpSpec {
	readonly usage: string;
	readonly summary?: string;
	readonly commands?: readonly HelpEntry[];
	readonly options?: readonly HelpEntry[];
	readonly topics?: readonly HelpEntry[];
	readonly examples?: readonly string[];
	readonly exitCodes?: readonly HelpEntry[];
}

function renderEntries(entries: readonly HelpEntry[]): string {
	const width = Math.max(...entries.map((entry) => entry.label.length));

	return entries.map((entry) => `  ${entry.label.padEnd(width)}  ${entry.description}`).join('\n');
}

function pushEntrySection(lines: string[], title: string, entries: readonly HelpEntry[] | undefined): void {
	if (!entries || entries.length === 0) {
		return;
	}

	lines.push(`${title}:`, renderEntries(entries), '');
}

function pushExamples(lines: string[], examples: readonly string[] | undefined): void {
	if (!examples || examples.length === 0) {
		return;
	}

	lines.push('Examples:', ...examples.map((example) => `  ${example}`), '');
}

export function renderHelp(spec: HelpSpec, lang: CliLang = 'en'): string {
	const headings = HELP_HEADINGS[lang];
	const lines = [`${headings.usage}: ${spec.usage}`, ''];

	if (spec.summary) {
		lines.push(spec.summary, '');
	}

	pushEntrySection(lines, headings.commands, spec.commands);
	pushEntrySection(lines, headings.topics, spec.topics);
	pushEntrySection(lines, headings.options, spec.options);
	pushExamples(lines, spec.examples);
	pushEntrySection(lines, headings.exitCodes, spec.exitCodes);

	return `${lines.join('\n').trimEnd()}\n`;
}

export function renderCliError(message: string, helpCommand: string, lang: CliLang = 'en'): string {
	if (lang === 'ko') {
		return `오류: ${message}\n사용법은 \`${helpCommand}\` 명령으로 확인하세요.`;
	}

	return `Error: ${message}\nRun \`${helpCommand}\` for usage.`;
}

export function printUsageError(
	reporter: Reporter,
	message: string,
	helpCommand: string,
	helpText: string,
	lang: CliLang = 'en',
): void {
	reporter.stderr(renderCliError(message, helpCommand, lang));
	reporter.stdout(helpText);
}
