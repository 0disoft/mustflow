---
mustflow_doc: skill.release-notes-authoring
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: release-notes-authoring
description: Apply this skill when drafting release notes, changelog entries, or public change summaries from verified repository changes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.release-notes-authoring
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Release Notes Authoring

<!-- mustflow-section: purpose -->
## Purpose

Turn verified repository changes into clear user-facing release notes without inflating internal work into product claims.

This first version is intentionally limited. Until the repository declares a read-only release-history command intent, do not infer release history from raw Git commands. Work from user-provided change summaries, current diff summaries, existing release preparation notes, and files already in scope.

<!-- mustflow-section: use-when -->
## Use When

- The user asks for release notes, changelog entries, public change summaries, release preparation copy, or package release wording.
- A change touches public CLI behavior, installed templates, schemas, command contracts, package metadata, user-facing documentation, migration notes, or security/privacy wording.
- A maintainer wants to decide which current changes belong in public notes and which are internal-only.
- Package or template versions changed and the public note needs to stay aligned with release verification.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only asks to inspect unreleased implementation details without public wording.
- The task needs historical commit or tag analysis and no configured read-only release-history intent exists; report the missing intent instead of running raw Git history commands.
- The task asks for marketing copy, launch copy, or a product announcement rather than release evidence.
- The requested change belongs only in code comments, tests, or private planning notes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User-provided change summary, current diff summary, release preparation notes, or explicit files to summarize.
- Release audience and target surface, such as CLI users, template users, package maintainers, contributors, or documentation readers.
- Evidence for each public claim, such as changed files, tests, schemas, docs, templates, package metadata, or run receipts.
- Version source and release-versioning preferences when package or template versions are mentioned.
- Relevant command-intent contract entries for status, diff, docs, release, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Historical release claims are avoided unless a configured read-only release-history intent or user-provided history summary is available.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or revise release notes, changelog entries, release preparation notes, or documentation sections directly tied to verified changes.
- Classify changes as added, changed, fixed, security/privacy, migration or breaking, documentation or packaging, or internal-only.
- Keep internal-only work out of public release notes unless it affects a public contract, release process, or contributor workflow.
- Do not invent version history, impact level, migration risk, compatibility promises, dates, or external availability claims.

<!-- mustflow-section: procedure -->
## Procedure

1. Establish the evidence set.
   - Use user-provided summaries, current diff summaries, release preparation notes, and directly relevant changed files.
   - If historical commits, tags, or prior releases are needed and no configured read-only intent exists, report the missing release-history intent.
2. Identify public surfaces.
   - CLI behavior, installed templates, schemas, command contracts, package metadata, user-visible docs, migrations, security or privacy behavior, and contributor-facing workflow can be release-note material.
   - Internal refactors, test-only changes, generated-output refreshes, formatting, and private planning notes stay out unless they change a public contract.
3. Classify each candidate note.
   - `added`: new user-visible capability or packaged surface.
   - `changed`: changed behavior, workflow, default, command contract, template, schema, or documentation promise.
   - `fixed`: user-visible bug fix or correctness restoration.
   - `security_privacy`: safer handling of secrets, personal data, permissions, disclosure, retention, or audit boundaries.
   - `migration_breaking`: behavior that needs user action, compatibility attention, or upgrade notes.
   - `docs_packaging`: public documentation, package, template, install, or release-process change.
   - `internal_only`: not appropriate for public notes.
4. Write from observable value.
   - Name the user-visible effect, not the implementation detail.
   - Keep notes concise and specific.
   - Avoid exaggerated words such as "major", "seamless", "powerful", or "new architecture" unless the evidence proves that public impact.
5. Attach evidence mentally before final wording.
   - Every public note should trace to a changed file, schema, template, doc, test, configured command result, or user-provided source.
   - If evidence is missing, omit the note or mark it as a release-note candidate needing review.
6. Keep version and migration claims synchronized.
   - Use `[release.versioning]` preferences and the repository's version source when versions are mentioned.
   - Do not invent release dates, compatibility ranges, or upgrade commands.
7. Verify the release-note surface.
   - Run the narrowest configured command intents that cover docs, package metadata, templates, and mustflow workflow changes.
   - Report skipped release-history inspection when no configured intent exists.

<!-- mustflow-section: postconditions -->
## Postconditions

- Public notes are supported by local evidence or user-provided source text.
- Internal-only work is excluded or explicitly labeled as internal-only.
- Version, migration, security, and packaging claims are conservative and synchronized with current files.
- Missing release-history command support is reported instead of bypassed.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use release checks when notes mention package metadata, template metadata, schemas, installation behavior, or publishing readiness.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the evidence set is too thin, produce release-note candidates with review gaps instead of final notes.
- If the user asks for Git history and no configured release-history intent exists, report that missing intent and use only provided summaries.
- If a note would expose secrets, personal data, private customer details, or hidden implementation risk, omit or generalize it.
- If verification fails, triage the failing configured intent before treating release notes as ready.
- If translated release notes are needed and no reviewed translation path exists, keep the source note authoritative and mark translation follow-up.

<!-- mustflow-section: output-format -->
## Output Format

- Release audience and source evidence
- Notes by category
- Internal-only changes excluded
- Version or migration claims checked
- Command intents run
- Skipped release-history checks and reasons
- Remaining release-note risks
