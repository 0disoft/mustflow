---
mustflow_doc: skill.clarifying-question-gate
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: clarifying-question-gate
description: Apply this skill when a coding task needs request-contract repair: missing intent, scope, completion evidence, domain, data, security, UX, dependency, architecture, or verification decisions cannot be safely inferred from current repository evidence. Use it to proceed with safe assumptions, ask bounded confirmation questions, or reroute conflicts without becoming a general prompt-writing skill.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.clarifying-question-gate
  command_intents:
    - changes_status
    - changes_diff_summary
    - mustflow_check
---

# Clarifying Question Gate

<!-- mustflow-section: purpose -->
## Purpose

Repair an ambiguous request into an executable task contract, and ask only the questions that
protect the work from expensive wrong assumptions.

Good agent work is not maximally autonomous and not maximally interrogative. It moves forward on
cheap, reversible, repository-evident decisions, and stops before choices that are costly to undo or
whose correct answer belongs to the user, product owner, security owner, or operations owner.

The goal is not to make the user rewrite the prompt. Normalize the request inside the current task,
state the interpretation when it matters, and continue unless a high-cost decision still needs
confirmation.

This skill also protects the repository from vague imperative requests such as "fix the bug",
"clean this up", "make it pretty", "speed it up", "add tests", "fix the build", "make an API",
or "handle errors". Do not execute the literal wording as permission to patch symptoms. Convert
the request into a reviewable contract for the target, criteria, scope, affected surfaces,
verification, and stop-or-ask boundary.

<!-- mustflow-section: use-when -->
## Use When

- The user asks for implementation, debugging, refactoring, UI, data, API, release, or workflow work
  but the success criteria are not observable from the request or repository evidence.
- The task may affect existing users, existing data, migrations, deletion, retention, auth,
  authorization, billing, entitlements, files, secrets, external APIs, public CLI/API output,
  user-visible UX policy, package dependencies, architecture, performance tradeoffs, or verification
  expectations.
- The task uses ambiguous domain words such as user, account, team, workspace, project, active,
  complete, canceled, subscription, admin, owner, archived, deleted, invite, or verified.
- Several implementation scopes are plausible and differ in cost, compatibility, risk, or future
  maintenance burden.
- You are about to add a new dependency, service, folder boundary, storage model, framework pattern,
  persistent state, or broad refactor that the current files do not already require.
- The request is a terse command that names an activity but not its target behavior, quality
  criteria, impacted contracts, or proof of completion, for example bug fixing, error handling,
  refactoring, test repair, type cleanup, performance work, API work, UI polish, documentation,
  dependency updates, CI repair, or PR preparation.
- The request can be safely clarified by a short normalized contract instead of a long back-and-forth.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The answer is available by reading current files, tests, docs, config, or local patterns.
- The change is small, local, reversible, and covered by an existing pattern or focused test.
- The task is analysis-only and does not need an implementation decision.
- A more specific skill already requires a blocking question for the same risk and covers the whole
  decision, such as `structure-discovery-gate`, `auth-permission-change`, `database-migration-change`,
  `dependency-upgrade-review`, or `release-publish-change`.
- The request is mainly to draft a task prompt, work order, issue, PR instruction, or handoff for
  another agent; use `task-instruction-authoring`.
- The work is a production prompt, prompt builder, RAG prompt, structured output, eval, or model/tool
  policy; use `prompt-contract-quality-review`.
- Repository, host, user, nested-project, command-contract, or generated instruction sources
  conflict; use `instruction-conflict-scope-check`.
- Hidden structural decisions dominate the task, such as a new data model, service boundary, storage
  strategy, provider, public URL contract, or long-lived architecture choice; use
  `structure-discovery-gate`.
- Asking would only delegate ordinary engineering responsibility, such as "should I add tests?",
  "should I handle errors?", "what stack is this?", or "what style should I use?" when the repository
  already answers it.
- The only useful output would be "copy this rewritten prompt and send it again." Produce a
  normalized contract and proceed in the current conversation unless the user explicitly requested a
  reusable prompt artifact or the request is too broken to execute.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request and any stated success criteria, constraints, examples, deadlines, or non-goals.
- Relevant repository evidence: current files, tests, schemas, command contracts, docs, context,
  nearby code patterns, and existing verification options.
- Candidate decisions that are still ambiguous after reading local evidence.
- Reversibility classification for each decision: cheap/reversible, moderate, or expensive/hard to
  roll back.
- A recommended option for each blocking question, with the tradeoff of at least one alternative.
- Host input capability when known: whether a structured user-input mechanism such as Codex
  `request_user_input` or MCP elicitation is explicitly available in the current runtime.
- A request-state decision: `ready`, `ready_with_assumptions`, `needs_confirmation`,
  `blocked_by_conflict`, or `insufficient_evidence`.
- A normalized task contract when the original request is vague enough to risk drift: goal, current
  context, change scope, excluded scope, user-visible behavior, constraints, completion evidence,
  verification, report format, and remaining risks.
