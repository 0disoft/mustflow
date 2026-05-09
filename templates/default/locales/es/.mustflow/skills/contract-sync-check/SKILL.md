---
mustflow_doc: skill.contract-sync-check
locale: es
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: contract-sync-check
description: Apply this skill when a change affects a declared contract that must stay aligned across code, schemas, templates, tests, and documentation.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.contract-sync-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Contract Sync Check

<!-- mustflow-section: purpose -->
## Purpose

Keep declared behavior, machine-readable contracts, installed templates, tests, and public documentation from drifting apart after a change.

<!-- mustflow-section: use-when -->
## Use When

- A command, option, JSON output, schema, template file, manifest, lock entry, preference, or public document changes.
- A change adds, removes, renames, or reclassifies a mustflow-owned file.
- Tests encode expected package, template, schema, command, dashboard, or documentation behavior.
- A user asks whether documentation, configuration, or installed template behavior should be updated together.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a private implementation refactor with no declared contract or public surface.
- The changed files are already covered by a narrower skill whose procedure explicitly checks every affected contract.
- The user explicitly asks for a local experiment that should not update published or installed surfaces.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed-file list and intended behavior change.
- The primary contract source, such as code, schema, config, template metadata, or documentation.
- Known derived surfaces: tests, README, docs site, localized templates, manifests, lock files, and JSON Schemas.
- Relevant command-intent contract entries.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update only the surfaces required to keep the contract consistent.
- Add or adjust tests only when they encode the changed contract or packaging surface.
- Mark translations or prose-heavy docs for review when exact wording cannot be confidently localized.
- Do not broaden command permissions, invent new contract files, or convert exploratory notes into binding policy.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the contract being changed and identify its source of truth.
2. List the expected synchronized surfaces for that contract: source code, schemas, command metadata, templates, manifests, lock files, tests, README, docs site, and localized copies.
3. Compare the changed files with that list and add any missing required surface.
4. Keep derived files mechanically aligned with the source of truth. If a surface is intentionally not updated, record the reason.
5. Check that command intent names, schema ids, frontmatter revisions, template entries, version strings, and documented examples match exactly where they are meant to match.
6. Use the narrowest configured verification that covers the contract and any packaging or documentation surface touched.
7. In the final report, separate synchronized surfaces from skipped or deferred surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- The contract source and every required derived surface agree.
- Any intentionally stale, deferred, or review-needed surface is explicitly named.
- The final report includes the command intents used to verify contract alignment.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Also run a narrower configured test or build intent if the contract affects executable behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If validation finds drift, fix the first contract mismatch before adding new behavior.
- If the source of truth is unclear, stop and report the competing sources instead of picking one silently.
- If a required surface is too broad to verify in the current task, report the skipped surface and its risk.
- If localized surfaces cannot be confidently updated, keep source metadata accurate and mark those translations for review.

<!-- mustflow-section: output-format -->
## Output Format

- Contract changed
- Source of truth used
- Synchronized surfaces
- Deferred or review-needed surfaces
- Command intents run
- Skipped checks and reasons
- Remaining drift risk
