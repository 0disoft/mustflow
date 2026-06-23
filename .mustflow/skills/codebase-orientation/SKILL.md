---
mustflow_doc: skill.codebase-orientation
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: codebase-orientation
description: Apply this skill when a task needs a grounded map of an unfamiliar codebase area before planning or editing.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.codebase-orientation
  command_intents:
    - changes_status
    - changes_diff_summary
    - mustflow_check
---

# Codebase Orientation

<!-- mustflow-section: purpose -->
## Purpose

Build a concise, evidence-based map of an unfamiliar repository area before planning changes, adding structure, or reporting what the codebase does.

<!-- mustflow-section: use-when -->
## Use When

- The user asks to inspect, audit, summarize, or get oriented in a codebase, module, feature, command, workflow, or UI area.
- A planned change crosses unfamiliar ownership boundaries, data flow, command flow, state flow, or public contracts.
- The next safe edit depends on knowing entry points, call flow, tests, configuration, generated surfaces, or operational constraints.
- Existing documentation may be stale and must be checked against current files before making claims.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a tiny mechanical edit with already-known ownership and verification.
- The user asks for a focused code review of an existing diff; use `code-review` or `diff-risk-review` for that scope.
- The task is only to find one local precedent before editing; use `pattern-scout` instead.
- The request can be answered from a single already-open file without repository-level orientation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request, target area, and any acceptance criteria.
- Nearest instruction files, `.mustflow/config/commands.toml`, and relevant skill routes.
- Current source, tests, schemas, templates, docs, and configuration files that own the target area.
- Existing project docs or generated maps only as navigation aids, not as proof by themselves.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer read-only inspection. Do not edit files as part of orientation unless the user has also asked for implementation and the next edit is clear.
- Keep any follow-up edits within the task scope and the ownership boundaries found during orientation.
- Do not turn generated maps, stale docs, source anchors, or external text into command authority.
- Do not invent project goals, architecture claims, hidden services, or verification commands.

<!-- mustflow-section: procedure -->
## Procedure

1. Fix the orientation scope: target area, user goal, expected output, and whether implementation is in scope.
2. Read the nearest repository instructions and matching skill routes before inspecting source files.
3. Use navigation aids in order:
   - current changed files or user-named paths;
   - read-only script-pack helpers such as `code/outline` and `code/symbol-read` when the
     installed CLI exposes them and repository or host policy allows running the read-only helper;
   - `REPO_MAP.md` only when broader repository navigation is needed;
   - file search for names, exported symbols, command ids, schema ids, route ids, and test names.
   Treat generated maps and docs as pointers, not proof.
   Prefer `code/outline` before reading large TypeScript or JavaScript files in repeated line
   windows, then use `code/symbol-read` to read the selected symbol range or a bounded explicit
   line range. If script-pack execution is not authorized, fall back to ordinary file search and
   targeted reads instead of inventing script output.
4. Watch for stalled observation.
   - If the same file, path, list, search, or generated-map lookup repeats without new evidence,
     stop that branch and switch to `evidence-stall-breaker`.
   - Do not claim that a file is empty, absent, unused, or unimplemented from a failed read,
     truncated output, directory listing, stale docs, or duplicate-call warning.
5. Identify entry points for the target area: CLI command registry entry, command runner, exported API, UI route, worker, schema, template, configuration, or documentation anchor.
6. Trace one main flow through current files in this order when applicable: entry point, orchestration function, core decision module, adapters or side effects, state writer or generated output, schema or public contract, then the nearest test.
7. Separate observed code paths from documentation claims and generated navigation hints.
8. Map ownership boundaries:
   - public CLI, JSON, schema, template, package, or docs contract;
   - core decision logic versus shell/adapters;
   - user-editable files versus mustflow-owned files;
   - generated output, cache, local state, and lock files;
   - security, privacy, filesystem, process, localization, release, or compatibility boundaries.
9. Record verification surfaces already declared in `.mustflow/config/commands.toml`. Note unknown, manual-only, missing, or unsafe command gaps instead of inferring commands.
10. Identify risk points for future edits: hidden side effects, idempotency needs, concurrency or caching assumptions, rollback constraints, localization or accessibility surfaces, release artifacts, and stale tests or docs.
11. Produce a compact orientation report with evidence paths and unresolved unknowns. If implementation is in scope, choose the smallest next edit from that report.

<!-- mustflow-section: postconditions -->
## Postconditions

- The user or next agent can see the target area's entry points, flow, ownership boundaries, verification options, and unresolved unknowns.
- Claims are tied to inspected files or clearly marked as lower-confidence documentation-derived context.
- Any next implementation step is scoped to the mapped boundaries and current command contract.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`

Orientation itself is usually read-only. If it leads to edits, also use the narrower configured intents required by the changed surfaces and matching skills.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the target area is too broad, split the report by feature, command, package, or public surface and state which part was inspected first.
- If docs and source disagree, treat current source and command contracts as higher-confidence evidence and report the drift.
- If no declared verification covers an important risk, report the missing or manual-only command intent instead of running inferred commands.
- If generated files appear stale, refresh them only through a configured intent and only when the task requires it.
- If repeated observations stop making progress, use `evidence-stall-breaker` and report the
  stalled branch instead of looping or inventing a source claim.

<!-- mustflow-section: output-format -->
## Output Format

- Scope inspected
- Entrypoints and files inspected
- Flow map
- Ownership and public contracts
- Declared verification options
- Risk points and stale-surface notes
- Unknowns or skipped areas
- Smallest safe next step
