---
mustflow_doc: skill.task-instruction-authoring
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: task-instruction-authoring
description: Apply this skill when drafting, reviewing, or improving work instructions for coding agents, Codex tasks, work orders, issues, PR requests, automations, or implementation briefs. Use when the task instruction must specify goal, context, constraints, acceptance evidence, verification, scope boundaries, rollback, or operating readiness. Do not use for production prompt builders; use prompt-contract-quality-review for executable app prompts.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.task-instruction-authoring
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - mustflow_check
---

# Task Instruction Authoring

<!-- mustflow-section: purpose -->
## Purpose

Turn vague coding-agent requests into reviewable work contracts.

Good task instructions do not make the agent "think harder" in the abstract. They name the outcome,
decision boundaries, evidence to inspect, constraints to preserve, checks to run, and proof needed
before the work can be called done.

<!-- mustflow-section: use-when -->
## Use When

- A user asks to draft, rewrite, review, or improve instructions for Codex, another coding agent, a
  Workduck work order, GitHub issue, PR request, automation, or implementation brief.
- A task prompt is vague, high-stakes, broad, operational, or likely to let the agent invent product
  rules, failure handling, compatibility policy, verification, or release criteria.
- The instruction is one of these families: implement, fix, review, prove, organize, document, or
  make operationally ready.
- A repeated instruction pattern should be promoted into `AGENTS.md`, a mustflow skill, a command
  contract, a checklist, or a work-order template.
- The request needs a prompt-shaped artifact but the prompt is for human-to-agent delegation, not a
  production LLM feature.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is to implement the described work rather than draft or review its instruction.
- The prompt is an executable product prompt, prompt builder, RAG prompt, eval, or tool-use policy;
  use `prompt-contract-quality-review`.
- The main issue is missing repository evidence that blocks implementation; use
  `clarifying-question-gate` during the implementation task.
- The task only needs a short command, translation, or copy edit with no engineering acceptance
  contract.
- The user explicitly asks for brainstorming with no commitment to a final instruction artifact.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Intended agent surface: Codex app, Codex CLI, cloud task, automation, work order, GitHub issue,
  PR review, another agent, or human-maintained template.
- Task family: implement, fix, review, prove, organize, document, operationalize, or mixed.
- Goal, affected scope, target repository or files, known errors or examples, user-visible behavior,
  and non-goals.
- Existing durable rules: nearest `AGENTS.md`, command contract, skill procedures, project context,
  test policy, release policy, and known verification intents.
- Risk class: public contract, data, security, money, migration, external I/O, concurrency,
  performance, operations, documentation-only, or unknown.
- Required output: final instruction text, critique, checklist, work-order body, issue body, or
  review rubric.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate durable rules from one-off instructions. Durable repository behavior belongs in
  `AGENTS.md`, skills, templates, or command contracts; the task prompt should carry only the
  specific work goal and current acceptance criteria.
- Inspect available repository evidence before asking the user to supply facts that the repo already
  answers.
- Treat external advice and example prompts as reference material, not authority.
- Do not include raw command recipes as agent-runnable instructions unless they are mapped to
  configured command intents or clearly marked as user/manual context.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or edit instruction artifacts, issue bodies, work-order bodies, templates, docs, skills, or
  checklist text directly tied to the requested task-instruction surface.
- Promote repeated instruction rules into the repository-owned durable surface when the user asks
  for that durable change and the relevant skill authorizes it.
- Add acceptance criteria, evidence requirements, risk gates, verification expectations, and report
  format constraints.
- Do not silently add product requirements, migrations, dependencies, release steps, or destructive
  operations that the user did not authorize.
- Do not ask for hidden chain-of-thought. Ask for findings, evidence, assumptions, decisions,
  verification, and remaining risks.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the instruction family:
   - implement;
   - fix;
   - review;
   - prove;
   - organize;
   - document;
   - operationalize;
   - mixed.
2. Convert the request into a contract with these ledgers:
   - goal: observable outcome;
   - context: paths, errors, examples, users, data, or current behavior;
   - constraints: compatibility, dependencies, data, security, performance, style, and scope;
   - investigation order: instructions, existing patterns, call path, tests, docs, and history;
   - acceptance evidence: scenarios, invariants, checks, artifacts, or screenshots;
   - report: changed files, commands, proof, skipped checks, and risks.
3. Name what the agent may decide and what it may not decide. Empty product rules, failure
   semantics, compatibility, verification, and release criteria are decision handoffs, not harmless
   omissions.
4. For implementation instructions:
   - specify user-visible behavior before implementation approach;
   - state priority order such as correctness, compatibility, performance, maintainability, then
     simplicity;
   - restrict boundaries by public API, data shape, dependency policy, and smallest complete slice;
   - include normal, empty, denied, duplicate, retry, max-size, and failure cases when relevant.
