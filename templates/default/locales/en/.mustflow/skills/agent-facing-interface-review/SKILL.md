---
mustflow_doc: skill.agent-facing-interface-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: agent-facing-interface-review
description: Apply this skill when a CLI, REST or HTTP API, SDK, or command surface must be discoverable, invocable, and monitorable by AI agents, coding agents, or automation, and review is needed for capability or discovery endpoints, machine-readable self-description, stable feature ids, input and output contract schemas, side-effect metadata, executable examples, capability checks, task-oriented command indexes, unified command grammar, structured argument constraints, single-source documentation generation, agent output modes, next-command error suggestions, confirmation tokens and plan-bound mutations for risky work, or acceptance-path latency budgets for jobs that agents submit, track, and inspect.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-facing-interface-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Agent-Facing Interface Review

<!-- mustflow-section: purpose -->
## Purpose

Review CLI and API surfaces as self-describing, machine-readable interfaces that AI agents can
discover, invoke, and monitor without reading human help — not as human-only UIs with automation
bolted on afterwards.

The review question is not "is the help text clear?" It is "can an agent that has never seen this
product find every feature, learn its exact input and output contract, know what side effects it
causes, get a runnable example, verify it is supported in this environment, and track the job it
started — all through stable machine-readable interfaces and bounded acceptance latency?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports a capabilities or discovery endpoint, feature registry,
  machine-readable help, feature ids, input or output contract schemas, side-effect metadata,
  executable examples, capability checks, task-oriented command indexes, unified command grammar,
  structured argument constraints, single-source documentation generation, agent output modes,
  next-command error suggestions, or acceptance-path latency budgets.
- A CLI, REST or HTTP API, SDK, or command surface must be discoverable and drivable by AI agents,
  coding agents, or automation that learn features at runtime instead of reading human docs.
- A review needs proof that an agent can find a feature, invoke it correctly on the first attempt,
  and monitor the resulting job without trial and error or prose interpretation.
- A change claims that a CLI or API is agent-friendly, self-describing, automation-ready, or
  discoverable.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only option or argument semantics, parser rules, defaults, or config precedence; use
  `cli-option-contract-review`.
- The task is only stdout, stderr, JSON fields, exit codes, or human help wording without a new
  agent-facing discovery or output-mode contract; use `cli-output-contract-review` or
  `public-json-contract-change`.
- The task is only HTTP method choices, safe or idempotent or cacheable claims, status codes, or
  conditional requests; use `http-api-semantics-review`.
- The task is only general caller ergonomics or misuse resistance without an AI-agent discovery or
  self-description boundary; use `api-misuse-resistance-review`.
- The task is only per-request latency of API handlers without an acceptance-path or first-event
  budget; use `api-request-performance-review`.
- The task is only LLM response latency such as time to first token or model round trips; use
  `llm-response-latency-review`.
- The task is only agent runtime tool-call gates, approval flows, or executor control; use
  `agent-execution-control-review`.
- The task asks for live probing, credential guessing, or penetration-testing traffic against a
  production interface. Stay within defensive local review and tests.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Discovery-surface ledger: the capabilities endpoint, describe command, feature registry, or other
  single entrypoint agents use to find features.
- Feature-registry ledger: feature ids, display names, aliases, one-line purposes, search keywords,
  and which features exist per version, plugin, platform, or account role.
- Contract-source ledger: the schema, option registry, or command model from which parser, help,
  docs, validators, and completions are generated, and where it lives.
- Side-effect ledger: read-only, side-effect, destructive, reversible, confirmation-required, and
  idempotent attributes per feature, plus expected change targets and reversibility for payment,
  deletion, deployment, and permission commands.
- Example ledger: structured success and failure examples with argument objects, expected output,
  and preconditions.
- Capability-check ledger: how agents verify current-environment support, the unsupported reason,
  and replacement feature ids.
- Command-index and grammar ledger: task phrases, synonyms, resource-action grammar rules, and
  resource-id argument conventions.
- Error-suggestion ledger: stable error codes, expected and actual values, allowed values, wrong
  locations, and corrected-command candidates.
- Output-mode ledger: agent output mode, JSON stability, field ordering, stderr separation, and
  non-interactive behavior.
- Acceptance-path ledger: accept, status-lookup, and first-event latency budgets; durable
  record-before-accept behavior; status store; streaming first response; and cached auth or routing.
- Existing tests, API docs, generated clients, fixtures, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing discovery, contract, side-effect, example, capability,
  grammar, error, output-mode, or acceptance-path evidence can be reported without guessing.
- Agents are treated as first-class consumers with their own search cost and latency budget, not as
  humans who happen to use a terminal.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten a single discovery entrypoint, feature ids, machine-readable contracts, side-effect
  metadata, executable examples, capability checks, task-oriented indexes, unified grammar,
  structured constraints, single-source generation, agent output modes, next-command error
  suggestions, and acceptance-path latency budgets, plus directly synchronized documentation or
  templates owned by the selected boundary.