- For terse implementation commands, a normalized execution contract with:
  - the observed target or failure source;
  - the intended behavior or quality criterion;
  - the changed and explicitly excluded surfaces;
  - public contracts, data, security, UX, dependency, or generated outputs that may be affected;
  - the verification plan and evidence that will close the task;
  - the condition that requires stopping, asking, or handing off to a narrower skill.
- Source tags for contract entries: `user_confirmed`, `repository_derived`, `safe_assumption`, or
  `unresolved`.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Repository evidence has been inspected before asking. Do not ask the user to answer facts that the
  codebase can answer.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Questions are limited to decisions that block safe implementation, not curiosity, preference
  collection, or broad product discovery.
- Product decisions are separated from engineering responsibilities. Do not ask whether to preserve
  existing style, avoid swallowed errors, add appropriate tests, or follow command contracts.
- Structured input tools are optional host capabilities. Do not claim they exist, simulate their UI,
  or depend on them unless the current host explicitly exposes them for this turn or tool call.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- No edits are required when the skill only gates a blocking decision.
- When proceeding under a safe assumption, keep the implementation small enough that a wrong
  assumption can be corrected locally.
- Do not add dependencies, migrations, persistent data changes, permission policy, deletion behavior,
  public contract changes, or broad refactors while a blocking question remains unanswered.
- Do not create speculative specs, roadmaps, or documentation unless the user requested that artifact
  or another selected skill authorizes that scope.

<!-- mustflow-section: procedure -->
## Procedure

1. Read enough local evidence to avoid lazy questions:
   - current feature code, nearby tests, schemas, docs, command contracts, and context files when
     relevant;
   - existing UI, API, data, auth, dependency, and verification patterns before proposing a new one.
2. Identify the decisions still unresolved after that evidence.
3. Classify each unresolved decision:
   - `repository_answerable`: inspect more local evidence instead of asking;
   - `safe_assumption`: choose the smallest reversible option and state the assumption before or while
     working;
   - `blocking_question`: stop before implementation because the wrong choice would be expensive,
     user-visible, security-sensitive, data-affecting, dependency-affecting, or hard to roll back.
4. Choose exactly one request state:
   - `ready`: no material ambiguity remains; proceed normally.
   - `ready_with_assumptions`: only narrow reversible assumptions remain; proceed and report them.
   - `needs_confirmation`: one or more user-owned, high-cost, or hard-to-reverse decisions must be
     confirmed before implementation.
   - `blocked_by_conflict`: instructions or command authority conflict; reroute to
     `instruction-conflict-scope-check`.
   - `insufficient_evidence`: more repository reading, reproduction, or scoped analysis is needed
     before asking or implementing.
5. Normalize terse implementation commands before editing:
   - For bug, error, build, CI, or failing-test requests, identify the observed failure source,
     distinguish implementation defects from test or environment defects, and define the regression
     evidence before changing code.
   - For refactor, cleanup, naming, comment, folder, type, or duplicate-removal requests, preserve
     behavior as the default invariant and name the readability, responsibility, type-safety, or
     dependency-direction criterion being improved.
   - For performance requests, identify the suspected or measured bottleneck, baseline, workload,
     and verification signal before optimizing.
   - For API, response shape, auth, permission, logging, error, cache, database, migration, or
     dependency requests, identify compatibility, data, security, lifecycle, and rollback surfaces
     before implementation.
   - For UI, accessibility, responsive, form, modal, routing, search, filtering, pagination, or
     state-management requests, identify the user path, visible states, failure states, device or
     input constraints, and verification evidence.
   - For docs, README, env var, deploy, release, or PR requests, identify the source of truth,
     affected install or automation surfaces, required verification, and any maintainer-facing
     limitation text.
   - Do not treat "minimal fix" as the default when a symptom-only patch would leave the affected
     flow, contract, or regression coverage broken.
6. Build a normalized task contract when the user request is underspecified but executable:
   - goal;
   - current context;
   - change scope;
   - excluded scope;
   - user-visible behavior;
   - constraints;
   - completion evidence;
   - verification;
   - report format;
   - remaining risks.
   Tag each non-obvious contract entry as `user_confirmed`, `repository_derived`,
   `safe_assumption`, or `unresolved`. Do not add new product requirements while normalizing.
7. Ask about observable completion before feature shape when success is unclear:
   - what behavior proves the task is done;
   - which user path, command, test, screenshot, migration state, or registry/release state closes it.
8. Ask about scope only when plausible scopes have different cost or risk:
   - minimal symptom fix, root-cause fix, or broader cleanup;
   - prototype, maintainable production path, or release-ready path.
9. Ask about existing users and data before changing persistence, lifecycle, deletion, migration,
   retention, cache, API compatibility, or old-client behavior.
10. Ask about failure UX before implementing user-visible success flows where failure handling is a
   product decision: retry, queue, message, audit/log-only, rollback, partial success, or manual
   recovery.
11. Ask about security and authorization before relying on UI hiding, client-side checks, roles,
   invites, team boundaries, file access, billing state, or admin features.
