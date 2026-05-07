import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { ensureInside } from '../lib/filesystem.js';
import { MANIFEST_LOCK_RELATIVE_PATH, readManifestLock, sha256File, type LockedFile } from '../lib/manifest-lock.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { getDefaultTemplate, getTemplateFiles, type TemplateFileSource } from '../lib/templates.js';
import { readTomlFile, stringifyToml } from '../lib/toml.js';

const UPDATE_SCHEMA_VERSION = '1';

type UpdateAction = 'unchanged' | 'create' | 'update' | 'blocked-local-change' | 'manual-review';
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

interface UpdatePlanItem {
	readonly relativePath: string;
	readonly sourceKind: TemplateFileSource['sourceKind'];
	readonly action: UpdateAction;
	readonly reason: string;
}

interface UpdatePlanSummary {
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

type MutableTomlTable = Record<string, unknown>;

export function getUpdateHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf update (--dry-run|--apply) [options]',
			summary:
				lang === 'ko'
					? '설치된 mustflow 작업 흐름의 갱신을 미리 보거나 적용합니다.'
					: 'Preview or apply updates for the installed mustflow workflow.',
			options: [
				{ label: '--dry-run', description: lang === 'ko' ? '파일을 쓰지 않고 갱신 계획만 출력합니다' : 'Print the update plan without writing files' },
				{
					label: '--apply',
					description:
						lang === 'ko'
							? '차단된 로컬 변경이 없을 때 안전한 템플릿 갱신을 적용합니다'
							: 'Apply safe template updates when no local changes are blocked',
				},
				{ label: '--json', description: lang === 'ko' ? '기계가 읽기 쉬운 JSON을 출력합니다' : 'Print machine-readable JSON' },
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf update --dry-run', 'mf update --dry-run --json', 'mf update --apply'],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko'
							? '계획을 출력했거나 안전한 갱신을 적용했습니다'
							: 'Plan was printed or safe updates were applied',
				},
				{
					label: '1',
					description:
						lang === 'ko'
							? '차단된 작업, 누락된 상태, 또는 잘못된 입력이 있습니다'
							: 'Plan found blocked work, missing state, or invalid input',
				},
			],
		},
		lang,
	);
}

function byRelativePath(files: readonly LockedFile[]): Map<string, LockedFile> {
	return new Map(files.map((file) => [file.relativePath, file]));
}

function planUpdate(projectRoot: string): { readonly items: readonly UpdatePlanItem[]; readonly error?: string } {
	const lockResult = readManifestLock(projectRoot);

	if (lockResult.kind === 'missing') {
		return { items: [], error: `Missing ${MANIFEST_LOCK_RELATIVE_PATH}` };
	}

	if (lockResult.kind === 'invalid') {
		return { items: [], error: `Invalid manifest lock: ${lockResult.message}` };
	}

	const template = getDefaultTemplate();
	const selectedLocale = lockResult.lock.templateLocale ?? template.manifest.defaultLocale;
	const templateFiles = getTemplateFiles(template, selectedLocale);
	const lockedFiles = byRelativePath(lockResult.lock.files);
	const items: UpdatePlanItem[] = [];

	for (const source of templateFiles) {
		const targetPath = path.join(projectRoot, source.relativePath);
		const lockedFile = lockedFiles.get(source.relativePath);

		ensureInside(template.templateRoot, source.sourcePath);
		ensureInside(projectRoot, targetPath);

		if (!existsSync(targetPath)) {
			items.push({
				relativePath: source.relativePath,
				sourceKind: source.sourceKind,
				action: 'create',
				reason: 'target file is missing',
			});
			continue;
		}

		const currentHash = sha256File(targetPath);
		const templateHash = sha256File(source.sourcePath);

		if (!lockedFile && currentHash !== templateHash) {
			items.push({
				relativePath: source.relativePath,
				sourceKind: source.sourceKind,
				action: 'blocked-local-change',
				reason: 'target file exists but is not tracked by the manifest lock',
			});
			continue;
		}

		if (lockedFile && currentHash !== lockedFile.contentHash) {
			items.push({
				relativePath: source.relativePath,
				sourceKind: source.sourceKind,
				action: 'blocked-local-change',
				reason: 'current file differs from the manifest lock baseline',
			});
			continue;
		}

		if (lockedFile?.source === 'managed_block' && currentHash !== templateHash) {
			items.push({
				relativePath: source.relativePath,
				sourceKind: source.sourceKind,
				action: 'manual-review',
				reason: 'managed AGENTS.md block cannot be safely rewritten yet',
			});
			continue;
		}

		if (currentHash !== templateHash) {
			items.push({
				relativePath: source.relativePath,
				sourceKind: source.sourceKind,
				action: 'update',
				reason: 'template content differs from current file',
			});
			continue;
		}

		items.push({
			relativePath: source.relativePath,
			sourceKind: source.sourceKind,
			action: 'unchanged',
			reason: 'current file matches the bundled template',
		});
	}

	return { items };
}

