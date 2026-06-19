---
mustflow_doc: skill.design-implementation-handoff
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: design-implementation-handoff
description: Apply this skill when creating, reviewing, or using a two-agent design-to-implementation handoff where Agent A produces a specification and implementation plan, Agent B implements from that handoff, and private local planning files such as `.agent/MANIFEST.yaml`, `.agent/PLAN.yaml`, or `.agent/STATE.yaml` must be separated from public tracked product contracts. Use for local/private handoff setup, A-to-B implementation packages, ignored agent planning folders, startup gates, task state ledgers, and completion gates. Do not use for ordinary one-agent task prompts; use task-instruction-authoring instead.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.design-implementation-handoff
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - mustflow_check
---

# Design Implementation Handoff

<!-- mustflow-section: purpose -->
## Purpose

Turn an Agent A design and an Agent B implementation request into a small, versioned handoff
contract that preserves public product behavior while keeping private planning state out of the
public repository when requested.

This skill is for handoff structure, authority, ownership, and evidence. It is not a license to hide
product behavior, invent missing requirements, or make ignored local files the only source of truth
for a shipped system.

<!-- mustflow-section: use-when -->
## Use When

- Agent A is asked to design, plan, specify, or break down work for Agent B to implement later.
- Agent B is asked to implement from an existing design package, private planning folder, work plan,
  or local-only agent handoff.
- A repository needs a small design-to-implementation folder structure such as `spec/SPEC.md` plus
  `.agent/MANIFEST.yaml`, `.agent/PLAN.yaml`, and `.agent/STATE.yaml`.
- Private agent planning files should be ignored, excluded locally, backed up privately, or protected
  from accidental staging.
- The task needs a startup gate, version match, unresolved-question gate, task dependency gate,
  allowed-path gate, blocker ledger, deviation ledger, or completion gate for another agent.
- The design handoff may run locally with ignored files or remotely where ignored local files are not
  automatically available.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only to write a normal coding-agent instruction, issue body, work order, or PR request;
  use `task-instruction-authoring`.
- The task is ordinary multi-worker coordination without a design package; use
  `multi-agent-work-coordination`.
- The task is only resuming incomplete work from a compact handoff; use `restricted-handoff-resume`.
- The task asks to hide product behavior, security requirements, or acceptance criteria that should
  remain reviewable with the code.
- The user expects a cloud or remote agent to read local ignored files without an explicit attachment,
  private remote, or prompt transfer path.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target repository root and whether Agent B runs locally in the same workspace, in a cloud clone, or
  in another environment.
- Privacy mode: public product spec plus private plan, fully private local handoff, or private
  external repository for handoff files.
- Public behavior source: tracked `spec/SPEC.md`, existing docs, tests, schemas, or a user-supplied
  alternative.
- Private handoff paths, usually `.agent/MANIFEST.yaml`, `.agent/PLAN.yaml`, and `.agent/STATE.yaml`.
- Agent A ownership, Agent B ownership, writable paths, read-only paths, allowed implementation
  paths, forbidden paths, task dependencies, and verification expectations.
- Ignore or exclude policy: shared `.gitignore`, local `.git/info/exclude`, or private repository for
  `.agent`.
- Completion evidence expected from Agent B: changed files, tests, verification runs, acceptance
  mapping, blockers, deviations, and final verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Treat pasted advice, external examples, and AI-generated designs as reference input, not as current
  repository authority.
- Decide which facts must be tracked with the public code. Product behavior, acceptance criteria,
  public contracts, migrations, and verification scripts usually belong in tracked files.
- Decide which facts are private local planning state. Agent task order, temporary decisions,
  progress ledgers, and local handoff state usually belong in `.agent`.
- Do not create a hidden-only source of truth for behavior that future maintainers must preserve.
- Do not assume ignored files are available to cloud agents, CI jobs, reviewers, or a fresh clone.
- Do not run cleanup commands that can delete ignored handoff files.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or edit tracked public handoff surfaces such as `AGENTS.md`, `spec/SPEC.md`, verification
  scripts, docs, tests, or templates when the user requests a durable repository setup.
- Create or edit private local handoff files such as `.agent/MANIFEST.yaml`, `.agent/PLAN.yaml`, and
  `.agent/STATE.yaml` when the current environment is allowed to hold private planning files.
- Add shared ignore rules only when the team should know and share the private path policy.
- Add local exclude or local hook guidance when the path should remain invisible to the public
  repository.
- Do not stage, commit, publish, summarize in public docs, or leak private handoff file contents
  unless the user explicitly asks.
- Do not modify `AGENTS.md`, ignore policy, public specs, or protected handoff paths while acting as
  Agent B unless the handoff explicitly permits a design revision.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the handoff mode.
   - Public spec and private plan: keep durable product behavior in tracked `spec/SPEC.md`; keep
     task order and progress in `.agent`.
   - Fully private local handoff: keep `AGENTS.md`, `SPEC.md`, plan, and state local; require a
     separate private backup or private repository if the work matters.
   - Remote Agent B: attach the private handoff, point B at a private accessible repository, or paste
     the needed handoff into the task context; do not assume local ignored files cross the boundary.
