---
mustflow_doc: skill.clarifying-question-gate
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: clarifying-question-gate
description: Apply this skill when a coding task has missing intent, scope, domain, data, security, UX, dependency, architecture, or verification decisions that cannot be safely inferred from current repository evidence.
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

Ask only the questions that protect the work from expensive wrong assumptions.

Good agent work is not maximally autonomous and not maximally interrogative. It moves forward on
cheap, reversible, repository-evident decisions, and stops before choices that are costly to undo or
whose correct answer belongs to the user, product owner, security owner, or operations owner.

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

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The answer is available by reading current files, tests, docs, config, or local patterns.
- The change is small, local, reversible, and covered by an existing pattern or focused test.
- The task is analysis-only and does not need an implementation decision.
- A more specific skill already requires a blocking question for the same risk and covers the whole
  decision, such as `structure-discovery-gate`, `auth-permission-change`, `database-migration-change`,
  `dependency-upgrade-review`, or `release-publish-change`.
- Asking would only delegate ordinary engineering responsibility, such as "should I add tests?",
  "should I handle errors?", "what stack is this?", or "what style should I use?" when the repository
  already answers it.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request and any stated success criteria, constraints, examples, deadlines, or non-goals.
- Relevant repository evidence: current files, tests, schemas, command contracts, docs, context,
  nearby code patterns, and existing verification options.
- Candidate decisions that are still ambiguous after reading local evidence.
- Reversibility classification for each decision: cheap/reversible, moderate, or expensive/hard to
  roll back.
- A recommended option for each blocking question, with the tradeoff of at least one alternative.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Repository evidence has been inspected before asking. Do not ask the user to answer facts that the
  codebase can answer.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Questions are limited to decisions that block safe implementation, not curiosity, preference
  collection, or broad product discovery.

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
4. Ask about observable completion before feature shape when success is unclear:
   - what behavior proves the task is done;
   - which user path, command, test, screenshot, migration state, or registry/release state closes it.
5. Ask about scope only when plausible scopes have different cost or risk:
   - minimal symptom fix, root-cause fix, or broader cleanup;
   - prototype, maintainable production path, or release-ready path.
6. Ask about existing users and data before changing persistence, lifecycle, deletion, migration,
   retention, cache, API compatibility, or old-client behavior.
7. Ask about failure UX before implementing user-visible success flows where failure handling is a
   product decision: retry, queue, message, audit/log-only, rollback, partial success, or manual
   recovery.
8. Ask about security and authorization before relying on UI hiding, client-side checks, roles,
   invites, team boundaries, file access, billing state, or admin features.
9. Ask before adding or swapping dependencies, services, queues, databases, auth providers, design
   systems, state managers, or major folder boundaries.
10. Ask about verification when there is no declared command intent or when the user expects a
    specific proof beyond the repository's configured checks.
11. Keep the question set short:
    - ask at most three questions at once;
    - each question must name the decision, the recommended choice, the consequence of that choice,
      and one meaningful alternative;
    - avoid open-ended prompts like "how should I implement this?" unless no responsible options can
      be framed from repository evidence.
12. If no blocking question remains, proceed without ceremony. State only the assumptions that matter
    to review or rollback.
13. If a blocking question remains unanswered, do not implement around it. Offer the smallest safe
    non-blocked action, such as read-only analysis, a plan, a reproduction, or a narrow preparatory
    refactor when another selected skill supports it.

<!-- mustflow-section: postconditions -->
## Postconditions

- Questions are grounded in inspected repository evidence.
- The agent has not asked for facts it could read locally.
- Expensive, user-owned, security-sensitive, data-affecting, dependency-affecting, and public-contract
  decisions are resolved before implementation.
- Safe assumptions are narrow, reversible, and reported.
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
- If the task becomes over-scoped, reduce the next action to the smallest safe slice with explicit
  acceptance evidence.
- If verification intent is missing, report the missing command contract instead of inventing a raw
  command.

<!-- mustflow-section: output-format -->
## Output Format

- Repository evidence inspected
- Blocking questions asked, with recommendation and tradeoff
- Safe assumptions made
- Decisions intentionally deferred
- Implementation scope selected
- Command intents run
- Skipped checks and reasons
- Remaining ambiguity or rollback risk
