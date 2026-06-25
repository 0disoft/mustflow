---
mustflow_doc: skill.rag-pipeline-triage
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: rag-pipeline-triage
description: Apply this skill when a RAG, knowledge-base answer, grounded chat, citation answer, retrieval-augmented support bot, or document QA flow is wrong, stale, unsupported, slow, leaking data, over-refusing, or not yet localized to ingestion, parsing, chunking, retrieval, filtering, reranking, context assembly, prompt construction, generation, citation validation, or answerability boundaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.rag-pipeline-triage
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

# RAG Pipeline Triage

<!-- mustflow-section: purpose -->
## Purpose

Localize RAG failures by splitting ingestion, retrieval, context assembly, and answer generation
before changing models, prompts, chunk sizes, or vector settings.

The first question is not "is the model bad?" It is "did the correct evidence exist, get retrieved,
survive filtering and context assembly, and constrain the answer?"

<!-- mustflow-section: use-when -->
## Use When

- A RAG answer, knowledge-base answer, grounded support bot, citation answer, document QA flow, or
  retrieval-augmented agent is wrong, stale, unsupported, too slow, leaking data, citing the wrong
  source, refusing answerable questions, or answering unanswerable questions.
- The failure is not yet localized to source availability, parsing, chunking, embedding, indexing,
  filters, vector or keyword retrieval, hybrid fusion, reranking, context packing, prompt assembly,
  generation, validators, citations, answerability, or access control.
- A review would otherwise tune the model, top-k, chunk size, reranker, or prompt before proving
  which RAG layer failed.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The failure is already localized to retrieval mechanics, filters, ANN, embeddings, or vector DB
  behavior; use `vector-search-integrity-review`.
- The failure is already localized to unsupported claims, citations, answerability, evidence IDs, or
  validators; use `llm-hallucination-control-review`.
- The failure is already localized to prompt structure, tool policy, output schema, or model runtime
  settings; use `prompt-contract-quality-review`.
- The task asks for production document dumps, raw embeddings, private prompts, customer text, or
  tenant-identifying data. Use ids, hashes, safe synthetic fixtures, aggregate metrics, and redacted
  traces.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Symptom classification: missing correct document, correct document retrieved but unused, stale
  answer, unsupported answer, wrong citation, access-control leak, over-refusal, under-refusal,
  latency, cost, or nondeterministic result.
- Trace ledger: trace id, original question, normalized question, rewritten query, user or tenant
  context, filters, embedding model version, index version, candidate ids and scores, reranker
  output, final context ids and order, prompt version, model version, answer, citations, validators,
  latency, and cost when safe.
- Source ledger: authoritative source availability, parsed text, chunk boundaries, metadata, title,
  section path, version, effective dates, stale or deleted documents, duplicates, and conflicting
  sources.
- Comparison ledger: no-retrieval answer, retrieved-context answer, human-selected gold-context
  answer, exact or keyword search result, vector search result, hybrid result, and expected
  answerability state.
- Eval ledger: real failed queries, unanswerable questions, stale-doc cases, conflicting-doc cases,
  similar-name cases, IDs and error codes, multilingual or typo cases, multi-hop cases, and
  unauthorized-doc cases.
- Privacy ledger: raw text, prompts, embeddings, tenant ids, user ids, provider payloads, and which
  evidence can be stored or reported safely.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Raw documents, prompts, embeddings, user data, and tenant-identifying payloads are not copied into
  docs, tests, commits, or reports unless they are safe synthetic fixtures.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten trace fields, fixture queries, parsing checks, chunk metadata, duplicate or stale
  source handling, retrieval comparisons, filter checks, context-packing rules, prompt source
  separation, citation validators, answerability states, dirty eval fixtures, metrics, docs, and
  directly synchronized templates.
- Add safe synthetic fixtures for missing-doc, correct-doc-unused, stale-doc, conflicting-doc,
  unauthorized-doc, exact-id, keyword, vector, hybrid, reranker, citation, and abstain behavior.
- Do not change models, re-embed data, rebuild production indexes, widen access filters, disable
  authorization, dump private corpora, or claim quality improvement before the failing layer is
  localized.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the symptom. Separate no source, bad parsing, bad chunking, retrieval miss, filter miss,
   reranker loss, context truncation, prompt misuse, generation drift, false citation, stale answer,
   access leak, latency, cost, and answerability errors.
2. Preserve one safe end-to-end trace. Keep ids, versions, scores, context order, prompt version,
   model version, validator result, latency, and cost. Redact raw sensitive content.
