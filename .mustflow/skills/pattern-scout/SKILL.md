---
mustflow_doc: skill.pattern-scout
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: pattern-scout
description: Apply this skill before implementing in an unfamiliar area where an existing local pattern may already solve the shape of the change.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.pattern-scout
  command_intents:
    - changes_status
    - changes_diff_summary
    - mustflow_check
---

# Pattern Scout

<!-- mustflow-section: purpose -->
## Purpose

Find the closest local implementation pattern before creating new structure, naming, data flow, tests, or documentation shape.

<!-- mustflow-section: use-when -->
## Use When

- The task touches an unfamiliar module, command, UI pane, schema, template, skill, or documentation family.
- A similar feature already appears to exist elsewhere in the repository.
- A new abstraction, helper, file layout, or test style might be introduced without enough local evidence.
- The change should fit established naming, localization, validation, or packaging conventions.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a tiny mechanical edit with an obvious surrounding pattern.
- The user explicitly asks for a one-off experiment or prototype outside established structure.
- The existing pattern is already known from the current task context and no new area is being touched.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request and intended changed-file area.
- Nearby files and at least one analogous implementation when available.
- Relevant route, schema, template, test, or documentation examples.
- Current changed-file list if work is already in progress.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer read-only exploration before editing.
- After choosing a pattern, edit only the files needed to apply that pattern to the requested change.
- Add a new pattern only when no local pattern fits, and record why the new shape is necessary.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the change shape: command, UI pane, schema, template document, skill, test, documentation page, or other local category.
2. Search for examples in this order:
   - same directory or feature folder;
   - same command, package, template, schema, or docs family;
   - same architectural layer, such as core, CLI, tests, docs, or templates;
   - repository-wide only after local evidence is insufficient.
3. Inspect enough surrounding code to understand ownership, naming, data flow, and verification style. Prefer patterns with matching file names, exported names, registry entries, tests, and template or schema synchronization.
4. Choose the closest pattern and list the files that define it. If multiple patterns conflict, choose the one nearest to the files being changed and explain why other candidates were rejected.
5. Identify the parts that must stay aligned: file naming, frontmatter, schema keys, localization keys, test helper style, manifest entries, lock entries, or documentation routing.
6. Implement by extending the chosen pattern instead of inventing a parallel shape.
7. If the change intentionally differs from the closest pattern, state the reason in the final report.
8. Use the smallest configured verification that covers the changed pattern.

<!-- mustflow-section: postconditions -->
## Postconditions

- The implementation follows a named local pattern or clearly documents why it diverges.
- New files are connected to every existing registry, manifest, schema, localization, or docs surface used by that pattern.
- The final report names the pattern evidence and any intentional deviation.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`

Also run any narrower configured test, build, or documentation intent required by the chosen pattern.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no local pattern exists, report that this is a new pattern and keep the first version small.
- If patterns conflict, prefer the one closest to the changed files and report the tradeoff.
- If verification reveals missing registry or metadata alignment, fix the alignment before adding unrelated logic.
- If the closest pattern appears stale or broken, do not copy the stale behavior silently; report it and choose a safer local precedent.

<!-- mustflow-section: output-format -->
## Output Format

- Change shape
- Local pattern inspected
- Pattern applied or reason for deviation
- Registries, manifests, or docs kept aligned
- Command intents run
- Skipped checks and reasons
- Remaining pattern risks
