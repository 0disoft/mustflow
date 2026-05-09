import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { stdin as processStdin, stdout as processStdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { ensureInside } from '../lib/filesystem.js';
import { localeMessage, t, type CliLang } from '../lib/i18n.js';
import { isLocaleTag } from '../lib/locale-tags.js';
import { MANIFEST_LOCK_RELATIVE_PATH, sha256File } from '../lib/manifest-lock.js';
import { isCommitMessageStyle, isTestAuthoringPolicy } from '../lib/preferences-options.js';
import type { Reporter } from '../lib/reporter.js';
import { getDefaultTemplate, getTemplateFiles, type TemplateFileSource } from '../lib/templates.js';

type PlannedStatus = 'create' | 'unchanged' | 'conflict' | 'merge' | 'overwrite';

interface PlannedFile {
	readonly relativePath: string;
	readonly sourcePath: string;
	readonly sourceKind: TemplateFileSource['sourceKind'];
	readonly targetPath: string;
	readonly status: PlannedStatus;
	readonly lock: boolean;
}

interface InitOptions {
	readonly yes: boolean;
	readonly dryRun: boolean;
	readonly merge: boolean;
	readonly force: boolean;
	readonly interactive: boolean;
	readonly profile?: string;
	readonly locale?: string;
	readonly agentLang?: string;
	readonly productSourceLocale?: string;
	readonly productLocales: readonly string[];
	readonly preferenceOverrides: readonly PreferenceOverride[];
}

const MUSTFLOW_BLOCK_START = '<!-- mustflow:start schema=1 -->';
const MUSTFLOW_BLOCK_END = '<!-- mustflow:end -->';
const GITIGNORE_RELATIVE_PATH = '.gitignore';
const GITIGNORE_FRAGMENT_RELATIVE_PATH = 'gitignore.mustflow';
const LOCALE_LABELS: Record<string, string> = {
	en: 'English',
	ko: 'Korean',
	zh: 'Chinese',
	es: 'Spanish',
	fr: 'French',
	hi: 'Hindi',
};

interface PromptChoice {
	readonly value: string;
	readonly label: string;
}

interface PromptReader {
	question(prompt: string): Promise<string>;
	close(): void;
}

interface PreferenceOverride {
	readonly key: string;
	readonly section: string;
	readonly field: string;
	readonly renderedValue: string;
}

function getMustflowRouterBlock(locale: string): string {
	return localeMessage(locale, 'init.routerBlock');
}

export function getInitHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf init [options]',
			summary: t(lang, 'init.help.summary'),
			options: [
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
				{ label: '--yes', description: t(lang, 'init.help.option.yes') },
				{
					label: '--dry-run',
					description: t(lang, 'init.help.option.dryRun'),
				},
				{
					label: '--interactive',
					description: t(lang, 'init.help.option.interactive'),
				},
				{
					label: '--merge',
					description: t(lang, 'init.help.option.merge'),
				},
				{
					label: '--force',
					description: t(lang, 'init.help.option.force'),
				},
				{
					label: '--profile <name>',
					description: t(lang, 'init.help.option.profile'),
				},
				{
					label: '--locale <locale>',
					description: t(lang, 'init.help.option.locale'),
				},
				{
					label: '--agent-lang <locale>',
					description: t(lang, 'init.help.option.agentLang'),
				},
				{
					label: '--set <key=value>',
					description: t(lang, 'init.help.option.set'),
				},
				{
					label: '--product-source-locale <locale>',
					description: t(lang, 'init.help.option.productSourceLocale'),
				},
				{
					label: '--product-locale <locale>',
					description: t(lang, 'init.help.option.productLocale'),
				},
			],
			examples: [
				'mf init --dry-run',
				'mf init --interactive',
				'mf init --set git.auto_commit=true',
				'mf init --profile oss --locale ko',
				'mf init --profile product --product-source-locale en --product-locale ko-KR',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'init.help.exit.ok') },
				{
					label: '1',
					description: t(lang, 'init.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

function splitLongOption(arg: string): { name: string; value?: string } {
	const equalsIndex = arg.indexOf('=');

	if (equalsIndex === -1) {
		return { name: arg };
	}

	return {
		name: arg.slice(0, equalsIndex),
		value: arg.slice(equalsIndex + 1),
	};
}

function readRequiredOptionValue(
	args: string[],
	index: number,
	parsed: { name: string; value?: string },
	reporter: Reporter,
	lang: CliLang,
): string | undefined {
	if (parsed.value !== undefined) {
		if (parsed.value.trim().length === 0) {
			printUsageError(reporter, t(lang, 'cli.error.missingValue', { option: parsed.name }), 'mf init --help', getInitHelp(lang), lang);
			return undefined;
		}

		return parsed.value;
	}

	const next = args[index + 1];

	if (!next || next.startsWith('-')) {
		printUsageError(reporter, t(lang, 'cli.error.missingValue', { option: parsed.name }), 'mf init --help', getInitHelp(lang), lang);
		return undefined;
	}

	return next;
}

function parseBoolean(value: string): boolean | undefined {
	if (value === 'true') {
		return true;
	}

	if (value === 'false') {
		return false;
	}

	return undefined;
}

function parsePositiveInteger(value: string): number | undefined {
	const parsed = Number.parseInt(value, 10);

	if (String(parsed) !== value || parsed <= 0) {
		return undefined;
	}

	return parsed;
}

function isSupportedLanguagePreference(value: string): boolean {
	return ['agent_response', 'docs', 'preserve_existing'].includes(value) || isLocaleTag(value);
}

function isSupportedMemorySummaryPreference(value: string): boolean {
	return ['agent_response', 'docs', 'preserve_existing'].includes(value) || isLocaleTag(value);
}

const RELEASE_VERSIONING_PREFERENCE_FIELDS = new Set([
	'impact_check',
	'suggest_bump',
	'auto_bump',
	'require_user_confirmation',
	'sync_template_version',
	'sync_docs_examples',
	'sync_tests',
]);

const VERIFICATION_SELECTION_STRATEGIES = new Set(['risk_based', 'targeted', 'full']);
const VERIFICATION_SELECTION_BOOLEAN_FIELDS = new Set([
	'prefer_related_tests',
	'skip_docs_only_full_test',
	'skip_low_risk_code_full_test',
	'skip_translation_only_full_test',
	'skip_copy_only_full_test',
	'report_skipped',
]);
const TEST_AUTHORING_BOOLEAN_FIELDS = new Set(['prefer_existing_tests', 'require_new_test_rationale']);

function createPreferenceOverride(key: string, value: string, reporter: Reporter, lang: CliLang): PreferenceOverride | undefined {
	if (key === 'git.auto_stage' || key === 'git.auto_commit') {
		const parsed = parseBoolean(value);

		if (parsed === undefined) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git',
			field: key.slice('git.'.length),
			renderedValue: String(parsed),
		};
	}

	if (key === 'git.auto_push') {
		if (value !== 'false') {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git',
			field: 'auto_push',
			renderedValue: 'false',
		};
	}

	if (key === 'git.commit_message.language') {
		if (!isSupportedLanguagePreference(value)) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git.commit_message',
			field: 'language',
			renderedValue: tomlString(value),
		};
	}

	if (key === 'git.commit_message.style') {
		if (!isCommitMessageStyle(value)) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git.commit_message',
			field: 'style',
			renderedValue: tomlString(value),
		};
	}

	if (key === 'git.commit_message.max_suggestions') {
		const parsed = parsePositiveInteger(value);

		if (parsed === undefined || parsed > 5) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git.commit_message',
			field: 'max_suggestions',
			renderedValue: String(parsed),
		};
	}

	if (key === 'git.commit_message.include_body') {
		if (!['when_non_trivial', 'never', 'always'].includes(value)) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git.commit_message',
			field: 'include_body',
			renderedValue: tomlString(value),
		};
	}

	if (key === 'git.commit_message.split_when_multiple_concerns') {
		const parsed = parseBoolean(value);

		if (parsed === undefined) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'git.commit_message',
			field: 'split_when_multiple_concerns',
			renderedValue: String(parsed),
		};
	}

	if (key === 'reporting.commit_suggestion.enabled') {
		const parsed = parseBoolean(value);

		if (parsed === undefined) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'reporting.commit_suggestion',
			field: 'enabled',
			renderedValue: String(parsed),
		};
	}

	if (key.startsWith('release.versioning.')) {
		const field = key.slice('release.versioning.'.length);

		if (!RELEASE_VERSIONING_PREFERENCE_FIELDS.has(field)) {
			reporter.stderr(t(lang, 'init.error.unsupportedPreference', { key }));
			return undefined;
		}

		const parsed = parseBoolean(value);

		if (parsed === undefined) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'release.versioning',
			field,
			renderedValue: String(parsed),
		};
	}

	if (key === 'verification.selection.strategy') {
		if (!VERIFICATION_SELECTION_STRATEGIES.has(value)) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'verification.selection',
			field: 'strategy',
			renderedValue: tomlString(value),
		};
	}

	if (key.startsWith('verification.selection.')) {
		const field = key.slice('verification.selection.'.length);

		if (!VERIFICATION_SELECTION_BOOLEAN_FIELDS.has(field)) {
			reporter.stderr(t(lang, 'init.error.unsupportedPreference', { key }));
			return undefined;
		}

		const parsed = parseBoolean(value);

		if (parsed === undefined) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'verification.selection',
			field,
			renderedValue: String(parsed),
		};
	}

	if (key === 'testing.authoring.new_test_policy') {
		if (!isTestAuthoringPolicy(value)) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'testing.authoring',
			field: 'new_test_policy',
			renderedValue: tomlString(value),
		};
	}

	if (key.startsWith('testing.authoring.')) {
		const field = key.slice('testing.authoring.'.length);

		if (!TEST_AUTHORING_BOOLEAN_FIELDS.has(field)) {
			reporter.stderr(t(lang, 'init.error.unsupportedPreference', { key }));
			return undefined;
		}

		const parsed = parseBoolean(value);

		if (parsed === undefined) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'testing.authoring',
			field,
			renderedValue: String(parsed),
		};
	}

	if (key === 'language.memory.summary') {
		if (!isSupportedMemorySummaryPreference(value)) {
			reporter.stderr(t(lang, 'init.error.invalidPreferenceValue', { key, value }));
			return undefined;
		}

		return {
			key,
			section: 'language.memory',
			field: 'summary',
			renderedValue: tomlString(value),
		};
	}

	reporter.stderr(t(lang, 'init.error.unsupportedPreference', { key }));
	return undefined;
}