- Update CLI and API docs, generated clients, examples, tests, and template surfaces that describe
  the same interface contract.
- Do not add raw schema-diff tooling, new command authority, or unconfigured verification surfaces
  under this skill.
- Do not include secret values, raw credentials, or private environment values in discovery payloads,
  examples, or capability-check responses.

<!-- mustflow-section: procedure -->
## Procedure

1. Provide one discovery entrypoint for every feature.
   - CLI: `app describe --json`; API: `GET /capabilities`. Return feature id, purpose, input
     format, output format, required permissions, expected latency, state-change flag, and
     asynchronous-execution flag — not just command names. Do not make agents wander through
     multiple help pages and docs.
2. Separate human display names from stable feature ids.
   - `Generate report` may change anytime; `report.generate.v1` must stay stable. Agents remember
     and reuse features by id, not by prose. When a command is renamed, keep the old id and aliases
     so prompts and automation do not break at once.
3. Split the feature list from the feature detail.
   - First discovery returns id, one-line purpose, and search keywords only. When the agent selects
     a feature, return the full spec via `app describe <feature-id> --json` or
     `GET /capabilities/<feature-id>`. Discovery cost must stay nearly flat as the feature count
     grows into the hundreds.
4. Machine-encode input and output contracts before writing prose.
   - Inputs use JSON Schema, APIs use OpenAPI, and CLIs use an argument spec generated from the
     same internal schema. Encode required, defaults, allowed ranges, enums, mutually exclusive
     arguments, and conditional requirements such as `delimiter` being allowed only when
     `format = "csv"`. Natural-language-only contracts make agents fail deterministically.
5. Declare what each feature changes.
   - Attach `read_only`, `side_effect`, `destructive`, `reversible`, `requires_confirmation`, and
     `idempotent` attributes per feature. Agents cannot reliably tell read features from deletion
     features by description alone. Payment, deletion, deployment, and permission commands must also
     include the expected change targets and whether the change can be rolled back.
6. Provide examples as executable data, not decorative strings.
   - Return structured argument objects, expected output, and preconditions alongside CLI example
     strings so agents can transform examples into new commands. Include representative failure
     examples such as missing required values, conflicting arguments, and nonexistent resources to
     speed up error correction.
7. Let agents check support instead of guessing it.
   - Provide `app capabilities check <feature-id> --json` or an equivalent per-environment check.
     The response must include whether the feature is supported, the reason it is unavailable
     (version, plugin, OS, or account permission), and a replacement feature id. Missing support
     checks are the main cause of agents inventing nonexistent features.
8. Build a task-oriented command index, not a table of contents.
   - Agents search by the work they need to do: "create project", "search user", "cancel deploy",
     "view logs". Connect task phrases to command ids and include synonyms such as `remove`,
     `delete`, `purge`, `삭제`, and `제거` as search keywords.
9. Return one command's complete usage in a single call.
   - `app help deploy.create --json` must return positional and option arguments, types, defaults,
     enums, repeatability, conflict conditions, environment-variable mappings, and output format in
     one object. Do not force agents to read top-level help, sub-help, separate docs, and example
     pages in sequence.
10. Unify command grammar without exceptions.
    - Use one rule such as `app <resource> <action>` across all commands, and keep resource-id
      arguments consistent (`--id` or a positional id, never a mix). Exceptions force agents to
      guess syntax.
11. Make error responses suggest the next command.
    - Error responses need a stable error code, the actual input value, the expected type, the
      allowed values, the wrong location, and a corrected command candidate. An unknown
      `--output-type` should immediately suggest the nearest `--output-format` and its allowed
      values instead of printing `invalid argument`.
12. Structure constraints instead of writing long prose.
    - Express argument relationships as schema fields: `conflicts_with`, `requires`, and `one_of`.
      Agents err on relationships between arguments far more often than on feature purpose. Ten
      prose lines are less reliable than three constraint fields.
13. Generate docs and implementation from the same source.
    - Derive CLI parser, help text, web docs, OpenAPI, validators, and completions from one command
      schema so implementation and documentation cannot drift. Options removed from the parser must
      disappear from docs, and new required arguments must appear in agent-facing descriptions.
14. Provide a dedicated agent output mode.
    - Do not make agents combine `--json`, `--quiet`, `--no-progress`, and `--no-color` manually.
      Provide one `--agent` flag that enables stable JSON output, fixed field ordering, stderr
      separation, and non-interactive execution. Treating the agent path as an accessory of the
      human UI keeps breaking it.
15. Define the 500ms goal as acceptance-path latency, not completion time.
    - Video conversion or large analysis will not finish in 500ms. Split the budget: acceptance
      about 150ms, status lookup about 100ms, first progress event within 500ms. Budgets must be
      per stage so bottlenecks are findable.