function printItems(title: string, items: readonly UpdatePlanItem[], reporter: Reporter): void {
	reporter.stdout(`${title}: ${items.length}`);

	for (const item of items) {
		reporter.stdout(`- ${item.relativePath} (${item.reason})`);
	}
}

function summarizePlan(items: readonly UpdatePlanItem[]): UpdatePlanSummary {
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

function readInstalledLocale(projectRoot: string): string | undefined {
	const lockResult = readManifestLock(projectRoot);

	return lockResult.kind === 'present' ? lockResult.lock.templateLocale : undefined;
}

function copyTemplateFile(projectRoot: string, relativePath: string): void {
	const template = getDefaultTemplate();
	const source = getTemplateFiles(template, readInstalledLocale(projectRoot) ?? template.manifest.defaultLocale).find(
		(file) => file.relativePath === relativePath,
	);
	const targetPath = path.join(projectRoot, relativePath);

	if (!source) {
		throw new Error(`Template source missing for ${relativePath}`);
	}

	ensureInside(template.templateRoot, source.sourcePath);
	ensureInside(projectRoot, targetPath);
	mkdirSync(path.dirname(targetPath), { recursive: true });
	copyFileSync(source.sourcePath, targetPath);
}

function backupUpdateFiles(projectRoot: string, items: readonly UpdatePlanItem[], reporter: Reporter): void {
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
		mkdirSync(path.dirname(backupPath), { recursive: true });
		copyFileSync(sourcePath, backupPath);
	}

	reporter.stdout(`Backed up ${updateItems.length} file${updateItems.length === 1 ? '' : 's'} to ${backupRoot}`);
}

function updateManifestLockAfterApply(projectRoot: string, appliedItems: readonly UpdatePlanItem[]): void {
	if (appliedItems.length === 0) {
		return;
	}

	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	ensureInside(projectRoot, lockPath);
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
	writeFileSync(lockPath, stringifyToml(parsed));
}