function parsePreferenceOverride(raw: string, reporter: Reporter, lang: CliLang): PreferenceOverride | undefined {
	const equalsIndex = raw.indexOf('=');

	if (equalsIndex <= 0 || equalsIndex === raw.length - 1) {
		reporter.stderr(t(lang, 'init.error.invalidPreference', { value: raw }));
		return undefined;
	}

	return createPreferenceOverride(raw.slice(0, equalsIndex), raw.slice(equalsIndex + 1), reporter, lang);
}

function parseOptions(args: string[], reporter: Reporter, lang: CliLang): InitOptions | undefined {
	let yes = false;
	let dryRun = false;
	let merge = false;
	let force = false;
	let interactive = false;
	let profile: string | undefined;
	let locale: string | undefined;
	let agentLang: string | undefined;
	let productSourceLocale: string | undefined;
	const productLocales: string[] = [];
	const preferenceOverrides: PreferenceOverride[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg) {
			continue;
		}

		const parsed = splitLongOption(arg);

		if (['--yes', '--dry-run', '--merge', '--force', '--interactive'].includes(parsed.name) && parsed.value !== undefined) {
			printUsageError(reporter, t(lang, 'cli.error.unexpectedValue', { option: parsed.name }), 'mf init --help', getInitHelp(lang), lang);
			return undefined;
		}

		if (parsed.name === '--yes') {
			yes = true;
			continue;
		}

		if (parsed.name === '--dry-run') {
			dryRun = true;
			continue;
		}

		if (parsed.name === '--merge') {
			merge = true;
			continue;
		}

		if (parsed.name === '--force') {
			force = true;
			continue;
		}

		if (parsed.name === '--interactive') {
			interactive = true;
			continue;
		}

		if (parsed.name === '--set') {
			const value = readRequiredOptionValue(args, index, parsed, reporter, lang);

			if (value === undefined) {
				return undefined;
			}

			if (parsed.value === undefined) {
				index += 1;
			}

			const override = parsePreferenceOverride(value, reporter, lang);

			if (!override) {
				return undefined;
			}

			preferenceOverrides.push(override);
			continue;
		}

		if (['--profile', '--locale', '--agent-lang', '--product-source-locale', '--product-locale'].includes(parsed.name)) {
			const value = readRequiredOptionValue(args, index, parsed, reporter, lang);

			if (value === undefined) {
				return undefined;
			}

			if (parsed.value === undefined) {
				index += 1;
			}

			if (parsed.name === '--profile') {
				profile = value;
			} else if (parsed.name === '--locale') {
				locale = value;
			} else if (parsed.name === '--agent-lang') {
				agentLang = value;
			} else if (parsed.name === '--product-source-locale') {
				productSourceLocale = value;
			} else {
				productLocales.push(value);
			}

			continue;
		}

		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: arg }), 'mf init --help', getInitHelp(lang), lang);
		return undefined;
	}

	if (merge && force) {
		printUsageError(reporter, t(lang, 'init.error.cannotCombineMergeForce'), 'mf init --help', getInitHelp(lang), lang);
		return undefined;
	}

	if (interactive && yes) {
		printUsageError(reporter, t(lang, 'init.error.cannotCombineInteractiveYes'), 'mf init --help', getInitHelp(lang), lang);
		return undefined;
	}

	return {
		yes,
		dryRun,
		merge,
		force,
		interactive,
		profile,
		locale,
		agentLang,
		productSourceLocale,
		productLocales,
		preferenceOverrides,
	};
}

