import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import {
	ensureFileTargetInsideWithoutSymlinks,
	ensureInside,
	writeUtf8FileInsideWithoutSymlinks,
} from '../lib/filesystem.js';
import { MANIFEST_LOCK_RELATIVE_PATH, readManifestLock, sha256File, type LockedFile } from '../lib/manifest-lock.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { getDefaultTemplate, getTemplateFiles, skillNameForTemplatePath, type TemplateFileSource } from '../lib/templates.js';
import { readTomlFile, stringifyToml } from '../lib/toml.js';
import { createUpdateDiffPreview, shouldPreviewUpdateDiff, type UpdateDiffPreview } from '../lib/update-diff-preview.js';

const UPDATE_SCHEMA_VERSION = '1';
const CUSTOMIZED_LOCK_ACTION = 'customized';

export type UpdateAction = 'unchanged' | 'create' | 'update' | 'blocked-local-change' | 'manual-review';
type UpdateMode = 'dry-run' | 'apply' | 'unspecified';

interface UpdatePolicy {
	readonly baseline: 'manifest_lock_content_hash';
	readonly allowed_apply_actions: readonly ['update', 'create'];
	readonly blocking_actions: readonly ['blocked-local-change', 'manual-review'];
	readonly dry_run_writes_files: false;
	readonly backup_path_pattern: '.mustflow/backups/<timestamp>/';
	readonly never_overwrite_local_changes: true;
	readonly writes_only_template_manifest_paths: true;
}

const UPDATE_POLICY: UpdatePolicy = {
	baseline: 'manifest_lock_content_hash',
	allowed_apply_actions: ['update', 'create'],
	blocking_actions: ['blocked-local-change', 'manual-review'],
	dry_run_writes_files: false,
	backup_path_pattern: '.mustflow/backups/<timestamp>/',
	never_overwrite_local_changes: true,
	writes_only_template_manifest_paths: true,
};

export interface UpdatePlanItem {
	readonly relativePath: string;
	readonly sourceKind: TemplateFileSource['sourceKind'];
	readonly action: UpdateAction;
	readonly reason: string;
	readonly diff_preview?: UpdateDiffPreview;
}

export interface UpdatePlanSummary {
	readonly blockedLocalChanges: number;
	readonly manualReview: number;
	readonly wouldUpdate: number;
	readonly wouldCreate: number;
	readonly unchanged: number;
}

interface UpdatePlanOutput {
	readonly schema_version: string;
	readonly command: 'update';
	readonly mode: UpdateMode;
	readonly policy: UpdatePolicy;
	readonly ok: boolean;
	readonly wroteFiles: boolean;
	readonly summary: UpdatePlanSummary;
	readonly items: readonly UpdatePlanItem[];
	readonly error?: string;
}

interface ApplyResult {
	readonly created: number;
	readonly updated: number;
	readonly wroteFiles: boolean;
}

interface InternalUpdatePlanItem extends Omit<UpdatePlanItem, 'diff_preview'> {
	readonly source: TemplateFileSource;
}

type MutableTomlTable = Record<string, unknown>;

