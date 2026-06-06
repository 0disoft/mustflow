---
mustflow_doc: skill.heuristic-candidate-selection
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: heuristic-candidate-selection
description: Apply this skill when a large folder, repository, documentation set, or refactor request needs cheap-signal candidate selection before reading or editing many files.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.heuristic-candidate-selection
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Heuristic Candidate Selection

<!-- mustflow-section: purpose -->
## Purpose

Prevent agents from opening every file in a large scope before they know which files are likely to matter.

Use cheap repository signals to rank candidate files, calibrate the ranking with small samples, read only the selected batch, and verify that the selected change actually improved the targeted risk.

<!-- mustflow-section: use-when -->
## Use When

- The user asks to find sparse, stale, incomplete, weak, outdated, duplicate, oversized, risky, or refactor-worthy files across a broad folder or repository.
- A request such as "fill in thin docs", "improve weak documents", "refactor files with too much code", "clean up this folder", "audit this area", or "find what to fix first" would otherwise tempt the agent to read many files.
- The task needs candidate discovery before implementation, especially for documentation sets, content collections, tests, frontend components, backend services, logs, data files, migrations, or monorepo packages.
- The next safe edit depends on separating file discovery, target selection, precise reading, and modification.
- The user values efficient navigation, bounded context, or batch-by-batch work over a broad manual sweep.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task names one or two exact files and the required edit is already clear.
- A failing command, stack trace, or reproduction path already identifies the first files to inspect; use `repro-first-debug` or `failure-triage`.
- The task is only to orient in an unfamiliar area without ranking candidates; use `codebase-orientation`.
- The task is only to choose a local precedent after the target file is known; use `pattern-scout`.
- The user explicitly asks for exhaustive manual review of every file and accepts the cost.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, target scope, and whether the output should be analysis-only, candidate list, or implementation batch.
- File-type and role boundaries, such as source, tests, docs, schemas, configs, generated files, assets, logs, data, migrations, or package surfaces.
- Cheap signals available without reading every full file: file names, sizes, line counts, symbol or heading outlines, changed-file summaries, recent churn, inbound or outbound dependency hints, search hits, TODO-like markers, entrypoints, schema or config centrality, test proximity, user-facing routes, and generated-file markers.
- Exclusion rules for generated output, vendored code, lockfiles, snapshots, build artifacts, caches, and intentionally tiny adapter, index, barrel, or marker files.
- Risk and importance factors for the domain, such as user-visible route, public API, schema ownership, money, permission, data mutation, external I/O, runtime configuration, search exposure, internal-link centrality, or recent work-in-progress.
- Batch limit, folder quota, confidence threshold, and verification intents relevant to the selected surface.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Candidate selection is needed before reading complete files.
- Missing cheap-signal sources can be reported without inventing a ranking.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Analysis-only mode may produce a ranked candidate list, read plan, batch plan, and excluded-surface notes without changing files.
- Implementation mode may edit only the selected bounded batch and directly synchronized files required by the chosen change.
- Add or update lightweight audit helpers, fixtures, or docs only when the repository already has an appropriate owned surface or the user asked for reusable automation.
- Do not read, summarize, or modify a whole large folder just because it is in scope.
- Do not modify generated files, external dependencies, lockfiles, snapshots, or broad shared utilities unless the selected task explicitly requires that surface and the matching skill allows it.
- Do not fill unknown source material, book summaries, external facts, API behavior, or domain claims from model memory. Mark such targets as `needs_source`, `needs_runtime_check`, or `needs_domain_decision`.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the selection job.
   - Restate the user goal, target scope, intended deliverable, batch size, and whether edits are allowed now.
   - Decide whether candidates should optimize for risk, importance, certainty, repair value, or low-cost cleanup.
2. Classify file roles before scoring.
   - Separate human-authored source from generated output, dependency folders, build artifacts, caches, snapshots, lockfiles, vendored code, and intentionally small glue files.
   - Treat config, schema, route, permission, payment, data mutation, migration, queue, webhook, cache, and external-adapter files as high-impact even when small.