function sameFileContent(sourcePath: string, targetPath: string): boolean {
	return readFileSync(sourcePath, 'utf8') === readFileSync(targetPath, 'utf8');
}

function formatLocaleChoice(locale: string): string {
	const label = LOCALE_LABELS[locale] ?? locale;

	return `${label} (${locale})`;
}

function createPromptReader(reporter: Reporter): PromptReader {
	if (!processStdin.isTTY) {
		const lines = readFileSync(0, 'utf8').split(/\r?\n/u);

		return {
			async question(prompt: string): Promise<string> {
				reporter.stdout(prompt.trimEnd());
				return lines.shift() ?? '';
			},
			close() {
				// No resources are held when stdin is pre-read from a pipe.
			},
		};
	}

	const readline = createInterface({
		input: processStdin,
		output: processStdout,
	});

	return {
		question(prompt: string): Promise<string> {
			return readline.question(prompt);
		},
		close() {
			readline.close();
		},
	};
}

function shouldPromptForInit(args: readonly string[], options: InitOptions): boolean {
	if (options.interactive) {
		return true;
	}

	if (options.yes || args.length > 0) {
		return false;
	}

	return Boolean(processStdin.isTTY && processStdout.isTTY);
}

async function promptChoice(
	reader: PromptReader,
	reporter: Reporter,
	lang: CliLang,
	question: string,
	choices: readonly PromptChoice[],
	defaultValue: string,
): Promise<string> {
	const defaultIndex = Math.max(
		0,
		choices.findIndex((choice) => choice.value === defaultValue),
	);

	reporter.stdout('');
	reporter.stdout(question);

	for (const [index, choice] of choices.entries()) {
		reporter.stdout(`  ${index + 1}. ${choice.label}`);
	}

	for (;;) {
		const answer = (await reader.question(t(lang, 'init.prompt.select', { defaultChoice: defaultIndex + 1 }))).trim();

		if (answer.length === 0) {
			return choices[defaultIndex]?.value ?? defaultValue;
		}

		const selectedIndex = Number.parseInt(answer, 10);

		if (String(selectedIndex) === answer && selectedIndex >= 1 && selectedIndex <= choices.length) {
			return choices[selectedIndex - 1]?.value ?? defaultValue;
		}

		reporter.stderr(t(lang, 'init.prompt.invalidChoice', { count: choices.length }));
	}
}