16. Record only on the acceptance path; never do the work there.
    - Validate, authorize, save the job record, and enqueue, then let a worker execute. Never return
      `accepted` before the record is durable: tie the database job record and the queue event in one
      transaction or use a transactional outbox so an accepted job cannot vanish on server failure.
17. Do not spawn a process or runtime per invocation.
    - Reinitializing Node, re-scanning config, and loading every plugin per command blows past 500ms.
      Use a local daemon, long-lived backend, or pre-warmed worker pool with the CLI as a thin RPC
      client, and reuse heavyweight SDK, TLS, and database initialization instead of creating it per
      request.
18. Keep a status-only store and path separate from work data.
    - Status lookups must not join the large job and log tables. Maintain a small record with the
      latest state (`queued`, `running`, `progress`, `completed`, `failed`) for single-key lookup,
      and split detailed logs and results into separate calls.
19. Stream the first response separately from the final result.
    - The first response does not need the finished output. Send job id, validated input summary,
      selected executor, current queue position, and next check time first, then continue with
      progress. Use SSE or chunked responses over HTTP and JSON Lines in CLIs.
20. Cache authentication and routing on the acceptance path.
    - Do not call an external auth server or read tenant settings and permission policies from
      several databases per request. Verify signatures locally, cache public keys, tenant settings,
      feature permissions, and worker routing briefly, and use cache-version or policy-generation
      numbers so permission changes invalidate stale results immediately.
21. Enforce latency budgets on p95 and p99, not averages.
    - A 120ms average with intermittent 3s spikes is unsuitable for agent automation. Set per-stage
      budgets for auth, validation, DB storage, queue registration, and response serialization and
      measure p50, p95, and p99 separately. Record DNS lookup, first TLS handshake, cold start, lock
      contention, and queue backpressure separately, and show which stage exceeded its budget instead
      of reporting only slowness.
22. Replace interactive confirmation with explicit confirmation tokens for risky work.
    - Agents cannot answer `continue?` mid-run. Every question must be pre-answerable through an
      argument, environment variable, input file, or stdin. For destructive work, do not accept a
      bare `yes`; require a confirmation token that names the target and expected change, for
      example the hash of a previously reviewed delete plan, so a stale confirmation cannot be
      replayed against a different resource.
23. Bind mutation to stable resource ids and reviewed plans.
    - Humans use names such as `production` or `recent project`; agent automation must not guess
      among duplicates or context. Require a stable resource id for mutations and allow name search
      only during discovery, freezing the resolved id before the change. For plan-and-apply flows,
      make apply require the plan id or plan hash so what was reviewed is exactly what executes.

<!-- mustflow-section: postconditions -->
## Postconditions

- A single discovery entrypoint, stable feature ids, list-detail split, machine contracts,
  side-effect metadata, executable examples, capability checks, task-oriented index, one-call
  command specs, unified grammar, next-command error suggestions, structured constraints,
  single-source generation, agent output mode, and acceptance-path latency budgets are explicit.
- Help-text-only discovery, name-only contracts, prose-only constraints, unbounded discovery cost,
  human formatting in agent output, non-durable `accepted`, per-invocation runtimes, joined status
  lookups, non-streamed first response, uncached auth or routing, average-only latency claims,
  bare-`yes` confirmation, and name-bound mutations are fixed or reported.
- Agent-facing interface claims are backed by configured tests, contract evidence, or labeled as
  manual-only or missing.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured tests that prove discovery-entrypoint completeness, feature-id
stability, conditional contract validation, side-effect metadata, capability-check behavior, agent
output-mode stability, next-command error suggestions, acceptance-path durability, status-store
lookup, streamed first response, cached auth or routing, and p95 or p99 latency budgets.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If discovery, contract, side-effect, example, capability, grammar, error, output-mode, or
  acceptance-path evidence is missing, report the gap instead of claiming the interface is
  agent-friendly.
- If agent output mixes ANSI color, progress animation, table padding, or volatile wording, fix or
  report it as an agent-path contract break before other work.
- If `accepted` can be returned before the job record and queue event are durable, fix or report the
  durability window as a defect.
- If latency is measured only as an average, report the missing p95 and p99 evidence and name the
  stages without budgets.
- If the change is primarily option semantics, output contracts, HTTP semantics, caller ergonomics,
  per-request latency, or LLM latency, route to the matching skill listed in Do Not Use When.
- If a real secret appears in discovery payloads, examples, fixtures, logs, or reports, stop
  repeating it and use `secret-exposure-response`.

<!-- mustflow-section: output-format -->
## Output Format

- Agent-facing interface reviewed
- Discovery entrypoint, feature ids, and list-detail split findings
- Machine contract and single-source generation findings
- Side-effect metadata and executable example findings
- Capability-check and task-oriented index findings
- Command grammar, constraint, error-suggestion, and agent output-mode findings
- Acceptance-path, status-store, streaming, caching, and latency-budget findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining agent-facing interface risk
