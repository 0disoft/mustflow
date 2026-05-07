import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from './command-contract.js';
import type { TemplatePaths } from './templates.js';
import { readTomlFile } from './toml.js';

const REQUIRED_STATUS_VALUES = ['current', 'stale', 'needs_review', 'missing'] as const;

function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

function isPositiveInteger(value: unknown): value is number {
	return Number.isInteger(value) && Number(value) > 0;
}

function isSafeRelativePath(value: unknown): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return false;
	}

	const normalized = value.replace(/\\/g, '/');
	const segments = normalized.split('/').filter(Boolean);

	if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) {
		return false;
	}

	return segments.length > 0 && segments.every((segment) => segment !== '.' && segment !== '..');
}

function readTable(table: TomlTable, key: string, label: string, issues: string[]): TomlTable | undefined {
	if (!hasOwn(table, key)) {
		issues.push(`${label} is required`);
		return undefined;
	}

	const value = table[key];

	if (!isRecord(value)) {
		issues.push(`${label} must be a TOML table`);
		return undefined;
	}

	return value;
}

function readOptionalTable(table: TomlTable, key: string, label: string, issues: string[]): TomlTable | undefined {
	if (!hasOwn(table, key)) {
		return undefined;
	}

	const value = table[key];

	if (!isRecord(value)) {
		issues.push(`${label} must be a TOML table`);
		return undefined;
	}

	return value;
}

function readString(table: TomlTable, key: string, label: string, issues: string[]): string | undefined {
	if (typeof table[key] !== 'string' || table[key].trim().length === 0) {
		issues.push(`${label} must be a string`);
		return undefined;
	}

	return table[key];
}

function readPositiveInteger(table: TomlTable, key: string, label: string, issues: string[]): number | undefined {
	if (!isPositiveInteger(table[key])) {
		issues.push(`${label} must be a positive integer`);
		return undefined;
	}

	return table[key];
}

function readStringArray(table: TomlTable, key: string, label: string, issues: string[]): string[] | undefined {
	const value = table[key];

	if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		issues.push(`${label} must be a non-empty string array`);
		return undefined;
	}

	return value;
}

function validateExistingTemplatePath(templateRoot: string, relativePath: unknown, label: string, issues: string[]): string | undefined {
	if (!isSafeRelativePath(relativePath)) {
		issues.push(`${label} must be a non-empty relative path`);
		return undefined;
	}

	if (!existsSync(path.join(templateRoot, ...relativePath.split('/')))) {
		issues.push(`${label} points to a missing file: ${relativePath}`);
		return undefined;
	}

	return relativePath;
}

function parseMarkdownFrontmatter(filePath: string): Record<string, string> | undefined {
	const content = readFileSync(filePath, 'utf8');

	if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
		return undefined;
	}

	const frontmatterStart = content.startsWith('---\r\n') ? 5 : 4;
	const endMatch = /\r?\n---(?:\r?\n|$)/u.exec(content.slice(frontmatterStart));

	if (!endMatch || endMatch.index === undefined) {
		return undefined;
	}

	const frontmatter: Record<string, string> = {};
	const endIndex = frontmatterStart + endMatch.index;
	const lines = content.slice(frontmatterStart, endIndex).split(/\r?\n/u);

	for (const line of lines) {
		const match = /^([A-Za-z0-9_.-]+):\s*(.*?)\s*$/u.exec(line);

		if (!match) {
			continue;
		}

		frontmatter[match[1]] = match[2].replace(/^"(.*)"$/u, '$1');
	}

	return frontmatter;
}

function validateFrontmatterField(
	frontmatter: Record<string, string>,
	key: string,
	expected: string,
	label: string,
	issues: string[],
): void {
	if (frontmatter[key] !== expected) {
		issues.push(`${label}.frontmatter.${key} must be ${expected}`);
	}
}