async function promptBoolean(
	reader: PromptReader,
	reporter: Reporter,
	lang: CliLang,
	question: string,
	defaultValue: boolean,
): Promise<boolean> {
	const defaultLabel = defaultValue ? 'Y/n' : 'y/N';

	for (;;) {
		const answer = (await reader.question(`${question} [${defaultLabel}]: `)).trim().toLowerCase();

		if (answer.length === 0) {
			return defaultValue;
		}

		if (answer === 'y' || answer === 'yes' || answer === 'true') {
			return true;
		}

		if (answer === 'n' || answer === 'no' || answer === 'false') {
			return false;
		}

		reporter.stderr(t(lang, 'init.prompt.invalidBoolean'));
	}
}

function hasPreferenceOverride(overrides: readonly PreferenceOverride[], key: string): boolean {
	return overrides.some((override) => override.key === key);
}

function addPromptedPreferenceOverride(
	overrides: PreferenceOverride[],
	key: string,
	value: string,
	reporter: Reporter,
	lang: CliLang,
): void {
	const override = createPreferenceOverride(key, value, reporter, lang);

	if (override) {
		overrides.push(override);
	}
}

async function promptInitOptions(
	template: ReturnType<typeof getDefaultTemplate>,
	options: InitOptions,
	reporter: Reporter,
	lang: CliLang,
): Promise<InitOptions> {
	const reader = createPromptReader(reporter);

	try {
		const preferenceOverrides = [...options.preferenceOverrides];
		const localeChoices = template.manifest.locales.map((locale) => ({
			value: locale,
			label: formatLocaleChoice(locale),
		}));
		const profileChoices = template.manifest.profiles.map((profile) => ({
			value: profile,
			label: profile,
		}));
		const locale = options.locale ?? (await promptChoice(
			reader,
			reporter,
			lang,
			t(lang, 'init.prompt.locale'),
			localeChoices,
			template.manifest.defaultLocale,
		));
		const profile = options.profile ?? (await promptChoice(
			reader,
			reporter,
			lang,
			t(lang, 'init.prompt.profile'),
			profileChoices,
			template.manifest.defaultProfile,
		));
		const agentLanguageChoices = [
			{ value: 'same-as-docs', label: t(lang, 'init.prompt.sameAsDocuments') },
			...localeChoices,
		];
		const selectedAgentLang = options.agentLang ?? (await promptChoice(
			reader,
			reporter,
			lang,
			t(lang, 'init.prompt.agentLang'),
			agentLanguageChoices,
			'same-as-docs',
		));
		const agentLang = selectedAgentLang === 'same-as-docs' ? locale : selectedAgentLang;
		const customizeAdvanced = await promptBoolean(reader, reporter, lang, t(lang, 'init.prompt.advanced'), false);

		if (customizeAdvanced) {
			if (!hasPreferenceOverride(preferenceOverrides, 'git.auto_stage')) {
				addPromptedPreferenceOverride(
					preferenceOverrides,
					'git.auto_stage',
					String(await promptBoolean(reader, reporter, lang, t(lang, 'init.prompt.autoStage'), false)),
					reporter,
					lang,
				);
			}

			if (!hasPreferenceOverride(preferenceOverrides, 'git.auto_commit')) {
				addPromptedPreferenceOverride(
					preferenceOverrides,
					'git.auto_commit',
					String(await promptBoolean(reader, reporter, lang, t(lang, 'init.prompt.autoCommit'), false)),
					reporter,
					lang,
				);
			}

			if (!hasPreferenceOverride(preferenceOverrides, 'git.commit_message.language')) {
				const commitLanguageChoices = [
					{ value: 'preserve_existing', label: t(lang, 'init.prompt.preserveExisting') },
					{ value: 'same-as-agent', label: t(lang, 'init.prompt.sameAsAgentReports') },
					...localeChoices,
				];
				const commitLanguage = await promptChoice(
					reader,
					reporter,
					lang,
					t(lang, 'init.prompt.commitMessageLanguage'),
					commitLanguageChoices,
					'preserve_existing',
				);

				addPromptedPreferenceOverride(
					preferenceOverrides,
					'git.commit_message.language',
					commitLanguage === 'same-as-agent' ? agentLang : commitLanguage,
					reporter,
					lang,
				);
			}

			if (!hasPreferenceOverride(preferenceOverrides, 'reporting.commit_suggestion.enabled')) {
				addPromptedPreferenceOverride(
					preferenceOverrides,
					'reporting.commit_suggestion.enabled',
					String(await promptBoolean(reader, reporter, lang, t(lang, 'init.prompt.commitSuggestions'), true)),
					reporter,
					lang,
				);
			}
		}

		return {
			...options,
			profile,
			locale,
			agentLang,
			preferenceOverrides,
		};
	} finally {
		reader.close();
	}
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function planStatus(relativePath: string, sourcePath: string, targetPath: string, options: InitOptions): PlannedStatus {
	if (!existsSync(targetPath)) {
		return 'create';
	}

	if (sameFileContent(sourcePath, targetPath)) {
		return 'unchanged';
	}

	if (options.force) {
		return 'overwrite';
	}

	if (options.merge && relativePath === 'AGENTS.md') {
		return 'merge';
	}

	return 'conflict';
}

function gitignoreFragmentPath(template: ReturnType<typeof getDefaultTemplate>): string {
	return path.join(template.templateRoot, template.manifest.commonRoot, GITIGNORE_FRAGMENT_RELATIVE_PATH);
}

function mergeGitignoreContent(existingContent: string, fragmentContent: string): string {
	const normalizedFragment = fragmentContent.trim();
	const blockPattern = new RegExp(`${escapeRegExp('# mustflow:start schema=1')}[\\s\\S]*?${escapeRegExp('# mustflow:end')}`, 'u');

	if (blockPattern.test(existingContent)) {
		return `${existingContent.replace(blockPattern, normalizedFragment).trimEnd()}\n`;
	}

	if (existingContent.trim().length === 0) {
		return `${normalizedFragment}\n`;
	}

	return `${existingContent.trimEnd()}\n\n${normalizedFragment}\n`;
}

function planGitignoreStatus(sourcePath: string, targetPath: string): PlannedStatus {
	if (!existsSync(targetPath)) {
		return 'create';
	}

	const mergedContent = mergeGitignoreContent(readFileSync(targetPath, 'utf8'), readFileSync(sourcePath, 'utf8'));

	return mergedContent === readFileSync(targetPath, 'utf8') ? 'unchanged' : 'merge';
}

function renderPlanVerb(status: PlannedStatus): string {
	if (status === 'create') {
		return 'create';
	}

	if (status === 'unchanged') {
		return 'leave unchanged';
	}

	if (status === 'merge') {
		return 'merge';
	}

	if (status === 'overwrite') {
		return 'overwrite';
	}

	return 'conflict';
}

function printDryRunPlan(plannedFiles: readonly PlannedFile[], reporter: Reporter, lang: CliLang): void {
	for (const file of plannedFiles) {
		reporter.stdout(t(lang, 'init.plan.would', { action: renderPlanVerb(file.status), path: file.relativePath }));
	}

	reporter.stdout(t(lang, 'init.plan.noFilesWritten'));
}

function printConflictReport(conflicts: readonly PlannedFile[], reporter: Reporter, lang: CliLang): void {
	for (const conflict of conflicts) {
		reporter.stderr(t(lang, 'init.conflict', { path: conflict.relativePath }));
	}

	reporter.stderr(t(lang, 'init.plan.noFilesWritten'));
	reporter.stderr(t(lang, 'init.conflictGuidance'));
}

function mergeAgentsContent(existingContent: string, locale: string): string {
	const routerBlock = getMustflowRouterBlock(locale);
	const blockPattern = new RegExp(
		`${escapeRegExp(MUSTFLOW_BLOCK_START)}[\\s\\S]*?${escapeRegExp(MUSTFLOW_BLOCK_END)}`,
	);

	if (blockPattern.test(existingContent)) {
		return existingContent.replace(blockPattern, routerBlock);
	}

	return `${routerBlock}\n\n${existingContent}`;
}

function buildPlannedFiles(
	template: ReturnType<typeof getDefaultTemplate>,
	selectedLocale: string,
	targetRoot: string,
	options: InitOptions,
): PlannedFile[] {
	const plannedFiles = getTemplateFiles(template, selectedLocale).map((source): PlannedFile => {
		const targetPath = path.join(targetRoot, source.relativePath);

		ensureInside(template.templateRoot, source.sourcePath);
		ensureInside(targetRoot, targetPath);

		return {
			relativePath: source.relativePath,
			sourcePath: source.sourcePath,
			sourceKind: source.sourceKind,
			targetPath,
			status: planStatus(source.relativePath, source.sourcePath, targetPath, options),
			lock: true,
		};
	});
	const sourcePath = gitignoreFragmentPath(template);
	const targetPath = path.join(targetRoot, GITIGNORE_RELATIVE_PATH);

	ensureInside(template.templateRoot, sourcePath);
	ensureInside(targetRoot, targetPath);

	plannedFiles.push({
		relativePath: GITIGNORE_RELATIVE_PATH,
		sourcePath,
		sourceKind: 'common',
		targetPath,
		status: planGitignoreStatus(sourcePath, targetPath),
		lock: false,
	});

	return plannedFiles;
}

function backupConflictingFiles(projectRoot: string, conflicts: readonly PlannedFile[]): string | undefined {
	if (conflicts.length === 0) {
		return undefined;
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupRoot = path.join(projectRoot, '.mustflow', 'backups', timestamp);

	for (const conflict of conflicts) {
		const backupPath = path.join(backupRoot, conflict.relativePath);
		ensureInside(backupRoot, backupPath);
		mkdirSync(path.dirname(backupPath), { recursive: true });
		copyFileSync(conflict.targetPath, backupPath);
	}

	return backupRoot;
}

function tomlString(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function tomlArray(values: readonly string[]): string {
	return `[${values.map(tomlString).join(', ')}]`;
}

function validateInitSelection(
	template: ReturnType<typeof getDefaultTemplate>,
	options: InitOptions,
	reporter: Reporter,
	lang: CliLang,
): boolean {
	if (options.profile && !template.manifest.profiles.includes(options.profile)) {
		reporter.stderr(t(lang, 'init.error.unsupportedProfile', { profile: options.profile }));
		reporter.stderr(t(lang, 'init.error.supportedProfiles', { profiles: template.manifest.profiles.join(', ') }));
		return false;
	}

	if (options.locale && !template.manifest.locales.includes(options.locale)) {
		reporter.stderr(t(lang, 'init.error.unsupportedLocale', { locale: options.locale }));
		reporter.stderr(t(lang, 'init.error.supportedLocales', { locales: template.manifest.locales.join(', ') }));
		return false;
	}

	for (const [label, value] of [
		['--agent-lang', options.agentLang],
		['--product-source-locale', options.productSourceLocale],
	] as const) {
		if (value && !isLocaleTag(value)) {
			reporter.stderr(t(lang, 'init.error.invalidLocaleTag', { label, value }));
			return false;
		}
	}

	for (const productLocale of options.productLocales) {
		if (!isLocaleTag(productLocale)) {
			reporter.stderr(t(lang, 'init.error.invalidLocaleTag', { label: '--product-locale', value: productLocale }));
			return false;
		}
	}

	return true;
}

function replaceLine(content: string, pattern: RegExp, replacement: string): string {
	return pattern.test(content) ? content.replace(pattern, replacement) : `${content.trimEnd()}\n${replacement}\n`;
}

function replaceTomlSetting(content: string, section: string, field: string, renderedValue: string): string {
	const sectionPattern = new RegExp(`(^\\[${escapeRegExp(section)}\\]\\n)([\\s\\S]*?)(?=^\\[[^\\]]+\\]\\n|\\s*$)`, 'mu');
	const replacement = `${field} = ${renderedValue}`;

	if (!sectionPattern.test(content)) {
		return `${content.trimEnd()}\n\n[${section}]\n${replacement}\n`;
	}

	return content.replace(sectionPattern, (_match, header: string, body: string) => {
		const fieldPattern = new RegExp(`^${escapeRegExp(field)}\\s*=.*$`, 'mu');
		const nextBody = fieldPattern.test(body)
			? body.replace(fieldPattern, replacement)
			: `${body.trimEnd()}\n${replacement}\n`;

		return `${header}${nextBody}`;
	});
}

function removeProductI18nBlock(content: string): string {
	return content.replace(/\n\[product_i18n\]\n[\s\S]*?(?=\n\[[^\]]+\]\n|$)/u, '').trimEnd();
}

function renderProductI18nBlock(sourceLocale: string, targetLocales: readonly string[]): string {
	return [
		'',
		'[product_i18n]',
		'enabled = true',
		`source_locale = ${tomlString(sourceLocale)}`,
		`target_locales = ${tomlArray(targetLocales)}`,
		`fallback_locale = ${tomlString(sourceLocale)}`,
		'locale_tag_format = "bcp47"',
		'user_facing_text_policy = "externalize"',
		'hardcoded_user_facing_strings = "avoid"',
		'translation_policy = "update_source_mark_targets_stale"',
		'do_not_translate = ["identifiers", "log_keys", "error_codes", "metric_names", "api_field_names"]',
	].join('\n');
}

function applyInitPreferences(
	preferencesPath: string,
	template: ReturnType<typeof getDefaultTemplate>,
	options: InitOptions,
): boolean {
	if (!existsSync(preferencesPath)) {
		return false;
	}

	const original = readFileSync(preferencesPath, 'utf8');
	let next = original;

	if (options.profile) {
		next = replaceLine(next, /^profile = ".*"$/mu, `profile = ${tomlString(options.profile)}`);
	}

	if (options.locale) {
		next = replaceLine(next, /^docs = ".*"$/mu, `docs = ${tomlString(options.locale)}`);
	}

	if (options.agentLang) {
		next = replaceLine(next, /^agent_response = ".*"$/mu, `agent_response = ${tomlString(options.agentLang)}`);
	}

	if (options.productSourceLocale || options.productLocales.length > 0) {
		const sourceLocale = options.productSourceLocale ?? options.locale ?? template.manifest.defaultLocale;
		const targetLocales = options.productLocales.length > 0 ? options.productLocales : [sourceLocale];

		next = `${removeProductI18nBlock(next)}\n${renderProductI18nBlock(sourceLocale, targetLocales)}\n`;
	}

	for (const override of options.preferenceOverrides) {
		next = replaceTomlSetting(next, override.section, override.field, override.renderedValue);
	}

	if (next === original) {
		return false;
	}

	writeFileSync(preferencesPath, next);
	return true;
}

function printInitSelection(
	template: ReturnType<typeof getDefaultTemplate>,
	options: InitOptions,
	reporter: Reporter,
	lang: CliLang,
): void {
	reporter.stdout(t(lang, 'init.selection.profile', { profile: options.profile ?? template.manifest.defaultProfile }));
	reporter.stdout(t(lang, 'init.selection.locale', { locale: options.locale ?? template.manifest.defaultLocale }));

	if (options.agentLang) {
		reporter.stdout(t(lang, 'init.selection.agentLang', { locale: options.agentLang }));
	}

	if (options.productSourceLocale || options.productLocales.length > 0) {
		reporter.stdout(t(lang, 'init.selection.productSourceLocale', { locale: options.productSourceLocale ?? options.locale ?? template.manifest.defaultLocale }));
		reporter.stdout(
			t(lang, 'init.selection.productLocales', {
				locales: options.productLocales.length > 0 ? options.productLocales.join(', ') : t(lang, 'init.selection.sourceLocaleOnly'),
			}),
		);
	}
}

function lockAction(status: PlannedStatus): string {
	if (status === 'create') {
		return 'created';
	}

	if (status === 'merge') {
		return 'merged';
	}

	if (status === 'overwrite') {
		return 'overwritten';
	}

	return 'unchanged';
}

function lockSource(file: PlannedFile): string {
	if (file.relativePath === 'AGENTS.md' && file.status === 'merge') {
		return 'managed_block';
	}

	return file.sourceKind === 'locale' ? 'template_locale' : 'template_common';
}

function renderManifestLock(
	template: ReturnType<typeof getDefaultTemplate>,
	plannedFiles: readonly PlannedFile[],
	options: InitOptions,
	customizedFiles: ReadonlySet<string>,
): string {
	const lines = [
		'schema_version = "1"',
		'generated_by = "mustflow"',
		'',
		'[template]',
		`id = ${tomlString(template.manifest.id)}`,
		`version = ${tomlString(template.manifest.version)}`,
		`profile = ${tomlString(options.profile ?? template.manifest.defaultProfile)}`,
		`locale = ${tomlString(options.locale ?? template.manifest.defaultLocale)}`,
	];

	if (options.agentLang) {
		lines.push(`agent_lang = ${tomlString(options.agentLang)}`);
	}

	if (options.productSourceLocale || options.productLocales.length > 0) {
		lines.push('', '[product_i18n]');
		lines.push(`source_locale = ${tomlString(options.productSourceLocale ?? options.locale ?? template.manifest.defaultLocale)}`);
		lines.push(
			`target_locales = ${tomlArray(
				options.productLocales.length > 0
					? options.productLocales
					: [options.productSourceLocale ?? options.locale ?? template.manifest.defaultLocale],
			)}`,
		);
	}

	for (const file of plannedFiles.filter((plannedFile) => plannedFile.lock)) {
		lines.push(
			'',
			`[files.${tomlString(file.relativePath)}]`,
			`source = ${tomlString(lockSource(file))}`,
			`last_action = ${tomlString(customizedFiles.has(file.relativePath) ? 'customized' : lockAction(file.status))}`,
			`content_hash = ${tomlString(sha256File(file.targetPath))}`,
		);
	}

	return `${lines.join('\n')}\n`;
}

function writeManifestLock(
	projectRoot: string,
	template: ReturnType<typeof getDefaultTemplate>,
	plannedFiles: readonly PlannedFile[],
	options: InitOptions,
	customizedFiles: ReadonlySet<string>,
): void {
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	ensureInside(projectRoot, lockPath);
	mkdirSync(path.dirname(lockPath), { recursive: true });
	writeFileSync(lockPath, renderManifestLock(template, plannedFiles, options, customizedFiles));
}

export async function runInit(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getInitHelp(lang));
		return 0;
	}

	const parsedOptions = parseOptions(args, reporter, lang);

	if (!parsedOptions) {
		return 1;
	}

	const targetRoot = process.cwd();
	let template: ReturnType<typeof getDefaultTemplate>;

	try {
		template = getDefaultTemplate();
	} catch (error) {
		reporter.stderr(error instanceof Error ? error.message : String(error));
		return 1;
	}

	const options = shouldPromptForInit(args, parsedOptions) ? await promptInitOptions(template, parsedOptions, reporter, lang) : parsedOptions;
	const selectedLocale = options.locale ?? template.manifest.defaultLocale;

	if (!validateInitSelection(template, options, reporter, lang)) {
		return 1;
	}

	let created = 0;
	let unchanged = 0;
	let merged = 0;
	let overwritten = 0;
	const plannedFiles = buildPlannedFiles(template, selectedLocale, targetRoot, options);
	const conflicts = plannedFiles.filter((file) => file.status === 'conflict');
	const forceConflicts = plannedFiles.filter((file) => file.status === 'overwrite');

	if (options.dryRun) {
		printInitSelection(template, options, reporter, lang);
		printDryRunPlan(plannedFiles, reporter, lang);
		return 0;
	}

	if (conflicts.length > 0) {
		printConflictReport(conflicts, reporter, lang);
		return 1;
	}

	const backupRoot = options.force ? backupConflictingFiles(targetRoot, forceConflicts) : undefined;

	if (backupRoot) {
		reporter.stdout(
			t(lang, 'init.backup.conflicts', {
				count: forceConflicts.length,
				fileWord: t(lang, forceConflicts.length === 1 ? 'init.fileWord.singular' : 'init.fileWord.plural'),
				path: backupRoot,
			}),
		);
	}

	for (const file of plannedFiles) {
		if (file.status === 'create') {
			mkdirSync(path.dirname(file.targetPath), { recursive: true });
			copyFileSync(file.sourcePath, file.targetPath);
			created += 1;
			reporter.stdout(t(lang, 'init.action.created', { path: file.relativePath }));
			continue;
		}

		if (file.status === 'unchanged') {
			unchanged += 1;
			reporter.stdout(t(lang, 'init.action.unchanged', { path: file.relativePath }));
			continue;
		}

		if (file.status === 'merge') {
			const mergedContent =
				file.relativePath === GITIGNORE_RELATIVE_PATH
					? mergeGitignoreContent(readFileSync(file.targetPath, 'utf8'), readFileSync(file.sourcePath, 'utf8'))
					: mergeAgentsContent(readFileSync(file.targetPath, 'utf8'), selectedLocale);

			writeFileSync(file.targetPath, mergedContent);
			merged += 1;
			reporter.stdout(t(lang, 'init.action.merged', { path: file.relativePath }));
			continue;
		}

		if (file.status === 'overwrite') {
			mkdirSync(path.dirname(file.targetPath), { recursive: true });
			copyFileSync(file.sourcePath, file.targetPath);
			overwritten += 1;
			reporter.stdout(t(lang, 'init.action.overwrote', { path: file.relativePath }));
		}
	}

	const customizedFiles = new Set<string>();
	const preferencesPath = path.join(targetRoot, '.mustflow', 'config', 'preferences.toml');
	if (applyInitPreferences(preferencesPath, template, options)) {
		customizedFiles.add('.mustflow/config/preferences.toml');
		reporter.stdout(t(lang, 'init.action.customizedPreferences'));
	}

	writeManifestLock(targetRoot, template, plannedFiles, options, customizedFiles);
	reporter.stdout(t(lang, 'init.action.wrote', { path: MANIFEST_LOCK_RELATIVE_PATH }));

	reporter.stdout(
		t(lang, 'init.complete', { created, merged, overwritten, unchanged }),
	);
	return 0;
}
