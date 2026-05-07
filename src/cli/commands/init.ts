import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { ensureInside } from '../lib/filesystem.js';
import type { CliLang } from '../lib/i18n.js';
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
const MUSTFLOW_ROUTER_BLOCK_KO = `${MUSTFLOW_BLOCK_START}
이 저장소는 mustflow 에이전트 작업 흐름 구조를 따릅니다.

작업 전 다음 파일을 읽습니다.
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\`이 있으면 읽기
- \`.mustflow/skills/INDEX.md\`
${MUSTFLOW_BLOCK_END}`;
const MUSTFLOW_ROUTER_BLOCK_EN = `${MUSTFLOW_BLOCK_START}
This repository follows the mustflow agent workflow structure.

Read these files before working:
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\` if present
- \`.mustflow/skills/INDEX.md\`
${MUSTFLOW_BLOCK_END}`;

function getMustflowRouterBlock(locale: string): string {
	return locale === 'ko' ? MUSTFLOW_ROUTER_BLOCK_KO : MUSTFLOW_ROUTER_BLOCK_EN;
}

export function getInitHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf init [options]',
			summary:
				lang === 'ko'
					? '현재 저장소에 기본 mustflow 에이전트 작업 흐름을 복사합니다.'
					: 'Copy the default mustflow agent workflow into the current repository.',
			options: [
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
				{ label: '--yes', description: lang === 'ko' ? '안전한 기본값을 사용합니다' : 'Use safe defaults for prompts' },
				{
					label: '--dry-run',
					description: lang === 'ko' ? '파일을 쓰지 않고 설치 계획만 출력합니다' : 'Print the install plan without writing files',
				},
				{
					label: '--merge',
					description:
						lang === 'ko'
							? '기존 AGENTS.md에 mustflow 관리 블록만 병합합니다'
							: 'Merge a mustflow router block into an existing AGENTS.md',
				},
				{
					label: '--force',
					description:
						lang === 'ko' ? '충돌 파일을 백업한 뒤 덮어씁니다' : 'Back up conflicting files and overwrite them',
				},
				{
					label: '--profile <name>',
					description:
						lang === 'ko'
							? '프로젝트 성격을 설정합니다: minimal, oss, team, product, library'
							: 'Set project profile: minimal, oss, team, product, or library',
				},
				{
					label: '--locale <locale>',
					description: lang === 'ko' ? '설치할 mustflow 문서 언어를 설정합니다' : 'Set installed mustflow document locale',
				},
				{
					label: '--agent-lang <locale>',
					description: lang === 'ko' ? '에이전트 보고 언어를 설정합니다' : 'Set the preferred agent response language',
				},
				{
					label: '--product-source-locale <locale>',
					description:
						lang === 'ko' ? '제품 사용자 문구의 기준 언어를 설정합니다' : 'Set source locale for user-facing product text',
				},
				{
					label: '--product-locale <locale>',
					description:
						lang === 'ko' ? '제품 사용자 대상 로케일을 추가합니다. 반복할 수 있습니다' : 'Add a user-facing product locale; can be repeated',
				},
			],
			examples: [
				'mf init --dry-run',
				'mf init --profile oss --locale ko',
				'mf init --profile product --product-source-locale en --product-locale ko-KR',
			],
			exitCodes: [
				{ label: '0', description: lang === 'ko' ? '설치 완료, 변경 없음, 또는 계획 출력' : 'Install completed, no-op completed, or plan printed' },
				{
					label: '1',
					description:
						lang === 'ko' ? '잘못된 선택지 또는 파일 충돌로 쓰기를 중단했습니다' : 'Invalid options or file conflicts prevented writing',
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
			printUsageError(reporter, `Missing value for ${parsed.name}`, 'mf init --help', getInitHelp(lang), lang);
			return undefined;
		}

		return parsed.value;
	}

	const next = args[index + 1];

	if (!next || next.startsWith('-')) {
		printUsageError(reporter, `Missing value for ${parsed.name}`, 'mf init --help', getInitHelp(lang), lang);
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
			printUsageError(reporter, `Unexpected value for ${parsed.name}`, 'mf init --help', getInitHelp(lang), lang);
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

		printUsageError(reporter, `Unknown option: ${arg}`, 'mf init --help', getInitHelp(lang), lang);
		return undefined;
	}

	if (merge && force) {
		printUsageError(reporter, 'Cannot combine --merge and --force', 'mf init --help', getInitHelp(lang), lang);
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

function printDryRunPlan(plannedFiles: readonly PlannedFile[], reporter: Reporter): void {
	for (const file of plannedFiles) {
		reporter.stdout(`Would ${renderPlanVerb(file.status)} ${file.relativePath}`);
	}

	reporter.stdout('No files were written.');
}

function printConflictReport(conflicts: readonly PlannedFile[], reporter: Reporter): void {
	for (const conflict of conflicts) {
		reporter.stderr(`Conflict: ${conflict.relativePath} already exists and differs from the mustflow template.`);
	}

	reporter.stderr('No files were written.');
	reporter.stderr('Use --dry-run to preview, --merge to add a mustflow block to AGENTS.md, or --force to back up and overwrite.');
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
): boolean {
	if (options.profile && !template.manifest.profiles.includes(options.profile)) {
		reporter.stderr(`Unsupported profile: ${options.profile}`);
		reporter.stderr(`Supported profiles: ${template.manifest.profiles.join(', ')}`);
		return false;
	}

	if (options.locale && !template.manifest.locales.includes(options.locale)) {
		reporter.stderr(`Unsupported locale: ${options.locale}`);
		reporter.stderr(`Supported template locales for this package: ${template.manifest.locales.join(', ')}`);
		return false;
	}

	for (const [label, value] of [
		['--agent-lang', options.agentLang],
		['--product-source-locale', options.productSourceLocale],
	] as const) {
		if (value && !isLocaleTag(value)) {
			reporter.stderr(`Invalid locale tag for ${label}: ${value}`);
			return false;
		}
	}

	for (const productLocale of options.productLocales) {
		if (!isLocaleTag(productLocale)) {
			reporter.stderr(`Invalid locale tag for --product-locale: ${productLocale}`);
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

function printInitSelection(template: ReturnType<typeof getDefaultTemplate>, options: InitOptions, reporter: Reporter): void {
	reporter.stdout(`Template profile: ${options.profile ?? template.manifest.defaultProfile}`);
	reporter.stdout(`Template locale: ${options.locale ?? template.manifest.defaultLocale}`);

	if (options.agentLang) {
		reporter.stdout(`Agent response language: ${options.agentLang}`);
	}

	if (options.productSourceLocale || options.productLocales.length > 0) {
		reporter.stdout(`Product source locale: ${options.productSourceLocale ?? options.locale ?? template.manifest.defaultLocale}`);
		reporter.stdout(`Product locales: ${options.productLocales.length > 0 ? options.productLocales.join(', ') : '(source locale only)'}`);
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

	if (!validateInitSelection(template, options, reporter)) {
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
		printInitSelection(template, options, reporter);
		printDryRunPlan(plannedFiles, reporter);
		return 0;
	}

	if (conflicts.length > 0) {
		printConflictReport(conflicts, reporter);
		return 1;
	}

	const backupRoot = options.force ? backupConflictingFiles(targetRoot, forceConflicts) : undefined;

	if (backupRoot) {
		reporter.stdout(`Backed up ${forceConflicts.length} conflicting file${forceConflicts.length === 1 ? '' : 's'} to ${backupRoot}`);
	}

	for (const file of plannedFiles) {
		if (file.status === 'create') {
			mkdirSync(path.dirname(file.targetPath), { recursive: true });
			copyFileSync(file.sourcePath, file.targetPath);
			created += 1;
			reporter.stdout(`Created ${file.relativePath}`);
			continue;
		}

		if (file.status === 'unchanged') {
			unchanged += 1;
			reporter.stdout(`Unchanged ${file.relativePath}`);
			continue;
		}

		if (file.status === 'merge') {
			writeFileSync(file.targetPath, mergeAgentsContent(readFileSync(file.targetPath, 'utf8'), selectedLocale));
			merged += 1;
			reporter.stdout(`Merged ${file.relativePath}`);
			continue;
		}

		if (file.status === 'overwrite') {
			mkdirSync(path.dirname(file.targetPath), { recursive: true });
			copyFileSync(file.sourcePath, file.targetPath);
			overwritten += 1;
			reporter.stdout(`Overwrote ${file.relativePath}`);
		}
	}

	const customizedFiles = new Set<string>();
	const preferencesPath = path.join(targetRoot, '.mustflow', 'config', 'preferences.toml');
	if (applyInitPreferences(preferencesPath, template, options)) {
		customizedFiles.add('.mustflow/config/preferences.toml');
		reporter.stdout('Customized .mustflow/config/preferences.toml');
	}

	writeManifestLock(targetRoot, template, plannedFiles, options, customizedFiles);
	reporter.stdout(`Wrote ${MANIFEST_LOCK_RELATIVE_PATH}`);

	reporter.stdout(
		`mustflow init complete: ${created} created, ${merged} merged, ${overwritten} overwritten, ${unchanged} unchanged.`,
	);
	return 0;
}
