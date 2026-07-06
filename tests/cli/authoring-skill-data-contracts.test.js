import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readSkillDirectoryNames,
	readText,
	routeReasons,
} from './helpers/skill-contracts.js';

test('database migration change review catches online rollout and DDL traps', () => {
	const localSkill = readText('.mustflow/skills/database-migration-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/database-migration-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /old code, new code, old data, and new data/u);
	assert.match(localSkill, /expand, backfill, switch, and contract/u);
	assert.match(localSkill, /DROP COLUMN/u);
	assert.match(localSkill, /NOT NULL/u);
	assert.match(localSkill, /PostgreSQL `NOT VALID`/u);
	assert.match(localSkill, /CREATE INDEX CONCURRENTLY/u);
	assert.match(localSkill, /ALGORITHM=INSTANT/u);
	assert.match(localSkill, /LOCK=NONE/u);
	assert.match(localSkill, /lock_timeout/u);
	assert.match(localSkill, /statement_timeout/u);
	assert.match(localSkill, /DDL statements in one transaction/u);
	assert.match(localSkill, /cursor-based ordering key/u);
	assert.match(localSkill, /idempotency/u);
	assert.match(localSkill, /pause\/resume/u);
	assert.match(localSkill, /replication lag/u);
	assert.match(localSkill, /idle-in-transaction/u);
	assert.match(localSkill, /cut-over/u);
	assert.match(localSkill, /dual-write mismatch/u);
	assert.match(localSkill, /observability queries/u);
	assert.match(localSkill, /roll-forward/u);
	assert.match(localSkill, /offset-based backfills/u);
	assert.match(skillIndex, /\.mustflow\/skills\/database-migration-change\/SKILL\.md/u);
	assert.match(skillIndex, /online DDL, indexes, constraints, background-job backfills/u);
	assert.match(skillIndex, /lock\/timeout\/replication\/cut-over\/runbook\/observability classification/u);
	assert.match(routes, /\[routes\."database-migration-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.match(routes, /priority = 82/u);
	assertRouteReasonsText(routes, [
		'code_change',
		'data_change',
		'migration_change',
		'public_api_change',
		'test_change',
		'docs_change',
		'security_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/database-migration-change\/SKILL\.md"/u);
	assert.match(manifest, /"database-migration-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.database-migration-change"\][\s\S]*?revision = 4/u);
});

test('database query bottleneck review catches diff-visible query path risks', () => {
	const localSkill = readText('.mustflow/skills/database-query-bottleneck-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/database-query-bottleneck-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /cardinality explosion/u);
	assert.match(localSkill, /N\+1 candidates/u);
	assert.match(localSkill, /eager loading/u);
	assert.match(localSkill, /`SELECT \*`/u);
	assert.match(localSkill, /stable `ORDER BY`/u);
	assert.match(localSkill, /`OFFSET \.\.\. LIMIT \.\.\.`/u);
	assert.match(localSkill, /composite indexes/u);
	assert.match(localSkill, /range predicates/u);
	assert.match(localSkill, /Functions or casts around columns/u);
	assert.match(localSkill, /parameter and type mismatch/u);
	assert.match(localSkill, /Leading wildcard/u);
	assert.match(localSkill, /`OR` across different columns/u);
	assert.match(localSkill, /Very large `IN` lists/u);
	assert.match(localSkill, /`EXISTS` for existence checks/u);
	assert.match(localSkill, /`NOT IN` with NULLs/u);
	assert.match(localSkill, /`LEFT JOIN` followed by `WHERE right_table\.col/u);
	assert.match(localSkill, /Aggregate before join fan-out/u);
	assert.match(localSkill, /latest-row and per-parent subqueries/u);
	assert.match(localSkill, /wide rows with large text, JSON, or blob columns/u);
	assert.match(localSkill, /JSON filters/u);
	assert.match(localSkill, /tenant and soft-delete scope/u);
	assert.match(localSkill, /estimated rows and actual rows/u);
	assert.match(localSkill, /extended statistics/u);
	assert.match(localSkill, /PostgreSQL `EXPLAIN ANALYZE`/u);
	assert.match(localSkill, /MySQL `EXPLAIN ANALYZE`/u);
	assert.match(localSkill, /SQL Server actual execution plans/u);
	assert.match(localSkill, /Query Store history/u);
	assert.match(localSkill, /Missing-index recommendations are candidates/u);
	assert.match(localSkill, /Plan forcing is a last resort/u);
	assert.match(localSkill, /Check transaction scope/u);
	assert.match(skillIndex, /\.mustflow\/skills\/database-query-bottleneck-review\/SKILL\.md/u);
	assert.match(skillIndex, /Database query review needs to catch bottlenecks visible in the diff/u);
	assert.match(skillIndex, /cardinality explosion, ORM N\+1, eager-load overfetch/u);
	assert.match(routes, /\[routes\."database-query-bottleneck-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 67/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'data_change',
		'performance_change',
		'test_change',
		'docs_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/database-query-bottleneck-review\/SKILL\.md"/u);
	assert.match(manifest, /"database-query-bottleneck-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.database-query-bottleneck-review"\][\s\S]*?revision = 2/u);
});

test('database JSON modeling review keeps flexible columns from hiding schema decisions', () => {
	const localSkill = readText('.mustflow/skills/database-json-modeling-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/database-json-modeling-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /schema, ownership, validation, indexing, retention/u);
	assert.match(localSkill, /truly document-shaped context/u);
	assert.match(localSkill, /`JSON`, `jsonb`, `json`, `metadata`/u);
	assert.match(localSkill, /`raw_payload`/u);
	assert.match(localSkill, /schemaVersion/u);
	assert.match(localSkill, /JSON key registry/u);
	assert.match(localSkill, /tenant scope/u);
	assert.match(localSkill, /permission bit/u);
	assert.match(localSkill, /uniqueness rule/u);
	assert.match(localSkill, /child tables/u);
	assert.match(localSkill, /generated columns/u);
	assert.match(localSkill, /computed columns/u);
	assert.match(localSkill, /expression indexes/u);
	assert.match(localSkill, /GIN indexes/u);
	assert.match(localSkill, /`jsonb_path_ops`/u);
	assert.match(localSkill, /`JSON_VALUE`/u);
	assert.match(localSkill, /`JSON_EXTRACT`/u);
	assert.match(localSkill, /`ISJSON`/u);
	assert.match(localSkill, /unknown-key behavior/u);
	assert.match(localSkill, /Raw payload versus operational truth split/u);
	assert.match(skillIndex, /\.mustflow\/skills\/database-json-modeling-review\/SKILL\.md/u);
	assert.match(skillIndex, /Database JSON, `jsonb`, `json`, metadata/u);
	assert.match(skillIndex, /business state hidden in metadata/u);
	assert.match(
		routes,
		/\[routes\."database-json-modeling-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "adjunct"/u,
	);
	assert.match(routes, /priority = 69/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'data_change',
		'performance_change',
		'migration_change',
		'test_change',
		'docs_change',
		'security_change',
		'privacy_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/database-json-modeling-review\/SKILL\.md"/u);
	assert.match(manifest, /"database-json-modeling-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.database-json-modeling-review"\][\s\S]*?revision = 1/u);
});

test('deletion lifecycle review keeps delete, restore, purge, and retention semantics explicit', () => {
	const localSkill = readText('.mustflow/skills/deletion-lifecycle-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/deletion-lifecycle-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /retention windows/u);
	assert.match(localSkill, /user-restorable soft delete/u);
	assert.match(localSkill, /operator-restorable recovery/u);
	assert.match(localSkill, /legal-retention hold/u);
	assert.match(localSkill, /cryptographic erasure/u);
	assert.match(localSkill, /`is_deleted`/u);
	assert.match(localSkill, /`deleted_at`/u);
	assert.match(localSkill, /partial indexes/u);
	assert.match(localSkill, /tombstones/u);
	assert.match(localSkill, /PITR/u);
	assert.match(localSkill, /WAL/u);
	assert.match(localSkill, /binlog/u);
	assert.match(localSkill, /downstream deletion/u);
	assert.match(localSkill, /`ON DELETE CASCADE`/u);
	assert.match(localSkill, /tenant offboarding/u);
	assert.match(localSkill, /backup residue window/u);
	assert.match(skillIndex, /\.mustflow\/skills\/deletion-lifecycle-review\/SKILL\.md/u);
	assert.match(skillIndex, /Data deletion, soft delete, hard delete, purge/u);
	assert.match(skillIndex, /false irreversible-delete claim/u);
	assert.match(
		routes,
		/\[routes\."deletion-lifecycle-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "adjunct"/u,
	);
	assert.match(routes, /priority = 70/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'data_change',
		'performance_change',
		'migration_change',
		'test_change',
		'docs_change',
		'security_change',
		'privacy_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/deletion-lifecycle-review\/SKILL\.md"/u);
	assert.match(manifest, /"deletion-lifecycle-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.deletion-lifecycle-review"\][\s\S]*?revision = 1/u);
});

test('database lock contention review catches hot rows and blocking paths', () => {
	const localSkill = readText('.mustflow/skills/database-lock-contention-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/database-lock-contention-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /hot-row contention/u);
	assert.match(localSkill, /`SELECT \.\.\. FOR UPDATE`/u);
	assert.match(localSkill, /`FOR NO KEY UPDATE`/u);
	assert.match(localSkill, /`SKIP LOCKED`/u);
	assert.match(localSkill, /gap or next-key locks/u);
	assert.match(localSkill, /metadata locks/u);
	assert.match(localSkill, /conditional updates/u);
	assert.match(localSkill, /sharded counters/u);
	assert.match(localSkill, /append-only ledgers/u);
	assert.match(localSkill, /reservation tables/u);
	assert.match(localSkill, /deadlock retry/u);
	assert.match(localSkill, /idle-in-transaction blockers/u);
	assert.match(localSkill, /pool wait/u);
	assert.match(localSkill, /both waiter and blocker/u);
	assert.match(localSkill, /static lock-contention risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/database-lock-contention-review\/SKILL\.md/u);
	assert.match(skillIndex, /Database lock contention review needs to catch blocking visible in the diff/u);
	assert.match(skillIndex, /hot-row serialization, parent-counter bottleneck/u);
	assert.match(
		routes,
		/\[routes\."database-lock-contention-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "adjunct"/u,
	);
	assert.match(routes, /priority = 68/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'data_change',
		'performance_change',
		'migration_change',
		'test_change',
		'docs_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/database-lock-contention-review\/SKILL\.md"/u);
	assert.match(manifest, /"database-lock-contention-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.database-lock-contention-review"\][\s\S]*?revision = 1/u);
});

test('clickhouse code change catches MergeTree, ingest, and query-plan traps', () => {
	const localSkill = readText('.mustflow/skills/clickhouse-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/clickhouse-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /ClickHouse is not fast PostgreSQL/u);
	assert.match(localSkill, /MergeTree storage layout/u);
	assert.match(localSkill, /describe MergeTree primary keys as unique constraints/u);
	assert.match(localSkill, /partitioning as lifecycle first/u);
	assert.match(localSkill, /Small inserts create parts/u);
	assert.match(localSkill, /async insert as server-side batching/u);
	assert.match(localSkill, /deduplication as block-level behavior/u);
	assert.match(localSkill, /`INSERT SELECT`/u);
	assert.match(localSkill, /materialized views as insert triggers/u);
	assert.match(localSkill, /Avoid trusting `POPULATE`/u);
	assert.match(localSkill, /`AggregateFunction` state plus `-Merge`/u);
	assert.match(localSkill, /`arrayJoin` explosion/u);
	assert.match(localSkill, /`anyLast`/u);
	assert.match(localSkill, /approximate functions such as `topK`/u);
	assert.match(localSkill, /`FINAL`, mutations, and `OPTIMIZE FINAL`/u);
	assert.match(localSkill, /projections as hidden data structures/u);
	assert.match(localSkill, /dictionaries/u);
	assert.match(localSkill, /`GLOBAL IN` or `GLOBAL JOIN`/u);
	assert.match(localSkill, /ordinary CTEs are materialized or cached/u);
	assert.match(localSkill, /skip-index cargo culting/u);
	assert.match(skillIndex, /\.mustflow\/skills\/clickhouse-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /ClickHouse-specific schema, MergeTree engine configuration/u);
	assert.match(skillIndex, /OLTP-shaped table design/u);
	assert.match(routes, /\[routes\."clickhouse-code-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.deepEqual(routeReasons(routes, 'clickhouse-code-change'), [
		'code_change',
		'data_change',
		'migration_change',
		'behavior_change',
		'public_api_change',
		'test_change',
		'docs_change',
		'security_change',
		'performance_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/clickhouse-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"clickhouse-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.clickhouse-code-change"\][\s\S]*?revision = 1/u);
});

test('duckdb code change catches embedded OLAP, file-format, and profiling traps', () => {
	const localSkill = readText('.mustflow/skills/duckdb-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/duckdb-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /DuckDB is embedded OLAP/u);
	assert.match(localSkill, /not SQLite-like OLTP/u);
	assert.match(localSkill, /single read-write process/u);
	assert.match(localSkill, /Multi-process writes/u);
	assert.match(localSkill, /duckdb\.sql\(\)/u);
	assert.match(localSkill, /`cursor\(\)`/u);
	assert.match(localSkill, /`DuckDBInstance`/u);
	assert.match(localSkill, /Appender buffers data/u);
	assert.match(localSkill, /`memory_limit` is not a full process\s+RSS cap/u);
	assert.match(localSkill, /`temp_directory`/u);
	assert.match(localSkill, /`duckdb_memory\(\)`/u);
	assert.match(localSkill, /`duckdb_temporary_files\(\)`/u);
	assert.match(localSkill, /CSV auto-detect/u);
	assert.match(localSkill, /`union_by_name=true`/u);
	assert.match(localSkill, /Parquet row group/u);
	assert.match(localSkill, /Add `ORDER BY`/u);
	assert.match(localSkill, /order-sensitive aggregates/u);
	assert.match(localSkill, /`TIMESTAMPTZ` stores instants/u);
	assert.match(localSkill, /`EXPLAIN ANALYZE`/u);
	assert.match(localSkill, /`profiling_coverage`/u);
	assert.match(localSkill, /ART index/u);
	assert.match(localSkill, /`AS MATERIALIZED` or `AS NOT MATERIALIZED`/u);
	assert.match(localSkill, /Use `QUALIFY`/u);
	assert.match(localSkill, /DuckDB macros are SQL templates/u);
	assert.match(skillIndex, /\.mustflow\/skills\/duckdb-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /DuckDB-specific embedded OLAP database use/u);
	assert.match(skillIndex, /SQLite-like OLTP assumption/u);
	assert.match(routes, /\[routes\."duckdb-code-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.deepEqual(routeReasons(routes, 'duckdb-code-change'), [
		'code_change',
		'data_change',
		'migration_change',
		'behavior_change',
		'public_api_change',
		'test_change',
		'docs_change',
		'security_change',
		'performance_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/duckdb-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"duckdb-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.duckdb-code-change"\][\s\S]*?revision = 1/u);
});

test('github contribution quality gate keeps maintainer-facing GitHub posts evidence-based', () => {
	const localSkill = readText('.mustflow/skills/github-contribution-quality-gate/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/github-contribution-quality-gate/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /revision: 3/u);
	assert.match(localSkill, /repository templates/u);
	assert.match(localSkill, /duplicate search/u);
	assert.match(localSkill, /readable Markdown structure/u);
	assert.match(localSkill, /Plan the reading order before polishing prose/u);
	assert.match(localSkill, /Do not add agent, assistant, vendor, or tool prefixes/u);
	assert.match(localSkill, /such as `\[codex\]`, `\[AI\]`, or `\[bot\]`/u);
	assert.match(localSkill, /Use Markdown elements by job, not decoration/u);
	assert.match(localSkill, /Apply a Preview self-check/u);
	assert.match(localSkill, /behavior matrix/u);
	assert.match(localSkill, /SUPPORT\.md/u);
	assert.match(localSkill, /SECURITY\.md/u);
	assert.match(localSkill, /AI assistance/u);
	assert.match(localSkill, /human contributor/u);
	assert.match(localSkill, /PRIVATE_SECURITY_REPORT/u);
	assert.match(localSkill, /ASK_IN_EXISTING_THREAD/u);
	assert.match(localSkill, /POST_AS_DRAFT/u);
	assert.match(localSkill, /Use ready-for-review as the default for small, independent fixes/u);
	assert.match(localSkill, /Use draft only when the PR is intentionally discussion-first/u);
	assert.match(localSkill, /Do not re-request review merely because a draft was marked ready/u);
	assert.match(localSkill, /DO_NOT_POST/u);
	assert.match(localSkill, /`same problem here`/u);
	assert.match(localSkill, /Does the title state the observed issue result or PR outcome/u);
	assert.match(localSkill, /Does the PR title avoid agent, assistant, vendor, or tool prefixes/u);
	assert.match(localSkill, /Is a verified small PR ready for review instead of unnecessarily draft/u);
	assert.match(skillIndex, /\.mustflow\/skills\/github-contribution-quality-gate\/SKILL\.md/u);
	assert.match(skillIndex, /maintainer-facing comment content/u);
	assert.match(routes, /\[routes\."github-contribution-quality-gate"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'docs_change',
		'workflow_change',
		'public_api_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/github-contribution-quality-gate\/SKILL\.md"/u);
	assert.match(manifest, /"github-contribution-quality-gate"/u);
	assert.match(i18n, /\[documents\."skill\.github-contribution-quality-gate"\][\s\S]*?revision = 3/u);
});