12. Ask before adding or swapping dependencies, services, queues, databases, auth providers, design
   systems, state managers, or major folder boundaries.
13. Ask about verification when there is no declared command intent or when the user expects a
    specific proof beyond the repository's configured checks.
14. Keep the question set short:
    - ask at most three questions at once;
    - ask only one question when its answer may make later questions irrelevant;
    - each question must name the decision, the recommended choice, the consequence of that choice,
      and one meaningful alternative;
    - avoid open-ended prompts like "how should I implement this?" unless no responsible options can
      be framed from repository evidence.
15. Prefer structured user input for real blocking decisions when the host exposes it:
    - use a structured input tool such as `request_user_input` or MCP elicitation only when it is
      explicitly listed as available in the current runtime or tool call;
    - use it for `needs_confirmation` or for a non-blocking `ready_with_assumptions` choice whose
      answer would materially improve the result without stopping all progress;
    - ask at most three short questions, and prefer one question when the answer may change the next
      question;
    - provide two or three mutually exclusive choices, put the recommended choice first, and include
      the concrete consequence or tradeoff for each choice;
    - allow free-form input when the host mechanism supports it, because the listed options are a
      steering aid rather than a closed product decision;
    - use auto-resolution only for non-blocking choices with a narrow reversible default, and never
      for destructive actions, publish or release decisions, credential or secret handling, data
      deletion or migration, auth or billing policy, dependency adoption, or other explicit
      confirmation gates;
    - if no structured input mechanism is available, ask the same blocking decision as a concise
      normal chat question when host policy allows it; do not invent a fake UI, long questionnaire,
      or multiple-choice card in prose when the host explicitly forbids that fallback.
16. Do not ask bad engineering-delegation questions:
    - "Should I add tests?"
    - "Should I handle errors?"
    - "Should I follow existing style?"
    - "Should I check current files?"
    - "Should I preserve existing behavior?"
17. Use prompt rewriting only as an exception:
    - the user explicitly asks for a prompt, issue, PR body, work order, or handoff for another
      agent;
    - the current request is too broken to execute and a normalized contract plus confirmation is the
      smallest safe next step.
    Otherwise, show the normalized contract only when it materially reduces drift, then proceed in
    the same conversation.
18. If no blocking question remains, proceed without ceremony. State only the assumptions that matter
    to review or rollback.
19. If a blocking question remains unanswered, do not implement around it. Offer the smallest safe
    non-blocked action, such as read-only analysis, a plan, a reproduction, or a narrow preparatory
    refactor when another selected skill supports it.

<!-- mustflow-section: postconditions -->
## Postconditions

- Questions are grounded in inspected repository evidence.
- The agent has not asked for facts it could read locally.
- Expensive, user-owned, security-sensitive, data-affecting, dependency-affecting, and public-contract
  decisions are resolved before implementation.
- Structured input tools are used only when available and only for bounded decisions that benefit
  from user choice.
- Safe assumptions are narrow, reversible, and reported.
- Any normalized contract preserves the user's original request separately from repository-derived
  facts and safe assumptions.
- Terse commands are expanded into target, criterion, scope, affected-surface, verification, and
  stop-or-ask boundaries before implementation.
- Prompt rewriting is not used as a substitute for proceeding in the current task.
- The final work can be judged against observable success criteria or a reported verification gap.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`

This skill often runs before edits and may need no command execution by itself. After implementation,
run the specific configured verification intents required by the selected implementation skills.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the user rejects a question as unnecessary, reclassify the decision as a safe assumption only
  when current evidence supports a narrow reversible path; otherwise report the unresolved risk.
- If new evidence shows the question was answered by current files, continue without asking and note
  the evidence if it affects the final report.
- If a blocking question reveals a larger feature, switch to the relevant skill before editing that
  new scope.
- If the issue is an instruction conflict rather than missing detail, switch to
  `instruction-conflict-scope-check` instead of negotiating the conflict as a preference question.
- If structural design owns the decision, switch to `structure-discovery-gate`; if a prompt artifact
  or work order owns it, switch to `task-instruction-authoring` or `prompt-contract-quality-review`.
- If the task becomes over-scoped, reduce the next action to the smallest safe slice with explicit
  acceptance evidence.
- If verification intent is missing, report the missing command contract instead of inventing a raw
  command.

<!-- mustflow-section: output-format -->
## Output Format

- Repository evidence inspected
- Request state: `ready`, `ready_with_assumptions`, `needs_confirmation`, `blocked_by_conflict`, or
  `insufficient_evidence`
- Normalized task contract, only when needed, with `user_confirmed`, `repository_derived`,
  `safe_assumption`, and `unresolved` source tags
- Blocking questions asked, with recommendation and tradeoff
- Question delivery mode: structured host input, normal chat fallback, or not needed
- Safe assumptions made
- Decisions intentionally deferred
- Implementation scope selected
- Command intents run
- Skipped checks and reasons
- Remaining ambiguity or rollback risk
