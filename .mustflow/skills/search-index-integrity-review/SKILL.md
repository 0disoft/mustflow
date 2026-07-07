---
mustflow_doc: skill.search-index-integrity-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: search-index-integrity-review
description: Apply this skill when keyword search, full-text search, Elasticsearch, OpenSearch, Lucene-style indexes, search APIs, indexing pipelines, source maps, metadata taxonomy, aliases, bulk indexing, refresh visibility, analyzers, mappings, synonyms, autocomplete, pagination, shard failures, search quality, or search performance are created, changed, reviewed, or failing. Use vector-search-integrity-review first for vector-only or semantic retrieval mechanics, and use rag-pipeline-triage first when a RAG failure is not yet localized to search retrieval.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.search-index-integrity-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Search Index Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review search as an end-to-end index and query contract, not as "the cluster is green."

The core question is whether a source record can be changed, accepted by the indexing path, become visible through the same API users call, rank as expected, stay isolated by tenant and filters, and remain fast under realistic query shapes.

<!-- mustflow-section: use-when -->
## Use When

- Code creates or changes search ingestion, indexing jobs, bulk writes, index aliases, refresh policy, index templates, mappings, analyzers, keyword or text fields, synonyms, autocomplete, query builders, filters, sort, pagination, highlighting, source filtering, result shaping, search caches, or search observability.
- Search is missing documents, returning stale data, returning partial results, ranking the wrong document, showing zero results, leaking tenant data, slowing down, timing out, rejecting writes, or behaving differently through direct search, backend API, and UI.
- A review needs index visibility, read/write alias, bulk item errors, shard failure, mapping drift, analyzer, synonym, golden-set, p95 or p99 latency, slow-log, query fingerprint, shard fan-out, cache, refresh, segment merge, disk watermark, or search SLO evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only vector, semantic, embedding, ANN, reranking, or vector hybrid mechanics; use `vector-search-integrity-review` first.
- The task is an end-to-end RAG failure and it is not yet clear whether ingestion, retrieval, context assembly, prompt construction, generation, citation validation, or answerability failed; use `rag-pipeline-triage` first.
- The task is only API transport, CORS, SDK, gateway, auth, or cache failure before the search boundary is known; use `api-failure-triage`.
- The task is ordinary database query performance with no search index, analyzer, ranking, alias, or indexing path.
- The requested evidence would require dumping private queries, customer documents, raw personal data, or production result pages into docs, tests, commits, or reports. Use safe IDs, hashes, synthetic fixtures, aggregate counts, or redacted examples.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Symptom classification: source not indexed, write not visible, wrong alias, partial shard result, wrong exact match, wrong full-text match, ranking drift, zero results, stale delete, tenant leak, autocomplete failure, deep-page failure, slow query, bulk rejection, mapping conflict, or UI/API mismatch.
- Source-to-search ledger: source id, tenant, category, status, update time, indexing request time, bulk item result, indexed document id, direct lookup result, first search-visible time, rank, delete or tombstone state, and visibility lag.
- Query contract ledger: user-facing API path, direct search request, API-transformed request, UI result shaping, index or alias, tenant and permission filters, analyzed fields, exact fields, sort, pagination mode, source fields, highlight fields, cache state, and expected result ids.
- Index contract ledger: read alias, write alias, index templates, mappings, analyzers, normalizers,
  exact id fields, exact keyword fields, facet fields, filter-only metadata, embedding-header
  metadata, citation metadata, negative metadata, taxonomy fields, controlled vocabulary, metadata
  key budget, stable source id, document id, chunk id when applicable, alias or synonym tables,
  source-map fields, published/effective/indexed/verified dates, version fields, content hash,
  schema version, index version, dynamic mapping policy, refresh policy, shard and replica plan,
  segment or merge state, disk watermark risk, and rollover or reindex status.
- Quality ledger: representative queries, expected results, acceptable alternatives, zero-result expectations, Precision@K, Recall@K, MRR or ranking metric, before/after comparison, click or behavior metric limitations, and golden-set fixture status.
- Performance ledger: cold and warm latency, p50, p95, p99, search server time, API time, UI time, query phase, fetch phase, response size, shard fan-out, thread-pool active/queue/rejected, slow-log or query-profile evidence, cache hit or miss, and retry behavior.
- Privacy ledger: raw query text, document text, tenant ids, user ids, behavior analytics, search logs, highlights, and whether evidence can be stored safely as synthetic fixtures, ids, hashes, summaries, or aggregate metrics.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Existing search adapters, query builders, index templates, mapping fixtures, golden sets, telemetry, and tests have been searched before changing search behavior.
- Raw private document text, queries, user behavior, and tenant-identifying payloads are not copied into repository artifacts unless they are safe synthetic fixtures.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten search canaries, indexing ledgers, bulk item error handling, alias checks, mapping
  and analyzer fixtures, metadata taxonomy checks, frontmatter schema checks,
  controlled-vocabulary fixtures, exact-keyword fixtures, negative-metadata filters,
  exact-versus-full-text tests, tenant and permission filter tests, golden-set tests, synonym
  regression tests, pagination guards, query and miss-log metrics, search latency metrics, docs,
  and directly synchronized templates.