function applyUpdate(projectRoot: string, items: readonly UpdatePlanItem[], reporter: Reporter): ApplyResult {
	let created = 0;
	let updated = 0;
	const appliedItems: UpdatePlanItem[] = [];

	backupUpdateFiles(projectRoot, items, reporter);

	for (const item of items) {
		if (item.action !== 'create' && item.action !== 'update') {
			continue;
		}

		copyTemplateFile(projectRoot, item.relativePath);
		appliedItems.push(item);

		if (item.action === 'create') {
			created += 1;
			reporter.stdout(`Created ${item.relativePath}`);
		} else {
			updated += 1;
			reporter.stdout(`Updated ${item.relativePath}`);
		}
	}

	updateManifestLockAfterApply(projectRoot, appliedItems);

	if (appliedItems.length > 0) {
		reporter.stdout(`Wrote ${MANIFEST_LOCK_RELATIVE_PATH}`);
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
	reporter.stdout(lang === 'ko' ? '정책:' : 'Policy:');
	reporter.stdout(`- ${lang === 'ko' ? '기준선' : 'Baseline'}: ${UPDATE_POLICY.baseline}`);
	reporter.stdout(`- ${lang === 'ko' ? '적용 가능 상태' : 'Apply actions'}: ${UPDATE_POLICY.allowed_apply_actions.join(', ')}`);
	reporter.stdout(`- ${lang === 'ko' ? '차단 상태' : 'Blocking actions'}: ${UPDATE_POLICY.blocking_actions.join(', ')}`);
	reporter.stdout(`- ${lang === 'ko' ? '백업 위치' : 'Backup path'}: ${UPDATE_POLICY.backup_path_pattern}`);
}

function printPlan(output: UpdatePlanOutput, reporter: Reporter, lang: CliLang): void {
	const blocked = output.items.filter((item) => item.action === 'blocked-local-change');
	const manualReview = output.items.filter((item) => item.action === 'manual-review');
	const updates = output.items.filter((item) => item.action === 'update');
	const creates = output.items.filter((item) => item.action === 'create');

	reporter.stdout(lang === 'ko' ? 'mustflow 갱신 계획' : 'mustflow update plan');
	printPolicy(reporter, lang);
	printItems(lang === 'ko' ? '차단된 로컬 변경' : 'Blocked local changes', blocked, reporter);
	printItems(lang === 'ko' ? '수동 검토' : 'Manual review', manualReview, reporter);
	printItems(lang === 'ko' ? '갱신 예정' : 'Would update', updates, reporter);
	printItems(lang === 'ko' ? '생성 예정' : 'Would create', creates, reporter);

	if (blocked.length === 0 && manualReview.length === 0 && updates.length === 0 && creates.length === 0) {
		reporter.stdout(lang === 'ko' ? '필요한 템플릿 갱신이 없습니다.' : 'No template updates needed.');
	}
}

export function runUpdate(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getUpdateHelp(lang));
		return 0;
	}

	const supported = new Set(['--dry-run', '--apply', '--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));
	const wantsJson = args.includes('--json');
	const wantsDryRun = args.includes('--dry-run');
	const wantsApply = args.includes('--apply');
	const requestedMode = getRequestedMode(wantsDryRun, wantsApply);

	if (unsupported.length > 0) {
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	if (wantsDryRun && wantsApply) {
		const error = 'Cannot combine --dry-run and --apply.';

		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput([], error, false), requestedMode), null, 2));
			return 1;
		}

		printUsageError(reporter, error, 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	if (!wantsDryRun && !wantsApply) {
		const error = 'Specify --dry-run or --apply.';

		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput([], error, false), requestedMode), null, 2));
			return 1;
		}

		printUsageError(reporter, error, 'mf update --help', getUpdateHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	const plan = planUpdate(projectRoot);

	if (plan.error) {
		if (wantsJson) {
			reporter.stdout(JSON.stringify(withMode(planOutput(plan.items, plan.error, false), requestedMode), null, 2));
			return 1;
		}

		reporter.stderr(plan.error);
		return 1;
	}

	const dryRunOutput = withMode(planOutput(plan.items, undefined, false), requestedMode);

	if (wantsDryRun) {
		if (wantsJson) {
			reporter.stdout(JSON.stringify(dryRunOutput, null, 2));
			return dryRunOutput.ok ? 0 : 1;
		}

		printPlan(dryRunOutput, reporter, lang);
		reporter.stdout(lang === 'ko' ? '파일을 쓰지 않았습니다.' : 'No files were written.');
		return dryRunOutput.ok ? 0 : 1;
	}

	if (!dryRunOutput.ok) {
		if (wantsJson) {
			reporter.stdout(JSON.stringify(dryRunOutput, null, 2));
			return 1;
		}

		printPlan(dryRunOutput, reporter, lang);
		reporter.stdout(lang === 'ko' ? '파일을 쓰지 않았습니다.' : 'No files were written.');
		return 1;
	}

	if (wantsJson) {
		const applicableItems = plan.items.filter((item) => item.action === 'create' || item.action === 'update');
		const applyResult = applyUpdate(projectRoot, applicableItems, {
			stdout: () => undefined,
			stderr: (message) => reporter.stderr(message),
		});
		reporter.stdout(JSON.stringify(withMode(planOutput(plan.items, undefined, applyResult.wroteFiles), 'apply'), null, 2));
		return 0;
	}

	const applyResult = applyUpdate(projectRoot, plan.items, reporter);

	if (!applyResult.wroteFiles) {
		reporter.stdout(lang === 'ko' ? '필요한 템플릿 갱신이 없습니다.' : 'No template updates needed.');
		reporter.stdout(lang === 'ko' ? '파일을 쓰지 않았습니다.' : 'No files were written.');
		return 0;
	}

	reporter.stdout(
		`mustflow update complete: ${applyResult.updated} updated, ${applyResult.created} created.`,
	);
	return 0;
}
