---
mustflow_doc: skill.template-install-surface-sync
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: template-install-surface-sync
description: Apply this skill when mustflow template install surfaces, template manifests, skill profiles, locale source files, init or update behavior, managed file lists, package inclusion, template command contracts, or source-to-template workflow copies are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.template-install-surface-sync
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Template Install Surface Sync

<!-- mustflow-section: purpose -->
## Purpose

Keep the source repository's mustflow workflow files, install templates, manifests, profiles, locale policy, init/update behavior, and package tests aligned without blindly copying surfaces that must intentionally differ.

<!-- mustflow-section: use-when -->
## Use When

- A mustflow-owned file is added, removed, renamed, or materially changed and that file may be installed by the default template.
- Template `creates`, `skill_profiles`, locale source files, install policy, conflict policy, managed targets, generated targets, or forbidden targets change.
- `.mustflow/skills/*`, `.mustflow/skills/INDEX.md`, `.mustflow/skills/routes.toml`, `AGENTS.md`, `.mustflow/docs/agent-workflow.md`, template configs, or template command contracts are changed.
- `mf init`, `mf update`, manifest locks, backup behavior, package inclusion, release tests, or docs examples depend on installed template files.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes only a normal downstream project that consumes mustflow and does not modify the template source or install/update behavior.
- The change affects a declared contract but no install template, profile, locale, init, update, or package surface; use `contract-sync-check`.
- The task is only creating or editing a skill procedure; use `skill-authoring` first, then use this skill only if the skill is installed by a template.
- The user explicitly requests a local experiment that should not be reflected in install templates.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed-file list and the intended installed behavior.
- Source repository file, canonical template copy, and any localized source files.
- `templates/default/manifest.toml` entries: `creates`, `skill_profiles`, locale metadata, install policy, managed targets, generated targets, forbidden targets, and conflict policy.
- Init/update source code, package inclusion metadata, release or install tests, docs examples, and manifest-lock behavior that mention the changed surface.
- Intentional divergence rules between source and template copies.
- Relevant command-intent entries for related tests, docs validation, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Canonical source locale and template locale policy are known.
- Existing template manifest and nearby tests have been inspected before adding or removing installed files.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update source workflow files, canonical template copies, route metadata, manifest `creates`, profile membership, locale metadata, install/update tests, docs examples, and package file lists that own the same installed surface.
- Add explicit divergence notes in skill or docs text when source and template behavior must differ.
- Do not blindly copy the source repository's real command contract into a default template.
- Do not install specialist skills into every profile unless the trigger is broadly useful for that profile.
- Do not update localized skill copies unless that locale intentionally maintains translated skill text and review is available.
- Do not manually edit generated manifest locks or generated repository maps unless a configured intent owns the generated output.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the installed surface being changed: root instructions, workflow docs, skill body, skill index, route metadata, context file, config file, command contract, preference, template manifest, locale file, init/update behavior, package artifact, docs example, or release test.
2. Classify each surface as must-match, intentionally-divergent, generated, package-only, docs-only, or not-installed.
3. For must-match surfaces, update the source file and canonical template copy together. Examples include skill bodies, route metadata, skill index entries, managed workflow docs, and installable context or config defaults.
4. For intentionally-divergent surfaces, preserve the divergence and document the reason in the procedure or final report. Source repository command contracts usually contain real maintainer commands, while template command contracts should remain placeholders, unknown, or manual-only until a downstream project configures them.
5. Check `templates/default/manifest.toml`. Add new installable files to `creates`, remove deleted files, and place new skills only in profiles that would genuinely benefit from the route.
6. Check locale policy. Use the source locale as canonical. Non-source template locales may fall back to source-locale skill text unless translated skill text is intentionally maintained and review is available.
7. Check route alignment. `.mustflow/skills/INDEX.md` and `.mustflow/skills/routes.toml` must agree on route names, category, route type, priority intent, and expected verification intent names.
8. Check install/update behavior. If new files, profile membership, conflict policy, or managed targets change, inspect init/update tests and package tests that assert installed output, manifest lock behavior, backups, or diff previews.
9. Check package and release surfaces. Installed template files must be included in package output and covered by release-sensitive tests when the package includes templates.
10. Check public docs and examples only when they list installed files, profiles, init/update behavior, or workflow expectations.
11. Keep generated files generated. Refresh generated maps or package output only with configured intents, and report generated surfaces that are stale but outside the current allowed command set.
12. Verify with related tests first, then release and docs checks when package, template, manifest, or docs surfaces changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Source and template surfaces match where they should match and intentionally diverge where they should diverge.
- Manifest `creates`, skill profiles, locale policy, install/update behavior, package inclusion, tests, and docs agree with the installed surface.
- Any deferred locale, docs, package, or generated surface is named with risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use broader configured tests when init, update, package inclusion, or release behavior is cross-cutting or no narrower related test covers the template surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If `mustflow_check` reports route or manifest drift, fix the source/template metadata mismatch before changing unrelated files.
- If template tests fail after adding a file, check `creates`, profile membership, package inclusion, locale metadata, and generated map freshness before changing behavior.
- If source and template command contracts differ, do not normalize them unless the divergence is proven accidental.
- If a skill seems useful but profile impact is unclear, keep it out of narrow profiles and report the profile decision.
- If localized surfaces cannot be confidently updated, keep canonical source metadata accurate and mark translation review instead of guessing.

<!-- mustflow-section: output-format -->
## Output Format

- Installed template surface changed
- Must-match surfaces synchronized
- Intentional divergences preserved
- Manifest creates and profiles updated
- Locale, init/update, package, docs, and tests checked
- Command intents run
- Skipped checks and reasons
- Remaining template drift risk
