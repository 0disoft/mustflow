---
mustflow_doc: skill.source-freshness-check
locale: fr
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: source-freshness-check
description: Apply this skill when a task depends on information that may become stale, such as current versions, external docs, prices, dates, schedules, or product behavior.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.source-freshness-check
  command_intents:
    - changes_status
    - docs_validate_fast
    - mustflow_check
---

# Source Freshness Check

<!-- mustflow-section: purpose -->
## Purpose

Prevent stale or unverifiable claims from entering code, documentation, templates, release notes, or final reports.

<!-- mustflow-section: use-when -->
## Use When

- The task asks for the latest, current, newest, today, yesterday, tomorrow, or a specific recent date.
- A claim depends on external products, APIs, package versions, pricing, legal rules, schedules, sports, markets, or vendor documentation.
- Documentation or user-facing text mentions support status, release behavior, command availability, or compatibility that may drift.
- A source, quote, screenshot, or generated summary may be older than the current task.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The fact is purely local to the repository and can be verified from current files.
- The task is a mechanical edit that does not introduce or preserve time-sensitive claims.
- The user explicitly provides the source text to use and asks only for formatting or translation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The claim or decision that may become stale.
- The file, command output, source page, screenshot, or user-provided text that supports the claim.
- The date or version context when it is visible.
- Any repository policy about allowed sources, official documentation, or offline work.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update source-date notes only where they clarify freshness risk.
- Replace unstable wording such as "latest" with a dated or versioned claim when appropriate.
- Mark translations or docs for review when the source cannot be verified confidently.
- Do not invent citations, release dates, compatibility ranges, or vendor behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify every claim that depends on time, external behavior, or an upstream source.
2. Prefer the current repository file, official source, declared package metadata, or user-provided source text before secondary summaries.
3. Capture the freshness boundary: date checked, version checked, release tag, documentation page, or reason the claim is local and stable.
4. If a claim cannot be refreshed within the allowed tools or command contract, keep the wording conservative and report the unverified source.
5. Avoid open-ended words such as "latest", "current", or "recent" unless the sentence includes the concrete date or version that makes the claim inspectable.
6. When editing documentation, keep source notes close to the claim or in the final report rather than adding broad provenance sections.
7. Run the smallest configured verification that covers the changed files.

<!-- mustflow-section: postconditions -->
## Postconditions

- Time-sensitive claims are either verified, dated, versioned, or explicitly reported as unverified.
- Documentation does not imply live freshness when only a snapshot was checked.
- The final report names skipped refresh checks and any remaining stale-source risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `docs_validate_fast`
- `mustflow_check`

Also run the relevant configured test, build, or documentation intent if the refreshed claim changes executable behavior or public documentation.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the requested source cannot be accessed, report the access gap and avoid presenting the claim as current.
- If sources conflict, prefer the highest-authority source and report the conflict.
- If the freshness check changes meaning in translated docs, mark the affected translation for review.
- If checking freshness would require network access or tools outside the current host permissions, stop at the permission boundary and state what remains unchecked.

<!-- mustflow-section: output-format -->
## Output Format

- Freshness-sensitive claims found
- Source or version checked
- Wording changed or claim left conservative
- Command intents run
- Skipped source checks and reasons
- Remaining stale-source risk