export function getUpdateHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf update (--dry-run|--apply) [options]',
			summary: t(lang, 'update.help.summary'),
			options: [
				{ label: '--dry-run', description: t(lang, 'update.help.option.dryRun') },
				{ label: '--diff', description: t(lang, 'update.help.option.diff') },
				{
					label: '--apply',
					description: t(lang, 'update.help.option.apply'),
				},
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf update --dry-run', 'mf update --dry-run --diff', 'mf update --dry-run --diff --json', 'mf update --apply'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'update.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'update.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

function byRelativePath(files: readonly LockedFile[]): Map<string, LockedFile> {
	return new Map(files.map((file) => [file.relativePath, file]));
}

function sha256Text(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function templateFileHash(source: TemplateFileSource): string {
	return source.content === undefined ? sha256File(source.sourcePath) : sha256Text(source.content);
}

function isTemplateManagedSource(source: string): boolean {
	return source === 'template_locale' || source === 'template_common' || source === 'legacy';
}

function lockedTemplateSkillNames(files: readonly LockedFile[]): readonly string[] {
	return [
		...new Set(
			files
				.filter((file) => isTemplateManagedSource(file.source))
				.map((file) => skillNameForTemplatePath(file.relativePath))
				.filter((value): value is string => Boolean(value)),
		),
	];
}

function getInstalledTemplateFiles(projectRoot: string, template: ReturnType<typeof getDefaultTemplate>, lock: { readonly templateLocale?: string; readonly templateProfile?: string; readonly files: readonly LockedFile[] }): TemplateFileSource[] {
	return getTemplateFiles(
		template,
		lock.templateLocale ?? template.manifest.defaultLocale,
		lock.templateProfile ?? template.manifest.defaultProfile,
		{ extraSkillNames: lockedTemplateSkillNames(lock.files) },
	);
}

function writeTemplateFile(projectRoot: string, source: TemplateFileSource, targetPath: string): void {
	if (source.content !== undefined) {
		writeUtf8FileInsideWithoutSymlinks(projectRoot, targetPath, source.content);
		return;
	}

	ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath, { allowMissingLeaf: true });
	mkdirSync(path.dirname(targetPath), { recursive: true });
	copyFileSync(source.sourcePath, targetPath);
}

function templateTargetSafetyIssue(projectRoot: string, targetPath: string, allowMissingLeaf: boolean): string | undefined {
	try {
		ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath, { allowMissingLeaf });
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

function createPlanItem(source: TemplateFileSource, action: UpdateAction, reason: string): InternalUpdatePlanItem {
	return {
		relativePath: source.relativePath,
		sourceKind: source.sourceKind,
		source,
		action,
		reason,
	};
}

function publicPlanItem(item: InternalUpdatePlanItem): UpdatePlanItem {
	return {
		relativePath: item.relativePath,
		sourceKind: item.sourceKind,
		action: item.action,
		reason: item.reason,
	};
}

function publicPlanItems(items: readonly InternalUpdatePlanItem[]): UpdatePlanItem[] {
	return items.map((item) => publicPlanItem(item));
}

function createUpdatePlan(projectRoot: string): { readonly items: readonly InternalUpdatePlanItem[]; readonly error?: string } {
	const lockResult = readManifestLock(projectRoot);

	if (lockResult.kind === 'missing') {
		return { items: [], error: `Missing ${MANIFEST_LOCK_RELATIVE_PATH}` };
	}

	if (lockResult.kind === 'invalid') {
		return { items: [], error: `Invalid manifest lock: ${lockResult.message}` };
	}

	let template: ReturnType<typeof getDefaultTemplate>;

	try {
		template = getDefaultTemplate();
	} catch (error) {
		return { items: [], error: error instanceof Error ? error.message : String(error) };
	}

	const templateFiles = getInstalledTemplateFiles(projectRoot, template, lockResult.lock);
	const lockedFiles = byRelativePath(lockResult.lock.files);
	const items: InternalUpdatePlanItem[] = [];

	for (const source of templateFiles) {
		const targetPath = path.join(projectRoot, source.relativePath);
		const lockedFile = lockedFiles.get(source.relativePath);

		ensureInside(template.templateRoot, source.sourcePath);
		ensureInside(projectRoot, targetPath);
		const unsafeTargetReason = templateTargetSafetyIssue(projectRoot, targetPath, true);

		if (unsafeTargetReason) {
			items.push(createPlanItem(source, 'blocked-local-change', unsafeTargetReason));
			continue;
		}

		if (!existsSync(targetPath)) {
			if (lockedFile) {
				items.push(createPlanItem(source, 'blocked-local-change', 'target file is missing but tracked by the manifest lock'));
				continue;
			}

			items.push(createPlanItem(source, 'create', 'target file is missing'));
			continue;
		}

		const currentHash = sha256File(targetPath);
		const templateHash = templateFileHash(source);

		if (!lockedFile && currentHash !== templateHash) {
			items.push(createPlanItem(source, 'blocked-local-change', 'target file exists but is not tracked by the manifest lock'));
			continue;
		}

		if (lockedFile && currentHash !== lockedFile.contentHash) {
			items.push(createPlanItem(source, 'blocked-local-change', 'current file differs from the manifest lock baseline'));
			continue;
		}

		if (lockedFile?.lastAction === CUSTOMIZED_LOCK_ACTION && currentHash !== templateHash) {
			items.push(createPlanItem(source, 'unchanged', 'manifest lock marks this file as customized and current file matches that baseline'));
			continue;
		}

		if (lockedFile?.source === 'managed_block' && currentHash !== templateHash) {
			items.push(createPlanItem(source, 'manual-review', 'managed block requires a block-level manifest baseline'));
			continue;
		}

		if (currentHash !== templateHash) {
			items.push(createPlanItem(source, 'update', 'template content differs from current file'));
			continue;
		}

		items.push(createPlanItem(source, 'unchanged', 'current file matches the bundled template'));
	}

	return { items };
}

export function planUpdate(projectRoot: string): { readonly items: readonly UpdatePlanItem[]; readonly error?: string } {
	const plan = createUpdatePlan(projectRoot);

	return {
		items: publicPlanItems(plan.items),
		...(plan.error ? { error: plan.error } : {}),
	};
}

function printItems(title: string, items: readonly UpdatePlanItem[], reporter: Reporter): void {
	reporter.stdout(`${title}: ${items.length}`);

	for (const item of items) {
		reporter.stdout(`- ${item.relativePath} (${item.reason})`);
	}
}

function withDiffPreviews(projectRoot: string, items: readonly InternalUpdatePlanItem[]): UpdatePlanItem[] {
	return items.map((item) => {
		const publicItem = publicPlanItem(item);

		if (!shouldPreviewUpdateDiff(item.action)) {
			return publicItem;
		}

		return {
			...publicItem,
			diff_preview: createUpdateDiffPreview(projectRoot, item),
		};
	});
}

export function summarizePlan(items: readonly UpdatePlanItem[]): UpdatePlanSummary {
	return {
		blockedLocalChanges: items.filter((item) => item.action === 'blocked-local-change').length,
		manualReview: items.filter((item) => item.action === 'manual-review').length,
		wouldUpdate: items.filter((item) => item.action === 'update').length,
		wouldCreate: items.filter((item) => item.action === 'create').length,
		unchanged: items.filter((item) => item.action === 'unchanged').length,
	};
}

function isMutableTable(value: unknown): value is MutableTomlTable {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fileActionToLockAction(action: UpdateAction): 'created' | 'updated' {
	return action === 'create' ? 'created' : 'updated';
}

function copyTemplateFile(projectRoot: string, relativePath: string): void {
	const template = getDefaultTemplate();
	const lockResult = readManifestLock(projectRoot);
	const source = lockResult.kind === 'present'
		? getInstalledTemplateFiles(projectRoot, template, lockResult.lock).find((file) => file.relativePath === relativePath)
		: getTemplateFiles(template).find((file) => file.relativePath === relativePath);
	const targetPath = path.join(projectRoot, relativePath);

	if (!source) {
		throw new Error(`Template source missing for ${relativePath}`);
	}

	ensureInside(template.templateRoot, source.sourcePath);
	ensureInside(projectRoot, targetPath);
	ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath, { allowMissingLeaf: true });
	writeTemplateFile(projectRoot, source, targetPath);
}

function backupUpdateFiles(projectRoot: string, items: readonly UpdatePlanItem[], reporter: Reporter, lang: CliLang): void {
	const updateItems = items.filter((item) => item.action === 'update');

	if (updateItems.length === 0) {
		return;
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupRoot = path.join(projectRoot, '.mustflow', 'backups', timestamp);

	for (const item of updateItems) {
		const sourcePath = path.join(projectRoot, item.relativePath);
		const backupPath = path.join(backupRoot, item.relativePath);

		ensureInside(projectRoot, sourcePath);
		ensureInside(backupRoot, backupPath);
		ensureFileTargetInsideWithoutSymlinks(projectRoot, sourcePath);
		ensureFileTargetInsideWithoutSymlinks(projectRoot, backupPath, { allowMissingLeaf: true });
		mkdirSync(path.dirname(backupPath), { recursive: true });
		copyFileSync(sourcePath, backupPath);
	}

	reporter.stdout(
		t(lang, 'update.backup.files', {
			count: updateItems.length,
			fileWord: t(lang, updateItems.length === 1 ? 'init.fileWord.singular' : 'init.fileWord.plural'),
			path: backupRoot,
		}),
	);
}

function updateManifestLockAfterApply(projectRoot: string, appliedItems: readonly UpdatePlanItem[]): void {
	if (appliedItems.length === 0) {
		return;
	}

	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	ensureInside(projectRoot, lockPath);
	ensureFileTargetInsideWithoutSymlinks(projectRoot, lockPath);
	const parsed = readTomlFile(lockPath);

	if (!isMutableTable(parsed)) {
		throw new Error(`Invalid manifest lock: ${MANIFEST_LOCK_RELATIVE_PATH} must contain a TOML table`);
	}

	const template = getDefaultTemplate();
	const templateTable = isMutableTable(parsed.template) ? parsed.template : {};
	templateTable.id = template.manifest.id;
	templateTable.version = template.manifest.version;
	parsed.template = templateTable;

	const filesTable = isMutableTable(parsed.files) ? parsed.files : {};

	for (const item of appliedItems) {
		const targetPath = path.join(projectRoot, item.relativePath);
		ensureInside(projectRoot, targetPath);
		ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath);
		const existing = filesTable[item.relativePath];
		const existingTable = isMutableTable(existing) ? existing : {};

		filesTable[item.relativePath] = {
			source:
				typeof existingTable.source === 'string'
					? existingTable.source
					: item.sourceKind === 'locale'
						? 'template_locale'
						: 'template_common',
			last_action: fileActionToLockAction(item.action),
			content_hash: sha256File(targetPath),
		};
	}

	parsed.files = filesTable;
	writeUtf8FileInsideWithoutSymlinks(projectRoot, lockPath, stringifyToml(parsed));
}

function applyUpdate(projectRoot: string, items: readonly UpdatePlanItem[], reporter: Reporter, lang: CliLang): ApplyResult {
	let created = 0;
	let updated = 0;
	const appliedItems: UpdatePlanItem[] = [];

	backupUpdateFiles(projectRoot, items, reporter, lang);

	for (const item of items) {
		if (item.action !== 'create' && item.action !== 'update') {
			continue;
		}

		copyTemplateFile(projectRoot, item.relativePath);
		appliedItems.push(item);

		if (item.action === 'create') {
			created += 1;
			reporter.stdout(t(lang, 'update.action.created', { path: item.relativePath }));
		} else {
			updated += 1;
			reporter.stdout(t(lang, 'update.action.updated', { path: item.relativePath }));
		}
	}

	updateManifestLockAfterApply(projectRoot, appliedItems);

	if (appliedItems.length > 0) {
		reporter.stdout(t(lang, 'update.action.wrote', { path: MANIFEST_LOCK_RELATIVE_PATH }));
	}

	return {
		created,
		updated,
		wroteFiles: appliedItems.length > 0,
	};
}

function planOutput(items: readonly UpdatePlanItem[], error: string | undefined, wroteFiles: boolean): UpdatePlanOutput {
	const summary = summarizePlan(items);

	return {
		schema_version: UPDATE_SCHEMA_VERSION,
		command: 'update',
		mode: 'unspecified',
		policy: UPDATE_POLICY,
		ok: !error && summary.blockedLocalChanges === 0 && summary.manualReview === 0,
		wroteFiles,
		summary,
		items,
		...(error ? { error } : {}),
	};
}

function withMode(output: UpdatePlanOutput, mode: UpdateMode): UpdatePlanOutput {
	return {
		...output,
		mode,
	};
}

function getRequestedMode(wantsDryRun: boolean, wantsApply: boolean): UpdateMode {
	if (wantsDryRun && !wantsApply) {
		return 'dry-run';
	}

	if (wantsApply && !wantsDryRun) {
		return 'apply';
	}

	return 'unspecified';
}

function printPolicy(reporter: Reporter, lang: CliLang): void {
	reporter.stdout(t(lang, 'update.policy.title'));
	reporter.stdout(`- ${t(lang, 'update.policy.baseline')}: ${UPDATE_POLICY.baseline}`);
	reporter.stdout(`- ${t(lang, 'update.policy.applyActions')}: ${UPDATE_POLICY.allowed_apply_actions.join(', ')}`);
	reporter.stdout(`- ${t(lang, 'update.policy.blockingActions')}: ${UPDATE_POLICY.blocking_actions.join(', ')}`);
	reporter.stdout(`- ${t(lang, 'update.policy.backupPath')}: ${UPDATE_POLICY.backup_path_pattern}`);
}

function printPlan(output: UpdatePlanOutput, reporter: Reporter, lang: CliLang): void {
	const blocked = output.items.filter((item) => item.action === 'blocked-local-change');
	const manualReview = output.items.filter((item) => item.action === 'manual-review');
	const updates = output.items.filter((item) => item.action === 'update');
	const creates = output.items.filter((item) => item.action === 'create');

	reporter.stdout(t(lang, 'update.plan.title'));
	printPolicy(reporter, lang);
	printItems(t(lang, 'update.plan.blocked'), blocked, reporter);
	printItems(t(lang, 'update.plan.manualReview'), manualReview, reporter);
	printItems(t(lang, 'update.plan.wouldUpdate'), updates, reporter);
	printItems(t(lang, 'update.plan.wouldCreate'), creates, reporter);

	if (blocked.length === 0 && manualReview.length === 0 && updates.length === 0 && creates.length === 0) {
		reporter.stdout(t(lang, 'update.plan.noUpdates'));
	}
}

function printDiffPreviews(items: readonly UpdatePlanItem[], reporter: Reporter, lang: CliLang): void {
	const itemsWithDiff = items.filter((item) => item.diff_preview);

	if (itemsWithDiff.length === 0) {
		return;
	}

	reporter.stdout(t(lang, 'update.diff.title'));

	for (const item of itemsWithDiff) {
		const preview = item.diff_preview;

		if (!preview) {
			continue;
		}

		if (!preview.available) {
			reporter.stdout(`# ${item.relativePath}: ${t(lang, 'update.diff.unavailable', { reason: preview.reason ?? 'unknown' })}`);
			continue;
		}

		for (const line of preview.lines) {
			reporter.stdout(line);
		}
	}
}

export function runUpdate(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getUpdateHelp(lang));
		return 0;
	}

	const supported = new Set(['--dry-run', '--apply', '--json', '--diff']);
	const unsupported = args.filter((arg) => !supported.has(arg));
	const wantsJson = args.includes('--json');
	const wantsDryRun = args.includes('--dry-run');
	const wantsApply = args.includes('--apply');
	const wantsDiff = args.includes('--diff');
	const requestedMode = getRequestedMode(wantsDryRun, wantsApply);

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	if (wantsDryRun && wantsApply) {
		const error = t(lang, 'update.error.cannotCombineModes');

		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput([], error, false), requestedMode), null, 2));
			return 1;
		}

		printUsageError(reporter, error, 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	if (wantsDiff && !wantsDryRun) {
		const error = t(lang, 'update.error.diffRequiresDryRun');

		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput([], error, false), requestedMode), null, 2));
			return 1;
		}

		printUsageError(reporter, error, 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	if (!wantsDryRun && !wantsApply) {
		const error = t(lang, 'update.error.missingMode');

		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput([], error, false), requestedMode), null, 2));
			return 1;
		}

		printUsageError(reporter, error, 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	const plan = createUpdatePlan(projectRoot);

	if (plan.error) {
		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput(publicPlanItems(plan.items), plan.error, false), requestedMode), null, 2));
			return 1;
		}

		reporter.stderr(plan.error);
		return 1;
	}

	const outputItems = wantsDiff ? withDiffPreviews(projectRoot, plan.items) : publicPlanItems(plan.items);
	const dryRunOutput = withMode(planOutput(outputItems, undefined, false), requestedMode);

	if (wantsDryRun) {
		if (wantsJson) {
			reporter.stdout(JSON.stringify(dryRunOutput, null, 2));
			return dryRunOutput.ok ? 0 : 1;
		}

		printPlan(dryRunOutput, reporter, lang);
		if (wantsDiff) {
			printDiffPreviews(dryRunOutput.items, reporter, lang);
		}
		reporter.stdout(t(lang, 'update.plan.noFilesWritten'));
		return dryRunOutput.ok ? 0 : 1;
	}

	if (!dryRunOutput.ok) {
		if (wantsJson) {
			reporter.stdout(JSON.stringify(dryRunOutput, null, 2));
			return 1;
		}

		printPlan(dryRunOutput, reporter, lang);
		reporter.stdout(t(lang, 'update.plan.noFilesWritten'));
		return 1;
	}

	if (wantsJson) {
		const applicableItems = plan.items.filter((item) => item.action === 'create' || item.action === 'update');
		const applyResult = applyUpdate(projectRoot, applicableItems, {
			stdout: () => undefined,
			stderr: (message) => reporter.stderr(message),
		}, lang);
		reporter.stdout(JSON.stringify(withMode(planOutput(publicPlanItems(plan.items), undefined, applyResult.wroteFiles), 'apply'), null, 2));
		return 0;
	}

	const applyResult = applyUpdate(projectRoot, plan.items, reporter, lang);

	if (!applyResult.wroteFiles) {
		reporter.stdout(t(lang, 'update.plan.noUpdates'));
		reporter.stdout(t(lang, 'update.plan.noFilesWritten'));
		return 0;
	}

	reporter.stdout(
		t(lang, 'update.complete', { updated: applyResult.updated, created: applyResult.created }),
	);
	return 0;
}