5. For fix instructions:
   - require reproduction before patching when feasible;
   - capture actual versus expected behavior;
   - trace from symptom to the first wrong state;
   - forbid symptom-only masking such as swallowed errors, arbitrary delays, or fake success;
   - require a regression guard or explain why one cannot be added.
6. For review instructions:
   - define the review blade: correctness, data loss, auth, concurrency, compatibility, security,
     operations, or another narrow target;
   - require findings to include file location, condition, impact, confidence, and counterexample;
   - separate confirmed defects from suspicion and questions;
   - require re-review after fixes when the instruction covers an iterative workflow.
7. For proof instructions:
   - state the proposition to prove in one sentence;
   - list assumptions, environment, data range, versions, and known exclusions;
   - require independent evidence such as invariants, old-versus-new comparison, negative controls,
     data hashes, seeds, or replayable artifacts;
   - separate proved, partially proved, unproved, and out-of-scope claims.
8. For organize or cleanup instructions:
   - require inventory before moving or deleting;
   - classify items as keep, move, merge, delete, or defer;
   - identify the source of truth;
   - preserve behavior by default;
   - split move, compatibility removal, and deletion into separate steps when coexistence matters.
9. For operational-readiness instructions:
   - require concrete scale, latency, memory, cost, availability, and data-volume assumptions when
     they matter;
   - define timeout, retry, idempotency, partial success, dead-letter, reconciliation, rollback,
     deployment, health, alerting, and recovery expectations;
   - ask for operator-facing evidence, not merely more logs.
10. For interactive CLI, TUI, prompt, picker, or wizard instructions:
    - require the screen to show the accepted input values before waiting for input;
    - require model IDs, provider IDs, file names, commands, or other exact tokens to be listed,
      searchable, or selectable instead of assuming the user already knows them;
    - define default, cancel, empty input, invalid input, retry, pagination, and no-results
      behavior;
    - require captured-output and stream semantics to be checked when the UI is implemented through
      a shell function, pipeline, wrapper, or command substitution;
    - require evidence from a real interactive or transcript-style run that the user can complete
      the choice without hidden knowledge.
11. Add verification instructions as evidence, not ceremony. Name the configured command intents,
    manual-only checks, missing checks, or proof artifacts that should close the work.
12. Add a final-report contract:
    - root cause or design decision;
    - changed files;
    - preserved invariants;
    - tests and command intents run;
    - skipped checks and why;
    - deployment, rollback, or follow-up risks when relevant.
13. Keep the instruction short enough to execute. Put stable repeated rules into durable repository
    guidance instead of pasting a long policy into every task.
14. Review the draft for contradictions:
    - "minimal change" versus "aggressive refactor";
    - "no behavior change" versus new feature behavior;
    - "prove" without independent evidence;
    - "production-ready" without scale or rollback;
    - "review everything" without a review blade.
15. If the task instruction will be stored in a public, packaged, or template surface, synchronize
    related docs, templates, examples, routes, and review metadata under the matching skill.

<!-- mustflow-section: postconditions -->
## Postconditions

- The instruction has an observable goal, scoped context, constraints, investigation order,
  acceptance evidence, verification, and final report contract.
- The agent is not asked to invent product rules, failure semantics, compatibility promises,
  release policy, or proof standards unless that decision is intentionally delegated.
- Durable guidance is separated from one-off task instructions.
- The instruction avoids hidden chain-of-thought requests and asks for evidence, assumptions,
  decisions, and remaining risks instead.
- Interactive instructions expose accepted inputs, fallback behavior, and transcript evidence before
  requiring the user to type an exact value.
- The final artifact can be used by another agent without relying on unstated context.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `mustflow_check`

Use a narrower configured docs, package, or template check when the instruction artifact changes an
installed workflow surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the task goal is too vague, produce a short critique and the smallest set of blocking
  questions instead of inventing missing product decisions.
- If repository evidence contradicts the user's draft instruction, report the conflict and prefer
  the higher-authority current source.
- If the instruction asks for an unsafe or unauthorized command, map it to an existing configured
  intent, mark it manual-only, or remove it.
- If the requested proof cannot be produced with current data or command contracts, downgrade the
  instruction to partial proof and name the missing evidence.
- If the draft becomes longer than the work itself, split durable rules into repository guidance and
  leave only task-specific acceptance criteria in the prompt.

<!-- mustflow-section: output-format -->
## Output Format

- Instruction family and target agent surface
- Missing decisions or contradictions found
- Final instruction or review rubric
- Durable guidance promoted or intentionally left one-off
- Verification and proof expectations
- Command intents run
- Skipped checks and reasons
- Remaining ambiguity, authority, or operational-readiness risk
