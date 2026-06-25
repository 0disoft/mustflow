---
mustflow_doc: skill.vector-search-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: vector-search-integrity-review
description: Apply this skill when vector search, semantic search, RAG retrieval mechanics, embeddings, vector databases, ANN indexes, exact versus approximate search, filters, metadata payloads, namespaces, tenants, named vectors, hybrid search, reranking, recall, latency, quantization, HNSW, IVF, pgvector, Qdrant, Milvus, Weaviate, OpenSearch kNN, or retrieval golden-set behavior is created, changed, reviewed, or failing. Use rag-pipeline-triage first when a RAG failure is not yet localized to retrieval versus parsing, context assembly, prompt, generation, citation, or answerability.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.vector-search-integrity-review
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

# Vector Search Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review vector and semantic search as a retrieval contract, not as "the vector database is good or
bad."

The core question is whether ingestion, embedding, storage, exact search, approximate search,
filters, reranking, and latency evidence all agree for the same query contract.

<!-- mustflow-section: use-when -->
## Use When

- Code creates or changes embedding generation, preprocessing, chunking, vector schema, collection
  names, namespaces, tenants, named vectors, metadata payloads, filters, search parameters, ANN
  indexes, hybrid search, reranking, retrieval metrics, RAG context selection, or vector DB clients.
- Search is missing documents, returning wrong results, returning empty filtered results, duplicating
  chunks, leaking tenants, becoming slow, changing quality after model or index changes, or behaving
  differently across replicas.
- A review needs recall, MRR, golden-set, exact-versus-ANN, filter, metadata index, quantization,
  compaction, shard, consistency, reranker, or embedding-model-version evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only generic database schema or query performance with no vector, embedding, semantic
  retrieval, or RAG boundary; use the database or performance skill.
- The task is only LLM answer grounding after retrieval is already proven; use
  `llm-hallucination-control-review`.
- The task is an end-to-end RAG failure and it is not yet clear whether ingestion, retrieval,
  context assembly, prompt construction, generation, citation validation, or answerability failed;
  use `rag-pipeline-triage` first.
- The task is only API transport or SDK failure before search boundaries are known; use
  `api-failure-triage`.
- The task asks for live production vector dumps containing sensitive text, embeddings, customer
  documents, or private prompts. Use redacted hashes, ids, dimensions, norms, and aggregate metrics.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Retrieval symptom classification: ingestion missing, write not visible, wrong results, empty
  results, low recall, tenant leak, duplicate chunks, stale deletes, slow search, reranker drift, or
  generated answer drift.
- Query contract ledger: query text or safe fixture id, embedding model and revision, preprocessing
  version, vector dimension, vector norm, metric, collection, namespace, tenant, named vector,
  filters, `top_k`, candidate count, consistency level, ANN parameters, hybrid weights, and reranker
  settings.
- Ingestion ledger: source id, chunk id, deterministic vector id, embedding version, payload shape,
  write count, unique id count, direct lookup count, indexed count, deleted or tombstoned count, and
  visibility lag.
- Quality ledger: golden queries, expected ids, acceptable alternatives, exact-search result,
  ANN result, recall at k, MRR, empty rate, duplicate rate, filtered result count, and before/after
  comparison.
- Performance ledger: cold versus warm latency, p50, p95, p99, queue wait, DB search time, reranker
  time, payload size, filter selectivity, shard distribution, compaction or indexing work, memory,
  disk, and retry behavior.
- Privacy ledger: raw text, vectors, prompts, document ids, tenant ids, provider payloads, and
  whether evidence can be safely stored as ids, hashes, summaries, or aggregate metrics.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Raw embeddings, raw document text, prompts, and tenant-identifying payloads are not copied into
  docs, tests, commits, or reports unless they are safe synthetic fixtures.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten embedding versioning, preprocessing versioning, vector validation, deterministic
  IDs, namespace or tenant selection, metadata indexes, filter construction, exact-search checks,
  ANN parameters, reranker candidate counts, golden-set tests, metrics, docs, fixtures, and
  retrieval contract tests.
- Add focused synthetic fixtures that encode expected retrieval behavior, filtered retrieval,
  tenant separation, duplicate handling, and exact-versus-ANN comparison.
- Do not change embedding models, rebuild large indexes, tune ANN parameters, disable filters, widen
  tenants, bypass authorization, or dump production vectors without explicit scope and evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the symptom first: ingestion missing, write-not-visible, wrong result, empty result,
   stale delete, duplicate chunks, tenant leak, slow search, reranker drift, or answer generation.
2. Build the query contract ledger before tuning. Include model revision, preprocessing, dimension,
   norm, metric, collection, namespace, named vector, filters, `top_k`, ANN parameters, hybrid
   weights, reranker settings, and consistency level.