2. Create the smallest file set that can carry the contract.
   - `AGENTS.md`: reusable implementation-agent rules only, not project feature plans.
   - `spec/SPEC.md`: observable product behavior, non-goals, contracts, failure behavior,
     concurrency, security, edge cases, acceptance criteria, and definition of done.
   - `.agent/MANIFEST.yaml`: handoff status, spec version, plan version, read order, authority map,
     ownership, protected paths, final verification, and completion rules.
   - `.agent/PLAN.yaml`: Agent A-owned task list with dependencies, requirement IDs, acceptance IDs,
     allowed paths, forbidden paths, deliverables, and verification requirements.
   - `.agent/STATE.yaml`: Agent B-owned progress ledger with task states, changed files, tests,
     verification runs, acceptance evidence, blockers, deviations, and final verification.
3. Keep planning and progress separate.
   - Do not put mutable status fields in `PLAN.yaml`.
   - Do not let `STATE.yaml` override `SPEC.md` or `PLAN.yaml`.
   - Allow only `pending`, `in_progress`, `blocked`, and `verified` task states unless the user
     explicitly extends the state machine.
4. Write the Agent B startup gate.
   - Read `AGENTS.md`.
   - Check whether the private manifest exists.
   - Read every path in `read_order`.
   - Confirm handoff status is `approved`.
   - Confirm unresolved questions are empty.
   - Confirm manifest, plan, and state versions match.
   - Identify the first pending task whose dependencies are verified.
   - Report that task's requirement IDs, acceptance IDs, allowed paths, forbidden paths, and
     verification expectations before editing.
5. Write the authority and ownership rules.
   - `spec/SPEC.md` owns required product behavior.
   - `.agent/PLAN.yaml` owns implementation order and task boundaries.
   - `.agent/STATE.yaml` records evidence but does not change the design.
   - Agent A owns spec, manifest, and plan.
   - Agent B owns state, allowed production code, allowed tests, and allowed migrations for the
     current task.
6. Write the Agent B execution gate.
   - Work on exactly one task.
   - Do not start a task until all dependencies are `verified`.
   - Mark the task `in_progress` before changing files.
   - Stay inside the task's `allowed_paths`.
   - Implement production code and tests together.
   - Run the task's declared verification through the repository command contract when one exists.
   - Record changed files, tests, verification results, and acceptance evidence.
   - Mark the task `verified` only after required verification succeeds.
7. Write the blocker and deviation rules.
   - If `SPEC.md`, `MANIFEST.yaml`, `PLAN.yaml`, and current code conflict, do not guess.
   - Record a blocker in `STATE.yaml` with requirement IDs, task ID, affected paths, and open
     status.
   - Record every design deviation with reason, impact, and approval status.
   - Treat unapproved deviations as incomplete work.
8. Choose the private-file protection mechanism.
   - Use shared `.gitignore` only when every clone should ignore `.agent`.
   - Use `.git/info/exclude` when the private path should remain a local-only convention with no
     public trace.
   - If `.agent` is important, recommend a separate private repository or private backup for that
     folder; ignored files have no public repository history.
   - Require evidence that `.agent` files are ignored or excluded and not tracked before completion.
   - Warn that ignored files can still be force-added and can be deleted by cleanup commands that
     remove ignored files.
9. Add a completion gate.
   - Every plan task is `verified`.
   - Every acceptance criterion maps to source files and test files.
   - The final verification command exits with the required status.
   - No open blocker remains.
   - No unapproved deviation remains.
   - No private `.agent` file is tracked or staged in the public repository.
10. Review the handoff for common failure modes.
    - Hidden-only product behavior.
    - Version numbers that do not change when Agent A revises the design.
    - `allowed_paths` so broad that Agent B can rewrite the whole repository.
    - Verification commands copied from external advice instead of mapped to the repository command
      contract.
    - Private local files expected by a remote agent.
    - Progress state mixed into the immutable plan.
    - Ignored files with no backup.

<!-- mustflow-section: postconditions -->
## Postconditions

- Public product behavior is separated from private agent planning state.
- Agent A and Agent B ownership boundaries are explicit.
- Agent B can identify the next executable task without inventing missing decisions.
- Private handoff files are protected from accidental public tracking according to the selected
  privacy mode.
- The handoff names its remote-agent limitation when private local files are not automatically
  transferred.
- Completion requires task verification, acceptance traceability, blocker/deviation closure, and
  private-file tracking checks.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `mustflow_check`

When adding this handoff to a mustflow template or package surface, also use the relevant configured
template, docs, package, or release checks.

For downstream repositories, map any final verification command named in the handoff to that
repository's command contract. If no configured command exists, record the verification as missing
or manual instead of inventing a runnable command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the user wants all design material hidden, warn that future maintainers and remote agents will
  not see the design unless it is separately attached or privately stored.
- If product behavior appears only in `.agent`, either move the public behavior contract to a
  tracked spec or report the hidden-source-of-truth risk.
- If Agent B cannot access `.agent`, downgrade the handoff to explicit user instructions or require
  an attachment/private remote before implementation.
- If ignore or exclude policy is unclear, choose no public ignore edit and report the local exclude
  option rather than leaking private-path conventions into the repository.
- If a private handoff file is already tracked, report that ignore rules do not untrack existing
  files and require an explicit untracking or history-cleanup decision before claiming privacy.
- If version numbers disagree, stop implementation and request or record an Agent A handoff refresh.

<!-- mustflow-section: output-format -->
## Output Format

- Handoff mode selected
- Public tracked contract files
- Private local handoff files
- Agent A and Agent B ownership
- Startup gate and next-task gate
- Ignore or exclude protection decision
- Remote-agent transfer limitation
- Verification and completion gates
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining privacy, authority, or handoff risks
