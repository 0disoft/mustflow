---
mustflow_doc: skill.migration-safety-check
locale: zh
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: migration-safety-check
description: Apply this skill when code, data, schema, configuration, file layout, template, or generated-state migrations are planned, edited, documented, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.migration-safety-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Migration Safety Check

<!-- mustflow-section: purpose -->
## Purpose

Keep migrations reversible, scoped, and verified before they affect data, schemas, configuration, templates, generated state, or file layout.

<!-- mustflow-section: use-when -->
## Use When

- A change moves, renames, deletes, transforms, backfills, or rewrites files, data, schemas, configuration, template state, generated state, or persisted metadata.
- A task mentions migration, upgrade, conversion, import, export, reindexing, backfill, cleanup, lock refresh, or baseline regeneration.
- Documentation or final reports claim that a migration is safe, complete, reversible, idempotent, or already applied.
- A change could make older installed projects, existing lock files, generated files, caches, or user-edited documents incompatible.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a small local refactor with no persisted, generated, installed, or user data surface.
- The task only edits inert documentation and makes no claim about applying or validating a migration.
- The migration would require live production access, destructive actions, or manual operator approval that is outside the current command contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The source state, target state, and the files or data that would change.
- The owner of the migration surface: code, schema, template, lock file, generated state, cache, package, or docs.
- Idempotency, rollback, backup, dry-run, compatibility, and failure behavior expectations.
- Relevant command-intent contract entries for status, diff, docs, release, build, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten migration plans, compatibility notes, dry-run behavior, validation checks, lock metadata, tests, and docs tied to the changed surface.
- Prefer idempotent, explicit, and inspectable migration behavior over implicit one-way rewrites.
- Mark rollback, backup, or compatibility gaps as unverified when they cannot be proven.
- Do not run destructive migrations, delete user data, rewrite generated state broadly, or claim live migration success without configured evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the migration surface and classify it as code, schema, data, configuration, template, generated state, cache, package metadata, or documentation.
2. Record the source state, target state, expected affected paths, and whether the change must support old and new states during transition.
3. Check whether the migration is idempotent: a second run should either do nothing or report an already-applied state without extra diffs.
4. Check rollback or recovery expectations: backup, restore path, manual fallback, or explicit "not reversible" report.
5. Prefer dry-run or read-only inspection before apply behavior when a command or workflow exists for it.
6. Keep compatibility claims tied to fixtures, lock metadata, tests, generated output, or documented command results.
7. If the migration changes public docs, installed templates, package contents, or lock files, synchronize the related metadata and version surfaces.
8. Run the narrowest configured verification that proves the migrated surface and its metadata still agree.

<!-- mustflow-section: postconditions -->
## Postconditions

- The migration surface, source state, target state, and compatibility boundary are named.
- Idempotency, rollback, backup, dry-run, and verification status are either proven or explicitly left as remaining risk.
- Final reports do not imply that a live or destructive migration ran unless configured evidence proves it.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, migration dry-run, or documentation intent when it better proves the changed migration surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the migration has no rollback or dry-run path, report that risk before applying broader changes.
- If a migration check fails, stop at the first affected surface and avoid cascading rewrites.
- If old and new states conflict, preserve user data and lock metadata before updating generated or derived files.
- If verification requires live data, operator approval, or destructive access, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- Migration surface reviewed
- Source and target state
- Idempotency and rollback status
- Compatibility or lock metadata updated
- Command intents run
- Skipped checks and reasons
- Remaining migration risk
