---
mustflow_doc: skill.github-contribution-quality-gate
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: github-contribution-quality-gate
description: Apply this skill before drafting, opening, or replying to public GitHub issues, pull requests, review threads, or maintainer-facing comments so the contribution follows repository rules, uses readable Markdown structure, avoids duplicate low-value content, and includes verified evidence.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.github-contribution-quality-gate
  command_intents:
    - changes_status
    - changes_diff_summary
    - mustflow_check
---

# GitHub Contribution Quality Gate

<!-- mustflow-section: purpose -->
## Purpose

Create GitHub issues, pull requests, review replies, and maintainer-facing comments that save maintainer time.

The goal is not polished prose. The goal is verified, scoped, actionable information that follows the target repository's rules and gives maintainers enough evidence to reproduce, review, merge, redirect, close, or reject the work faster.

<!-- mustflow-section: use-when -->
## Use When

- The user asks to draft, open, improve, or reply to a public GitHub issue, pull request, review thread, or maintainer-facing comment.
- A PR description, issue body, bug report, feature request, documentation report, review reply, or follow-up comment needs repository-template alignment.
- A GitHub issue or PR body needs clearer title, section order, Markdown rendering, review order, verification evidence, risk handling, or maintainer-facing information structure.
- The contribution may depend on `README.md`, `CONTRIBUTING.md`, issue templates, pull request templates, `SUPPORT.md`, `SECURITY.md`, maintainer comments, duplicate issues, duplicate pull requests, or project-specific contribution rules.
- AI-generated analysis, generated code, generated tests, generated reproduction steps, or generated security reasoning may influence the public GitHub content.
- The user has evidence that may belong in an existing issue or pull request instead of a new thread.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only to review code before a report; use `code-review` or `diff-risk-review`.
- The task is to publish a release, release notes, or changelog entry; use `release-publish-change` or `release-notes-authoring`.
- The content is a private vulnerability report, credential leak, exploit path, account compromise, or sensitive security issue. Follow the repository security policy and do not draft a public issue.
- The user asks to mass-generate issues, mass-generate pull requests, farm contribution graphs, farm bounties, or post content the human contributor cannot explain.
- The task requires a GitHub operation that the host, repository, or user has not permitted. This skill can draft and gate content, but it does not grant external service permission.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target repository owner and name, plus the URL when available.
- Intended GitHub action: bug issue, feature issue, documentation issue, question redirect, pull request, review reply, issue comment, PR comment, or follow-up update.
- Repository rules found in `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `SECURITY.md`, issue templates, issue forms, pull request templates, and linked development docs.
- Duplicate and context search evidence: searched terms, open and closed issues, open and closed pull requests, discussions when used by the repository, documentation, changelog, and related maintainer comments.
- User evidence: reproduction steps, minimal example, logs, screenshots, recordings, changed files, local test output, failing command, environment, version, linked issue, or maintainer question being answered.
- Draft structure evidence: proposed title, first-screen summary, section headings, Markdown tables, task lists, code blocks, details blocks, screenshots, links, review order, and unresolved questions.
- Verification level: personally reproduced, partially reproduced, inferred from code, inferred from logs, not reproduced, not searched, or not verified.
- Desired result: report a bug, propose a feature, submit a fix, ask for design approval, answer a maintainer, provide missing evidence, or close the loop.

<!-- mustflow-section: preconditions -->
## Preconditions

- Treat repository-specific rules as the source of truth for the draft format.
- Prefer repository templates over fallback structures.
- If template fields are required, preserve the headings and answer each field. Use `N/A` only when the field truly does not apply, with one short reason.
- If the repository sends support questions to Discussions, Discord, Slack, Stack Overflow, a mailing list, or another support channel, do not draft a bug issue for a support question.
- If duplicate search is not possible with available context or host tools, state that clearly and lower confidence.
- If essential evidence is missing, do not fabricate it. Return a blocking gate decision or ask for the exact missing evidence.
- If a public post may expose a private vulnerability, credential, exploit, private log, customer data, or account-specific detail, return `PRIVATE_SECURITY_REPORT`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Draft or revise issue bodies, PR descriptions, review replies, and maintainer-facing comments.
- Summarize repository rules, duplicate-search results, evidence, missing evidence, and posting risk.
- Update local documentation only when the user explicitly asks to save the draft or the repository task separately requires documentation changes.
- Do not edit code, tests, templates, schemas, repository settings, labels, milestones, or GitHub state as part of this skill unless a separate task and matching skill authorize that work.
- Do not add generic filler, speculative root causes, fake test results, fake reproduction steps, or unverified claims.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the intended contribution surface: new issue, existing issue comment, new PR, existing PR comment, review reply, or follow-up update.
2. Read repository contribution rules before drafting:
   - root, `.github/`, and `docs/` `CONTRIBUTING.md`;
   - `CODE_OF_CONDUCT.md`;
   - `SUPPORT.md`;
   - `SECURITY.md`;
   - `.github/ISSUE_TEMPLATE/` Markdown templates, YAML issue forms, and `config.yml`;
   - `pull_request_template.md`, `.github/pull_request_template.md`, `docs/pull_request_template.md`, and `PULL_REQUEST_TEMPLATE/`;
   - development docs linked from the contribution guide.
3. Identify mandatory repository fields: title format, labels or issue type guidance, reproduction requirements, test expectations, AI-assistance disclosure rules, security-reporting path, support channel, contribution scope, and linked-issue requirements.
4. Search for duplicates and context before drafting. Use exact error text, function names, component names, stack trace fragments, package names, version numbers, platform names, and user-facing symptoms. Record likely duplicates with number, status, and why they are or are not the same.
5. Decide whether the contribution adds new verified value:
   - new value includes a minimal reproduction, different affected version, regression range, failing test, confirmed workaround, smaller root-cause evidence, platform-specific observation, or logs that materially improve triage;
   - `same problem here` without new evidence is not new value.
6. Plan the reading order before polishing prose.
   - Title should name the observed result for issues or the guaranteed behavior after a PR, not labels such as `[BUG]`, `fix`, `WIP`, or implementation chores.
   - First screen should contain conclusion, impact, and requested decision. Move long logs, full outputs, screenshots, and alternatives below or into `<details>`.
   - Headings should answer one question each. Avoid dump headings such as `Details`, `Misc`, `Notes`, or `Context` unless the repository template requires them.
   - Separate observed facts, current hypotheses, decisions, and unknowns. Use `Cause` only when the cause is confirmed.
7. For bug issues, require actual behavior, expected behavior, exact reproduction steps, smallest reasonable reproduction, version, environment, relevant logs or screenshots, regression status, attempted workarounds, concrete impact, and completion criteria.
8. For feature or enhancement issues, require user problem, affected users, current workflow, desired workflow, why existing behavior is insufficient, related discussions, compatibility impact, alternatives considered, and non-goals when the proposal can sprawl.
9. For documentation issues, require exact page, section, symbol, command, or example; current wording or behavior; expected wording or explanation; and evidence that the current documentation is stale or misleading when available.
10. For pull requests, require focused scope, linked issue or prior discussion when non-trivial, changed behavior, intentionally unchanged behavior, tests added or updated, exact verification results, compatibility notes for public surfaces, UI screenshots when relevant, and draft status when incomplete.
11. For PR review guidance, provide a review order by reasoning path rather than dumping changed files. Name files or commits only when they help reviewers inspect behavior, generated output, tests, or mechanical-only changes in the right order.
12. For review replies, answer the maintainer's actual question first. Provide requested logs, reproduction, design tradeoff, tests, or blocker. Do not answer a different question because it is easier.
13. Use Markdown elements by job, not decoration.
    - Use tables only for comparable short values such as environment, behavior matrix, before/after behavior, browser results, or risk response.
    - Use task lists only for merge conditions, unresolved manual checks, or follow-up items whose state can change. Do not duplicate CI facts that automation already reports.
    - Use fenced code blocks with language tags for logs, JSON, SQL, commands, diffs, or suggestions. Quote only the minimal evidence needed and fold long output into `<details>` with a specific summary.
    - Use inline code only for searchable identifiers, paths, commands, status codes, API routes, flags, and config values.
    - Use alerts, blockquotes, footnotes, Mermaid diagrams, images, and videos sparingly and only when they improve judgment. Add one sentence that states what each artifact proves.
    - Prefer permanent code links for external GitHub references when citing exact lines. Do not rely on moving branch links for durable evidence.
14. Make verification and risk sections decision-ready.
    - For verification, report commands or checks, environment, outcome, and unverified areas. `tested` or a bare command list is not enough.
    - For behavior changes, prefer a behavior matrix that maps conditions to previous behavior, new behavior, and verification.
    - For risk, state condition, detection, mitigation, and rollback or forward-fix path. Do not write vague risk labels without a response.
    - For migrations, flags, generated files, UI changes, and refactors, explicitly state unchanged behavior and out-of-scope work.
15. For review comments, label severity when useful and keep each comment actionable.
    - Use local team conventions when they exist; otherwise labels such as `blocking`, `question`, `suggestion`, `nit`, and `praise` can clarify review weight.
    - Good comments state observation, impact, and proposed next step.
    - Use GitHub suggestions only when the change is small and the reason is already clear or stated above the suggestion.
16. Apply a Preview self-check before treating the draft as ready.
    - First-screen check: conclusion, impact, and requested action are visible before logs or screenshots.
    - Heading-only check: the `##` headings tell a coherent story without reading every paragraph.
    - Gray-block check: long code blocks, tables, details, and alerts are preceded by a sentence saying what they prove.
    - Narrow-panel check: wide tables, screenshots, and before/after comparisons remain readable in the GitHub PR pane.
    - Action check: an issue has completion criteria; a PR has review focus, verification, and risk or rollback notes when relevant.