function validateMarkdownFrontmatter(
	templateRoot: string,
	relativePath: string,
	label: string,
	expectedDocumentId: string,
	expectedLocale: string,
	expectedCanonical: boolean,
	expectedRevision: number | undefined,
	issues: string[],
): void {
	if (!relativePath.endsWith('.md')) {
		return;
	}

	const absolutePath = path.join(templateRoot, ...relativePath.split('/'));
	const frontmatter = parseMarkdownFrontmatter(absolutePath);

	if (!frontmatter) {
		issues.push(`${label}.frontmatter is required`);
		return;
	}

	validateFrontmatterField(frontmatter, 'mustflow_doc', expectedDocumentId, label, issues);
	validateFrontmatterField(frontmatter, 'locale', expectedLocale, label, issues);
	validateFrontmatterField(frontmatter, 'canonical', String(expectedCanonical), label, issues);

	if (expectedRevision !== undefined) {
		validateFrontmatterField(frontmatter, 'revision', String(expectedRevision), label, issues);
	} else if (!isPositiveInteger(Number(frontmatter.revision))) {
		issues.push(`${label}.frontmatter.revision must be a positive integer`);
	}
}

function readTomlTable(filePath: string, label: string, issues: string[]): TomlTable | undefined {
	try {
		const parsed = readTomlFile(filePath);

		if (!isRecord(parsed)) {
			issues.push(`${label} must contain a TOML table`);
			return undefined;
		}

		return parsed;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Invalid TOML in ${label}: ${message}`);
		return undefined;
	}
}

function isLocalizedSourcePath(template: TemplatePaths, sourcePath: string, sourceLocale: string): boolean {
	if (!template.manifest.localesRoot) {
		return false;
	}

	return sourcePath.replace(/\\/g, '/').startsWith(`${template.manifest.localesRoot}/${sourceLocale}/`);
}

function validateTranslationPathPrefix(
	template: TemplatePaths,
	documentSourcePath: string,
	sourceLocale: string,
	translationLocale: string,
	translationPath: string,
	issues: string[],
): void {
	if (!isLocalizedSourcePath(template, documentSourcePath, sourceLocale) || !template.manifest.localesRoot) {
		return;
	}

	const expectedPrefix = `${template.manifest.localesRoot}/${translationLocale}/`;

	if (!translationPath.replace(/\\/g, '/').startsWith(expectedPrefix)) {
		issues.push(`[documents.*.translations.${translationLocale}].path must start with ${expectedPrefix}`);
	}
}

function validateTranslation(
	template: TemplatePaths,
	documentLabel: string,
	documentSourcePath: string,
	sourceLocale: string,
	revision: number | undefined,
	statusValues: ReadonlySet<string>,
	translationLocale: string,
	translation: unknown,
	issues: string[],
): void {
	const label = `${documentLabel}.translations.${translationLocale}`;

	if (!isRecord(translation)) {
		issues.push(`[${label}] must be a TOML table`);
		return;
	}

	if (!template.manifest.locales.includes(translationLocale)) {
		issues.push(`[${label}] locale must be listed in template manifest locales.available`);
	}

	if (translationLocale === sourceLocale) {
		issues.push(`[${label}] locale must not equal the source locale`);
	}

	const status = readString(translation, 'status', `[${label}].status`, issues);
	const sourceRevision = readPositiveInteger(translation, 'source_revision', `[${label}].source_revision`, issues);
	const pathValue = translation.path;

	if (status && !statusValues.has(status)) {
		issues.push(`[${label}].status must be one of ${Array.from(statusValues).join(', ')}`);
	}

	if (revision && sourceRevision && sourceRevision > revision) {
		issues.push(`[${label}].source_revision must not be greater than the source revision`);
	}

	if (status === 'current' && revision && sourceRevision && sourceRevision !== revision) {
		issues.push(`[${label}].source_revision must equal the source revision when status is current`);
	}

	if (status === 'stale' && revision && sourceRevision && sourceRevision >= revision) {
		issues.push(`[${label}].source_revision must be lower than the source revision when status is stale`);
	}

	if (status === 'missing') {
		if (pathValue !== undefined && !isSafeRelativePath(pathValue)) {
			issues.push(`[${label}].path must be a relative path when present`);
		}
		return;
	}

	const translationPath = validateExistingTemplatePath(template.templateRoot, pathValue, `[${label}].path`, issues);

	if (translationPath) {
		validateTranslationPathPrefix(template, documentSourcePath, sourceLocale, translationLocale, translationPath, issues);
		validateMarkdownFrontmatter(
			template.templateRoot,
			translationPath,
			`[${label}]`,
			documentLabel.replace(/^documents\./u, ''),
			translationLocale,
			false,
			undefined,
			issues,
		);
	}
}

function validateDocument(
	template: TemplatePaths,
	documentId: string,
	document: unknown,
	sourceLocale: string,
	statusValues: ReadonlySet<string>,
	issues: string[],
): void {
	const label = `documents.${documentId}`;

	if (!isRecord(document)) {
		issues.push(`[${label}] must be a TOML table`);
		return;
	}

	const source = validateExistingTemplatePath(template.templateRoot, document.source, `[${label}].source`, issues);
	const documentSourceLocale = readString(document, 'source_locale', `[${label}].source_locale`, issues);
	const revision = readPositiveInteger(document, 'revision', `[${label}].revision`, issues);

	if (documentSourceLocale && documentSourceLocale !== sourceLocale) {
		issues.push(`[${label}].source_locale must equal template source locale ${sourceLocale}`);
	}

	if (source) {
		validateMarkdownFrontmatter(template.templateRoot, source, `[${label}]`, documentId, sourceLocale, true, revision, issues);
	}

	const translations = readOptionalTable(document, 'translations', `[${label}.translations]`, issues);

	if (!translations || !source) {
		return;
	}

	for (const [translationLocale, translation] of Object.entries(translations)) {
		validateTranslation(
			template,
			label,
			source,
			sourceLocale,
			revision,
			statusValues,
			translationLocale,
			translation,
			issues,
		);
	}
}

export function validateTemplateI18n(template: TemplatePaths): string[] {
	const issues: string[] = [];
	const manifestToml = readTomlTable(template.manifestPath, 'template manifest', issues);

	if (!manifestToml) {
		return issues;
	}

	const manifestI18n = readTable(manifestToml, 'i18n', '[manifest.i18n]', issues);
	const manifestLocales = readTable(manifestToml, 'locales', '[manifest.locales]', issues);

	if (!manifestI18n || !manifestLocales) {
		return issues;
	}

	const metadataPath = validateExistingTemplatePath(
		template.templateRoot,
		manifestI18n.metadata,
		'[manifest.i18n].metadata',
		issues,
	);
	const manifestSourceLocale = readString(manifestI18n, 'source_locale', '[manifest.i18n].source_locale', issues);
	const localesSourceLocale = readString(manifestLocales, 'source', '[manifest.locales].source', issues);

	if (!metadataPath) {
		return issues;
	}

	const i18nToml = readTomlTable(path.join(template.templateRoot, ...metadataPath.split('/')), metadataPath, issues);

	if (!i18nToml) {
		return issues;
	}

	readPositiveInteger(i18nToml, 'version', '[i18n].version', issues);
	const sourceLocale = readString(i18nToml, 'source_locale', '[i18n].source_locale', issues);
	const statusValues = readStringArray(i18nToml, 'status_values', '[i18n].status_values', issues);
	const documents = readTable(i18nToml, 'documents', '[i18n.documents]', issues);

	if (sourceLocale && manifestSourceLocale && sourceLocale !== manifestSourceLocale) {
		issues.push('[i18n].source_locale must match [manifest.i18n].source_locale');
	}

	if (sourceLocale && localesSourceLocale && sourceLocale !== localesSourceLocale) {
		issues.push('[i18n].source_locale must match [manifest.locales].source');
	}

	if (sourceLocale && !template.manifest.locales.includes(sourceLocale)) {
		issues.push('[i18n].source_locale must be listed in template manifest locales.available');
	}

	if (!sourceLocale || !statusValues || !documents) {
		return issues;
	}

	for (const requiredStatus of REQUIRED_STATUS_VALUES) {
		if (!statusValues.includes(requiredStatus)) {
			issues.push(`[i18n].status_values must include ${requiredStatus}`);
		}
	}

	const allowedStatuses = new Set(statusValues);

	for (const [documentId, document] of Object.entries(documents)) {
		validateDocument(template, documentId, document, sourceLocale, allowedStatuses, issues);
	}

	return issues;
}