- Add focused synthetic fixtures that encode expected exact search, full-text search, analyzer behavior, synonym behavior, filtered search, tenant isolation, zero-result behavior, pagination stability, and ranking order.
- Do not change analyzer, synonym, refresh, alias, shard, cache, or ranking settings blindly. First preserve source-to-search, query-contract, quality, and performance evidence.
- Do not force every write to refresh immediately unless the product contract explicitly needs synchronous visibility and the indexing cost is accepted.
- Do not treat search metrics as permission checks. Authorization and tenant filters must remain enforced outside and inside the search query path as the product requires.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the failure before tuning.
   - Separate source missing, indexing rejected, write not visible, wrong alias, direct lookup mismatch, exact-search mismatch, full-text mismatch, ranking drift, partial shard result, API/UI transformation, stale cache, and slow query.
   - If the symptom is only "cluster green but users cannot find it," require source-to-search evidence.
2. Add or inspect a search canary when the system supports it.
   - A unique canary document should pass through the same write path and user-facing search API as real data.
   - Record accepted time, first visible time, rank, index or alias, tenant or filter context, and not-found evidence.
3. Check bulk and ingestion outcomes per item.
   - A batch-level success is insufficient. Inspect item-level errors, mapping conflicts, version conflicts, rejected writes, shard failures, retries, and failed ids.
   - Preserve failed source ids or safe hashes so reindex and reconciliation can target real misses.
4. Reconcile source and index by slices.
   - Compare counts and checksums by tenant, date, category, status, or other ownership boundary.
   - Total count equality can hide one tenant missing and another duplicated.
5. Split direct lookup, exact search, and full-text search.
   - Direct lookup success with search failure points toward refresh, alias, mapping, analyzer, filter, query, or API transformation.
   - Exact keyword failure and full-text failure are different contracts.
6. Check read and write aliases.
   - Expand aliases to concrete indexes, write index, filters, routing, rollover state, and reindex targets.
   - A new index receiving writes while search reads the old alias is an indexing visibility bug, not a ranking bug.
7. Treat partial shard results as correctness evidence.
   - Record `timed_out`, total shards, successful shards, failed shards, and partial-result policy.
   - If partial results are not a valid product state, fail the request instead of silently returning incomplete search.
8. Compare direct search, backend API, and UI output.
   - Direct search isolates engine behavior.
   - Backend API adds query builders, permission filters, caches, response shaping, and pagination.
   - UI adds sorting, dedupe, local cache, page state, and display filtering.
9. Inspect mappings and analyzers before changing queries.
   - IDs, emails, status codes, tags, and exact filters usually need keyword-like fields.
   - Human text usually needs text analysis. Use analyzer evidence or fixtures to prove tokenization for punctuation, case, hyphen, Korean spacing, product codes, and mixed alphanumeric text.
10. Review metadata taxonomy and controlled vocabulary.
    - Distinguish filter fields, facet fields, ranking fields, display fields, and source-map fields.
    - Canonical keys, aliases, synonyms, old names, and related terms should be explicit so free-form tags do not become five spellings of the same concept.
    - Treat tags as filter conditions, not vibes. Reject values such as important, misc, final, or
      reference unless they have a controlled, queryable meaning.
    - Keep the metadata key set small enough that writers can fill it consistently; separate a
      core filter set from optional enrichment instead of accepting unbounded ad hoc keys.
11. Split metadata by job.
    - Filter metadata should be typed and exact; context headers should help lexical and semantic
      recall; citation metadata should point back to source spans.
    - Do not put every metadata key into analyzed text. Select title, section, entity, date, type,
      and other disambiguators; keep volatile, private, or filter-only fields out of recall text.
    - Keep LLM-visible metadata separate from search/filter metadata when the index feeds RAG.
      Operational paths, ACL fields, tenant IDs, and internal ids should not become answer text
      unless they change citation, permission, or disambiguation.
12. Separate path hints from state fields.
    - Paths may encode tenant, visibility, lifecycle, source, language, or date for operations, but
      `status`, `is_current`, `effective_from`, `effective_to`, `published_at`, `indexed_at`,
      `last_verified_at`, `version`, and `revision` should remain first-class filter fields.
    - File names are human hints; stable ids are machine keys. Renames, storage moves, and reindex
      jobs should not break citations, deletes, feedback logs, or eval sets.
13. Review negative metadata and lifecycle filters.
    - Visibility, audience, jurisdiction exclusions, draft/deprecated state, retention, and security
      class are search correctness gates, not decoration.
    - A good search result that should not have been eligible is a security or product bug.
14. Preserve source maps and freshness fields.
    - Store document id, chunk id when applicable, file or URL, section anchor, line or page span, content hash, schema or index version, and last indexed time so stale or unsupported results can be traced.
15. Review exact keyword fields separately from analyzed text.
    - Error codes, API paths, legal references, ticket ids, SKU values, class or function names, and
      deprecated names need exact or keyword search coverage even when semantic retrieval exists.