17. Apply AI-assistance rules:
    - the human contributor remains responsible for accuracy, completeness, copyright, testing, follow-up, and explanation;
    - disclose substantial AI assistance when the repository requires it or when AI-generated analysis, code, tests, reproduction steps, or security reasoning materially shaped the content;
    - do not submit AI output that the human contributor has not reviewed, cannot explain, or could have tested but did not.
18. Choose a gate decision before writing the final draft:
    - `POST` when the content follows repository rules and has enough verified value;
    - `POST_AS_DRAFT` when a PR direction is useful but not ready for final review;
    - `ASK_IN_EXISTING_THREAD` when the evidence belongs in a related issue or PR;
    - `DO_NOT_POST` when the content lacks verified value, duplicates existing content, violates repository rules, or the human contributor cannot defend it;
    - `PRIVATE_SECURITY_REPORT` when the content should not be public.
19. Draft concise maintainer-ready content. Put the core fact early, keep sections short, include only relevant evidence, quote logs narrowly, and avoid generic flattery, repeated apology, AI disclaimers, or project background that maintainers already know.
20. Run or report configured local verification only when the GitHub content depends on the current local diff or repository workflow. Do not infer missing commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- The gate decision is explicit and evidence-backed.
- Repository templates and rules are followed or the reason they could not be checked is stated.
- Duplicate search is summarized with confidence.
- Every technical claim in the draft is tied to evidence or marked uncertain.
- Title, first-screen summary, section order, Markdown elements, verification, and risk handling help maintainers decide what to do next.
- Security-sensitive content is not prepared for public posting.
- AI assistance is disclosed when required or material.
- The draft helps maintainers act faster or the skill blocks posting.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available and relevant:

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`

Use `changes_status` and `changes_diff_summary` when drafting a PR description or review reply for the current local diff. Use `mustflow_check` when the GitHub content concerns mustflow workflow files or skill changes. If a repository-specific test, lint, build, or docs check is required but not declared as a configured intent, report the missing intent instead of inventing a command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If repository rules cannot be inspected, draft only a low-confidence outline and list the missing rule files or inaccessible templates.
- If duplicate search cannot be performed, do not claim the issue is new.
- If a duplicate exists and the user has no new evidence, return `DO_NOT_POST`.
- If a duplicate exists and the user has new evidence, draft a concise comment for the existing thread instead of a new issue.
- If the report is a support request, redirect to the repository's support path instead of drafting a bug report.
- If the issue may be security-sensitive, return `PRIVATE_SECURITY_REPORT` and cite the repository security policy path when known.
- If the human contributor cannot explain the claim, fix, or answer, return `DO_NOT_POST`.
- If tests were feasible but not run, keep the draft honest and explain the skipped verification.

<!-- mustflow-section: output-format -->
## Output Format

- Gate decision: `POST`, `POST_AS_DRAFT`, `ASK_IN_EXISTING_THREAD`, `DO_NOT_POST`, or `PRIVATE_SECURITY_REPORT`
- Why
- Repository rules found
- Duplicate and context check
- Evidence checked
- Information-structure and Markdown checks
- Missing evidence
- Draft
- Final self-check:
  - Does the title state the observed issue result or PR outcome instead of metadata?
  - Can a maintainer understand the conclusion, impact, and requested action from the first screen?
  - Do headings, tables, task lists, details blocks, code blocks, screenshots, and links each have one clear job?
  - Can a maintainer reproduce or review this without guessing?
  - Does this follow repository rules and templates?
  - Does this add new information beyond existing issues or PRs?
  - Is every technical claim backed by evidence?
  - Are facts, hypotheses, decisions, and unknowns separated?
  - Does a PR include review focus, verification results, unverified areas, and risk or rollback notes when relevant?
  - Were feasible tests or verification checks run or honestly skipped?
  - Is AI assistance disclosed when required or material?
  - Can the human contributor explain and defend the content without AI?
  - Does posting this save maintainer time?