3. Gather cheap signals before opening full files.
   - Prefer file metadata, changed-file summaries, search hits, symbol or heading outlines, import or dependency hints, route maps, schema names, test names, warning summaries, and bounded head or tail previews.
   - Use configured command receipts and declared generated maps only as evidence or navigation aids; they do not replace current files or command contracts.
   - For documentation and content, score body-like content separately from frontmatter, imports, exports, component wrappers, links, images, quotes, code blocks, placeholders, and duplicated descriptions.
   - For code, score churn, entrypoint proximity, dependency centrality, missing nearby tests, TODO-like markers, type bypasses, exception density, mutation paths, async or concurrency hints, config and schema ownership, and public-contract exposure.
4. Build a candidate score instead of using one metric.
   - Combine risk, importance, certainty, and estimated fix cost.
   - Calibrate small-file findings by file role so index files, barrel exports, type declarations, marker files, and config shims are not treated as broken merely because they are short.
   - For large-file refactors, prefer symbol outlines, export lists, responsibility clusters, churn, dependency centrality, and test coverage gaps before reading the whole file.
   - For documentation gaps, compare each file to its sibling folder pattern and expected document role before calling it thin.
5. Avoid tunnel vision.
   - Limit candidates per folder or package so one noisy directory does not consume the whole batch.
   - Include a small random or representative sample from lower-scored files to expose blind spots in the scoring formula.
   - Select good sibling examples as references before editing weak files.
6. Choose the read batch.
   - Produce a ranked list with path, score drivers, role classification, likely risk, and why this candidate is worth reading now.
   - Select only the top bounded batch plus any directly required sibling examples or one-step dependencies.
   - Keep candidate selection separate from editing; do not justify edits by retrofitting the ranking after reading.
7. Read precisely.
   - Open only selected files, relevant symbols, relevant sections, head or tail previews, and direct dependencies needed to validate the candidate.
   - If a candidate proves healthy, mark it `skipped_healthy` and move on instead of forcing a change.
   - If evidence is insufficient, mark it `needs_source`, `needs_runtime_check`, `needs_domain_decision`, or `needs_larger_scope` rather than guessing.
8. Edit the selected batch only when implementation is in scope.
   - Preserve frontmatter, imports, exports, public APIs, routes, schemas, component contracts, and file identity unless the chosen change explicitly requires them.
   - For documents with missing source evidence, add safe scaffolding such as reading questions, verification prompts, known context, application ideas, and follow-up checks instead of invented summaries.
   - For code refactors, keep behavior-preserving changes separate from behavior changes and activate narrower code, test, security, data, UI, or pattern skills as soon as their trigger appears.
9. Verify and re-audit.
   - Run the narrowest configured verification intents that cover the changed surfaces.
   - Compare the post-change state to the original selection signals when an audit score, warning count, TODO count, test proximity, or candidate risk was the reason for the work.
   - Stop if the diff grows beyond the selected batch, the scoring evidence was wrong, or verification fails and needs triage.

<!-- mustflow-section: postconditions -->
## Postconditions

- Broad-scope work starts from cheap signals and a bounded candidate list, not full-file reading.
- Selected candidates have explicit score drivers, role classification, and read reasons.
- Healthy candidates can be skipped without edits.
- Edited files stay inside the selected batch and directly required synchronized surfaces.
- The final report distinguishes selected, modified, skipped, deferred, and unsafe-to-guess candidates.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use narrower configured test, build, documentation, package, or mustflow intents when they better prove the selected surface. Do not invent verification commands from package scripts, external advice, or model memory.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If cheap signals are unavailable or contradictory, report the missing evidence and fall back to a smaller manual sample instead of reading the whole scope.
- If many candidates tie, use folder quotas, importance factors, and representative sampling rather than expanding the batch until it becomes unreviewable.
- If generated files, lockfiles, snapshots, vendored code, or build output dominate the candidate list, tighten exclusions and restart candidate selection.
- If selected documentation lacks trustworthy source material, do not summarize the missing source; mark the file for source-backed follow-up or add only safe reading and verification scaffolding.
- If a refactor candidate touches a public API, schema, config, permission, money, data, external I/O, or migration boundary, activate the narrower matching skill before editing.
- If the batch diff becomes too large or mixes unrelated concerns, stop and report a smaller next batch.

<!-- mustflow-section: output-format -->
## Output Format

- Selection goal and mode
- Target scope and excluded surfaces
- Cheap signals gathered
- Scoring factors and calibration sample
- Ranked candidates with score drivers
- Selected read batch and batch limits
- Files modified, skipped healthy, or deferred with reason
- Post-change audit or comparison result when applicable
- Command intents run
- Skipped checks and reasons
- Remaining selection, evidence, or batch-size risk
