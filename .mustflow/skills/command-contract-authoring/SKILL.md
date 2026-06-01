---
mustflow_doc: skill.command-contract-authoring
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: command-contract-authoring
description: Apply this skill when creating, editing, reviewing, or removing `.mustflow/config/commands.toml` command intents, resources, effects, timeouts, output limits, environment policies, lifecycle values, run policies, command-selection metadata, CI/CD reproducibility surfaces, deployment handoffs, migration checks, health checks, smoke checks, or dashboard-hidden command behavior.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.command-contract-authoring
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Command Contract Authoring

<!-- mustflow-section: purpose -->
## Purpose

Keep `.mustflow/config/commands.toml` as the only runnable command-authority surface, with explicit intent boundaries, side effects, and verification meaning.

<!-- mustflow-section: use-when -->
## Use When

- A command intent, resource, effect, lock, lifecycle, run policy, timeout, output limit, environment policy, success code, or command selection hint is added, changed, removed, reviewed, or reported.
- A user asks to make a test, build, lint, release, publish, deploy, benchmark, browser, watcher, server, or external tool runnable through mustflow.
- CI/CD, deployment, migration, rollback, health-check, smoke-test, or platform handoff behavior is described as a button, dashboard setting, remembered local command, or provider-specific hidden configuration.
- A command is mentioned in docs, skills, templates, tests, or final reports as if an agent may run it.
- A missing, blocked, manual-only, unknown, unsafe, long-running, or inferred command path needs to be represented safely.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only runs an already configured command intent without changing the contract.
- The task changes application code and only needs to choose verification; use `diff-risk-review` or the narrower behavior skill.
- A command-like example is documentation-only and explicitly not a runnable project command.
- The requested command would grant broad automation authority without a bounded one-shot contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The intended command goal and whether it is verification, generation, release, diagnostics, migration, or a user-requested manual action.
- Current `.mustflow/config/commands.toml`, relevant workflow docs, affected tests, and any template command contract copies.
- Expected reads, writes, generated outputs, locks, network use, destructive behavior, timeout, output volume, environment needs, and stdin behavior.
- CI/CD or deployment reproducibility needs, including which build, test, migration, health, smoke, rollback, and deploy-adjacent steps must be represented as repository-owned command intents, manual-only actions, unknown capabilities, or documentation-only procedures.
- Dashboard dependency, including whether a platform stores build commands, environment variables, domains, scheduled jobs, routes, runtime version, regions, worker settings, or rollback behavior outside the repository.
- Whether the intent should be `configured`, `manual_only`, `unknown`, or omitted.
- Relevant verification command-intent entries for contract validation, docs, release-sensitive template output, and changed-file status.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and current command-authority rules have been checked.
- Missing command information can be represented as `unknown` or `manual_only` instead of guessed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update `.mustflow/config/commands.toml`, template command contracts, route descriptions, tests, and directly synchronized docs needed for the command contract.
- Add or tighten resource locks, declared effects, timeouts, output limits, stdin policy, environment policy, success codes, and selection metadata.
- Do not infer command authority from package-manager scripts, README snippets, Makefiles, local binaries, or user habits.
- Do not mark a long-running server, watcher, interactive prompt, deploy, publish, or destructive operation as agent-runnable without an explicit repository policy and safe one-shot wrapper.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the intent: read-only diagnostic, verification, build or generated output, migration, release or publish, dashboard or browser flow, long-running server, destructive action, or unknown capability.
2. Decide whether the command belongs in the contract. Prefer `manual_only` or `unknown` when the command needs human judgment, credentials, a server, a watcher, broad network access, or unbounded side effects.
3. For CI/CD and platform portability, distinguish execution from authority. A hosted platform button may trigger the process, but the repository should still name the build, test, migration, health-check, smoke-check, environment, and rollback expectations as command intents, manual-only entries, unknown capabilities, or operations docs.
4. Define the narrowest stable intent name and description. The description should explain the command purpose, not instruct an agent to bypass policy.
5. Declare lifecycle, run policy, stdin, timeout, success codes, output limit, working directory, network and destructive flags, and environment policy explicitly.
6. Model side effects before execution. Use resources and effects for generated output, writes, deletes, exclusive locks, shared reads, and non-overlap requirements.
7. Check long-running and background risks. If the operation starts a server, watcher, browser, queue worker, or daemon, require a bounded wrapper that starts, tests, and stops within one configured one-shot intent, or leave it unavailable.
8. Check environment exposure. Prefer minimal or allowlisted environment values; do not pass tokens, cloud credentials, or user secrets by default. If a command depends on environment variables, ensure the contract or synchronized docs identify the variable names and validation boundary without storing values.
9. Keep command selection metadata non-authoritative. `required_after`, coverage hints, cost hints, and verification preferences may guide choice, but only configured eligible intents can be run.
10. Synchronize all surfaces that name the intent: skills, workflow docs, templates, tests, public docs, operations docs, and schema fixtures.
11. Verify with the narrowest configured command intents that validate contract syntax, template output, release-sensitive package contents, and changed-file status.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every runnable intent is configured, one-shot, agent-allowed, closed-stdin, bounded by timeout and output limits, and explicit about side effects.
- Manual-only and unknown capabilities are visible without granting permission.
- Build, test, migration, health-check, smoke-check, deployment handoff, and rollback expectations are not hidden only in dashboard memory when they affect reproducibility.
- The final report names any missing, manual-only, or intentionally unavailable command path.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use narrower related tests when the command contract is covered by a specific test file.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If command validation fails, fix the contract before changing unrelated files.
- If the command cannot be bounded safely, mark it `manual_only` or `unknown` and report the missing safe wrapper.
- If a command requires secrets, external credentials, network access, or destructive writes, fail closed unless the repository already has a policy and a configured safe intent.
- If docs or skills mention a command that is not configured, rewrite the mention as unavailable or manual-only instead of implying agent authority.

<!-- mustflow-section: output-format -->
## Output Format

- Command intents or resources changed
- Authority decision: configured, manual-only, unknown, omitted, or deferred
- Side effects, locks, timeout, output, stdin, environment, network, and destructive boundaries
- CI/CD reproducibility, dashboard dependency, health-check, smoke-check, migration, deployment handoff, and rollback boundaries
- Synchronized docs, tests, templates, and schemas
- Command intents run
- Skipped checks and reasons
- Remaining command-contract risk