16. Review synonym and ranking changes against a golden set.
    - Synonyms can improve one query and break many others.
    - Compare representative queries before and after; include zero-result, typo, ambiguous, category, brand, long natural-language, and high-value queries.
17. Use query, miss, and click logs as improvement evidence without leaking raw private text.
    - Track query family, normalized terms, filters, zero-result rate, clicked ids, used chunks, fallback reason, and answer success where safe.
    - Do not turn private queries or highlights into fixtures unless they are redacted or synthetic.
18. Explain surprising ranks only for bounded cases.
    - Inspect why one expected document ranked below another for a small failing sample.
    - Do not enable expensive explain or profile behavior for broad production traffic.
19. Separate query, fetch, API, and UI latency.
    - p50, p95, and p99 must be grouped by search type, index, route, role, tenant class, and query fingerprint where safe.
    - Fetch time, source size, highlight fields, nested fields, and response shaping can dominate score calculation.
20. Fingerprint query shapes.
    - Remove raw IDs, dates, user text, and tenant secrets before grouping.
    - Store query family, index, role, shard count, cache state, source fields, sort, and filter shape so one feature cannot hide across millions of unique queries.
21. Check shard fan-out, thread pools, segments, cache, and disk.
    - Search across hundreds of tiny shards, stale segments, merge backlog, cold caches, search queue rejections, hot shards, and disk watermarks can look like application bugs.
    - Separate cold and warm measurements; cached benchmarks are not full search evidence.
22. Review refresh and visibility policy.
    - Indexing success is not search visibility.
    - Use synchronous visibility only for writes whose user contract needs it; otherwise define acceptable visibility lag and measure it.
23. Review pagination and result payloads.
    - Avoid deep offset pagination as a default product contract.
    - Use stable tie-breakers for cursor-like pagination, and limit source fields and highlights to what the UI needs.
24. Keep vector and hybrid boundaries explicit.
    - If dense vectors, ANN, reranking, hybrid score fusion, or Recall@K drives the failure, switch to `vector-search-integrity-review` for that slice.
    - If the bug is ordinary keyword indexing, alias, analyzer, source filtering, or shard partials, keep this skill as the primary route.
25. Define numeric SLOs and destructive drills when in scope.
    - Useful examples include indexing-to-search-visible p95, search p99, zero-result rate, partial shard failure rate, top-result duplication, golden-set metric, bulk item failure rate, and reindex reconciliation lag.
    - Live node kills, disk pressure, alias mistakes, mapping conflicts, and mass reindex drills are manual unless the command contract declares them.

<!-- mustflow-section: postconditions -->
## Postconditions

- The search symptom, source-to-search ledger, query contract, index contract, quality ledger, performance ledger, and privacy boundary are explicit.
- Metadata taxonomy, metadata key budget, schema versions, stable source/doc/chunk ids, canonical
  keys, aliases, exact keyword fields, filter-only versus LLM-visible metadata, lifecycle and
  effective-date fields, negative metadata, source maps, index version, content hash, query logs,
  and miss logs are explicit where relevant.
- Bulk item errors, source/index reconciliation, direct lookup, exact search, full-text search, aliases, partial shards, API/UI transformation, mappings, analyzers, synonyms, ranking, pagination, source payload, shard fan-out, thread-pool pressure, cache state, refresh visibility, segments, disk, and SLO evidence are fixed or reported where relevant.
- Search claims are backed by configured tests, fixtures, golden-set evidence, static review, safe canary evidence, or labeled manual-only or missing.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured tests that cover search contract, tenant isolation, filters, mappings, analyzer fixtures, golden-set metrics, docs, or template surfaces. Report missing live search cluster, slow-log, reindex, canary, load, or production-index evidence instead of inventing live diagnostics.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the query contract cannot be reconstructed, report the missing source, alias, filter, analyzer, ranking, or API transformation evidence before changing search settings.
- If evidence contains raw private query text, document text, personal data, behavior analytics, or tenant-identifying data, redact to synthetic fixtures, ids, hashes, safe summaries, or aggregate metrics.
- If the fix requires live index rebuild, production reindex, alias flip, cluster setting change, slow-log enablement, profile API on real traffic, or destructive drill outside the command contract, report the manual boundary.
- If configured verification fails, preserve the failing intent and output tail, then fix only the localized search contract or test expectation.

<!-- mustflow-section: output-format -->
## Output Format

- Search index integrity reviewed
- Symptom, source-to-search ledger, query contract, index contract, quality ledger, performance ledger, and privacy boundary
- Bulk, reconciliation, lookup, exact/full-text, alias, shard, API/UI, mapping, analyzer, taxonomy,
  source-map, synonym, ranking, pagination, payload, query-log, shard fan-out, thread-pool, cache,
  refresh, segment, disk, and SLO findings
- Fix applied or recommended
- Evidence level: canary evidence, golden-set evidence, configured-test evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped search diagnostics and reasons
- Remaining search-index risk
