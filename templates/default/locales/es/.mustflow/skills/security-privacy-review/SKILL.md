---
mustflow_doc: skill.security-privacy-review
locale: es
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: security-privacy-review
description: Apply this skill when code, configuration, docs, templates, logs, telemetry, credentials, or data flows affect secrets, personal data, authentication, authorization, retention, or external disclosure.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.security-privacy-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Security and Privacy Review

<!-- mustflow-section: purpose -->
## Purpose

Catch security, privacy, and disclosure risks introduced by ordinary code, documentation, template, configuration, logging, or reporting changes.

<!-- mustflow-section: use-when -->
## Use When

- A change touches authentication, authorization, sessions, admin behavior, tenant boundaries, personal data, secrets, tokens, credentials, API keys, or private files.
- A change adds or modifies logging, telemetry, diagnostics, receipts, reports, caches, generated state, retention, redaction, export, or external transmission.
- Documentation, templates, examples, tests, or final reports mention sensitive data handling, privacy behavior, secret handling, or user-identifying data.
- A diff could expose data through filenames, paths, command output, screenshots, generated artifacts, package contents, or public docs.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task needs a concrete abuse-case regression test; use `security-regression-tests` for that part.
- The task is only dependency availability, package version freshness, or artifact packaging without sensitive data.
- The task is a general security checklist with no changed boundary, data flow, or disclosure surface to inspect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed files, diff summary, and the user goal.
- Sensitive data, actor, trust boundary, storage, logging, retention, export, or external disclosure surfaces involved.
- Existing project rules for secrets, privacy, generated state, public docs, package contents, and command output.
- Relevant command-intent contract entries for status, diff, docs, release, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten redaction, masking, omission, retention, disclosure, or documentation wording when the changed surface justifies it.
- Remove sensitive-looking sample values from docs, fixtures, templates, logs, reports, and final output when they are not required.
- Mark unknown privacy or secret-handling behavior as unverified instead of claiming it is safe.
- Do not invent compliance claims, privacy guarantees, secret scanning results, or audit coverage.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the sensitive surface: secret, personal data, actor, permission, storage location, log, generated artifact, package file, public document, or external recipient.
2. Decide whether the change creates, stores, reads, transforms, logs, exports, deletes, or reports sensitive information.
3. Check whether the changed surface is public, packaged, generated, cached, retained, user-visible, or sent outside the repository boundary.
4. Verify that examples, fixtures, screenshots, command outputs, and final reports do not expose real-looking secrets or unnecessary personal data.
5. Prefer omission or minimal metadata over masking when the sensitive value is not needed for the user to understand the result.
6. If the change affects an authorization or abuse boundary, activate `security-regression-tests` for test selection instead of folding test generation into this review.
7. Run the narrowest configured verification that covers the changed docs, templates, package, or mustflow contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- Sensitive data and disclosure surfaces have been identified or explicitly reported as unknown.
- Public and packaged surfaces do not include unnecessary secrets, personal data, or misleading privacy guarantees.
- The final report names remaining unverified security or privacy risks without revealing sensitive values.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, or documentation intent when it better proves the changed sensitive surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a sensitive value appears in command output, stop copying it and summarize the issue without the value.
- If the project lacks enough context to confirm privacy or secret handling, report the uncertainty and avoid claiming safety.
- If a package, generated artifact, or public doc includes sensitive data, remove or redact it before continuing unrelated work.
- If verification requires unavailable scanners or live systems, report the missing check and the remaining risk.

<!-- mustflow-section: output-format -->
## Output Format

- Sensitive surfaces reviewed
- Disclosure or retention paths checked
- Redaction, omission, or wording changes made
- Related security-regression test need
- Command intents run
- Skipped checks and reasons
- Remaining security or privacy risk
