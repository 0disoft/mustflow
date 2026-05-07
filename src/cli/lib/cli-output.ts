import type { Reporter } from './reporter.js';
import { t, type CliLang } from './i18n.js';

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

function pushExamples(lines: string[], title: string, examples: readonly string[] | undefined): void {
	if (!examples || examples.length === 0) {
		return;
	}

	lines.push(`${title}:`, ...examples.map((example) => `  ${example}`), '');
}

export function renderHelp(spec: HelpSpec, lang: CliLang = 'en'): string {
	const lines = [`${t(lang, 'cli.heading.usage')}: ${spec.usage}`, ''];

	if (spec.summary) {
		lines.push(spec.summary, '');
	}

	pushEntrySection(lines, t(lang, 'cli.heading.commands'), spec.commands);
	pushEntrySection(lines, t(lang, 'cli.heading.topics'), spec.topics);
	pushEntrySection(lines, t(lang, 'cli.heading.options'), spec.options);
	pushExamples(lines, t(lang, 'cli.heading.examples'), spec.examples);
	pushEntrySection(lines, t(lang, 'cli.heading.exitCodes'), spec.exitCodes);

	return `${lines.join('\n').trimEnd()}\n`;
}

export function renderCliError(message: string, helpCommand: string, lang: CliLang = 'en'): string {
	return t(lang, 'cli.error.withUsage', { message, helpCommand });
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
