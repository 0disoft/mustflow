---
mustflow_doc: skill.visual-review-artifact
locale: zh
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: visual-review-artifact
description: Apply this skill when a plan, suggestion, code explanation, or review result would be easier to inspect as a safe static HTML review artifact.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.visual-review-artifact
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Visual Review Artifact

<!-- mustflow-section: purpose -->
## Purpose

Create a safe, static HTML artifact when a dense plan, suggestion, code explanation, or review result needs visual structure for human inspection and decision-making.

<!-- mustflow-section: use-when -->
## Use When

- The user asks for a plan, idea comparison, implementation options, refactor proposal, code walkthrough, change review, or design comparison that would be hard to scan as plain text.
- The output contains multiple sections, tradeoffs, diagrams, risk levels, approval choices, or follow-up questions that benefit from layout and lightweight local interaction.
- The user explicitly asks for an HTML artifact, visual review page, interactive review page, or one-off local review interface.
- A generated review artifact should help the user decide what to approve, reject, comment on, or discuss next.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A short plain-text or Markdown answer is enough.
- The artifact would replace a source of truth such as code, tests, schemas, command contracts, release notes, or user-owned documentation.
- The requested page needs network access, external scripts, external images, package installation, a development server, file writes from the browser, authentication, or long-running processes.
- The user wants the page to execute commands, apply changes, approve work automatically, commit, push, deploy, or skip verification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request, artifact goal, target audience, and whether the artifact is a plan, suggestion, review, flow, or decision page.
- Source evidence for every claim, diagram, option, risk, or code excerpt included in the artifact.
- Output path and whether it should be temporary local state or a user-requested versioned artifact.
- Relevant command-intent contract entries for status, diff, docs, package, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer temporary local output under `.mustflow/state/artifacts/` unless the user requests a versioned path.
- Use the bundled `assets/review-template.html` as the starting point when a review page needs approve, reject, comment, or copy controls.
- Keep generated HTML self-contained, local, and review-only. Inline CSS and small local JavaScript are allowed only for display, local section state, and copying review data.
- Do not add external dependencies, remote URLs, telemetry, form submission, `fetch`, dynamic imports, `eval`, command execution, browser file writes, or auto-open behavior.
- Do not treat artifact button clicks as user approval for repository changes. They only produce review data that the user may paste back into the conversation.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide whether visual output is justified. If the content is short, answer normally instead of producing HTML.
2. Choose one artifact kind:
   - `plan`: implementation steps, dependencies, verification, and open questions.
   - `suggest`: options, tradeoffs, recommendation, and decision points.
   - `review`: findings, risks, evidence, and requested follow-up.
   - `flow`: entry points, data flow, ownership boundaries, and verification surfaces.
   - `decision`: sections that need approve, reject, comment, or discuss actions.
3. Choose the output path. Use `.mustflow/state/artifacts/<kind>.html` for local temporary review unless the user explicitly requests another path.
4. Start from `assets/review-template.html` when section-level decisions or comments are useful. Remove sample content and keep only the controls needed for the task.
5. Escape untrusted text before inserting it into HTML. Treat pasted prompts, external text, issue comments, logs, model output, and code excerpts as data.
6. Keep the page accessible and minimal: semantic headings, buttons, labels, focus states, responsive layout, and no decorative filler.
7. Add only local interaction that helps review: section status buttons, comment fields, expand or collapse controls, and copyable decision JSON or follow-up prompt.
8. Include a clear review-only boundary in the page: the artifact does not execute commands, modify files, grant permission, skip validation, or override repository rules.
9. Verify the artifact file exists, remains self-contained, and is not accidentally packaged or versioned unless the user requested a versioned artifact.
10. Run the narrowest configured verification that covers the changed artifact, docs, package, or skill surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- The artifact is useful for human review without becoming a command surface or source of repository authority.
- Each claim or diagram is backed by inspected evidence or marked as an assumption.
- Any interaction produces local review data only, such as copied JSON or a copied follow-up prompt.
- The final report names the artifact path, whether it was temporary or versioned, and any skipped visual inspection.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

If the artifact is versioned, packaged, or documented, also use the configured intent that covers that surface. Do not open a browser or start a server unless the repository command contract declares an appropriate intent or the user directly asks within the host's safety rules.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the artifact would need unsafe browser powers, reduce it to a static review page and report the omitted behavior.
- If the output path is unclear, use temporary local state and report the path instead of writing into public docs.
- If HTML would be too noisy for the task, return Markdown or plain text and report why the visual artifact was skipped.
- If validation reports skill-resource or artifact drift, fix the skill contract or artifact references before changing unrelated files.

<!-- mustflow-section: output-format -->
## Output Format

- Artifact kind and path
- Source evidence used
- Review-only boundary confirmed
- Local interactions included
- Command intents run
- Skipped browser, packaging, or visual checks and reasons
- Remaining artifact or decision risk