3. Validate vector shape at ingestion and query time. Reject wrong dimension, NaN, infinities,
   all-zero vectors, extreme norms, and model or preprocessing version mismatches.
4. Keep embedding model identity exact. Model name alone is not enough; include revision, tokenizer,
   pooling, prefix policy, max length, HTML cleanup, chunking, and normalization.
5. Compare exact search with approximate search on the same query and filter. If exact search is
   wrong, stop tuning ANN and inspect embeddings, preprocessing, metric, payload, and expectations.
6. Compare filter-free search, filter-only count, filtered exact search, and filtered ANN search.
   Empty filtered results often mean filter construction, metadata typing, payload indexing, or
   post-filter candidate loss rather than bad embeddings.
7. Confirm collection, namespace, tenant, alias, and named vector. Directly inspect the problem id
   or safe synthetic id in the same search surface the app uses.
8. Check deterministic upsert ids. Source id, chunk index, tenant, and embedding version should not
   accidentally duplicate chunks or overwrite all chunks with one id.
9. Separate write success from search visibility. Check direct lookup, exact search, ANN search,
   indexed count, consistency, segment state, and visibility lag.
10. Check deletes and updates. Deletion marks, tombstones, compaction, vacuum, stale segments, and
    old chunks can keep appearing after API success.
11. Review metric and normalization. Cosine, dot product, and L2 are different contracts unless
    the vectors are intentionally normalized and the index operator matches.
12. Tune ANN only after the exact and filter contracts are correct. Evaluate recall and p95 latency
    across parameter sweeps instead of changing one value blindly.
13. Treat build-time index parameters as recall ceilings. If search-time parameters cannot recover
    recall, the index may need rebuild policy, not a larger query knob.
14. Review quantization and rescoring. Compare full-precision exact results with compressed-index
    candidates and confirm enough candidates reach full-precision reranking.
15. For hybrid search, store dense score, sparse or keyword score, normalized score, fusion method,
    and final score. Do not add incompatible raw scores directly without a deliberate combiner.
16. For reranking, record pre-rerank and post-rerank ids and ranks. If the right document never
    enters the candidate set, the reranker cannot recover it.
17. Avoid deep ANN pagination as a product contract. Use cursor, filters, grouping, or ordinary
    sorted indexes for deep browsing instead of pretending vector search has cheap random offsets.
18. Split cold and warm latency, server search time and client wait, vector DB time and reranker
    time, and single-query latency from concurrent load.
19. Inspect shard, replica, segment, compaction, flush, indexing, memory, disk, and cache state when
    p99 or intermittent quality varies across nodes.
20. Add a golden-set gate when the project has a test surface. Include easy, hard, filtered,
    tenant-scoped, rare-name, synonym, short-query, long-query, and sparse-data cases.

<!-- mustflow-section: postconditions -->
## Postconditions

- The retrieval symptom, query contract, ingestion contract, quality ledger, performance ledger, and
  privacy boundary are explicit.
- Exact search, ANN, filters, metadata, namespaces, tenants, named vectors, IDs, deletes, metric,
  normalization, quantization, hybrid search, reranking, shards, consistency, and latency are fixed
  or reported where relevant.
- Search quality claims are backed by golden-set, exact-versus-ANN, configured-test, static review,
  or manual-only evidence.

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

Prefer the narrowest configured tests that cover retrieval contract, tenant isolation, filters,
golden-set metrics, deterministic ids, and docs or template surfaces. Report missing vector DB,
embedding provider, exact-search, ANN recall, reranker, load, or production-index evidence instead
of inventing live diagnostics.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the query contract cannot be reconstructed, report the missing fields before changing model,
  filter, or ANN settings.
- If evidence contains raw text, embeddings, prompts, personal data, or tenant-identifying data,
  redact to ids, hashes, dimensions, norms, and aggregate metrics.
- If the fix requires model replacement, re-embedding, index rebuild, production data dump, or live
  vector DB access outside the command contract, report the manual boundary.
- If configured verification fails, preserve the failing intent and output tail, then fix only the
  localized retrieval contract or test expectation.

<!-- mustflow-section: output-format -->
## Output Format

- Vector search integrity reviewed
- Retrieval symptom, query contract, ingestion ledger, quality ledger, performance ledger, and
  privacy boundary
- Exact versus ANN, filter, metadata, namespace, tenant, id, delete, metric, normalization,
  quantization, hybrid, reranker, shard, consistency, and latency findings
- Fix applied or recommended
- Evidence level: golden-set evidence, configured-test evidence, static review risk, manual-only,
  missing, or not applicable
- Command intents run
- Skipped vector diagnostics and reasons
- Remaining vector search risk
