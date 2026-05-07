import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { ensureInside } from '../lib/filesystem.js';
import { localeMessage, t, type CliLang } from '../lib/i18n.js';
import { MANIFEST_LOCK_RELATIVE_PATH, sha256File } from '../lib/manifest-lock.js';
import type { Reporter } from '../lib/reporter.js';
import { getDefaultTemplate, getTemplateFiles, type TemplateFileSource } from '../lib/templates.js';

type PlannedStatus = 'create' | 'unchanged' | 'conflict' | 'merge' | 'overwrite';

interface PlannedFile {
	readonly relativePath: string;
	readonly sourcePath: string;
	readonly sourceKind: TemplateFileSource['sourceKind'];
	readonly targetPath: string;
	readonly status: PlannedStatus;
}

interface InitOptions {
	readonly dryRun: boolean;
	readonly merge: boolean;
	readonly force: boolean;
	readonly profile?: string;
	readonly locale?: string;
	readonly agentLang?: string;
	readonly productSourceLocale?: string;
	readonly productLocales: readonly string[];
}

const MUSTFLOW_BLOCK_START = '<!-- mustflow:start schema=1 -->';
const MUSTFLOW_BLOCK_END = '<!-- mustflow:end -->';
const LOCALE_TAG_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/u;

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

function isLocaleTag(value: string): boolean {
	return LOCALE_TAG_PATTERN.test(value);
}

function parseOptions(args: string[], reporter: Reporter, lang: CliLang): InitOptions | undefined {
	let dryRun = false;
	let merge = false;
	let force = false;
	let profile: string | undefined;
	let locale: string | undefined;
	let agentLang: string | undefined;
	let productSourceLocale: string | undefined;
	const productLocales: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg) {
			continue;
		}

		const parsed = splitLongOption(arg);

		if (['--yes', '--dry-run', '--merge', '--force'].includes(parsed.name) && parsed.value !== undefined) {
			printUsageError(reporter, t(lang, 'cli.error.unexpectedValue', { option: parsed.name }), 'mf init --help', getInitHelp(lang), lang);
			return undefined;
		}

		if (parsed.name === '--yes') {
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

	return {
		dryRun,
		merge,
		force,
		profile,
		locale,
		agentLang,
		productSourceLocale,
		productLocales,
	};
}

function sameFileContent(sourcePath: string, targetPath: string): boolean {
	return readFileSync(sourcePath, 'utf8') === readFileSync(targetPath, 'utf8');
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
		`${MUSTFLOW_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MUSTFLOW_BLOCK_END.replace(
			/[.*+?^${}()|[\]\\]/g,
			'\\$&',
		)}`,
	);

	if (blockPattern.test(existingContent)) {
		return existingContent.replace(blockPattern, routerBlock);
	}

	return `${routerBlock}\n\n${existingContent}`;
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

	for (const file of plannedFiles) {
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

export function runInit(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getInitHelp(lang));
		return 0;
	}

	const options = parseOptions(args, reporter, lang);

	if (!options) {
		return 1;
	}

	const targetRoot = process.cwd();
	const template = getDefaultTemplate();
	const selectedLocale = options.locale ?? template.manifest.defaultLocale;

	if (!validateInitSelection(template, options, reporter, lang)) {
		return 1;
	}

	let created = 0;
	let unchanged = 0;
	let merged = 0;
	let overwritten = 0;
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
		};
	});
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
			writeFileSync(file.targetPath, mergeAgentsContent(readFileSync(file.targetPath, 'utf8'), selectedLocale));
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