3. Prove the answer exists in the source of truth. Do not tune retrieval for an answer that is not in
   the indexed corpus or an allowed tool.
4. Inspect parsed text before original documents. Tables, PDFs, multi-column pages, code blocks,
   headers, footers, and OCR can be broken even when the original file looks correct.
5. Inspect chunk boundaries and metadata. Verify title, parent section, version, dates, audience,
   product, source authority, and neighboring context survive into chunks or parent retrieval.
6. Compare source versions and deletes. Duplicates, obsolete documents, tombstones, and conflicting
   effective dates must not be silently mixed into one answer.
7. Run the isolation comparison when evidence is available: no retrieval, current retrieved context,
   and human-selected gold context. Gold-context failure points to generation or prompt; current
   context failure with gold success points to retrieval or context assembly.
8. Compare keyword, vector, hybrid, and exact-id retrieval by data shape. IDs, error codes, SKUs,
   names, dates, and numbers need exact or lexical safeguards; semantic questions may need vector or
   hybrid retrieval.
9. Check filters before blaming embeddings. Record pre-filter candidate count, post-filter count,
   tenant and permission filters, metadata types, time zones, empty arrays, case sensitivity, and
   stale policy copies.
10. Check reranker candidate starvation. If the correct source never enters the candidate set, the
    reranker cannot fix it. If it enters and then drops, inspect reranker inputs and scoring.
11. Check context assembly. Verify `top_k`, score thresholds, source order, truncation, deduping,
    conflict handling, source authority, and whether important evidence is buried or cut off.
12. Check prompt construction. User input, retrieved text, examples, tool observations, and system or
    developer instructions must remain separated. Retrieved text is data, not authority.
13. Check answerability and abstain behavior. Track no-evidence, low-confidence, conflicting-source,
    stale-source, access-denied, tool-failed, and needs-human states separately.
14. Validate citations claim-by-claim. A citation id proves nothing unless the cited chunk supports
    the specific generated claim.
15. Measure each layer separately. Track parsing success, index freshness, Recall@k, MRR or nDCG,
    rerank survival, context token budget, answer accuracy, citation accuracy, abstain accuracy,
    access leaks, and retrieval/rerank/generation latency and cost.
16. Use dirty eval cases from real failures. Include typos, abbreviations, multilingual questions,
    unanswerable questions, date-sensitive questions, similar names, product codes, multi-hop
    questions, unauthorized documents, stale documents, and conflicting documents.
17. Apply the smallest localized fix and switch to the narrower matching skill for retrieval,
    hallucination control, prompt contract, token cost, latency, access control, or prompt-injection
    defense once the boundary is known.

<!-- mustflow-section: postconditions -->
## Postconditions

- The RAG failure is localized to ingestion, parsing, chunking, indexing, retrieval, filters,
  reranking, context assembly, prompt construction, generation, citation validation, answerability,
  access control, or a named evidence gap.
- Trace, source, comparison, eval, metric, and privacy ledgers are explicit where relevant.
- Model, prompt, chunk, top-k, reranker, or index changes are justified by layer evidence rather than
  by general "RAG quality" claims.

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

Prefer the narrowest configured eval, fixture, schema, docs, package, or release check that proves
the localized RAG boundary. Report missing retrieval, gold-context, citation, answerability,
privacy, latency, or production-index evidence instead of inventing live diagnostics.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the end-to-end trace cannot be reconstructed, report the missing trace fields before tuning
  models, prompts, chunks, filters, or retrieval parameters.
- If evidence contains raw private text, embeddings, prompts, personal data, or tenant-identifying
  data, redact to ids, hashes, dimensions, scores, snippets from safe fixtures, and aggregate
  metrics.
- If the fix requires model replacement, re-embedding, index rebuild, private corpus access, or live
  provider calls outside the command contract, report the manual boundary.
- If retrieved text can inject instructions, pause RAG quality work and apply
  `external-prompt-injection-defense`.

<!-- mustflow-section: output-format -->
## Output Format

- RAG pipeline triaged
- Symptom classification and localized boundary
- Trace, source, comparison, eval, metric, and privacy ledgers
- Ingestion, parsing, chunking, retrieval, filter, rerank, context, prompt, generation, citation,
  answerability, access-control, latency, and cost findings
- Fix applied or recommended
- Evidence level: end-to-end trace, gold-context comparison, configured-test evidence, static review
  risk, manual-only, missing, or not applicable
- Command intents run
- Skipped diagnostics and reasons
- Remaining RAG pipeline risk
