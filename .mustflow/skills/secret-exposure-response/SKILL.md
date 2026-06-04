---
mustflow_doc: skill.secret-exposure-response
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: secret-exposure-response
description: Apply this skill when a real or plausible secret, token, credential, private key, session value, password, connection string, or sensitive key material appears in repository files, generated artifacts, logs, command output, screenshots, fixtures, docs, package output, or final reports.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.secret-exposure-response
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Secret Exposure Response

<!-- mustflow-section: purpose -->
## Purpose

Handle secret-looking exposure as an incident-style containment task instead of an ordinary security review or cosmetic redaction.

<!-- mustflow-section: use-when -->
## Use When

- A real or plausible API key, token, private key, password, session cookie, OAuth credential, service-account value, connection string, signing secret, webhook secret, certificate key, recovery code, or production-like credential appears.
- Secret-looking material appears in tracked files, untracked files, generated artifacts, logs, command output, screenshots, fixtures, docs, templates, package output, cache, run receipts, or final reports.
- A task asks to remove, redact, report, package, publish, screenshot, paste, or summarize content that includes possible credential material.
- A previous command or tool output exposed sensitive values and the next response or edit could copy them further.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only adds placeholder environment variable names or fake examples; use `config-env-change` for normal config work.
- The task is a broad security review with no exposed or plausible credential value; use `security-privacy-review`.
- The value is clearly non-secret test data and cannot be confused with a real credential after inspecting the surrounding context.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Exposure surface: file, generated artifact, command output, screenshot, docs, fixture, package output, cache, or final report.
- Secret type if inferable without repeating the value.
- Whether the surface is tracked, untracked, generated, public, packaged, ignored, local-only, or already shared outside the repository.
- Scope of allowed remediation: redaction, deletion, placeholder replacement, docs rewrite, fixture rewrite, package-output cleanup, or report-only.
- Whether rotation, revocation, history rewrite, provider dashboard action, or user action is required but outside the current command contract.
- Relevant command-intent contract entries for status, diff, docs, package, release, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Remove, redact, or replace exposed values with safe placeholders in in-scope files.
- Update docs, fixtures, templates, tests, examples, generated-package inputs, or final-report wording to avoid re-exposure.
- Add local fake-value conventions only where they prevent recurrence and match repository style.
- Do not print, quote, copy, commit, push, publish, or package the secret value.
- Do not rotate, revoke, rewrite Git history, delete backups, or contact providers unless the user explicitly requests that action and the repository contract supports it.

<!-- mustflow-section: procedure -->
## Procedure

1. Stop ordinary work long enough to contain copying. Do not repeat the secret value in messages, patches, logs, docs, or final reports.
2. Classify the exposure surface without echoing the value: tracked file, untracked file, generated artifact, docs, fixture, package output, command output, screenshot, cache, run receipt, or final report.
3. Determine whether the value is real, plausible, fake, or unknown from surrounding context without making a false safety claim.
4. Remove or replace the value in in-scope repository files using a safe placeholder that cannot be mistaken for a real credential.
5. Check nearby examples, docs, templates, fixtures, generated-package inputs, and final-report text for copied variants of the same value.
6. If the value may have entered generated artifacts, package output, screenshots, run receipts, logs, or caches, report the affected surfaces and clean only those that are in scope and allowed.
7. If the value may be real or already shared, report that rotation or revocation is required. Do not claim redaction alone fixes exposure.
8. If the secret is tracked in Git history, report the history exposure and do not rewrite history unless explicitly requested.
9. If the secret is outside the current repository or in a provider dashboard, stop at the boundary and describe the required owner action without revealing the value.
10. Run the smallest configured verification that covers the changed docs, templates, package, or mustflow contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The secret value is not repeated in patches, docs, examples, package inputs, generated artifacts, or final reports.
- In-scope repository surfaces no longer contain the exposed value.
- Remaining rotation, revocation, history, package, cache, screenshot, or external-sharing risks are reported without revealing the value.
- The final report distinguishes redaction from credential invalidation.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, package, or documentation intent when it better proves the changed exposure surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the value might be real, treat it as real for reporting and avoid echoing it.
- If remediation requires deleting generated artifacts, rewriting Git history, rotating provider keys, or changing external systems, stop at the approval boundary and report the required owner action.
- If command output includes the value, summarize only the affected surface and never paste the raw output.
- If a fixture genuinely needs a secret-shaped value, replace it with an unmistakable fake and document that it is non-functional.
- If verification would reprint the secret, skip that command and report the reason.

<!-- mustflow-section: output-format -->
## Output Format

- Exposure surfaces reviewed
- Secret type classification without value
- Redaction, omission, or placeholder changes made
- Generated, package, docs, fixture, cache, log, screenshot, and final-report surfaces checked when relevant
- Rotation, revocation, history, or external-owner actions still required
- Command intents run
- Skipped checks and reasons
- Remaining exposure risk
