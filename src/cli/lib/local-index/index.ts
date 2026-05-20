import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { isRecord, readCommandContract, readString, readStringArray, type TomlTable } from '../command-contract.js';
import { listFilesRecursive, toPosixPath } from '../filesystem.js';
import { readTomlFile } from '../toml.js';
import {
	collectSourceAnchorIndexRecords,
	hasHighRiskSourceAnchorRiskTags,
	type SourceAnchorIndexRecord,
	type SourceAnchorSnapshot,
	type SourceAnchorStatus,
	type SourceAnchorSymbol,
} from '../../../core/source-anchor-status.js';
import { listSourceAnchorFiles } from '../../../core/source-anchors.js';
import { normalizeCommandEffects, type NormalizedCommandEffect } from '../../../core/command-effects.js';
import { listChangeClassificationRuleDescriptors } from '../../../core/change-classification.js';
import { writeFileInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';
import {
	DEFAULT_DATABASE_RELATIVE_PATH,
	DEFAULT_PROMPT_CACHE_STABLE_READ,
	DEFAULT_PROMPT_CACHE_TASK_SOURCES,
	DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES,
	INDEX_CONFIG_RELATIVE_PATH,
	LOCAL_INDEX_CONTENT_MODE,
	LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS,
	LOCAL_INDEX_PARSER_VERSION,
	LOCAL_INDEX_SCHEMA_VERSION,
	LOCAL_INDEX_STORE_FULL_CONTENT,
	LATEST_RUN_STATE_RELATIVE_PATH,
	MAX_SEARCH_MATCH_SNIPPET_CHARS,
	MAX_SNIPPET_BYTES_PER_DOCUMENT,
	MUSTFLOW_RELATIVE_PATH,
	SEARCH_BACKEND_FTS5,
	SEARCH_BACKEND_TABLE_SCAN,
	SEARCH_MATCH_CONTEXT_AFTER_CHARS,
	SEARCH_MATCH_CONTEXT_BEFORE_CHARS,
	SEARCH_MATCH_TRUNCATION_MARKER,
	SEARCH_NGRAM_MAX_GRAMS_PER_TARGET,
	SEARCH_NGRAM_MAX_LENGTH,
	SEARCH_NGRAM_MAX_TOKEN_CHARS,
	SEARCH_NGRAM_MIN_LENGTH,
	SOURCE_INDEX_MAX_FILE_BYTES,
	TEST_DISABLE_FTS5_ENV,
} from './constants.js';
import { loadSqlJs, type SqlJsDatabase, type SqlJsStatic, type SqlValue } from './sql.js';
import type {
	CacheLayer,
	IndexCommandIntent,
	IndexDocument,
	IndexedFileRecord,
	IndexSkill,
	IndexSkillRoute,
	LocalCommandEffectGraph,
	LocalCommandEffectGraphStatus,
	LocalCommandLockConflict,
	LocalIndexOptions,
	LocalIndexPromptContext,
	LocalIndexPromptContextStatus,
	LocalIndexResult,
	LocalIndexSourceConfig,
	LocalNonPassingVerificationReceipt,
	LocalPathSurfaceReadModel,
	LocalPathSurfaceReadModelStatus,
	LocalPathSurfaceRuleMatch,
	LocalRepeatedFailureFingerprint,
	LocalSearchItem,
	LocalSearchOptions,
	LocalSearchResult,
	LocalSevereVerificationRisk,
	LocalSourceAnchorVerdictRisk,
	LocalUncoveredCriterion,
	LocalValidationWeakeningSignal,
	LocalVerificationReadModelQueries,
	LocalVerificationReadModelStatus,
	SearchBackendKind,
	SearchNgramTargetKind,
} from './types.js';
export type {
	LocalCommandEffectGraph,
	LocalCommandEffectGraphStatus,
	LocalCommandLockConflict,
	LocalCommandWriteLock,
	LocalIndexOptions,
	LocalIndexPromptContext,
	LocalIndexPromptContextStatus,
	LocalIndexResult,
	LocalNonPassingVerificationReceipt,
	LocalPathSurfaceReadModel,
	LocalPathSurfaceReadModelStatus,
	LocalPathSurfaceRuleMatch,
	LocalRepeatedFailureFingerprint,
	LocalSearchItem,
	LocalSearchOptions,
	LocalSearchResult,
	LocalSearchScope,
	LocalSevereVerificationRisk,
	LocalSourceAnchorVerdictRisk,
	LocalUncoveredCriterion,
	LocalValidationWeakeningSignal,
	LocalVerificationReadModelQueries,
	LocalVerificationReadModelStatus,
	SearchBackendKind,
} from './types.js';

export function getLocalIndexDatabasePath(projectRoot: string): string {
	return path.join(projectRoot, ...DEFAULT_DATABASE_RELATIVE_PATH.split('/'));
}

function getExistingIndexablePaths(projectRoot: string): string[] {
	const paths = new Set<string>();
	const addIfExists = (relativePath: string) => {
		if (existsSync(path.join(projectRoot, ...relativePath.split('/')))) {
			paths.add(relativePath);
		}
	};

	addIfExists('AGENTS.md');

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'docs'))) {
		if (relativePath.endsWith('.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'docs', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'context'))) {
		if (relativePath.endsWith('.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'context', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'skills'))) {
		if (relativePath === 'INDEX.md' || relativePath.endsWith('/SKILL.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'skills', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'config'))) {
		if (relativePath.endsWith('.toml')) {
			paths.add(toPosixPath(path.join('.mustflow', 'config', relativePath)));
		}
	}

	return Array.from(paths).sort((left, right) => left.localeCompare(right));
}

function readText(projectRoot: string, relativePath: string): string {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

function readMustflowToml(projectRoot: string): TomlTable | undefined {
	const mustflowPath = path.join(projectRoot, ...MUSTFLOW_RELATIVE_PATH.split('/'));

	if (!existsSync(mustflowPath)) {
		return undefined;
	}

	const parsed = readTomlFile(mustflowPath);
	return isRecord(parsed) ? parsed : undefined;
}

function readIndexToml(projectRoot: string): TomlTable | undefined {
	const indexConfigPath = path.join(projectRoot, ...INDEX_CONFIG_RELATIVE_PATH.split('/'));

	if (!existsSync(indexConfigPath)) {
		return undefined;
	}

	const parsed = readTomlFile(indexConfigPath);
	return isRecord(parsed) ? parsed : undefined;
}

function readNestedTable(table: TomlTable | undefined, key: string): TomlTable | undefined {
	if (!table || !isRecord(table[key])) {
		return undefined;
	}

	return table[key];
}

function readOptionalStringArray(table: TomlTable | undefined, key: string): readonly string[] | null {
	return table ? readStringArray(table, key) ?? null : null;
}

function readBoolean(table: TomlTable | undefined, key: string): boolean | undefined {
	const value = table?.[key];
	return typeof value === 'boolean' ? value : undefined;
}

function readPositiveInteger(table: TomlTable | undefined, key: string): number | null {
	const value = table?.[key];

	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		return null;
	}

	return value;
}

function readLocalIndexSourceConfig(projectRoot: string): LocalIndexSourceConfig {
	const sourceIndexTable = readNestedTable(readIndexToml(projectRoot), 'source_index');
	const configuredMaxFileBytes = readPositiveInteger(sourceIndexTable, 'max_file_bytes');

	return {
		enabledByDefault: readBoolean(sourceIndexTable, 'enabled_by_default') === true,
		include: readOptionalStringArray(sourceIndexTable, 'include') ?? [],
		exclude: readOptionalStringArray(sourceIndexTable, 'exclude') ?? [],
		maxFileBytes: Math.min(configuredMaxFileBytes ?? SOURCE_INDEX_MAX_FILE_BYTES, SOURCE_INDEX_MAX_FILE_BYTES),
		allowedExtensions: readOptionalStringArray(sourceIndexTable, 'allowed_extensions') ?? [],
	};
}

function sha256Text(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function sha256Bytes(content: Uint8Array): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function getSourceScopeHash(includeSource: boolean, sourceConfig: LocalIndexSourceConfig): string {
	return sha256Text(
		JSON.stringify({
			includeSource,
			sourceConfig,
		}),
	);
}

function getDocumentType(relativePath: string): string {
	if (relativePath === 'AGENTS.md') {
		return 'agent_rules';
	}

	if (relativePath.startsWith('.mustflow/config/')) {
		return 'config';
	}

	if (relativePath === '.mustflow/skills/INDEX.md') {
		return 'skill_index';
	}

	if (relativePath === '.mustflow/context/INDEX.md') {
		return 'context_index';
	}

	if (relativePath.startsWith('.mustflow/context/')) {
		return 'context';
	}

	if (relativePath.endsWith('/SKILL.md')) {
		return 'skill';
	}

	if (relativePath.startsWith('.mustflow/docs/')) {
		return 'workflow_doc';
	}

	return 'document';
}

function parseFrontmatter(content: string): Record<string, string> {
	if (!content.startsWith('---')) {
		return {};
	}

	const end = content.indexOf('\n---', 3);

	if (end === -1) {
		return {};
	}

	const result: Record<string, string> = {};
	const rawFrontmatter = content.slice(3, end);

	for (const line of rawFrontmatter.split(/\r?\n/)) {
		const separatorIndex = line.indexOf(':');

		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim();

		if (key.length > 0 && value.length > 0) {
			result[key] = value;
		}
	}

	return result;
}

function getTitle(relativePath: string, content: string): string {
	const heading = content.match(/^#\s+(.+)$/mu)?.[1]?.trim();
	return heading && heading.length > 0 ? heading : path.posix.basename(relativePath);
}

function getSections(content: string): string[] {
	return [...content.matchAll(/^##\s+(.+)$/gmu)].map((match) => match[1]?.trim()).filter((value): value is string => Boolean(value));
}

function truncateUtf8(value: string, maxBytes: number): string {
	const buffer = Buffer.from(value, 'utf8');

	if (buffer.byteLength <= maxBytes) {
		return value;
	}

	return buffer.subarray(0, maxBytes).toString('utf8').replace(/\uFFFD$/u, '');
}

function collectDocuments(projectRoot: string): IndexDocument[] {
	return getExistingIndexablePaths(projectRoot).map((relativePath) => {
		const content = readText(projectRoot, relativePath);
		const frontmatter = parseFrontmatter(content);
		const revision = Number.parseInt(frontmatter.revision ?? '', 10);

		return {
			path: relativePath,
			type: getDocumentType(relativePath),
			title: getTitle(relativePath, content),
			locale: frontmatter.locale ?? null,
			revision: Number.isInteger(revision) ? revision : null,
			contentHash: sha256Text(content),
			contentSnippet: truncateUtf8(content, MAX_SNIPPET_BYTES_PER_DOCUMENT),
			sections: getSections(content),
		};
	});
}

function collectSkills(documents: readonly IndexDocument[]): IndexSkill[] {
	return documents
		.filter((document) => document.type === 'skill')
		.map((document) => ({
			name: document.path.split('/').at(-2) ?? document.title,
			path: document.path,
			title: document.title,
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeMarkdownCell(value: string): string {
	return value
		.replace(/<br\s*\/?>/giu, ' ')
		.replace(/`([^`]+)`/gu, '$1')
		.replace(/\s+/gu, ' ')
		.trim();
}

function parseMarkdownTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/u, '')
		.replace(/\|$/u, '')
		.split('|')
		.map((cell) => normalizeMarkdownCell(cell));
}

function isMarkdownSeparatorRow(cells: readonly string[]): boolean {
	return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function skillNameFromPath(skillPath: string): string {
	return skillPath.split('/').at(-2) ?? path.posix.basename(skillPath, '.md');
}

function splitVerificationIntents(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
}

function collectSkillRoutes(projectRoot: string): IndexSkillRoute[] {
	const indexPath = path.join(projectRoot, '.mustflow', 'skills', 'INDEX.md');

	if (!existsSync(indexPath)) {
		return [];
	}

	const content = readFileSync(indexPath, 'utf8');
	const routes: IndexSkillRoute[] = [];
	let inRouteTable = false;

	for (const line of content.split(/\r?\n/u)) {
		if (!line.trim().startsWith('|')) {
			if (inRouteTable && line.trim() === '') {
				inRouteTable = false;
			}

			continue;
		}

		const cells = parseMarkdownTableRow(line);

		if (cells.includes('Skill Document') && cells.includes('Trigger')) {
			inRouteTable = true;
			continue;
		}

		if (!inRouteTable || isMarkdownSeparatorRow(cells) || cells.length < 7) {
			continue;
		}

		const [trigger, skillPath, requiredInput, editScope, risk, verificationIntents, expectedOutput] = cells;

		if (!skillPath?.startsWith('.mustflow/skills/') || !skillPath.endsWith('/SKILL.md')) {
			continue;
		}

		routes.push({
			skillName: skillNameFromPath(skillPath),
			skillPath,
			trigger: trigger ?? '',
			requiredInput: requiredInput ?? '',
			editScope: editScope ?? '',
			risk: risk ?? '',
			verificationIntents: splitVerificationIntents(verificationIntents ?? ''),
			expectedOutput: expectedOutput ?? '',
		});
	}

	return routes.sort((left, right) => {
		const skillOrder = left.skillName.localeCompare(right.skillName);
		return skillOrder === 0 ? left.trigger.localeCompare(right.trigger) : skillOrder;
	});
}

function collectCommandIntents(projectRoot: string): IndexCommandIntent[] {
	if (!existsSync(path.join(projectRoot, '.mustflow', 'config', 'commands.toml'))) {
		return [];
	}

	const contract = readCommandContract(projectRoot);
	const intents: IndexCommandIntent[] = [];

	for (const [name, intent] of Object.entries(contract.intents).sort(([left], [right]) => left.localeCompare(right))) {
		if (!isRecord(intent)) {
			continue;
		}

		intents.push({
			name,
			status: readString(intent, 'status') ?? 'unknown',
			lifecycle: readString(intent, 'lifecycle') ?? null,
			runPolicy: readString(intent, 'run_policy') ?? null,
			description: readString(intent, 'description') ?? null,
			effects: normalizeCommandEffects(projectRoot, contract, name),
		});
	}

	return intents;
}

function normalizeIndexedFileSourceScope(value: SqlValue | undefined): IndexedFileRecord['sourceScope'] {
	const sourceScope = toSearchString(value);

	if (sourceScope === 'source_anchor' || sourceScope === 'state') {
		return sourceScope;
	}

	return 'workflow';
}

function readIndexedFileRecord(
	projectRoot: string,
	relativePath: string,
	sourceScope: IndexedFileRecord['sourceScope'],
	contentHash: string | null = null,
): IndexedFileRecord {
	const metadata = readIndexedFileMetadataRecord(projectRoot, relativePath, sourceScope);

	return {
		...metadata,
		contentHash: contentHash ?? sha256Bytes(readFileSync(path.join(projectRoot, ...relativePath.split('/')))),
	};
}

function readIndexedFileMetadataRecord(
	projectRoot: string,
	relativePath: string,
	sourceScope: IndexedFileRecord['sourceScope'],
): Omit<IndexedFileRecord, 'contentHash'> {
	const fullPath = path.join(projectRoot, ...relativePath.split('/'));
	const stats = statSync(fullPath);

	return {
		path: relativePath,
		sourceScope,
		sizeBytes: stats.size,
		mtimeMs: Math.round(stats.mtimeMs),
	};
}

function collectIndexedFileRecords(
	projectRoot: string,
	documents: readonly IndexDocument[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
	sourceAnchorCandidatePaths: readonly string[] = [],
): IndexedFileRecord[] {
	const records = new Map<string, IndexedFileRecord>();

	for (const document of documents) {
		records.set(document.path, readIndexedFileRecord(projectRoot, document.path, 'workflow', document.contentHash));
	}

	const sourcePaths = new Set([...sourceAnchorCandidatePaths, ...sourceAnchors.map((anchor) => anchor.path)]);

	for (const anchorPath of [...sourcePaths].sort((left, right) => left.localeCompare(right))) {
		if (!records.has(anchorPath)) {
			records.set(anchorPath, readIndexedFileRecord(projectRoot, anchorPath, 'source_anchor'));
		}
	}

	if (existsSync(path.join(projectRoot, ...LATEST_RUN_STATE_RELATIVE_PATH.split('/')))) {
		records.set(
			LATEST_RUN_STATE_RELATIVE_PATH,
			readIndexedFileRecord(projectRoot, LATEST_RUN_STATE_RELATIVE_PATH, 'state'),
		);
	}

	return [...records.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function collectSourceAnchorCandidatePaths(projectRoot: string, sourceConfig: LocalIndexSourceConfig): string[] {
	return listSourceAnchorFiles(projectRoot, {
		...sourceConfig,
		excludeGeneratedOrVendor: true,
	});
}

function collectFastPreflightIndexedFileRecords(
	projectRoot: string,
	includeSource: boolean,
	sourceConfig: LocalIndexSourceConfig,
): IndexedFileRecord[] | null {
	const records = new Map<string, IndexedFileRecord>();

	for (const relativePath of getExistingIndexablePaths(projectRoot)) {
		records.set(relativePath, readIndexedFileRecord(projectRoot, relativePath, 'workflow'));
	}

	if (includeSource) {
		try {
			for (const sourcePath of collectSourceAnchorCandidatePaths(projectRoot, sourceConfig)) {
				if (!records.has(sourcePath)) {
					records.set(sourcePath, readIndexedFileRecord(projectRoot, sourcePath, 'source_anchor'));
				}
			}
		} catch {
			return null;
		}
	}

	if (existsSync(path.join(projectRoot, ...LATEST_RUN_STATE_RELATIVE_PATH.split('/')))) {
		records.set(
			LATEST_RUN_STATE_RELATIVE_PATH,
			readIndexedFileRecord(projectRoot, LATEST_RUN_STATE_RELATIVE_PATH, 'state'),
		);
	}

	return [...records.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function normalizeSearchText(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

function normalizeSearchTokenText(value: string): string {
	return normalizeSearchText(value).normalize('NFKC').toLowerCase();
}

function extractSearchTokens(value: string): string[] {
	return [...normalizeSearchTokenText(value).matchAll(/[\p{L}\p{N}]+/gu)]
		.map((match) => match[0])
		.filter((token): token is string => Boolean(token));
}

function buildSearchNgrams(values: readonly string[]): string[] {
	const grams = new Set<string>();

	for (const value of values) {
		for (const token of extractSearchTokens(value)) {
			const boundedToken = token.slice(0, SEARCH_NGRAM_MAX_TOKEN_CHARS);
			const maxLength = Math.min(SEARCH_NGRAM_MAX_LENGTH, boundedToken.length);

			for (let length = SEARCH_NGRAM_MIN_LENGTH; length <= maxLength; length += 1) {
				for (let index = 0; index <= boundedToken.length - length; index += 1) {
					grams.add(boundedToken.slice(index, index + length));

					if (grams.size >= SEARCH_NGRAM_MAX_GRAMS_PER_TARGET) {
						return [...grams].sort((left, right) => left.localeCompare(right));
					}
				}
			}
		}
	}

	return [...grams].sort((left, right) => left.localeCompare(right));
}

function toSearchString(value: SqlValue | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}

	if (value instanceof Uint8Array) {
		return '';
	}

	return String(value);
}

function queryRows(database: SqlJsDatabase, sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
	const [result] = database.exec(sql, params);

	if (!result) {
		return [];
	}

	return result.values.map((values) => {
		const row: Record<string, SqlValue> = {};

		result.columns.forEach((column, index) => {
			row[column] = values[index] ?? null;
		});

		return row;
	});
}

interface LocalSearchCapabilities {
	readonly backend: SearchBackendKind;
	readonly fts5Available: boolean;
}

interface VerificationEvidenceSummary {
	readonly sourcePath: string;
	readonly sourceHash: string;
	readonly command: string;
	readonly kind: string;
	readonly status: string;
	readonly runDir: string | null;
	readonly manifestPath: string | null;
	readonly verificationPlanId: string | null;
	readonly completionStatus: string | null;
	readonly primaryReason: string | null;
	readonly matchedIntents: number;
	readonly ranIntents: number;
	readonly passedIntents: number;
	readonly failedIntents: number;
	readonly skippedIntents: number;
	readonly receiptCount: number;
	readonly coverageCount: number;
	readonly remainingRiskCount: number;
	readonly failureFingerprint: string | null;
}

interface VerificationReceiptSummary {
	readonly sourcePath: string;
	readonly ordinal: number;
	readonly intent: string | null;
	readonly status: string;
	readonly skipped: boolean;
	readonly verificationPlanId: string | null;
	readonly receiptPath: string | null;
	readonly receiptSha256: string | null;
	readonly commandFingerprint: string | null;
	readonly contractFingerprint: string | null;
	readonly currentStateHash: string | null;
	readonly writeDriftStatus: string | null;
}

interface VerificationCoverageState {
	readonly sourcePath: string;
	readonly criterionId: string;
	readonly source: string;
	readonly status: string;
	readonly requirementReason: string | null;
	readonly intents: readonly string[];
	readonly receiptCount: number;
	readonly gapCount: number;
	readonly sourceAnchorCount: number;
}

interface VerificationRiskSignal {
	readonly sourcePath: string;
	readonly ordinal: number;
	readonly code: string;
	readonly severity: string;
	readonly detailHash: string;
}

interface ValidationRatchetSignalReadModel {
	readonly signalId: string;
	readonly planId: string | null;
	readonly code: string;
	readonly severity: string;
	readonly pathHash: string;
	readonly beforeHash: string | null;
	readonly afterHash: string | null;
}

interface SourceAnchorRiskSignalReadModel {
	readonly anchorId: string;
	readonly pathHash: string;
	readonly status: SourceAnchorStatus;
	readonly riskSignal: string;
	readonly confidence: number;
	readonly navigationOnly: boolean;
	readonly canInstructAgent: boolean;
}

interface VerificationFailureFingerprint {
	readonly sourcePath: string;
	readonly fingerprint: string;
	readonly verificationPlanId: string | null;
	readonly status: string;
	readonly failedIntents: readonly string[];
	readonly primaryReason: string | null;
	readonly failedIntentsHash: string | null;
	readonly riskCodesHash: string | null;
	readonly affectedSurfacesHash: string | null;
	readonly firstSeenAt: string | null;
	readonly lastSeenAt: string | null;
	readonly seenCount: number;
	readonly requiresNewEvidence: boolean;
}

interface VerificationPlanReadModel {
	readonly planId: string;
	readonly sourcePath: string;
	readonly classificationHash: string | null;
	readonly commandContractHash: string | null;
	readonly selectedIntentsHash: string | null;
	readonly createdAt: string | null;
	readonly sourceHash: string;
}

interface AcceptanceCriterionReadModel {
	readonly criterionId: string;
	readonly planId: string;
	readonly source: string;
	readonly statementHash: string | null;
	readonly reason: string | null;
	readonly surface: string | null;
	readonly pathHash: string | null;
}

interface CriterionCoverageReadModel {
	readonly criterionId: string;
	readonly planId: string;
	readonly status: string;
	readonly receiptCount: number;
	readonly gapCount: number;
	readonly riskCount: number;
}

interface CommandReceiptReadModel {
	readonly receiptHash: string;
	readonly planId: string;
	readonly intent: string | null;
	readonly status: string;
	readonly commandFingerprint: string | null;
	readonly contractFingerprint: string | null;
	readonly currentStateHash: string | null;
	readonly writeDriftStatus: string | null;
}

interface CompletionVerdictSummaryReadModel {
	readonly claimId: string;
	readonly planId: string;
	readonly status: string;
	readonly primaryReason: string | null;
	readonly riskCount: number;
	readonly contradictionCount: number;
	readonly blockerCount: number;
}

interface ReproRouteReadModel {
	readonly routeId: string;
	readonly taskHash: string;
	readonly routeDigest: string | null;
	readonly routeKind: string | null;
	readonly failureOracleHash: string | null;
}

interface ReproObservationReadModel {
	readonly routeId: string;
	readonly phase: 'before_fix' | 'after_fix' | 'regression_guard';
	readonly outcome: string | null;
	readonly receiptHash: string | null;
	readonly diagnosticFingerprint: string;
}

interface FailureFingerprintReadModel {
	readonly fingerprint: string;
	readonly planId: string | null;
	readonly failedIntentsHash: string | null;
	readonly riskCodesHash: string | null;
	readonly seenCount: number;
	readonly firstSeenAt: string | null;
	readonly lastSeenAt: string | null;
}

interface VerificationEvidenceIndex {
	readonly summaries: readonly VerificationEvidenceSummary[];
	readonly verificationPlans: readonly VerificationPlanReadModel[];
	readonly acceptanceCriteria: readonly AcceptanceCriterionReadModel[];
	readonly criterionCoverage: readonly CriterionCoverageReadModel[];
	readonly receipts: readonly VerificationReceiptSummary[];
	readonly commandReceiptSummaries: readonly CommandReceiptReadModel[];
	readonly coverageStates: readonly VerificationCoverageState[];
	readonly riskSignals: readonly VerificationRiskSignal[];
	readonly validationRatchetSignals: readonly ValidationRatchetSignalReadModel[];
	readonly completionVerdictSummaries: readonly CompletionVerdictSummaryReadModel[];
	readonly failureFingerprints: readonly VerificationFailureFingerprint[];
	readonly reproRoutes: readonly ReproRouteReadModel[];
	readonly reproObservations: readonly ReproObservationReadModel[];
	readonly failureFingerprintReadModels: readonly FailureFingerprintReadModel[];
}

const VALIDATION_RATCHET_RISK_CODES = new Set([
	'related_test_deleted',
	'skip_or_only_marker_present',
	'todo_or_pending_marker_added',
	'assertion_count_decreased',
	'assertion_matcher_weakened',
	'negative_assertion_removed',
	'exception_assertion_removed',
	'snapshot_mass_updated',
	'golden_output_replaced',
	'verification_intent_disabled',
	'verification_required_after_removed',
	'success_exit_codes_widened',
	'command_allows_no_tests',
	'command_forces_snapshot_update',
	'command_hides_failure',
	'coverage_threshold_lowered',
	'test_selection_narrowed',
]);

function searchCapabilities(fts5Available: boolean): LocalSearchCapabilities {
	return {
		backend: fts5Available ? SEARCH_BACKEND_FTS5 : SEARCH_BACKEND_TABLE_SCAN,
		fts5Available,
	};
}

function detectLocalSearchCapabilities(database: SqlJsDatabase): LocalSearchCapabilities {
	if (process.env[TEST_DISABLE_FTS5_ENV] === '1') {
		return searchCapabilities(false);
	}

	try {
		database.run('CREATE VIRTUAL TABLE temp.mustflow_fts5_probe USING fts5(value)');
		database.run('DROP TABLE temp.mustflow_fts5_probe');
		return searchCapabilities(true);
	} catch {
		return searchCapabilities(false);
	}
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
	try {
		const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
		return isJsonRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function stringField(record: Record<string, unknown> | null | undefined, key: string): string | null {
	const value = record?.[key];
	return typeof value === 'string' ? value : null;
}

function booleanField(record: Record<string, unknown> | null | undefined, key: string): boolean {
	return record?.[key] === true;
}

function numberField(record: Record<string, unknown> | null | undefined, key: string): number {
	const value = record?.[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function recordField(record: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
	const value = record?.[key];
	return isJsonRecord(value) ? value : null;
}

function recordArrayField(record: Record<string, unknown> | null | undefined, key: string): readonly Record<string, unknown>[] {
	const value = record?.[key];
	return Array.isArray(value) ? value.filter(isJsonRecord) : [];
}

function stringArrayField(record: Record<string, unknown> | null | undefined, key: string): readonly string[] {
	const value = record?.[key];
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function joinedList(values: readonly string[]): string {
	return [...values].sort((left, right) => left.localeCompare(right)).join(', ');
}

function hashJson(value: unknown): string {
	return sha256Text(JSON.stringify(value));
}

function stringListHash(values: readonly (string | null)[]): string | null {
	const normalized = values.filter((value): value is string => typeof value === 'string' && value.length > 0);
	return normalized.length > 0 ? hashJson([...normalized].sort((left, right) => left.localeCompare(right))) : null;
}

function reproObservation(
	routeId: string,
	phase: ReproObservationReadModel['phase'],
	evidence: Record<string, unknown> | null,
): ReproObservationReadModel {
	const status = stringField(evidence, 'status');
	const outcome = stringField(evidence, 'outcome') ?? status;
	const receiptHash = stringField(evidence, 'receipt_sha256');
	const diagnosticFingerprint =
		stringField(evidence, 'diagnostic_fingerprint') ??
		stringField(evidence, 'diagnostic_hash') ??
		hashJson({
			phase,
			status,
			outcome,
			summary: stringField(evidence, 'summary'),
			reason: stringField(evidence, 'reason'),
		});

	return {
		routeId,
		phase,
		outcome,
		receiptHash,
		diagnosticFingerprint,
	};
}

function evidenceStatusForRunReceipt(latest: Record<string, unknown>): string {
	return stringField(latest, 'status') ?? (booleanField(latest, 'timed_out') ? 'timed_out' : 'unknown');
}

function failedIntentsFromReceipts(receipts: readonly VerificationReceiptSummary[]): readonly string[] {
	return receipts
		.filter((receipt) => ['failed', 'timed_out', 'start_failed'].includes(receipt.status))
		.map((receipt) => receipt.intent)
		.filter((intent): intent is string => typeof intent === 'string' && intent.length > 0)
		.sort((left, right) => left.localeCompare(right));
}

function createFailureFingerprint(input: {
	readonly command: string;
	readonly status: string;
	readonly verificationPlanId: string | null;
	readonly primaryReason: string | null;
	readonly failedIntents: readonly string[];
	readonly riskCodes: readonly string[];
	readonly runIntent?: string | null;
	readonly timedOut?: boolean;
	readonly exitCodeClass?: string | null;
	readonly errorKind?: string | null;
}): string | null {
	if (
		input.status === 'passed' ||
		input.status === 'verified' ||
		(input.failedIntents.length === 0 && input.riskCodes.length === 0 && input.timedOut !== true && !input.errorKind)
	) {
		return null;
	}

	return sha256Text(
		JSON.stringify({
			command: input.command,
			status: input.status,
			verificationPlanId: input.verificationPlanId,
			primaryReason: input.primaryReason,
			failedIntents: [...input.failedIntents].sort((left, right) => left.localeCompare(right)),
			riskCodes: [...input.riskCodes].sort((left, right) => left.localeCompare(right)),
			runIntent: input.runIntent ?? null,
			timedOut: input.timedOut === true,
			exitCodeClass: input.exitCodeClass ?? null,
			errorKind: input.errorKind ?? null,
		}),
	);
}

function createVerificationEvidenceIndex(projectRoot: string): VerificationEvidenceIndex {
	const latestPath = path.join(projectRoot, ...LATEST_RUN_STATE_RELATIVE_PATH.split('/'));

	if (!existsSync(latestPath)) {
		return {
			summaries: [],
			verificationPlans: [],
			acceptanceCriteria: [],
			criterionCoverage: [],
			receipts: [],
			commandReceiptSummaries: [],
			coverageStates: [],
			riskSignals: [],
			validationRatchetSignals: [],
			completionVerdictSummaries: [],
			failureFingerprints: [],
			reproRoutes: [],
			reproObservations: [],
			failureFingerprintReadModels: [],
		};
	}

	const latest = readJsonRecord(latestPath);

	if (!latest) {
		return {
			summaries: [],
			verificationPlans: [],
			acceptanceCriteria: [],
			criterionCoverage: [],
			receipts: [],
			commandReceiptSummaries: [],
			coverageStates: [],
			riskSignals: [],
			validationRatchetSignals: [],
			completionVerdictSummaries: [],
			failureFingerprints: [],
			reproRoutes: [],
			reproObservations: [],
			failureFingerprintReadModels: [],
		};
	}

	const sourceHash = sha256Bytes(readFileSync(latestPath));
	const command = stringField(latest, 'command') ?? 'unknown';
	const kind = stringField(latest, 'kind') ?? (command === 'verify' ? 'verify_run_summary' : 'run_receipt');
	const evidenceModel = recordField(latest, 'evidence_model');
	const completionVerdict = recordField(latest, 'completion_verdict');
	const completionEvidence = recordField(completionVerdict, 'evidence');
	const verificationPlanId = stringField(latest, 'verification_plan_id') ?? stringField(evidenceModel, 'verification_plan_id');
	const primaryReason = stringField(completionVerdict, 'primary_reason');
	const status = stringField(latest, 'status') ?? stringField(completionVerdict, 'status') ?? 'unknown';
	const completionStatus = stringField(completionVerdict, 'status');
	const rawReceipts = recordArrayField(evidenceModel, 'receipts');
	const rawCoverage = recordArrayField(evidenceModel, 'coverage_matrix');
	const rawRequirements = recordArrayField(evidenceModel, 'requirements');
	const rawRisks = recordArrayField(evidenceModel, 'remaining_risks');
	const recordedFailureFingerprintRecord = recordField(latest, 'failure_fingerprint');
	const repeatedFailureSummary = recordField(latest, 'repeated_failure_summary');
	const reproEvidence = recordField(latest, 'repro_evidence') ?? recordField(evidenceModel, 'repro_evidence');
	const reproductionRoute = recordField(reproEvidence, 'reproduction_route');
	const recordedFailureFingerprint = stringField(recordedFailureFingerprintRecord, 'fingerprint');
	const receipts: VerificationReceiptSummary[] =
		rawReceipts.length > 0
			? rawReceipts.map((receipt, index) => ({
					sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
					ordinal: index + 1,
					intent: stringField(receipt, 'intent'),
					status: stringField(receipt, 'status') ?? 'unknown',
					skipped: booleanField(receipt, 'skipped'),
					verificationPlanId: stringField(receipt, 'verification_plan_id'),
					receiptPath: stringField(receipt, 'receipt_path'),
					receiptSha256: stringField(receipt, 'receipt_sha256'),
					commandFingerprint: stringField(receipt, 'command_fingerprint'),
					contractFingerprint: stringField(receipt, 'contract_fingerprint'),
					currentStateHash:
						stringField(receipt, 'head_tree_hash') ??
						stringField(receipt, 'changed_files_hash') ??
						stringField(receipt, 'changed_file_hash'),
					writeDriftStatus: stringField(receipt, 'write_drift_status'),
				}))
			: [
					{
						sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
						ordinal: 1,
						intent: stringField(latest, 'intent'),
						status: evidenceStatusForRunReceipt(latest),
						skipped: false,
						verificationPlanId: null,
						receiptPath: stringField(latest, 'receipt_path') ?? LATEST_RUN_STATE_RELATIVE_PATH,
						receiptSha256: sourceHash,
						commandFingerprint: stringField(recordField(latest, 'performance'), 'command_fingerprint'),
						contractFingerprint: stringField(recordField(latest, 'performance'), 'contract_fingerprint'),
						currentStateHash: stringField(latest, 'head_tree_hash') ?? stringField(latest, 'changed_files_hash'),
						writeDriftStatus: stringField(recordField(latest, 'write_drift'), 'status'),
					},
				];
	const coverageStates = rawCoverage.map((coverage): VerificationCoverageState => {
		const evidence = recordField(coverage, 'evidence');

		return {
			sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
			criterionId: stringField(coverage, 'criterion_id') ?? 'unknown',
			source: stringField(coverage, 'source') ?? 'unknown',
			status: stringField(coverage, 'status') ?? 'unknown',
			requirementReason: stringField(coverage, 'requirement_reason'),
			intents: stringArrayField(evidence, 'intents'),
			receiptCount: stringArrayField(evidence, 'receipt_paths').length,
			gapCount: stringArrayField(evidence, 'gap_reasons').length,
			sourceAnchorCount: stringArrayField(evidence, 'source_anchor_ids').length,
		};
	});
	const riskSignals = rawRisks.map((risk, index): VerificationRiskSignal => ({
		sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
		ordinal: index + 1,
		code: stringField(risk, 'code') ?? 'unknown',
		severity: stringField(risk, 'severity') ?? 'unknown',
		detailHash: sha256Text(stringField(risk, 'detail') ?? ''),
	}));
	const validationRatchetSignals = rawRisks
		.map((risk, index): ValidationRatchetSignalReadModel | null => {
			const code = stringField(risk, 'code') ?? 'unknown';
			if (!VALIDATION_RATCHET_RISK_CODES.has(code)) {
				return null;
			}

			const severity = stringField(risk, 'severity') ?? 'unknown';
			const pathValue = stringField(risk, 'path');
			const detailHash = sha256Text(stringField(risk, 'detail') ?? '');
			const pathHash = pathValue === null ? hashJson({ code, detailHash }) : sha256Text(pathValue);
			const beforeHash = stringField(risk, 'before_hash') ?? stringField(risk, 'before_digest');
			const afterHash = stringField(risk, 'after_hash') ?? stringField(risk, 'after_digest');

			return {
				signalId: hashJson({
					sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
					ordinal: index + 1,
					planId: verificationPlanId,
					code,
					pathHash,
					beforeHash,
					afterHash,
				}),
				planId: verificationPlanId,
				code,
				severity,
				pathHash,
				beforeHash,
				afterHash,
			};
		})
		.filter((signal): signal is ValidationRatchetSignalReadModel => signal !== null);
	const verificationPlans: VerificationPlanReadModel[] =
		verificationPlanId === null
			? []
			: [
					{
						planId: verificationPlanId,
						sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
						classificationHash:
							rawRequirements.length > 0 || rawCoverage.length > 0
								? hashJson({
										requirements: rawRequirements.map((requirement) => ({
											id: stringField(requirement, 'requirement_id') ?? stringField(requirement, 'id'),
											reason: stringField(requirement, 'reason'),
											source: stringField(requirement, 'source'),
										})),
										coverage: rawCoverage.map((coverage) => ({
											id: stringField(coverage, 'criterion_id'),
											reason: stringField(coverage, 'requirement_reason'),
											source: stringField(coverage, 'source'),
											status: stringField(coverage, 'status'),
										})),
									})
								: null,
						commandContractHash: stringListHash(receipts.map((receipt) => receipt.contractFingerprint)),
						selectedIntentsHash: stringListHash(receipts.map((receipt) => receipt.intent)),
						createdAt: stringField(latest, 'started_at') ?? stringField(latest, 'created_at'),
						sourceHash,
					},
				];
	const acceptanceCriteria =
		verificationPlanId === null
			? []
			: rawCoverage.map((coverage): AcceptanceCriterionReadModel => {
					const evidence = recordField(coverage, 'evidence');
					const pathRefs = [
						...stringArrayField(evidence, 'paths'),
						...stringArrayField(evidence, 'changed_paths'),
						...stringArrayField(evidence, 'source_anchor_ids'),
					];

					return {
						criterionId: stringField(coverage, 'criterion_id') ?? 'unknown',
						planId: verificationPlanId,
						source: stringField(coverage, 'source') ?? 'unknown',
						statementHash: stringField(coverage, 'statement') ? sha256Text(stringField(coverage, 'statement') ?? '') : null,
						reason: stringField(coverage, 'requirement_reason'),
						surface: stringField(coverage, 'surface'),
						pathHash: pathRefs.length > 0 ? stringListHash(pathRefs) : null,
					};
				});
	const criterionCoverage =
		verificationPlanId === null
			? []
			: coverageStates.map((coverage): CriterionCoverageReadModel => ({
					criterionId: coverage.criterionId,
					planId: verificationPlanId,
					status: coverage.status,
					receiptCount: coverage.receiptCount,
					gapCount: coverage.gapCount,
					riskCount: coverage.sourceAnchorCount,
				}));
	const commandReceiptSummaries =
		verificationPlanId === null
			? []
			: receipts
					.filter((receipt) => receipt.verificationPlanId === verificationPlanId || receipt.verificationPlanId === null)
					.map((receipt): CommandReceiptReadModel => ({
						receiptHash:
							receipt.receiptSha256 ??
							hashJson({
								sourcePath: receipt.sourcePath,
								ordinal: receipt.ordinal,
								intent: receipt.intent,
								status: receipt.status,
								verificationPlanId,
							}),
						planId: verificationPlanId,
						intent: receipt.intent,
						status: receipt.status,
						commandFingerprint: receipt.commandFingerprint,
						contractFingerprint: receipt.contractFingerprint,
						currentStateHash: receipt.currentStateHash,
						writeDriftStatus: receipt.writeDriftStatus,
					}));
	const completionVerdictSummaries =
		verificationPlanId === null || completionStatus === null
			? []
			: [
					{
						claimId: hashJson({
							sourceHash,
							verificationPlanId,
							completionStatus,
							primaryReason,
						}),
						planId: verificationPlanId,
						status: completionStatus,
						primaryReason,
						riskCount: riskSignals.length,
						contradictionCount: stringArrayField(completionVerdict, 'contradictions').length,
						blockerCount: stringArrayField(completionVerdict, 'blockers').length,
					},
				];
	const failedIntents = failedIntentsFromReceipts(receipts);
	const failureFingerprint =
		recordedFailureFingerprint ??
		createFailureFingerprint({
			command,
			status: completionStatus ?? status,
			verificationPlanId,
			primaryReason,
			failedIntents,
			riskCodes: riskSignals.map((risk) => risk.code),
			runIntent: stringField(latest, 'intent'),
			timedOut: booleanField(latest, 'timed_out'),
			exitCodeClass: stringField(recordField(recordField(latest, 'performance'), 'result_summary'), 'exit_code_class'),
			errorKind: stringField(recordField(recordField(latest, 'performance'), 'result_summary'), 'error_kind'),
		});
	const failureFingerprints =
		failureFingerprint === null
			? []
			: [
					{
						sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
						fingerprint: failureFingerprint,
						verificationPlanId,
						status: completionStatus ?? status,
						failedIntents,
						primaryReason,
						failedIntentsHash:
							stringField(recordedFailureFingerprintRecord, 'failed_intents_hash') ??
							stringField(repeatedFailureSummary, 'failed_intents_hash'),
						riskCodesHash:
							stringField(recordedFailureFingerprintRecord, 'risk_codes_hash') ??
							stringField(repeatedFailureSummary, 'risk_codes_hash'),
						affectedSurfacesHash:
							stringField(recordedFailureFingerprintRecord, 'affected_surfaces_hash') ??
							stringField(repeatedFailureSummary, 'affected_surfaces_hash'),
						firstSeenAt: stringField(repeatedFailureSummary, 'first_seen_at'),
						lastSeenAt: stringField(repeatedFailureSummary, 'last_seen_at'),
						seenCount: Math.max(1, numberField(repeatedFailureSummary, 'seen_count')),
						requiresNewEvidence: booleanField(repeatedFailureSummary, 'requires_new_evidence'),
					},
				];
	const routeId = stringField(reproductionRoute, 'route_id');
	const reproRoutes =
		routeId === null || reproEvidence === null
			? []
			: [
					{
						routeId,
						taskHash: hashJson({
							reported_symptom: stringField(reproEvidence, 'reported_symptom'),
							expected_behavior: stringField(reproEvidence, 'expected_behavior'),
							observed_behavior: stringField(reproEvidence, 'observed_behavior'),
						}),
						routeDigest: stringField(reproductionRoute, 'route_digest'),
						routeKind: stringField(reproductionRoute, 'route_kind'),
						failureOracleHash: stringField(reproductionRoute, 'failure_oracle_hash'),
					},
				];
	const reproObservations =
		routeId === null || reproEvidence === null
			? []
			: [
					reproObservation(routeId, 'before_fix', recordField(reproEvidence, 'before_fix')),
					reproObservation(routeId, 'after_fix', recordField(reproEvidence, 'after_fix')),
					reproObservation(routeId, 'regression_guard', recordField(reproEvidence, 'regression_guard')),
				];
	const failureFingerprintReadModels = failureFingerprints.map((fingerprint): FailureFingerprintReadModel => ({
		fingerprint: fingerprint.fingerprint,
		planId: fingerprint.verificationPlanId,
		failedIntentsHash: fingerprint.failedIntentsHash ?? stringListHash(fingerprint.failedIntents),
		riskCodesHash: fingerprint.riskCodesHash,
		seenCount: fingerprint.seenCount,
		firstSeenAt: fingerprint.firstSeenAt,
		lastSeenAt: fingerprint.lastSeenAt,
	}));

	return {
		summaries: [
			{
				sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
				sourceHash,
				command,
				kind,
				status,
				runDir: stringField(latest, 'run_dir'),
				manifestPath: stringField(latest, 'manifest_path'),
				verificationPlanId,
				completionStatus,
				primaryReason,
				matchedIntents: numberField(completionEvidence, 'matched_intents'),
				ranIntents: numberField(completionEvidence, 'ran_intents'),
				passedIntents: numberField(completionEvidence, 'passed_intents'),
				failedIntents: numberField(completionEvidence, 'failed_intents'),
				skippedIntents: numberField(completionEvidence, 'skipped_intents'),
				receiptCount: receipts.length,
				coverageCount: coverageStates.length,
				remainingRiskCount: riskSignals.length,
				failureFingerprint,
			},
		],
		verificationPlans,
		acceptanceCriteria,
		criterionCoverage,
		receipts,
		commandReceiptSummaries,
		coverageStates,
		riskSignals,
		validationRatchetSignals,
		completionVerdictSummaries,
		failureFingerprints,
		reproRoutes,
		reproObservations,
		failureFingerprintReadModels,
	};
}

function readMetadataValue(database: SqlJsDatabase, key: string): string | undefined {
	return toSearchString(queryRows(database, 'SELECT value FROM metadata WHERE key = ?', [key])[0]?.value) || undefined;
}

function hasTable(database: SqlJsDatabase, tableName: string): boolean {
	return queryRows(database, 'SELECT name FROM sqlite_master WHERE type = "table" AND name = ?', [tableName]).length > 0;
}

function readStoredSearchCapabilities(database: SqlJsDatabase): LocalSearchCapabilities {
	const fts5Available = readMetadataValue(database, 'search_fts5_available') === 'true';
	const backend = readMetadataValue(database, 'search_backend');

	if (backend === SEARCH_BACKEND_FTS5 && hasTable(database, 'search_documents_fts')) {
		return { backend: SEARCH_BACKEND_FTS5, fts5Available };
	}

	return { backend: SEARCH_BACKEND_TABLE_SCAN, fts5Available };
}

function toNullableNumber(value: SqlValue | undefined): number | null {
	if (typeof value !== 'number') {
		return null;
	}

	return Number.isFinite(value) ? value : null;
}

function splitIndexedList(value: SqlValue | undefined): string[] {
	return toSearchString(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
}

function createCommandEffectGraphStatus(
	databasePath: string,
	status: LocalCommandEffectGraphStatus,
	stalePaths: readonly string[] = [],
): LocalCommandEffectGraph {
	return {
		source: 'local_index',
		authority: 'explanation_only',
		commandAuthority: '.mustflow/config/commands.toml',
		grantsCommandAuthority: false,
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		writeLocks: [],
		lockConflicts: [],
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh command-effect graph explanations.',
	};
}

async function readPreviousSourceAnchorSnapshots(databasePath: string): Promise<SourceAnchorSnapshot[]> {
	if (!existsSync(databasePath)) {
		return [];
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const rows = queryRows(
			database,
			`
SELECT
  source_anchors.id,
  source_anchors.path,
  source_anchors.line_start,
  source_anchors.purpose,
  source_anchors.search_terms,
  source_anchors.invariant,
  source_anchors.risk,
  source_anchor_fingerprints.anchor_metadata_hash,
  source_anchor_fingerprints.anchor_text_hash,
  source_anchor_fingerprints.context_hash,
  source_anchor_fingerprints.search_terms_hash,
  source_anchor_fingerprints.invariant_hash,
  source_anchor_fingerprints.risk_hash,
  source_anchor_fingerprints.symbol_kind,
  source_anchor_fingerprints.symbol_name,
  source_anchor_fingerprints.symbol_exported,
  source_anchor_fingerprints.signature_hash,
  source_anchor_fingerprints.body_hash,
  source_anchor_fingerprints.symbol_start_line,
  source_anchor_fingerprints.symbol_end_line
FROM source_anchors
JOIN source_anchor_fingerprints ON source_anchor_fingerprints.anchor_id = source_anchors.id
`,
		);

		return rows.map((row) => {
			const symbol: SourceAnchorSymbol = {
				kind: toSearchString(row.symbol_kind) as SourceAnchorSymbol['kind'],
				name: toSearchString(row.symbol_name) || null,
				exported: Number(row.symbol_exported) === 1,
				signatureHash: toSearchString(row.signature_hash) || null,
				bodyHash: toSearchString(row.body_hash) || null,
				startLine: toNullableNumber(row.symbol_start_line),
				endLine: toNullableNumber(row.symbol_end_line),
			};

			return {
				id: toSearchString(row.id),
				path: toSearchString(row.path),
				lineStart: Number(row.line_start),
				purpose: toSearchString(row.purpose) || null,
				search: toSearchString(row.search_terms)
					.split(/[,;]/u)
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				invariant: toSearchString(row.invariant) || null,
				risk: toSearchString(row.risk)
					.split(/[,;]/u)
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				navigationOnly: true,
				canInstructAgent: false,
				fingerprint: {
					anchorMetadataHash: toSearchString(row.anchor_metadata_hash),
					anchorTextHash: toSearchString(row.anchor_text_hash),
					contextHash: toSearchString(row.context_hash),
					searchTermsHash: toSearchString(row.search_terms_hash) || null,
					invariantHash: toSearchString(row.invariant_hash) || null,
					riskHash: toSearchString(row.risk_hash),
					symbol,
				},
			};
		});
	} catch {
		return [];
	} finally {
		database.close();
	}
}

interface CacheLayerSets {
	readonly stable: ReadonlySet<string>;
	readonly task: ReadonlySet<string>;
	readonly volatile: ReadonlySet<string>;
}

function readCacheLayerSets(projectRoot: string): CacheLayerSets {
	const mustflow = readMustflowToml(projectRoot);
	const promptCache = readNestedTable(mustflow, 'prompt_cache');
	const layers = readNestedTable(promptCache, 'layers');
	const stable = readNestedTable(layers, 'stable');
	const task = readNestedTable(layers, 'task');
	const volatile = readNestedTable(layers, 'volatile');
	const normalize = (values: readonly string[]) => new Set(values.map((value) => toPosixPath(value)));

	return {
		stable: normalize(readOptionalStringArray(stable, 'read') ?? [...DEFAULT_PROMPT_CACHE_STABLE_READ]),
		task: normalize(readOptionalStringArray(task, 'sources') ?? [...DEFAULT_PROMPT_CACHE_TASK_SOURCES]),
		volatile: normalize(readOptionalStringArray(volatile, 'sources') ?? [...DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES]),
	};
}

function inferCacheLayer(relativePath: string | null, kind: LocalSearchItem['kind'], cacheLayers: CacheLayerSets): CacheLayer {
	const normalized = relativePath ? toPosixPath(relativePath) : null;

	if (normalized && cacheLayers.volatile.has(normalized)) {
		return 'volatile';
	}

	if (normalized && cacheLayers.stable.has(normalized)) {
		return 'stable';
	}

	if (kind === 'command_intent' && cacheLayers.stable.has('.mustflow/config/commands.toml')) {
		return 'stable';
	}

	if (
		normalized &&
		(cacheLayers.task.has(normalized) || normalized.startsWith('.mustflow/context/') || normalized.endsWith('/SKILL.md'))
	) {
		return 'task';
	}

	if (normalized?.startsWith('.mustflow/state/') || normalized?.startsWith('.mustflow/cache/')) {
		return 'volatile';
	}

	return 'task';
}

function withCacheHint<T extends Omit<LocalSearchItem, 'cache_layer' | 'volatile'>>(
	item: T,
	cacheLayers: CacheLayerSets,
): T & Pick<LocalSearchItem, 'cache_layer' | 'volatile'> {
	const layer = inferCacheLayer(item.path ?? null, item.kind, cacheLayers);

	return {
		...item,
		cache_layer: layer,
		volatile: layer === 'volatile',
	};
}

function workflowAuthorityForDocument(documentType: string): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	if (documentType === 'agent_rules' || documentType === 'config' || documentType === 'workflow_doc') {
		return {
			authority_rank: 2,
			authority_label: 'workflow_authority',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: true,
		};
	}

	return {
		authority_rank: 4,
		authority_label: 'workflow_context',
		source_scope: 'workflow',
		navigation_only: false,
		can_instruct_agent: false,
	};
}

function skillAuthority(): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	return {
		authority_rank: 3,
		authority_label: 'skill_procedure',
		source_scope: 'workflow',
		navigation_only: false,
		can_instruct_agent: true,
	};
}

function commandIntentAuthority(): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	return {
		authority_rank: 1,
		authority_label: 'command_contract',
		source_scope: 'workflow',
		navigation_only: false,
		can_instruct_agent: true,
	};
}

function sourceAnchorAuthority(): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	return {
		authority_rank: 5,
		authority_label: 'source_navigation_hint',
		source_scope: 'source',
		navigation_only: true,
		can_instruct_agent: false,
	};
}

function getMatchSnippet(fields: readonly string[], query: string): string {
	const normalized = normalizeSearchText(fields.join(' '));
	const lower = normalized.toLowerCase();
	let start = lower.indexOf(query.toLowerCase());
	let matchLength = query.length;

	if (start === -1) {
		const [firstGram] = buildSearchNgrams([query]).filter((gram) => lower.includes(gram));

		if (!firstGram) {
			return truncateSearchMatchSnippet(normalized);
		}

		start = lower.indexOf(firstGram);
		matchLength = firstGram.length;
	}

	const from = Math.max(0, start - SEARCH_MATCH_CONTEXT_BEFORE_CHARS);
	const to = Math.min(normalized.length, start + matchLength + SEARCH_MATCH_CONTEXT_AFTER_CHARS);
	const prefix = from > 0 ? SEARCH_MATCH_TRUNCATION_MARKER : '';
	const suffix = to < normalized.length ? SEARCH_MATCH_TRUNCATION_MARKER : '';

	return truncateSearchMatchSnippet(`${prefix}${normalized.slice(from, to)}${suffix}`);
}

function truncateSearchMatchSnippet(value: string): string {
	if (value.length <= MAX_SEARCH_MATCH_SNIPPET_CHARS) {
		return value;
	}

	return `${value.slice(0, MAX_SEARCH_MATCH_SNIPPET_CHARS - SEARCH_MATCH_TRUNCATION_MARKER.length)}${SEARCH_MATCH_TRUNCATION_MARKER}`;
}

function scoreMatch(primaryFields: readonly string[], secondaryFields: readonly string[], query: string): number {
	const lowerQuery = query.toLowerCase();

	if (primaryFields.some((field) => field.toLowerCase() === lowerQuery)) {
		return 100;
	}

	if (primaryFields.some((field) => field.toLowerCase().includes(lowerQuery))) {
		return 80;
	}

	if (secondaryFields.some((field) => field.toLowerCase().includes(lowerQuery))) {
		return 40;
	}

	return 0;
}

function isMatched(fields: readonly string[], query: string): boolean {
	const lowerQuery = query.toLowerCase();

	return fields.some((field) => field.toLowerCase().includes(lowerQuery));
}

function createSchema(database: SqlJsDatabase, capabilities: LocalSearchCapabilities): void {
	database.run(`
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE indexed_files (
  path TEXT PRIMARY KEY,
  source_scope TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mtime_ms INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  index_mode TEXT NOT NULL,
  parser_version TEXT NOT NULL
);

CREATE TABLE documents (
  path TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  locale TEXT,
	revision INTEGER,
  content_hash TEXT NOT NULL,
  content_snippet TEXT NOT NULL
);

CREATE TABLE sections (
  document_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  heading TEXT NOT NULL,
  PRIMARY KEY (document_path, ordinal)
);

CREATE TABLE document_terms (
  document_path TEXT NOT NULL,
  term TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (document_path, term, source)
);

CREATE TABLE search_ngrams (
  target_kind TEXT NOT NULL,
  target_key TEXT NOT NULL,
  gram TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (target_kind, target_key, gram, source)
);

CREATE INDEX search_ngrams_lookup ON search_ngrams(target_kind, gram, target_key);

CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE skill_routes (
  skill_name TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  trigger TEXT NOT NULL,
  required_input TEXT NOT NULL,
  edit_scope TEXT NOT NULL,
  risk TEXT NOT NULL,
  verification_intents TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  PRIMARY KEY (skill_name, trigger)
);

CREATE TABLE command_intents (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  lifecycle TEXT,
  run_policy TEXT,
  description TEXT
);

CREATE TABLE command_effects (
  intent TEXT NOT NULL,
  source TEXT NOT NULL,
  access TEXT NOT NULL,
  mode TEXT NOT NULL,
  path TEXT,
  lock TEXT NOT NULL,
  concurrency TEXT NOT NULL
);

CREATE VIEW command_write_locks AS
SELECT
  intent,
  lock,
  group_concat(DISTINCT path) AS paths,
  group_concat(DISTINCT mode) AS modes,
  group_concat(DISTINCT source) AS sources,
  group_concat(DISTINCT concurrency) AS concurrencies,
  count(*) AS effect_count
FROM command_effects
WHERE access = 'write'
GROUP BY intent, lock;

CREATE VIEW command_lock_conflicts AS
SELECT
  a.intent AS left_intent,
  b.intent AS right_intent,
  a.lock AS lock,
  group_concat(DISTINCT a.path) AS left_paths,
  group_concat(DISTINCT b.path) AS right_paths,
  group_concat(DISTINCT a.mode) AS left_modes,
  group_concat(DISTINCT b.mode) AS right_modes,
  group_concat(DISTINCT a.concurrency) AS left_concurrencies,
  group_concat(DISTINCT b.concurrency) AS right_concurrencies
FROM command_effects a
JOIN command_effects b
  ON a.lock = b.lock
 AND a.intent < b.intent
WHERE
  a.access = 'write'
  OR b.access = 'write'
  OR a.concurrency = 'exclusive'
  OR b.concurrency = 'exclusive'
  OR a.mode = 'delete_recreate'
  OR b.mode = 'delete_recreate'
GROUP BY a.intent, b.intent, a.lock;

CREATE TABLE path_surfaces (
  rule_id TEXT PRIMARY KEY,
  pattern_kind TEXT NOT NULL,
  pattern TEXT NOT NULL,
  pattern_flags TEXT NOT NULL,
  surface_kind TEXT NOT NULL,
  category TEXT NOT NULL,
  is_public_surface INTEGER NOT NULL,
  update_policy TEXT NOT NULL
);

CREATE TABLE path_surface_reasons (
  rule_id TEXT NOT NULL,
  reason_kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY (rule_id, reason_kind, reason)
);

CREATE TABLE source_anchors (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  purpose TEXT,
  search_terms TEXT NOT NULL,
  invariant TEXT,
  risk TEXT NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);

CREATE TABLE source_anchor_fingerprints (
  anchor_id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  anchor_metadata_hash TEXT NOT NULL,
  anchor_text_hash TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  search_terms_hash TEXT,
  invariant_hash TEXT,
  risk_hash TEXT NOT NULL,
  symbol_kind TEXT NOT NULL,
  symbol_name TEXT,
  symbol_exported INTEGER NOT NULL,
  signature_hash TEXT,
  body_hash TEXT,
  symbol_start_line INTEGER,
  symbol_end_line INTEGER
);

CREATE TABLE source_anchor_status (
  anchor_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  confidence REAL NOT NULL,
  identity_signal TEXT NOT NULL,
  location_signal TEXT NOT NULL,
  symbol_signal TEXT NOT NULL,
  body_signal TEXT NOT NULL,
  metadata_signal TEXT NOT NULL,
  semantic_signal TEXT NOT NULL,
  risk_signal TEXT NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);

CREATE TABLE verification_evidence_summaries (
  source_path TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL,
  command TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  run_dir TEXT,
  manifest_path TEXT,
  verification_plan_id TEXT,
  completion_status TEXT,
  primary_reason TEXT,
  matched_intents INTEGER NOT NULL,
  ran_intents INTEGER NOT NULL,
  passed_intents INTEGER NOT NULL,
  failed_intents INTEGER NOT NULL,
  skipped_intents INTEGER NOT NULL,
  receipt_count INTEGER NOT NULL,
  coverage_count INTEGER NOT NULL,
  remaining_risk_count INTEGER NOT NULL,
  failure_fingerprint TEXT
);

CREATE TABLE verification_plans (
  plan_id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  classification_hash TEXT,
  command_contract_hash TEXT,
  selected_intents_hash TEXT,
  created_at TEXT,
  source_hash TEXT NOT NULL
);

CREATE TABLE acceptance_criteria (
  criterion_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  source TEXT NOT NULL,
  statement_hash TEXT,
  reason TEXT,
  surface TEXT,
  path_hash TEXT,
  PRIMARY KEY (plan_id, criterion_id)
);

CREATE TABLE criterion_coverage (
  criterion_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt_count INTEGER NOT NULL,
  gap_count INTEGER NOT NULL,
  risk_count INTEGER NOT NULL,
  PRIMARY KEY (plan_id, criterion_id)
);

CREATE TABLE verification_receipt_summaries (
  source_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  intent TEXT,
  status TEXT NOT NULL,
  skipped INTEGER NOT NULL,
  verification_plan_id TEXT,
  receipt_path TEXT,
  receipt_sha256 TEXT,
  PRIMARY KEY (source_path, ordinal)
);

CREATE TABLE command_receipt_summaries (
  receipt_hash TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  intent TEXT,
  status TEXT NOT NULL,
  command_fingerprint TEXT,
  contract_fingerprint TEXT,
  current_state_hash TEXT,
  write_drift_status TEXT,
  PRIMARY KEY (plan_id, receipt_hash)
);

CREATE TABLE verification_coverage_states (
  source_path TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  requirement_reason TEXT,
  intents TEXT NOT NULL,
  receipt_count INTEGER NOT NULL,
  gap_count INTEGER NOT NULL,
  source_anchor_count INTEGER NOT NULL,
  PRIMARY KEY (source_path, criterion_id)
);

CREATE TABLE verification_risk_signals (
  source_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  detail_hash TEXT NOT NULL,
  PRIMARY KEY (source_path, ordinal)
);

CREATE TABLE validation_ratchet_signals (
  signal_id TEXT PRIMARY KEY,
  plan_id TEXT,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  path_hash TEXT NOT NULL,
  before_hash TEXT,
  after_hash TEXT
);

CREATE TABLE completion_verdict_summaries (
  claim_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  primary_reason TEXT,
  risk_count INTEGER NOT NULL,
  contradiction_count INTEGER NOT NULL,
  blocker_count INTEGER NOT NULL
);

CREATE TABLE repro_routes (
  route_id TEXT PRIMARY KEY,
  task_hash TEXT NOT NULL,
  route_digest TEXT,
  route_kind TEXT,
  failure_oracle_hash TEXT
);

CREATE TABLE repro_observations (
  route_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  outcome TEXT,
  receipt_hash TEXT,
  diagnostic_fingerprint TEXT NOT NULL,
  PRIMARY KEY (route_id, phase)
);

CREATE TABLE failure_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  plan_id TEXT,
  failed_intents_hash TEXT,
  risk_codes_hash TEXT,
  seen_count INTEGER NOT NULL,
  first_seen_at TEXT,
  last_seen_at TEXT
);

CREATE TABLE verification_failure_fingerprints (
  source_path TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  verification_plan_id TEXT,
  status TEXT NOT NULL,
  failed_intents TEXT NOT NULL,
  primary_reason TEXT,
  failed_intents_hash TEXT,
  risk_codes_hash TEXT,
  affected_surfaces_hash TEXT,
  first_seen_at TEXT,
  last_seen_at TEXT,
  seen_count INTEGER NOT NULL,
  requires_new_evidence INTEGER NOT NULL,
  PRIMARY KEY (source_path, fingerprint)
);

CREATE TABLE source_anchor_risk_signals (
  anchor_id TEXT PRIMARY KEY,
  path_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  risk_signal TEXT NOT NULL,
  confidence REAL NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);
`);

	if (capabilities.backend === SEARCH_BACKEND_FTS5) {
		database.run(`
CREATE VIRTUAL TABLE search_documents_fts USING fts5(
  path UNINDEXED,
  type UNINDEXED,
  title,
  sections,
  terms,
  snippet
);

CREATE VIRTUAL TABLE search_skills_fts USING fts5(
  name UNINDEXED,
  path UNINDEXED,
  title
);

CREATE VIRTUAL TABLE search_skill_routes_fts USING fts5(
  route_key UNINDEXED,
  skill_name UNINDEXED,
  skill_path UNINDEXED,
  trigger,
  required_input,
  edit_scope,
  risk,
  verification_intents,
  expected_output
);

CREATE VIRTUAL TABLE search_command_intents_fts USING fts5(
  name UNINDEXED,
  status UNINDEXED,
  lifecycle UNINDEXED,
  run_policy UNINDEXED,
  description,
  effects
);

CREATE VIRTUAL TABLE search_source_anchors_fts USING fts5(
  id UNINDEXED,
  path UNINDEXED,
  purpose,
  search_terms,
  invariant,
  risk
);
`);
	}
}

function insertDocumentTerm(database: SqlJsDatabase, documentPath: string, term: string | null, source: string): void {
	const normalized = normalizeSearchText(term ?? '');

	if (normalized.length === 0) {
		return;
	}

	database.run('INSERT OR IGNORE INTO document_terms (document_path, term, source) VALUES (?, ?, ?)', [
		documentPath,
		normalized,
		source,
	]);
}

function insertSearchNgrams(
	database: SqlJsDatabase,
	targetKind: SearchNgramTargetKind,
	targetKey: string,
	values: readonly string[],
	source: string,
): void {
	for (const gram of buildSearchNgrams(values)) {
		database.run(
			'INSERT OR IGNORE INTO search_ngrams (target_kind, target_key, gram, source) VALUES (?, ?, ?, ?)',
			[targetKind, targetKey, gram, source],
		);
	}
}

function insertPathSurfaceReasons(
	database: SqlJsDatabase,
	ruleId: string,
	reasonKind: string,
	values: readonly string[],
): void {
	values.forEach((value, index) => {
		database.run(
			'INSERT INTO path_surface_reasons (rule_id, reason_kind, reason, ordinal) VALUES (?, ?, ?, ?)',
			[ruleId, reasonKind, value, index + 1],
		);
	});
}

function populatePathSurfaceReadModel(database: SqlJsDatabase): void {
	for (const rule of listChangeClassificationRuleDescriptors()) {
		database.run(
			'INSERT INTO path_surfaces (rule_id, pattern_kind, pattern, pattern_flags, surface_kind, category, is_public_surface, update_policy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				rule.id,
				rule.patternKind,
				rule.pattern,
				rule.patternFlags,
				rule.surface.kind,
				rule.surface.category,
				rule.surface.isPublicSurface ? 1 : 0,
				rule.surface.updatePolicy,
			],
		);

		insertPathSurfaceReasons(database, rule.id, 'change_kind', rule.changeKinds);
		insertPathSurfaceReasons(database, rule.id, 'validation_reason', rule.surface.validationReasons);
		insertPathSurfaceReasons(database, rule.id, 'affected_contract', rule.surface.affectedContracts);
		insertPathSurfaceReasons(database, rule.id, 'drift_check', rule.surface.driftChecks);
	}
}

function skillRouteKey(route: Pick<IndexSkillRoute, 'skillName' | 'trigger'>): string {
	return `${route.skillName}\u0000${route.trigger}`;
}

function populateSearchTables(
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
): void {
	for (const document of documents) {
		const documentTerms = queryRows(database, 'SELECT term FROM document_terms WHERE document_path = ? ORDER BY term', [
			document.path,
		]).map((row) => toSearchString(row.term));
		insertSearchNgrams(
			database,
			'document',
			document.path,
			[
				document.path,
				document.type,
				document.title,
				document.sections.join(' '),
				documentTerms.join(' '),
				document.contentSnippet,
			],
			'workflow_document',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_documents_fts (path, type, title, sections, terms, snippet) VALUES (?, ?, ?, ?, ?, ?)',
				[
					document.path,
					document.type,
					document.title,
					document.sections.join(' '),
					documentTerms.join(' '),
					document.contentSnippet,
				],
			);
		}
	}

	for (const skill of skills) {
		insertSearchNgrams(database, 'skill', skill.name, [skill.name, skill.path, skill.title], 'skill');

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run('INSERT INTO search_skills_fts (name, path, title) VALUES (?, ?, ?)', [
				skill.name,
				skill.path,
				skill.title,
			]);
		}
	}

	for (const route of skillRoutes) {
		const verificationIntents = route.verificationIntents.join(' ');
		insertSearchNgrams(
			database,
			'skill_route',
			skillRouteKey(route),
			[
				skillRouteKey(route),
				route.skillName,
				route.skillPath,
				route.trigger,
				route.requiredInput,
				route.editScope,
				route.risk,
				verificationIntents,
				route.expectedOutput,
			],
			'skill_route',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_skill_routes_fts (route_key, skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					skillRouteKey(route),
					route.skillName,
					route.skillPath,
					route.trigger,
					route.requiredInput,
					route.editScope,
					route.risk,
					verificationIntents,
					route.expectedOutput,
				],
			);
		}
	}

	for (const intent of commandIntents) {
		const effects = intent.effects
			.flatMap((effect) => [effect.lock, effect.path ?? '', effect.mode, effect.access, effect.concurrency])
			.join(' ');
		insertSearchNgrams(
			database,
			'command_intent',
			intent.name,
			[intent.name, intent.status, intent.lifecycle ?? '', intent.runPolicy ?? '', intent.description ?? '', effects],
			'command_intent',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_command_intents_fts (name, status, lifecycle, run_policy, description, effects) VALUES (?, ?, ?, ?, ?, ?)',
				[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description, effects],
			);
		}
	}

	for (const anchor of sourceAnchors) {
		insertSearchNgrams(
			database,
			'source_anchor',
			anchor.id,
			[
				anchor.id,
				anchor.path,
				anchor.purpose ?? '',
				anchor.search.join(' '),
				anchor.invariant ?? '',
				anchor.risk.join(' '),
			],
			'source_anchor',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_source_anchors_fts (id, path, purpose, search_terms, invariant, risk) VALUES (?, ?, ?, ?, ?, ?)',
				[
					anchor.id,
					anchor.path,
					anchor.purpose,
					anchor.search.join(' '),
					anchor.invariant,
					anchor.risk.join(' '),
				],
			);
		}
	}
}

function createSourceAnchorRiskSignals(sourceAnchors: readonly SourceAnchorIndexRecord[]): readonly SourceAnchorRiskSignalReadModel[] {
	return sourceAnchors
		.filter((anchor) => ['changed', 'review', 'stale'].includes(anchor.status))
		.map((anchor): SourceAnchorRiskSignalReadModel => ({
			anchorId: anchor.id,
			pathHash: sha256Text(anchor.path),
			status: anchor.status,
			riskSignal: anchor.signals.risk,
			confidence: anchor.confidence,
			navigationOnly: anchor.navigationOnly,
			canInstructAgent: anchor.canInstructAgent,
		}));
}

function populateDatabase(
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
	indexedFiles: readonly IndexedFileRecord[],
	verificationEvidence: VerificationEvidenceIndex,
	indexMode: LocalIndexResult['index_mode'],
	sourceScopeHash: string,
	sourceIndexEnabled: boolean,
	indexedAt: string,
): void {
	const sourceAnchorRiskSignals = createSourceAnchorRiskSignals(sourceAnchors);

	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['schema_version', LOCAL_INDEX_SCHEMA_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['parser_version', LOCAL_INDEX_PARSER_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['content_mode', LOCAL_INDEX_CONTENT_MODE]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'store_full_content',
		String(LOCAL_INDEX_STORE_FULL_CONTENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'max_snippet_bytes_per_document',
		String(MAX_SNIPPET_BYTES_PER_DOCUMENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_ngram_max_token_chars',
		String(SEARCH_NGRAM_MAX_TOKEN_CHARS),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_ngram_max_grams_per_target',
		String(SEARCH_NGRAM_MAX_GRAMS_PER_TARGET),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'source_index_max_file_bytes',
		String(SOURCE_INDEX_MAX_FILE_BYTES),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'excluded_raw_data_kinds',
		LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS.join(','),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['search_backend', capabilities.backend]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_fts5_available',
		String(capabilities.fts5Available),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['source_scope_hash', sourceScopeHash]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['source_index_enabled', String(sourceIndexEnabled)]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['index_mode', indexMode]);

	for (const indexedFile of indexedFiles) {
		database.run(
			'INSERT INTO indexed_files (path, source_scope, size_bytes, mtime_ms, content_hash, indexed_at, index_mode, parser_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				indexedFile.path,
				indexedFile.sourceScope,
				indexedFile.sizeBytes,
				indexedFile.mtimeMs,
				indexedFile.contentHash,
				indexedAt,
				indexMode,
				LOCAL_INDEX_PARSER_VERSION,
			],
		);
	}

	for (const document of documents) {
		database.run(
			'INSERT INTO documents (path, type, title, locale, revision, content_hash, content_snippet) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				document.path,
				document.type,
				document.title,
				document.locale,
				document.revision,
				document.contentHash,
				document.contentSnippet,
			],
		);

		document.sections.forEach((heading, index) => {
			database.run('INSERT INTO sections (document_path, ordinal, heading) VALUES (?, ?, ?)', [
				document.path,
				index + 1,
				heading,
			]);
		});
	}

	for (const skill of skills) {
		database.run('INSERT INTO skills (name, path, title) VALUES (?, ?, ?)', [skill.name, skill.path, skill.title]);
	}

	for (const route of skillRoutes) {
		const verificationIntents = route.verificationIntents.join(', ');
		database.run(
			'INSERT INTO skill_routes (skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				route.skillName,
				route.skillPath,
				route.trigger,
				route.requiredInput,
				route.editScope,
				route.risk,
				verificationIntents,
				route.expectedOutput,
			],
		);
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.skillName, 'skill_route_name');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.trigger, 'skill_route_trigger');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.risk, 'skill_route_risk');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.requiredInput, 'skill_route_required_input');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.editScope, 'skill_route_edit_scope');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', verificationIntents, 'skill_route_verification_intents');
	}

	for (const intent of commandIntents) {
		database.run(
			'INSERT INTO command_intents (name, status, lifecycle, run_policy, description) VALUES (?, ?, ?, ?, ?)',
			[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description],
		);

		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.name, 'command_intent');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.status, 'command_status');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.lifecycle, 'command_lifecycle');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.runPolicy, 'command_run_policy');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.description, 'command_description');

		for (const effect of intent.effects) {
			database.run(
				'INSERT INTO command_effects (intent, source, access, mode, path, lock, concurrency) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[effect.intent, effect.source, effect.access, effect.mode, effect.path, effect.lock, effect.concurrency],
			);
			if (effect.path !== null) {
				insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.path, 'command_effect_path');
			}
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.lock, 'command_effect_lock');
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.mode, 'command_effect_mode');
		}
	}

	for (const anchor of sourceAnchors) {
		database.run(
			'INSERT INTO source_anchors (id, path, line_start, purpose, search_terms, invariant, risk, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.path,
				anchor.lineStart,
				anchor.purpose,
				anchor.search.join(', '),
				anchor.invariant,
				anchor.risk.join(', '),
				anchor.navigationOnly ? 1 : 0,
				anchor.canInstructAgent ? 1 : 0,
			],
		);
		database.run(
			'INSERT INTO source_anchor_fingerprints (anchor_id, path, line_start, anchor_metadata_hash, anchor_text_hash, context_hash, search_terms_hash, invariant_hash, risk_hash, symbol_kind, symbol_name, symbol_exported, signature_hash, body_hash, symbol_start_line, symbol_end_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.path,
				anchor.lineStart,
				anchor.fingerprint.anchorMetadataHash,
				anchor.fingerprint.anchorTextHash,
				anchor.fingerprint.contextHash,
				anchor.fingerprint.searchTermsHash,
				anchor.fingerprint.invariantHash,
				anchor.fingerprint.riskHash,
				anchor.fingerprint.symbol.kind,
				anchor.fingerprint.symbol.name,
				anchor.fingerprint.symbol.exported ? 1 : 0,
				anchor.fingerprint.symbol.signatureHash,
				anchor.fingerprint.symbol.bodyHash,
				anchor.fingerprint.symbol.startLine,
				anchor.fingerprint.symbol.endLine,
			],
		);
		database.run(
			'INSERT INTO source_anchor_status (anchor_id, status, confidence, identity_signal, location_signal, symbol_signal, body_signal, metadata_signal, semantic_signal, risk_signal, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.status,
				anchor.confidence,
				anchor.signals.identity,
				anchor.signals.location,
				anchor.signals.symbol,
				anchor.signals.body,
				anchor.signals.metadata,
				anchor.signals.semantic,
				anchor.signals.risk,
				anchor.navigationOnly ? 1 : 0,
				anchor.canInstructAgent ? 1 : 0,
			],
		);
	}

	for (const summary of verificationEvidence.summaries) {
		database.run(
			'INSERT INTO verification_evidence_summaries (source_path, source_hash, command, kind, status, run_dir, manifest_path, verification_plan_id, completion_status, primary_reason, matched_intents, ran_intents, passed_intents, failed_intents, skipped_intents, receipt_count, coverage_count, remaining_risk_count, failure_fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				summary.sourcePath,
				summary.sourceHash,
				summary.command,
				summary.kind,
				summary.status,
				summary.runDir,
				summary.manifestPath,
				summary.verificationPlanId,
				summary.completionStatus,
				summary.primaryReason,
				summary.matchedIntents,
				summary.ranIntents,
				summary.passedIntents,
				summary.failedIntents,
				summary.skippedIntents,
				summary.receiptCount,
				summary.coverageCount,
				summary.remainingRiskCount,
				summary.failureFingerprint,
			],
		);
	}

	for (const plan of verificationEvidence.verificationPlans) {
		database.run(
			'INSERT INTO verification_plans (plan_id, source_path, classification_hash, command_contract_hash, selected_intents_hash, created_at, source_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				plan.planId,
				plan.sourcePath,
				plan.classificationHash,
				plan.commandContractHash,
				plan.selectedIntentsHash,
				plan.createdAt,
				plan.sourceHash,
			],
		);
	}

	for (const criterion of verificationEvidence.acceptanceCriteria) {
		database.run(
			'INSERT INTO acceptance_criteria (criterion_id, plan_id, source, statement_hash, reason, surface, path_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				criterion.criterionId,
				criterion.planId,
				criterion.source,
				criterion.statementHash,
				criterion.reason,
				criterion.surface,
				criterion.pathHash,
			],
		);
	}

	for (const coverage of verificationEvidence.criterionCoverage) {
		database.run(
			'INSERT INTO criterion_coverage (criterion_id, plan_id, status, receipt_count, gap_count, risk_count) VALUES (?, ?, ?, ?, ?, ?)',
			[coverage.criterionId, coverage.planId, coverage.status, coverage.receiptCount, coverage.gapCount, coverage.riskCount],
		);
	}

	for (const receipt of verificationEvidence.receipts) {
		database.run(
			'INSERT INTO verification_receipt_summaries (source_path, ordinal, intent, status, skipped, verification_plan_id, receipt_path, receipt_sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				receipt.sourcePath,
				receipt.ordinal,
				receipt.intent,
				receipt.status,
				receipt.skipped ? 1 : 0,
				receipt.verificationPlanId,
				receipt.receiptPath,
				receipt.receiptSha256,
			],
		);
	}

	for (const receipt of verificationEvidence.commandReceiptSummaries) {
		database.run(
			'INSERT INTO command_receipt_summaries (receipt_hash, plan_id, intent, status, command_fingerprint, contract_fingerprint, current_state_hash, write_drift_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				receipt.receiptHash,
				receipt.planId,
				receipt.intent,
				receipt.status,
				receipt.commandFingerprint,
				receipt.contractFingerprint,
				receipt.currentStateHash,
				receipt.writeDriftStatus,
			],
		);
	}

	for (const coverage of verificationEvidence.coverageStates) {
		database.run(
			'INSERT INTO verification_coverage_states (source_path, criterion_id, source, status, requirement_reason, intents, receipt_count, gap_count, source_anchor_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				coverage.sourcePath,
				coverage.criterionId,
				coverage.source,
				coverage.status,
				coverage.requirementReason,
				joinedList(coverage.intents),
				coverage.receiptCount,
				coverage.gapCount,
				coverage.sourceAnchorCount,
			],
		);
	}

	for (const risk of verificationEvidence.riskSignals) {
		database.run(
			'INSERT INTO verification_risk_signals (source_path, ordinal, code, severity, detail_hash) VALUES (?, ?, ?, ?, ?)',
			[risk.sourcePath, risk.ordinal, risk.code, risk.severity, risk.detailHash],
		);
	}

	for (const signal of verificationEvidence.validationRatchetSignals) {
		database.run(
			'INSERT INTO validation_ratchet_signals (signal_id, plan_id, code, severity, path_hash, before_hash, after_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[signal.signalId, signal.planId, signal.code, signal.severity, signal.pathHash, signal.beforeHash, signal.afterHash],
		);
	}

	for (const verdict of verificationEvidence.completionVerdictSummaries) {
		database.run(
			'INSERT INTO completion_verdict_summaries (claim_id, plan_id, status, primary_reason, risk_count, contradiction_count, blocker_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				verdict.claimId,
				verdict.planId,
				verdict.status,
				verdict.primaryReason,
				verdict.riskCount,
				verdict.contradictionCount,
				verdict.blockerCount,
			],
		);
	}

	for (const route of verificationEvidence.reproRoutes) {
		database.run(
			'INSERT INTO repro_routes (route_id, task_hash, route_digest, route_kind, failure_oracle_hash) VALUES (?, ?, ?, ?, ?)',
			[route.routeId, route.taskHash, route.routeDigest, route.routeKind, route.failureOracleHash],
		);
	}

	for (const observation of verificationEvidence.reproObservations) {
		database.run(
			'INSERT INTO repro_observations (route_id, phase, outcome, receipt_hash, diagnostic_fingerprint) VALUES (?, ?, ?, ?, ?)',
			[
				observation.routeId,
				observation.phase,
				observation.outcome,
				observation.receiptHash,
				observation.diagnosticFingerprint,
			],
		);
	}

	for (const fingerprint of verificationEvidence.failureFingerprintReadModels) {
		database.run(
			'INSERT INTO failure_fingerprints (fingerprint, plan_id, failed_intents_hash, risk_codes_hash, seen_count, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				fingerprint.fingerprint,
				fingerprint.planId,
				fingerprint.failedIntentsHash,
				fingerprint.riskCodesHash,
				fingerprint.seenCount,
				fingerprint.firstSeenAt,
				fingerprint.lastSeenAt,
			],
		);
	}

	for (const fingerprint of verificationEvidence.failureFingerprints) {
		database.run(
			'INSERT INTO verification_failure_fingerprints (source_path, fingerprint, verification_plan_id, status, failed_intents, primary_reason, failed_intents_hash, risk_codes_hash, affected_surfaces_hash, first_seen_at, last_seen_at, seen_count, requires_new_evidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				fingerprint.sourcePath,
				fingerprint.fingerprint,
				fingerprint.verificationPlanId,
				fingerprint.status,
				joinedList(fingerprint.failedIntents),
				fingerprint.primaryReason,
				fingerprint.failedIntentsHash,
				fingerprint.riskCodesHash,
				fingerprint.affectedSurfacesHash,
				fingerprint.firstSeenAt,
				fingerprint.lastSeenAt,
				fingerprint.seenCount,
				fingerprint.requiresNewEvidence ? 1 : 0,
			],
		);
	}

	for (const signal of sourceAnchorRiskSignals) {
		database.run(
			'INSERT INTO source_anchor_risk_signals (anchor_id, path_hash, status, risk_signal, confidence, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				signal.anchorId,
				signal.pathHash,
				signal.status,
				signal.riskSignal,
				signal.confidence,
				signal.navigationOnly ? 1 : 0,
				signal.canInstructAgent ? 1 : 0,
			],
		);
	}

	populatePathSurfaceReadModel(database);
	populateSearchTables(database, capabilities, documents, skills, skillRoutes, commandIntents, sourceAnchors);
}

type IncrementalRebuildReason =
	| 'missing_index'
	| 'schema_version_mismatch'
	| 'parser_version_mismatch'
	| 'source_scope_mismatch'
	| 'indexed_files_missing'
	| 'file_fingerprint_mismatch'
	| 'unreadable_index';

interface IncrementalReuseDecision {
	readonly reusable: boolean;
	readonly rebuildReason: IncrementalRebuildReason | null;
	readonly capabilities: LocalSearchCapabilities | null;
}

interface IncrementalPreflightReuse {
	readonly result: LocalIndexResult | null;
	readonly rebuildReason: IncrementalRebuildReason | null;
}

function readCount(database: SqlJsDatabase, tableName: string): number {
	if (!hasTable(database, tableName)) {
		return 0;
	}

	const [row] = queryRows(database, `SELECT COUNT(*) AS count FROM ${tableName}`);
	const count = row?.count;
	return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function readStoredIndexedPaths(database: SqlJsDatabase): string[] {
	if (!hasTable(database, 'documents')) {
		return [];
	}

	return queryRows(database, 'SELECT path FROM documents ORDER BY path')
		.map((row) => toSearchString(row.path))
		.filter(Boolean);
}

function createStoredLocalIndexResult(
	projectRoot: string,
	databasePath: string,
	dryRun: boolean,
	indexMode: LocalIndexResult['index_mode'],
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
): LocalIndexResult {
	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'index',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		dry_run: dryRun,
		wrote_files: false,
		index_mode: indexMode,
		reused_existing: true,
		rebuild_reason: null,
		document_count: readCount(database, 'documents'),
		skill_count: readCount(database, 'skills'),
		skill_route_count: readCount(database, 'skill_routes'),
		command_intent_count: readCount(database, 'command_intents'),
		command_effect_count: readCount(database, 'command_effects'),
		verification_evidence_summary_count: readCount(database, 'verification_evidence_summaries'),
		verification_plan_count: readCount(database, 'verification_plans'),
		acceptance_criteria_count: readCount(database, 'acceptance_criteria'),
		criterion_coverage_count: readCount(database, 'criterion_coverage'),
		verification_receipt_summary_count: readCount(database, 'verification_receipt_summaries'),
		command_receipt_summary_count: readCount(database, 'command_receipt_summaries'),
		verification_coverage_state_count: readCount(database, 'verification_coverage_states'),
		verification_risk_signal_count: readCount(database, 'verification_risk_signals'),
		validation_ratchet_signal_count: readCount(database, 'validation_ratchet_signals'),
		completion_verdict_summary_count: readCount(database, 'completion_verdict_summaries'),
		repro_route_count: readCount(database, 'repro_routes'),
		repro_observation_count: readCount(database, 'repro_observations'),
		failure_fingerprint_count: readCount(database, 'verification_failure_fingerprints'),
		source_index_enabled: readMetadataValue(database, 'source_index_enabled') === 'true',
		source_anchor_count: readCount(database, 'source_anchors'),
		source_anchor_risk_signal_count: readCount(database, 'source_anchor_risk_signals'),
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		content_mode: LOCAL_INDEX_CONTENT_MODE,
		store_full_content: LOCAL_INDEX_STORE_FULL_CONTENT,
		max_snippet_bytes_per_document: MAX_SNIPPET_BYTES_PER_DOCUMENT,
		excluded_raw_data_kinds: [...LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS],
		indexed_file_count: readCount(database, 'indexed_files'),
		indexed_paths: readStoredIndexedPaths(database),
	};
}

function indexedFilesMatch(database: SqlJsDatabase, currentFiles: readonly IndexedFileRecord[]): boolean {
	const rows = queryRows(
		database,
		'SELECT path, source_scope, content_hash, parser_version FROM indexed_files ORDER BY path',
	);

	if (rows.length !== currentFiles.length) {
		return false;
	}

	const currentByPath = new Map(currentFiles.map((file) => [file.path, file]));

	for (const row of rows) {
		const storedPath = toSearchString(row.path);
		const current = currentByPath.get(storedPath);

		if (!current) {
			return false;
		}

		if (
			normalizeIndexedFileSourceScope(row.source_scope) !== current.sourceScope ||
			toSearchString(row.content_hash) !== current.contentHash ||
			toSearchString(row.parser_version) !== LOCAL_INDEX_PARSER_VERSION
		) {
			return false;
		}
	}

	return true;
}

async function readIncrementalPreflightReuse(
	SQL: SqlJsStatic,
	databasePath: string,
	projectRoot: string,
	currentFiles: readonly IndexedFileRecord[] | null,
	sourceScopeHash: string,
	dryRun: boolean,
	indexMode: LocalIndexResult['index_mode'],
): Promise<IncrementalPreflightReuse> {
	if (!currentFiles) {
		return { result: null, rebuildReason: null };
	}

	if (!existsSync(databasePath)) {
		return { result: null, rebuildReason: 'missing_index' };
	}

	let database: SqlJsDatabase | undefined;

	try {
		database = new SQL.Database(readFileSync(databasePath));

		if (readStoredSchemaVersion(database) !== LOCAL_INDEX_SCHEMA_VERSION) {
			return { result: null, rebuildReason: 'schema_version_mismatch' };
		}

		if (readMetadataValue(database, 'parser_version') !== LOCAL_INDEX_PARSER_VERSION) {
			return { result: null, rebuildReason: 'parser_version_mismatch' };
		}

		if (readMetadataValue(database, 'source_scope_hash') !== sourceScopeHash) {
			return { result: null, rebuildReason: 'source_scope_mismatch' };
		}

		if (!hasTable(database, 'indexed_files')) {
			return { result: null, rebuildReason: 'indexed_files_missing' };
		}

		if (!indexedFilesMatch(database, currentFiles)) {
			return { result: null, rebuildReason: 'file_fingerprint_mismatch' };
		}

		const capabilities = readStoredSearchCapabilities(database);

		return {
			result: createStoredLocalIndexResult(projectRoot, databasePath, dryRun, indexMode, database, capabilities),
			rebuildReason: null,
		};
	} catch {
		return { result: null, rebuildReason: 'unreadable_index' };
	} finally {
		database?.close();
	}
}

async function readIncrementalReuseDecision(
	SQL: SqlJsStatic,
	databasePath: string,
	currentFiles: readonly IndexedFileRecord[],
	sourceScopeHash: string,
): Promise<IncrementalReuseDecision> {
	if (!existsSync(databasePath)) {
		return { reusable: false, rebuildReason: 'missing_index', capabilities: null };
	}

	let database: SqlJsDatabase | undefined;

	try {
		database = new SQL.Database(readFileSync(databasePath));

		if (readStoredSchemaVersion(database) !== LOCAL_INDEX_SCHEMA_VERSION) {
			return { reusable: false, rebuildReason: 'schema_version_mismatch', capabilities: null };
		}

		if (readMetadataValue(database, 'parser_version') !== LOCAL_INDEX_PARSER_VERSION) {
			return { reusable: false, rebuildReason: 'parser_version_mismatch', capabilities: null };
		}

		if (readMetadataValue(database, 'source_scope_hash') !== sourceScopeHash) {
			return { reusable: false, rebuildReason: 'source_scope_mismatch', capabilities: null };
		}

		if (!hasTable(database, 'indexed_files')) {
			return { reusable: false, rebuildReason: 'indexed_files_missing', capabilities: null };
		}

		if (!indexedFilesMatch(database, currentFiles)) {
			return { reusable: false, rebuildReason: 'file_fingerprint_mismatch', capabilities: null };
		}

		return {
			reusable: true,
			rebuildReason: null,
			capabilities: readStoredSearchCapabilities(database),
		};
	} catch {
		return { reusable: false, rebuildReason: 'unreadable_index', capabilities: null };
	} finally {
		database?.close();
	}
}

/**
 * mf:anchor cli.index.create
 * purpose: Build the local SQLite index for workflow documents and optional source anchors.
 * search: mf index, local index, sqlite, source anchors, workflow documents
 * invariant: Source anchors are indexed only when requested by CLI flag or local index configuration.
 * risk: cache, config
 */
export async function createLocalIndex(projectRoot: string, options: LocalIndexOptions = {}): Promise<LocalIndexResult> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const dryRun = options.dryRun === true;
	const incremental = options.incremental === true;
	const indexMode: LocalIndexResult['index_mode'] = incremental ? 'incremental' : 'full';
	const sourceConfig = readLocalIndexSourceConfig(projectRoot);
	const includeSource = options.includeSource === true || sourceConfig.enabledByDefault;
	const sourceScopeHash = getSourceScopeHash(includeSource, sourceConfig);
	let capabilities = searchCapabilities(false);
	let reusedExisting = false;
	let rebuildReason: string | null = null;

	const SQL = await loadSqlJs();
	const capabilityDatabase = new SQL.Database();
	capabilities = detectLocalSearchCapabilities(capabilityDatabase);
	capabilityDatabase.close();

	if (incremental) {
		const preflightFiles = collectFastPreflightIndexedFileRecords(projectRoot, includeSource, sourceConfig);
		const preflightReuse = await readIncrementalPreflightReuse(
			SQL,
			databasePath,
			projectRoot,
			preflightFiles,
			sourceScopeHash,
			dryRun,
			indexMode,
		);

		if (preflightReuse.result) {
			return preflightReuse.result;
		}

		rebuildReason = preflightReuse.rebuildReason;
	}

	const documents = collectDocuments(projectRoot);
	const skills = collectSkills(documents);
	const skillRoutes = collectSkillRoutes(projectRoot);
	const commandIntents = collectCommandIntents(projectRoot);
	const previousSourceAnchors = includeSource
		? await readPreviousSourceAnchorSnapshots(databasePath).catch(() => [])
		: [];
	const sourceAnchorCandidatePaths = includeSource ? collectSourceAnchorCandidatePaths(projectRoot, sourceConfig) : [];
	const sourceAnchors = includeSource
		? collectSourceAnchorIndexRecords(projectRoot, previousSourceAnchors, {
				...sourceConfig,
				excludeGeneratedOrVendor: true,
			})
		: [];
	const verificationEvidence = createVerificationEvidenceIndex(projectRoot);
	const indexedFiles = collectIndexedFileRecords(projectRoot, documents, sourceAnchors, sourceAnchorCandidatePaths);

	if (incremental) {
		const reuseDecision = await readIncrementalReuseDecision(SQL, databasePath, indexedFiles, sourceScopeHash);
		reusedExisting = reuseDecision.reusable;
		rebuildReason = reuseDecision.rebuildReason ?? rebuildReason;
		capabilities = reuseDecision.capabilities ?? capabilities;
	}

	if (!dryRun && !reusedExisting) {
		const database = new SQL.Database();

		createSchema(database, capabilities);
		populateDatabase(
			database,
			capabilities,
			documents,
			skills,
			skillRoutes,
			commandIntents,
			sourceAnchors,
			indexedFiles,
			verificationEvidence,
			indexMode,
			sourceScopeHash,
			includeSource,
			new Date().toISOString(),
		);
		writeFileInsideWithoutSymlinks(projectRoot, databasePath, database.export());
		database.close();
	}

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'index',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		dry_run: dryRun,
		wrote_files: !dryRun && !reusedExisting,
		index_mode: indexMode,
		reused_existing: reusedExisting,
		rebuild_reason: rebuildReason,
		document_count: documents.length,
		skill_count: skills.length,
		skill_route_count: skillRoutes.length,
		command_intent_count: commandIntents.length,
		command_effect_count: commandIntents.reduce((count, intent) => count + intent.effects.length, 0),
		verification_evidence_summary_count: verificationEvidence.summaries.length,
		verification_plan_count: verificationEvidence.verificationPlans.length,
		acceptance_criteria_count: verificationEvidence.acceptanceCriteria.length,
		criterion_coverage_count: verificationEvidence.criterionCoverage.length,
		verification_receipt_summary_count: verificationEvidence.receipts.length,
		command_receipt_summary_count: verificationEvidence.commandReceiptSummaries.length,
		verification_coverage_state_count: verificationEvidence.coverageStates.length,
		verification_risk_signal_count: verificationEvidence.riskSignals.length,
		validation_ratchet_signal_count: verificationEvidence.validationRatchetSignals.length,
		completion_verdict_summary_count: verificationEvidence.completionVerdictSummaries.length,
		repro_route_count: verificationEvidence.reproRoutes.length,
		repro_observation_count: verificationEvidence.reproObservations.length,
		failure_fingerprint_count: verificationEvidence.failureFingerprints.length,
		source_index_enabled: includeSource,
		source_anchor_count: sourceAnchors.length,
		source_anchor_risk_signal_count: createSourceAnchorRiskSignals(sourceAnchors).length,
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		content_mode: LOCAL_INDEX_CONTENT_MODE,
		store_full_content: LOCAL_INDEX_STORE_FULL_CONTENT,
		max_snippet_bytes_per_document: MAX_SNIPPET_BYTES_PER_DOCUMENT,
		excluded_raw_data_kinds: [...LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS],
		indexed_file_count: indexedFiles.length,
		indexed_paths: documents.map((document) => document.path),
	};
}

function readStoredSchemaVersion(database: SqlJsDatabase): string | undefined {
	return readMetadataValue(database, 'schema_version');
}

function getStalePaths(projectRoot: string, database: SqlJsDatabase): string[] {
	const schemaVersion = readStoredSchemaVersion(database);

	if (schemaVersion !== LOCAL_INDEX_SCHEMA_VERSION) {
		return ['.mustflow/cache/mustflow.sqlite'];
	}

	if (hasTable(database, 'indexed_files')) {
		const stalePaths = new Set<string>();
		const indexedRows = queryRows(database, 'SELECT path, source_scope, content_hash FROM indexed_files');
		const indexedPaths = new Set(indexedRows.map((row) => toSearchString(row.path)));

		for (const row of indexedRows) {
			const indexedPath = toSearchString(row.path);
			const sourceScope = normalizeIndexedFileSourceScope(row.source_scope);

			try {
				const current = readIndexedFileRecord(projectRoot, indexedPath, sourceScope);

				if (current.contentHash !== toSearchString(row.content_hash)) {
					stalePaths.add(indexedPath);
				}
			} catch {
				stalePaths.add(indexedPath);
			}
		}

		for (const document of collectDocuments(projectRoot)) {
			if (!indexedPaths.has(document.path)) {
				stalePaths.add(document.path);
			}
		}

		return Array.from(stalePaths).sort((left, right) => left.localeCompare(right));
	}

	const indexedRows = queryRows(database, 'SELECT path, content_hash FROM documents');
	const indexedHashes = new Map(indexedRows.map((row) => [toSearchString(row.path), toSearchString(row.content_hash)]));
	const currentDocuments = collectDocuments(projectRoot);
	const currentHashes = new Map(currentDocuments.map((document) => [document.path, document.contentHash]));
	const stalePaths = new Set<string>();

	for (const [indexedPath, indexedHash] of indexedHashes) {
		if (currentHashes.get(indexedPath) !== indexedHash) {
			stalePaths.add(indexedPath);
		}
	}

	for (const currentPath of currentHashes.keys()) {
		if (!indexedHashes.has(currentPath)) {
			stalePaths.add(currentPath);
		}
	}

	return Array.from(stalePaths).sort((left, right) => left.localeCompare(right));
}

function mapCommandLockConflict(row: Record<string, SqlValue>, intent: string): LocalCommandLockConflict {
	const targetIsLeft = toSearchString(row.left_intent) === intent;
	const targetPrefix = targetIsLeft ? 'left' : 'right';
	const otherPrefix = targetIsLeft ? 'right' : 'left';

	return {
		intent: toSearchString(row[`${otherPrefix}_intent`]),
		lock: toSearchString(row.lock),
		paths: splitIndexedList(row[`${targetPrefix}_paths`]),
		modes: splitIndexedList(row[`${targetPrefix}_modes`]),
		concurrencies: splitIndexedList(row[`${targetPrefix}_concurrencies`]),
		conflictingPaths: splitIndexedList(row[`${otherPrefix}_paths`]),
		conflictingModes: splitIndexedList(row[`${otherPrefix}_modes`]),
		conflictingConcurrencies: splitIndexedList(row[`${otherPrefix}_concurrencies`]),
	};
}

/**
 * mf:anchor cli.index.command-effect-graph
 * purpose: Read command-effect lock and conflict explanations from the local SQLite index.
 * search: mf explain command, command locks, local index, sqlite graph
 * invariant: Indexed command-effect rows explain current commands.toml only when the index is fresh and never grant command authority.
 * risk: cache, config
 */
function queryLocalCommandEffectGraph(
	databasePath: string,
	database: SqlJsDatabase,
	intent: string,
): LocalCommandEffectGraph {
	const writeLocks = queryRows(
		database,
		`
SELECT lock, paths, modes, sources, concurrencies, effect_count
FROM command_write_locks
WHERE intent = ?
ORDER BY lock
`,
		[intent],
	).map((row) => ({
		lock: toSearchString(row.lock),
		paths: splitIndexedList(row.paths),
		modes: splitIndexedList(row.modes),
		sources: splitIndexedList(row.sources),
		concurrencies: splitIndexedList(row.concurrencies),
		effectCount: typeof row.effect_count === 'number' && Number.isFinite(row.effect_count) ? row.effect_count : 0,
	}));

	const lockConflicts = queryRows(
		database,
		`
SELECT
  left_intent,
  right_intent,
  lock,
  left_paths,
  right_paths,
  left_modes,
  right_modes,
  left_concurrencies,
  right_concurrencies
FROM command_lock_conflicts
WHERE left_intent = ? OR right_intent = ?
ORDER BY lock, left_intent, right_intent
`,
		[intent, intent],
	).map((row) => mapCommandLockConflict(row, intent));

	return {
		source: 'local_index',
		authority: 'explanation_only',
		commandAuthority: '.mustflow/config/commands.toml',
		grantsCommandAuthority: false,
		status: 'fresh',
		databasePath,
		indexFresh: true,
		stalePaths: [],
		writeLocks,
		lockConflicts,
		refreshHint: null,
	};
}

export async function readLocalCommandEffectGraph(projectRoot: string, intent: string): Promise<LocalCommandEffectGraph> {
	const graphs = await readLocalCommandEffectGraphs(projectRoot, [intent]);
	return graphs.get(intent) ?? createCommandEffectGraphStatus(getLocalIndexDatabasePath(projectRoot), 'unreadable');
}

export async function readLocalCommandEffectGraphs(
	projectRoot: string,
	intents: readonly string[],
): Promise<ReadonlyMap<string, LocalCommandEffectGraph>> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const intentNames = [...new Set(intents)];
	const statusMap = (status: LocalCommandEffectGraphStatus, stalePaths: readonly string[] = []) =>
		new Map(intentNames.map((intent) => [intent, createCommandEffectGraphStatus(databasePath, status, stalePaths)] as const));

	if (!existsSync(databasePath)) {
		return statusMap('missing');
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return statusMap('stale', stalePaths);
		}

		return new Map(intentNames.map((intent) => [intent, queryLocalCommandEffectGraph(databasePath, database, intent)] as const));
	} catch {
		return statusMap('unreadable');
	} finally {
		database.close();
	}
}

function createPathSurfaceReadModelStatus(
	databasePath: string,
	status: LocalPathSurfaceReadModelStatus,
	inputPath: string | null,
	stalePaths: readonly string[] = [],
): LocalPathSurfaceReadModel {
	return {
		source: 'local_index',
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		inputPath,
		match: null,
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh path-surface explanations.',
	};
}

function createLocalIndexPromptContextStatus(
	databasePath: string,
	status: LocalIndexPromptContextStatus,
	stalePaths: readonly string[] = [],
	capabilities: LocalSearchCapabilities | null = null,
): LocalIndexPromptContext {
	return {
		source: 'local_index',
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		searchBackend: capabilities?.backend ?? null,
		searchFts5Available: capabilities?.fts5Available ?? null,
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh prompt-cache task context local-index metadata.',
	};
}

export async function readLocalIndexPromptContext(projectRoot: string): Promise<LocalIndexPromptContext> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		return createLocalIndexPromptContextStatus(databasePath, 'missing');
	}

	let database: SqlJsDatabase | undefined;

	try {
		const SQL = await loadSqlJs();
		database = new SQL.Database(readFileSync(databasePath));
		const capabilities = readStoredSearchCapabilities(database);
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return createLocalIndexPromptContextStatus(databasePath, 'stale', stalePaths, capabilities);
		}

		return createLocalIndexPromptContextStatus(databasePath, 'fresh', [], capabilities);
	} catch {
		return createLocalIndexPromptContextStatus(databasePath, 'unreadable');
	} finally {
		database?.close();
	}
}

function createVerificationReadModelQueryStatus(
	databasePath: string,
	status: LocalVerificationReadModelStatus,
	planId: string | null,
	stalePaths: readonly string[] = [],
): LocalVerificationReadModelQueries {
	return {
		source: 'local_index',
		authority: 'evidence_only',
		commandAuthority: '.mustflow/config/commands.toml',
		grantsCommandAuthority: false,
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		planId,
		uncoveredCriteria: [],
		severeRisks: [],
		nonPassingReceipts: [],
		repeatedFailureFingerprints: [],
		validationWeakeningSignals: [],
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh verification read-model evidence.',
	};
}

function readLatestVerificationPlanId(database: SqlJsDatabase): string | null {
	const row = queryRows(
		database,
		`
SELECT plan_id
FROM verification_plans
ORDER BY COALESCE(created_at, '') DESC, source_path DESC, plan_id DESC
LIMIT 1
`,
	)[0];

	return toSearchString(row?.plan_id) || null;
}

function readUncoveredCriteria(database: SqlJsDatabase, planId: string): readonly LocalUncoveredCriterion[] {
	return queryRows(
		database,
		`
SELECT
  acceptance_criteria.criterion_id,
  acceptance_criteria.source,
  acceptance_criteria.reason,
  acceptance_criteria.surface,
  acceptance_criteria.path_hash,
  criterion_coverage.status AS coverage_status,
  criterion_coverage.receipt_count,
  criterion_coverage.gap_count,
  criterion_coverage.risk_count
FROM acceptance_criteria
LEFT JOIN criterion_coverage
  ON criterion_coverage.plan_id = acceptance_criteria.plan_id
 AND criterion_coverage.criterion_id = acceptance_criteria.criterion_id
WHERE acceptance_criteria.plan_id = ?
  AND (criterion_coverage.status IS NULL OR criterion_coverage.status != 'covered')
ORDER BY acceptance_criteria.criterion_id
`,
		[planId],
	).map((row) => ({
		criterionId: toSearchString(row.criterion_id),
		source: toSearchString(row.source),
		reason: toSearchString(row.reason) || null,
		surface: toSearchString(row.surface) || null,
		pathHash: toSearchString(row.path_hash) || null,
		coverageStatus: toSearchString(row.coverage_status) || null,
		receiptCount: toNullableNumber(row.receipt_count) ?? 0,
		gapCount: toNullableNumber(row.gap_count) ?? 0,
		riskCount: toNullableNumber(row.risk_count) ?? 0,
	}));
}

function readSevereVerificationRisks(database: SqlJsDatabase, planId: string): readonly LocalSevereVerificationRisk[] {
	return queryRows(
		database,
		`
SELECT
  verification_risk_signals.source_path,
  verification_risk_signals.ordinal,
  verification_risk_signals.code,
  verification_risk_signals.severity,
  verification_risk_signals.detail_hash
FROM verification_risk_signals
JOIN verification_evidence_summaries
  ON verification_evidence_summaries.source_path = verification_risk_signals.source_path
WHERE verification_evidence_summaries.verification_plan_id = ?
  AND verification_risk_signals.severity IN ('high', 'critical')
ORDER BY verification_risk_signals.source_path, verification_risk_signals.ordinal
`,
		[planId],
	).map((row) => ({
		sourcePath: toSearchString(row.source_path),
		ordinal: toNullableNumber(row.ordinal) ?? 0,
		code: toSearchString(row.code),
		severity: toSearchString(row.severity),
		detailHash: toSearchString(row.detail_hash),
	}));
}

function readNonPassingReceipts(database: SqlJsDatabase, planId: string): readonly LocalNonPassingVerificationReceipt[] {
	return queryRows(
		database,
		`
SELECT
  receipt_hash,
  plan_id,
  intent,
  status,
  command_fingerprint,
  contract_fingerprint,
  current_state_hash,
  write_drift_status
FROM command_receipt_summaries
WHERE plan_id = ?
  AND (
    status != 'passed'
    OR write_drift_status IS NULL
    OR write_drift_status NOT IN ('clean', 'none')
  )
ORDER BY intent, receipt_hash
`,
		[planId],
	).map((row) => ({
		receiptHash: toSearchString(row.receipt_hash),
		planId: toSearchString(row.plan_id),
		intent: toSearchString(row.intent) || null,
		status: toSearchString(row.status),
		commandFingerprint: toSearchString(row.command_fingerprint) || null,
		contractFingerprint: toSearchString(row.contract_fingerprint) || null,
		currentStateHash: toSearchString(row.current_state_hash) || null,
		writeDriftStatus: toSearchString(row.write_drift_status) || null,
	}));
}

function readRepeatedFailureFingerprints(
	database: SqlJsDatabase,
	planId: string,
): readonly LocalRepeatedFailureFingerprint[] {
	return queryRows(
		database,
		`
SELECT
  source_path,
  fingerprint,
  verification_plan_id,
  status,
  failed_intents,
  primary_reason,
  failed_intents_hash,
  risk_codes_hash,
  affected_surfaces_hash,
  seen_count,
  requires_new_evidence
FROM verification_failure_fingerprints
WHERE verification_plan_id = ?
  AND requires_new_evidence = 1
ORDER BY fingerprint
`,
		[planId],
	).map((row) => ({
		sourcePath: toSearchString(row.source_path),
		fingerprint: toSearchString(row.fingerprint),
		verificationPlanId: toSearchString(row.verification_plan_id) || null,
		status: toSearchString(row.status),
		failedIntents: splitIndexedList(row.failed_intents),
		primaryReason: toSearchString(row.primary_reason) || null,
		failedIntentsHash: toSearchString(row.failed_intents_hash) || null,
		riskCodesHash: toSearchString(row.risk_codes_hash) || null,
		affectedSurfacesHash: toSearchString(row.affected_surfaces_hash) || null,
		seenCount: toNullableNumber(row.seen_count) ?? 0,
		requiresNewEvidence: Number(row.requires_new_evidence) === 1,
	}));
}

function readValidationWeakeningSignals(
	database: SqlJsDatabase,
	planId: string,
): readonly LocalValidationWeakeningSignal[] {
	return queryRows(
		database,
		`
SELECT signal_id, plan_id, code, severity, path_hash, before_hash, after_hash
FROM validation_ratchet_signals
WHERE plan_id = ?
ORDER BY severity DESC, code, signal_id
`,
		[planId],
	).map((row) => ({
		signalId: toSearchString(row.signal_id),
		planId: toSearchString(row.plan_id) || null,
		code: toSearchString(row.code),
		severity: toSearchString(row.severity),
		pathHash: toSearchString(row.path_hash),
		beforeHash: toSearchString(row.before_hash) || null,
		afterHash: toSearchString(row.after_hash) || null,
	}));
}

function queryLocalVerificationReadModel(
	databasePath: string,
	database: SqlJsDatabase,
	planId: string | null,
): LocalVerificationReadModelQueries {
	const selectedPlanId = planId ?? readLatestVerificationPlanId(database);
	const base = createVerificationReadModelQueryStatus(databasePath, 'fresh', selectedPlanId);

	if (!selectedPlanId) {
		return base;
	}

	return {
		...base,
		uncoveredCriteria: readUncoveredCriteria(database, selectedPlanId),
		severeRisks: readSevereVerificationRisks(database, selectedPlanId),
		nonPassingReceipts: readNonPassingReceipts(database, selectedPlanId),
		repeatedFailureFingerprints: readRepeatedFailureFingerprints(database, selectedPlanId),
		validationWeakeningSignals: readValidationWeakeningSignals(database, selectedPlanId),
	};
}

export async function readLocalVerificationReadModelQueries(
	projectRoot: string,
	planId: string,
): Promise<LocalVerificationReadModelQueries> {
	return readLocalVerificationReadModelQueriesForPlan(projectRoot, planId);
}

export async function readLocalVerificationReadModelQueriesForPlan(
	projectRoot: string,
	planId: string | null,
): Promise<LocalVerificationReadModelQueries> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		return createVerificationReadModelQueryStatus(databasePath, 'missing', planId);
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const requiredTables = [
			'acceptance_criteria',
			'criterion_coverage',
			'verification_evidence_summaries',
			'verification_plans',
			'verification_risk_signals',
			'command_receipt_summaries',
			'verification_failure_fingerprints',
			'validation_ratchet_signals',
		];

		if (requiredTables.some((tableName) => !hasTable(database, tableName))) {
			return createVerificationReadModelQueryStatus(databasePath, 'unreadable', planId);
		}

		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return createVerificationReadModelQueryStatus(databasePath, 'stale', planId, stalePaths);
		}

		return queryLocalVerificationReadModel(databasePath, database, planId);
	} catch {
		return createVerificationReadModelQueryStatus(databasePath, 'unreadable', planId);
	} finally {
		database.close();
	}
}

export async function readLatestLocalVerificationReadModelQueries(
	projectRoot: string,
): Promise<LocalVerificationReadModelQueries> {
	return readLocalVerificationReadModelQueriesForPlan(projectRoot, null);
}

function pathSurfaceReadModelWithMatch(
	base: LocalPathSurfaceReadModel,
	match: LocalPathSurfaceRuleMatch | null,
): LocalPathSurfaceReadModel {
	return {
		...base,
		match,
	};
}

function readPathSurfaceReasonMap(database: SqlJsDatabase): ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> {
	const byRule = new Map<string, Map<string, string[]>>();

	for (const row of queryRows(database, 'SELECT rule_id, reason_kind, reason FROM path_surface_reasons ORDER BY rule_id, reason_kind, ordinal')) {
		const ruleId = toSearchString(row.rule_id);
		const reasonKind = toSearchString(row.reason_kind);
		const reason = toSearchString(row.reason);
		let reasonsByKind = byRule.get(ruleId);

		if (!reasonsByKind) {
			reasonsByKind = new Map();
			byRule.set(ruleId, reasonsByKind);
		}

		const reasons = reasonsByKind.get(reasonKind) ?? [];
		reasons.push(reason);
		reasonsByKind.set(reasonKind, reasons);
	}

	return byRule;
}

function readPathSurfaceRuleMatches(database: SqlJsDatabase): readonly LocalPathSurfaceRuleMatch[] {
	const reasons = readPathSurfaceReasonMap(database);

	return queryRows(
		database,
		'SELECT rule_id, pattern_kind, pattern, pattern_flags, surface_kind, category, is_public_surface, update_policy FROM path_surfaces ORDER BY rowid',
	).map((row) => {
		const ruleId = toSearchString(row.rule_id);
		const reasonsByKind = reasons.get(ruleId);
		const reasonList = (kind: string) => reasonsByKind?.get(kind) ?? [];

		return {
			ruleId,
			patternKind: toSearchString(row.pattern_kind),
			pattern: toSearchString(row.pattern),
			patternFlags: toSearchString(row.pattern_flags),
			changeKinds: reasonList('change_kind'),
			surface: {
				kind: toSearchString(row.surface_kind),
				category: toSearchString(row.category),
				isPublicSurface: Number(row.is_public_surface) === 1,
				validationReasons: reasonList('validation_reason'),
				affectedContracts: reasonList('affected_contract'),
				updatePolicy: toSearchString(row.update_policy),
				driftChecks: reasonList('drift_check'),
			},
		};
	});
}

function matchPathSurfaceRule(
	relativePath: string | null,
	rules: readonly LocalPathSurfaceRuleMatch[],
): LocalPathSurfaceRuleMatch | null {
	if (!relativePath) {
		return null;
	}

	for (const rule of rules) {
		try {
			if (new RegExp(rule.pattern, rule.patternFlags).test(relativePath)) {
				return rule;
			}
		} catch {
			continue;
		}
	}

	return null;
}

export async function readLocalPathSurfaces(
	projectRoot: string,
	relativePaths: readonly string[],
): Promise<ReadonlyMap<string, LocalPathSurfaceReadModel>> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const normalizedPaths = [...new Set(relativePaths.map((relativePath) => toPosixPath(relativePath)).filter(Boolean))];
	const statusMap = (status: LocalPathSurfaceReadModelStatus, stalePaths: readonly string[] = []) =>
		new Map(
			normalizedPaths.map((relativePath) => [
				relativePath,
				createPathSurfaceReadModelStatus(databasePath, status, relativePath, stalePaths),
			] as const),
		);

	if (!existsSync(databasePath)) {
		return statusMap('missing');
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return statusMap('stale', stalePaths);
		}

		const rules = readPathSurfaceRuleMatches(database);
		return new Map(
			normalizedPaths.map((relativePath) => {
				const base = createPathSurfaceReadModelStatus(databasePath, 'fresh', relativePath);
				return [relativePath, pathSurfaceReadModelWithMatch(base, matchPathSurfaceRule(relativePath, rules))] as const;
			}),
		);
	} catch {
		return statusMap('unreadable');
	} finally {
		database.close();
	}
}

export async function readLocalPathSurface(
	projectRoot: string,
	relativePath: string | undefined,
): Promise<LocalPathSurfaceReadModel> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const inputPath = relativePath ? toPosixPath(relativePath) : null;

	if (!inputPath) {
		if (!existsSync(databasePath)) {
			return createPathSurfaceReadModelStatus(databasePath, 'missing', null);
		}

		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(databasePath));

		try {
			const stalePaths = getStalePaths(projectRoot, database);
			return createPathSurfaceReadModelStatus(databasePath, stalePaths.length > 0 ? 'stale' : 'fresh', null, stalePaths);
		} catch {
			return createPathSurfaceReadModelStatus(databasePath, 'unreadable', null);
		} finally {
			database.close();
		}
	}

	const surfaces = await readLocalPathSurfaces(projectRoot, [inputPath]);
	return surfaces.get(inputPath) ?? createPathSurfaceReadModelStatus(databasePath, 'unreadable', inputPath);
}

export async function readLocalSourceAnchorVerdictRisks(
	projectRoot: string,
	relativePaths: readonly string[],
): Promise<readonly LocalSourceAnchorVerdictRisk[]> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const normalizedPaths = new Set(relativePaths.map((relativePath) => toPosixPath(relativePath)).filter(Boolean));

	if (!existsSync(databasePath) || normalizedPaths.size === 0) {
		return [];
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0 || !hasTable(database, 'source_anchors') || !hasTable(database, 'source_anchor_status')) {
			return [];
		}

		const rows = queryRows(
			database,
			`
SELECT
  source_anchors.id,
  source_anchors.path,
  source_anchors.line_start,
  source_anchors.invariant,
  source_anchors.risk,
  source_anchor_status.status
FROM source_anchors
JOIN source_anchor_status ON source_anchor_status.anchor_id = source_anchors.id
WHERE source_anchor_status.status IN ('changed', 'review', 'stale')
ORDER BY source_anchors.id
`,
		);

		return rows
			.map((row): LocalSourceAnchorVerdictRisk | null => {
				const relativePath = toSearchString(row.path);
				const riskTags = splitIndexedList(row.risk);
				const status = toSearchString(row.status);

				if (
					!normalizedPaths.has(relativePath) ||
					!hasHighRiskSourceAnchorRiskTags(riskTags) ||
					(status !== 'changed' && status !== 'review' && status !== 'stale')
				) {
					return null;
				}

				return {
					source: 'local_index',
					authority: 'evidence_only',
					anchorId: toSearchString(row.id),
					path: relativePath,
					lineStart: Number(row.line_start),
					status,
					riskTags,
					invariant: toSearchString(row.invariant) || null,
				};
			})
			.filter((risk): risk is LocalSourceAnchorVerdictRisk => risk !== null);
	} catch {
		return [];
	} finally {
		database.close();
	}
}

function getSectionHeadings(database: SqlJsDatabase, documentPath: string): string[] {
	return queryRows(database, 'SELECT heading FROM sections WHERE document_path = ? ORDER BY ordinal', [documentPath]).map((row) =>
		toSearchString(row.heading),
	);
}

function getDocumentTerms(database: SqlJsDatabase, documentPath: string): string[] {
	return queryRows(database, 'SELECT term FROM document_terms WHERE document_path = ? ORDER BY term', [documentPath]).map((row) =>
		toSearchString(row.term),
	);
}

function getCommandEffects(database: SqlJsDatabase, intent: string): NormalizedCommandEffect[] {
	return queryRows(
		database,
		'SELECT intent, source, access, mode, path, lock, concurrency FROM command_effects WHERE intent = ? ORDER BY lock, path, mode',
		[intent],
	).map((row) => ({
		intent: toSearchString(row.intent),
		source: toSearchString(row.source) as NormalizedCommandEffect['source'],
		access: toSearchString(row.access) as NormalizedCommandEffect['access'],
		mode: toSearchString(row.mode) as NormalizedCommandEffect['mode'],
		path: row.path === null || row.path === undefined ? null : toSearchString(row.path),
		lock: toSearchString(row.lock),
		concurrency: toSearchString(row.concurrency) as NormalizedCommandEffect['concurrency'],
	}));
}

interface IndexedSearchMatches {
	readonly active: boolean;
	readonly documents: ReadonlySet<string>;
	readonly skills: ReadonlySet<string>;
	readonly skillRoutes: ReadonlySet<string>;
	readonly commandIntents: ReadonlySet<string>;
	readonly sourceAnchors: ReadonlySet<string>;
}

const EMPTY_INDEXED_SEARCH_MATCHES: IndexedSearchMatches = {
	active: false,
	documents: new Set(),
	skills: new Set(),
	skillRoutes: new Set(),
	commandIntents: new Set(),
	sourceAnchors: new Set(),
};

function buildFtsQuery(query: string): string | null {
	const tokens = extractSearchTokens(query);

	if (tokens.length === 0) {
		return null;
	}

	return [...new Set(tokens)].map((token) => `"${token.replaceAll('"', '""')}"`).join(' AND ');
}

function queryFtsSet(database: SqlJsDatabase, sql: string, ftsQuery: string, column: string): ReadonlySet<string> {
	return new Set(queryRows(database, sql, [ftsQuery]).map((row) => toSearchString(row[column])));
}

function mergeSearchSets(left: ReadonlySet<string>, right: ReadonlySet<string>): ReadonlySet<string> {
	return new Set([...left, ...right]);
}

function mergeIndexedSearchMatches(left: IndexedSearchMatches, right: IndexedSearchMatches): IndexedSearchMatches {
	return {
		active: left.active || right.active,
		documents: mergeSearchSets(left.documents, right.documents),
		skills: mergeSearchSets(left.skills, right.skills),
		skillRoutes: mergeSearchSets(left.skillRoutes, right.skillRoutes),
		commandIntents: mergeSearchSets(left.commandIntents, right.commandIntents),
		sourceAnchors: mergeSearchSets(left.sourceAnchors, right.sourceAnchors),
	};
}

function queryNgramSet(
	database: SqlJsDatabase,
	targetKind: SearchNgramTargetKind,
	grams: readonly string[],
): ReadonlySet<string> {
	const placeholders = grams.map(() => '?').join(', ');

	if (!placeholders) {
		return new Set();
	}

	return new Set(
		queryRows(
			database,
			`SELECT target_key
FROM search_ngrams
WHERE target_kind = ? AND gram IN (${placeholders})
GROUP BY target_key
HAVING COUNT(DISTINCT gram) = ?`,
			[targetKind, ...grams, grams.length],
		).map((row) => toSearchString(row.target_key)),
	);
}

function getNgramSearchMatches(database: SqlJsDatabase, query: string): IndexedSearchMatches {
	if (!hasTable(database, 'search_ngrams')) {
		return EMPTY_INDEXED_SEARCH_MATCHES;
	}

	const grams = buildSearchNgrams([query]);

	if (grams.length === 0) {
		return EMPTY_INDEXED_SEARCH_MATCHES;
	}

	return {
		active: true,
		documents: queryNgramSet(database, 'document', grams),
		skills: queryNgramSet(database, 'skill', grams),
		skillRoutes: queryNgramSet(database, 'skill_route', grams),
		commandIntents: queryNgramSet(database, 'command_intent', grams),
		sourceAnchors: queryNgramSet(database, 'source_anchor', grams),
	};
}

function getIndexedSearchMatches(database: SqlJsDatabase, query: string): IndexedSearchMatches {
	const capabilities = readStoredSearchCapabilities(database);
	const ftsQuery = capabilities.backend === SEARCH_BACKEND_FTS5 ? buildFtsQuery(query) : null;
	const ngramMatches = getNgramSearchMatches(database, query);

	if (!ftsQuery) {
		return ngramMatches;
	}

	try {
		const ftsMatches = {
			active: true,
			documents: queryFtsSet(
				database,
				'SELECT path FROM search_documents_fts WHERE search_documents_fts MATCH ?',
				ftsQuery,
				'path',
			),
			skills: queryFtsSet(database, 'SELECT name FROM search_skills_fts WHERE search_skills_fts MATCH ?', ftsQuery, 'name'),
			skillRoutes: queryFtsSet(
				database,
				'SELECT route_key FROM search_skill_routes_fts WHERE search_skill_routes_fts MATCH ?',
				ftsQuery,
				'route_key',
			),
			commandIntents: queryFtsSet(
				database,
				'SELECT name FROM search_command_intents_fts WHERE search_command_intents_fts MATCH ?',
				ftsQuery,
				'name',
			),
			sourceAnchors: queryFtsSet(
				database,
				'SELECT id FROM search_source_anchors_fts WHERE search_source_anchors_fts MATCH ?',
				ftsQuery,
				'id',
			),
		};

		return mergeIndexedSearchMatches(ftsMatches, ngramMatches);
	} catch {
		return ngramMatches;
	}
}

function matchesIndexedOrTableScan(
	fields: readonly string[],
	query: string,
	indexedMatches: IndexedSearchMatches,
	matchSet: ReadonlySet<string>,
	key: string,
): boolean {
	return (indexedMatches.active && matchSet.has(key)) || isMatched(fields, query);
}

function scoreIndexedOrTableScan(
	primaryFields: readonly string[],
	secondaryFields: readonly string[],
	query: string,
	indexedMatches: IndexedSearchMatches,
	matchSet: ReadonlySet<string>,
	key: string,
): number {
	const tableScore = scoreMatch(primaryFields, secondaryFields, query);
	return indexedMatches.active && matchSet.has(key) ? Math.max(tableScore, 20) : tableScore;
}

/**
 * mf:anchor cli.search.local-index
 * purpose: Search the local index while preserving workflow authority above source navigation hints.
 * search: mf search, scope workflow source all, authority rank, navigation only
 * invariant: Source anchor results remain navigation-only and cannot outrank command or workflow authority.
 * risk: cache, config
 */
export async function searchLocalIndex(projectRoot: string, query: string, options: LocalSearchOptions = {}): Promise<LocalSearchResult> {
	const normalizedQuery = normalizeSearchText(query);
	const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
	const scope = options.scope ?? 'workflow';
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		throw new Error('Local mustflow index not found. Run `mf index` before searching.');
	}

	if (normalizedQuery.length === 0) {
		throw new Error('Search query must not be empty.');
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));
	const cacheLayers = readCacheLayerSets(projectRoot);
	let capabilities = searchCapabilities(false);
	const results: LocalSearchItem[] = [];

	try {
		const stalePaths = getStalePaths(projectRoot, database);
		capabilities = readStoredSearchCapabilities(database);
		const indexedMatches = getIndexedSearchMatches(database, normalizedQuery);

		if (stalePaths.length > 0) {
			throw new Error(
				`Local mustflow index is stale: ${stalePaths.join(', ')}. Run \`mf index\` before searching. Refresh command: mf index`,
			);
		}

		if (scope === 'workflow' || scope === 'all') {
			for (const row of queryRows(database, 'SELECT path, type, title, content_snippet FROM documents')) {
				const pathValue = toSearchString(row.path);
				const typeValue = toSearchString(row.type);
				const title = toSearchString(row.title);
				const contentSnippet = toSearchString(row.content_snippet);
				const sectionHeadings = getSectionHeadings(database, pathValue);
				const documentTerms = getDocumentTerms(database, pathValue);
				const primaryFields = [pathValue, title];
				const secondaryFields = [typeValue, contentSnippet, ...sectionHeadings, ...documentTerms];
				const fields = [...primaryFields, ...secondaryFields];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.documents, pathValue)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'document',
							path: pathValue,
							title,
							document_type: typeValue,
							...workflowAuthorityForDocument(typeValue),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.documents,
								pathValue,
							),
						},
						cacheLayers,
					),
				);
			}

			for (const row of queryRows(database, 'SELECT name, path, title FROM skills')) {
				const name = toSearchString(row.name);
				const pathValue = toSearchString(row.path);
				const title = toSearchString(row.title);
				const fields = [name, pathValue, title];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.skills, name)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'skill',
							name,
							path: pathValue,
							title,
							...skillAuthority(),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								[name, pathValue, title],
								[],
								normalizedQuery,
								indexedMatches,
								indexedMatches.skills,
								name,
							),
						},
						cacheLayers,
					),
				);
			}

			for (const row of queryRows(
				database,
				'SELECT skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output FROM skill_routes',
			)) {
				const name = toSearchString(row.skill_name);
				const pathValue = toSearchString(row.skill_path);
				const trigger = toSearchString(row.trigger);
				const requiredInput = toSearchString(row.required_input);
				const editScope = toSearchString(row.edit_scope);
				const risk = toSearchString(row.risk);
				const verificationIntents = splitVerificationIntents(toSearchString(row.verification_intents));
				const expectedOutput = toSearchString(row.expected_output);
				const primaryFields = [name, trigger];
				const secondaryFields = [pathValue, requiredInput, editScope, risk, expectedOutput];
				const fields = [...primaryFields, ...secondaryFields];
				const routeKey = skillRouteKey({ skillName: name, trigger });

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.skillRoutes, routeKey)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'skill_route',
							name,
							path: pathValue,
							title: name,
							route_trigger: trigger,
							route_risk: risk,
							verification_intents: verificationIntents,
							...skillAuthority(),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.skillRoutes,
								routeKey,
							),
						},
						cacheLayers,
					),
				);
			}

			for (const row of queryRows(database, 'SELECT name, status, lifecycle, run_policy, description FROM command_intents')) {
				const name = toSearchString(row.name);
				const status = toSearchString(row.status);
				const lifecycle = toSearchString(row.lifecycle);
				const runPolicy = toSearchString(row.run_policy);
				const description = toSearchString(row.description);
				const effects = getCommandEffects(database, name);
				const effectLocks = [...new Set(effects.map((effect) => effect.lock))].sort((left, right) =>
					left.localeCompare(right),
				);
				const effectPaths = [
					...new Set(effects.map((effect) => effect.path).filter((effectPath): effectPath is string => effectPath !== null)),
				].sort((left, right) => left.localeCompare(right));
				const effectModes = [...new Set(effects.map((effect) => effect.mode))].sort((left, right) =>
					left.localeCompare(right),
				);
				const primaryFields = [name];
				const secondaryFields = [status, lifecycle, runPolicy, description, ...effectLocks, ...effectPaths, ...effectModes];
				const fields = [...primaryFields, ...secondaryFields];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.commandIntents, name)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'command_intent',
							name,
							title: description || name,
							effect_locks: effectLocks,
							effect_paths: effectPaths,
							effect_modes: effectModes,
							...commandIntentAuthority(),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.commandIntents,
								name,
							),
						},
						cacheLayers,
					),
				);
			}
		}

		if (scope === 'source' || scope === 'all') {
			for (const row of queryRows(
				database,
				'SELECT source_anchors.id, path, line_start, purpose, search_terms, invariant, risk, source_anchors.navigation_only, source_anchors.can_instruct_agent, status, confidence FROM source_anchors LEFT JOIN source_anchor_status ON source_anchor_status.anchor_id = source_anchors.id',
			)) {
				const id = toSearchString(row.id);
				const pathValue = toSearchString(row.path);
				const purpose = toSearchString(row.purpose);
				const searchTerms = toSearchString(row.search_terms);
				const invariant = toSearchString(row.invariant);
				const risk = toSearchString(row.risk);
				const primaryFields = [id, pathValue];
				const secondaryFields = [purpose, searchTerms, invariant, risk];
				const fields = [...primaryFields, ...secondaryFields];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.sourceAnchors, id)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'source_anchor',
							anchor_id: id,
							name: id,
							path: pathValue,
							line_start: Number(row.line_start),
							title: purpose || id,
							risk,
							...sourceAnchorAuthority(),
							stale_status: toSearchString(row.status) as SourceAnchorStatus,
							stale_confidence: Number(row.confidence),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.sourceAnchors,
								id,
							),
						},
						cacheLayers,
					),
				);
			}
		}
	} finally {
		database.close();
	}

	const sortedResults = results
		.sort((left, right) => {
			if (scope === 'all' && left.authority_rank !== right.authority_rank) {
				return left.authority_rank - right.authority_rank;
			}

			return right.score - left.score || (left.path ?? left.name ?? '').localeCompare(right.path ?? right.name ?? '');
		})
		.slice(0, limit);

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'search',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		query: normalizedQuery,
		limit,
		scope,
		index_fresh: true,
		stale_paths: [],
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		result_count: sortedResults.length,
		results: sortedResults,
	};
}
