---
mustflow_doc: repo-map
lifecycle: generated
generated_by: mustflow
relative_root: "."
source_policy: anchors_only
privacy_mode: minimal
anchor_count: 260
degraded: false
git_ls_files_status: ok
source_fingerprint: "sha256:5e5e4e779b2d6e27e9b699fa90cb9359c78be14619e2ecb8e4f4be7899d55417"
---

# REPO_MAP.md

This file is an agent navigation map for the current mustflow root. It is not a full file listing.
Regenerate it with `mf map --write` instead of editing it by hand.

## How To Use

- Start with `AGENTS.md` and the mustflow files listed in Priority Anchors.
- Use Directory Anchors to find local rules, guides, scaffold routers, package manifests, and command adapters.
- Use `git ls-files` or your editor when you need the complete file list.

## Priority Anchors

- `AGENTS.md`: Root agent operating rules. Read this before changing files.
- `.mustflow/docs/agent-workflow.md`: Shared workflow policy for agent work.
- `.mustflow/config/mustflow.toml`: Mustflow read order, authority, document roots, and protected paths.
- `.mustflow/config/commands.toml`: Command intent contract. Check this before running project commands.
- `.mustflow/config/preferences.toml`: Repository-level agent preferences. Treat them as defaults below user instructions and local style.
- `.mustflow/skills/router.toml`: Stable compact skill-routing kernel for prompt-cache-friendly first-pass selection.
- `.mustflow/context/INDEX.md`: Task-specific project context router. Read only when context is needed.
- `.mustflow/skills/routes.toml`: Full skill-routing metadata for detailed procedure selection.
- `.mustflow/skills/INDEX.md`: Expanded route table for detailed skill selection and route maintenance.

## Directory Anchors

### /

- `.gitattributes`: Git text, binary, and line-ending policy. Check before normalizing files.
- `ARCHITECTURE.md`: Optional system structure, module boundaries, and architectural decisions.
- `CHANGELOG.md`: Optional release history and user-visible change log.
- `CONTRIBUTING.md`: Optional contribution workflow and pull request guidance.
- `package.json`: Node.js package manifest, binary entry points, and package scripts.
- `README.md`: Human-facing project overview. Use it as context, not as agent policy.
- `REPO_FLOW.md`: Generated design-flow map. Use it to understand how work moves through the root.
- `ROADMAP.md`: Optional project planning, priority, milestone, and non-goal context.
- `SECURITY.md`: Optional security policy, vulnerability reporting, and sensitive-change guidance.
- `tsconfig.json`: TypeScript compiler configuration.

### .mustflow/context/

- `.mustflow/context/PROJECT.md`: Project goals, non-goals, terms, and repository-wide promises for agents.

### .mustflow/skills/abstraction-boundary-review/

- `.mustflow/skills/abstraction-boundary-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ada-code-change/

- `.mustflow/skills/ada-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/adapter-boundary/

- `.mustflow/skills/adapter-boundary/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/admin-control-plane-safety-review/

- `.mustflow/skills/admin-control-plane-safety-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/agent-eval-integrity-review/

- `.mustflow/skills/agent-eval-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/agent-execution-control-review/

- `.mustflow/skills/agent-execution-control-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ai-generated-code-hardening/

- `.mustflow/skills/ai-generated-code-hardening/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ai-product-readiness-review/

- `.mustflow/skills/ai-product-readiness-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/api-access-control-review/

- `.mustflow/skills/api-access-control-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/api-contract-change/

- `.mustflow/skills/api-contract-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/api-failure-triage/

- `.mustflow/skills/api-failure-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/api-misuse-resistance-review/

- `.mustflow/skills/api-misuse-resistance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/api-request-performance-review/

- `.mustflow/skills/api-request-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/app-startup-performance-review/

- `.mustflow/skills/app-startup-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/architecture-deepening-review/

- `.mustflow/skills/architecture-deepening-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/artifact-integrity-check/

- `.mustflow/skills/artifact-integrity-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/astro-code-change/

- `.mustflow/skills/astro-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/async-timing-boundary-review/

- `.mustflow/skills/async-timing-boundary-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/auth-flow-triage/

- `.mustflow/skills/auth-flow-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/auth-permission-change/

- `.mustflow/skills/auth-permission-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/axum-code-change/

- `.mustflow/skills/axum-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/babylon-code-change/

- `.mustflow/skills/babylon-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/backend-log-evidence-review/

- `.mustflow/skills/backend-log-evidence-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/backend-reliability-change/

- `.mustflow/skills/backend-reliability-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/behavior-preserving-refactor/

- `.mustflow/skills/behavior-preserving-refactor/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/browser-automation-reliability-review/

- `.mustflow/skills/browser-automation-reliability-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/bug-claim-evidence-gate/

- `.mustflow/skills/bug-claim-evidence-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/bun-code-change/

- `.mustflow/skills/bun-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/business-rule-leakage-review/

- `.mustflow/skills/business-rule-leakage-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/c-code-change/

- `.mustflow/skills/c-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cache-integrity-review/

- `.mustflow/skills/cache-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/change-blast-radius-review/

- `.mustflow/skills/change-blast-radius-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ci-pipeline-triage/

- `.mustflow/skills/ci-pipeline-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/clarifying-question-gate/

- `.mustflow/skills/clarifying-question-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cli-option-contract-review/

- `.mustflow/skills/cli-option-contract-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cli-output-contract-review/

- `.mustflow/skills/cli-output-contract-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/clickhouse-code-change/

- `.mustflow/skills/clickhouse-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/client-bundle-pruning-review/

- `.mustflow/skills/client-bundle-pruning-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cloud-cost-guardrail-review/

- `.mustflow/skills/cloud-cost-guardrail-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/code-review/

- `.mustflow/skills/code-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/codebase-orientation/

- `.mustflow/skills/codebase-orientation/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/command-contract-authoring/

- `.mustflow/skills/command-contract-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/command-intent-mapping-gate/

- `.mustflow/skills/command-intent-mapping-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/command-pattern/

- `.mustflow/skills/command-pattern/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/completion-evidence-gate/

- `.mustflow/skills/completion-evidence-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/complex-decision-analysis/

- `.mustflow/skills/complex-decision-analysis/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/composition-over-inheritance/

- `.mustflow/skills/composition-over-inheritance/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/concurrency-invariant-review/

- `.mustflow/skills/concurrency-invariant-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/config-env-change/

- `.mustflow/skills/config-env-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/contract-sync-check/

- `.mustflow/skills/contract-sync-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/core-web-vitals-field-review/

- `.mustflow/skills/core-web-vitals-field-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cpp-code-change/

- `.mustflow/skills/cpp-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/credit-ledger-integrity-review/

- `.mustflow/skills/credit-ledger-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cross-agent-session-reference/

- `.mustflow/skills/cross-agent-session-reference/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/cross-platform-filesystem-safety/

- `.mustflow/skills/cross-platform-filesystem-safety/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/css-code-change/

- `.mustflow/skills/css-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/dart-code-change/

- `.mustflow/skills/dart-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/database-change-safety/

- `.mustflow/skills/database-change-safety/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/database-json-modeling-review/

- `.mustflow/skills/database-json-modeling-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/database-lock-contention-review/

- `.mustflow/skills/database-lock-contention-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/database-migration-change/

- `.mustflow/skills/database-migration-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/database-query-bottleneck-review/

- `.mustflow/skills/database-query-bottleneck-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/date-number-audit/

- `.mustflow/skills/date-number-audit/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/deletion-lifecycle-review/

- `.mustflow/skills/deletion-lifecycle-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/deno-code-change/

- `.mustflow/skills/deno-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/dependency-injection/

- `.mustflow/skills/dependency-injection/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/dependency-reality-check/

- `.mustflow/skills/dependency-reality-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/dependency-upgrade-review/

- `.mustflow/skills/dependency-upgrade-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/deployment-rollout-safety-review/

- `.mustflow/skills/deployment-rollout-safety-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/design-implementation-handoff/

- `.mustflow/skills/design-implementation-handoff/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/desktop-auto-update-safety-review/

- `.mustflow/skills/desktop-auto-update-safety-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/desktop-background-process-stability-review/

- `.mustflow/skills/desktop-background-process-stability-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/desktop-memory-footprint-review/

- `.mustflow/skills/desktop-memory-footprint-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/diff-risk-review/

- `.mustflow/skills/diff-risk-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/docker-code-change/

- `.mustflow/skills/docker-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/docker-runtime-triage/

- `.mustflow/skills/docker-runtime-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/docs-prose-review/

- `.mustflow/skills/docs-prose-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/docs-update/

- `.mustflow/skills/docs-update/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/duckdb-code-change/

- `.mustflow/skills/duckdb-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/elysia-code-change/

- `.mustflow/skills/elysia-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/error-message-integrity-review/

- `.mustflow/skills/error-message-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/evidence-stall-breaker/

- `.mustflow/skills/evidence-stall-breaker/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/external-prompt-injection-defense/

- `.mustflow/skills/external-prompt-injection-defense/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/external-skill-intake/

- `.mustflow/skills/external-skill-intake/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/facade-pattern/

- `.mustflow/skills/facade-pattern/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/failure-integrity-review/

- `.mustflow/skills/failure-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/failure-triage/

- `.mustflow/skills/failure-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/file-path-cross-platform-change/

- `.mustflow/skills/file-path-cross-platform-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/file-upload-security-review/

- `.mustflow/skills/file-upload-security-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/flutter-code-change/

- `.mustflow/skills/flutter-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frame-render-performance-review/

- `.mustflow/skills/frame-render-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frontend-accessibility-tree-review/

- `.mustflow/skills/frontend-accessibility-tree-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frontend-component-library-review/

- `.mustflow/skills/frontend-component-library-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frontend-localization-review/

- `.mustflow/skills/frontend-localization-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frontend-render-stability/

- `.mustflow/skills/frontend-render-stability/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frontend-state-ownership-review/

- `.mustflow/skills/frontend-state-ownership-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/frontend-stress-layout-review/

- `.mustflow/skills/frontend-stress-layout-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/github-contribution-quality-gate/

- `.mustflow/skills/github-contribution-quality-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/go-code-change/

- `.mustflow/skills/go-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/godot-code-change/

- `.mustflow/skills/godot-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/hetzner-cloud-change/

- `.mustflow/skills/hetzner-cloud-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/heuristic-candidate-selection/

- `.mustflow/skills/heuristic-candidate-selection/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/hono-code-change/

- `.mustflow/skills/hono-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/hot-path-performance-review/

- `.mustflow/skills/hot-path-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/html-code-change/

- `.mustflow/skills/html-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/http-api-semantics-review/

- `.mustflow/skills/http-api-semantics-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/http-delivery-streaming/

- `.mustflow/skills/http-delivery-streaming/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/idea-triage/

- `.mustflow/skills/idea-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/idempotency-integrity-review/

- `.mustflow/skills/idempotency-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/image-delivery-performance-review/

- `.mustflow/skills/image-delivery-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/incident-triage-review/

- `.mustflow/skills/incident-triage-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/instruction-conflict-scope-check/

- `.mustflow/skills/instruction-conflict-scope-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/java-code-change/

- `.mustflow/skills/java-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/javascript-code-change/

- `.mustflow/skills/javascript-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/line-ending-hygiene/

- `.mustflow/skills/line-ending-hygiene/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/llm-hallucination-control-review/

- `.mustflow/skills/llm-hallucination-control-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/llm-response-latency-review/

- `.mustflow/skills/llm-response-latency-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/llm-service-ux-review/

- `.mustflow/skills/llm-service-ux-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/llm-token-cost-control-review/

- `.mustflow/skills/llm-token-cost-control-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/low-end-device-support-review/

- `.mustflow/skills/low-end-device-support-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/memory-lifetime-review/

- `.mustflow/skills/memory-lifetime-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/migration-safety-check/

- `.mustflow/skills/migration-safety-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/mobile-energy-efficiency-review/

- `.mustflow/skills/mobile-energy-efficiency-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/module-boundary-review/

- `.mustflow/skills/module-boundary-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/motion-system-contract-review/

- `.mustflow/skills/motion-system-contract-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/multi-agent-work-coordination/

- `.mustflow/skills/multi-agent-work-coordination/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/nestjs-code-change/

- `.mustflow/skills/nestjs-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/next-action-menu/

- `.mustflow/skills/next-action-menu/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/node-code-change/

- `.mustflow/skills/node-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/notification-delivery-integrity-review/

- `.mustflow/skills/notification-delivery-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/null-object-pattern/

- `.mustflow/skills/null-object-pattern/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/observability-debuggability-review/

- `.mustflow/skills/observability-debuggability-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/pascal-code-change/

- `.mustflow/skills/pascal-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/pattern-scout/

- `.mustflow/skills/pattern-scout/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/payment-integrity-review/

- `.mustflow/skills/payment-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/performance-budget-check/

- `.mustflow/skills/performance-budget-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/performance-measurement-integrity-review/

- `.mustflow/skills/performance-measurement-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/php-code-change/

- `.mustflow/skills/php-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/postgresql-code-change/

- `.mustflow/skills/postgresql-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/powershell-code-change/

- `.mustflow/skills/powershell-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/proactive-risk-surfacing/

- `.mustflow/skills/proactive-risk-surfacing/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/process-execution-safety/

- `.mustflow/skills/process-execution-safety/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/project-context-authoring/

- `.mustflow/skills/project-context-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/prompt-contract-quality-review/

- `.mustflow/skills/prompt-contract-quality-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/provenance-license-gate/

- `.mustflow/skills/provenance-license-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/public-json-contract-change/

- `.mustflow/skills/public-json-contract-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/pure-core-imperative-shell/

- `.mustflow/skills/pure-core-imperative-shell/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/python-code-change/

- `.mustflow/skills/python-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/quadratic-scan-review/

- `.mustflow/skills/quadratic-scan-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/quality-gaming-guard/

- `.mustflow/skills/quality-gaming-guard/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/queue-processing-integrity-review/

- `.mustflow/skills/queue-processing-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/race-condition-review/

- `.mustflow/skills/race-condition-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/rag-pipeline-triage/

- `.mustflow/skills/rag-pipeline-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/rate-limit-integrity-review/

- `.mustflow/skills/rate-limit-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/react-code-change/

- `.mustflow/skills/react-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/readme-authoring/

- `.mustflow/skills/readme-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/readme-evidence-gate/

- `.mustflow/skills/readme-evidence-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/release-notes-authoring/

- `.mustflow/skills/release-notes-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/release-publish-change/

- `.mustflow/skills/release-publish-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/repo-improvement-loop/

- `.mustflow/skills/repo-improvement-loop/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/repro-first-debug/

- `.mustflow/skills/repro-first-debug/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/requirement-regression-guard/

- `.mustflow/skills/requirement-regression-guard/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/restricted-handoff-resume/

- `.mustflow/skills/restricted-handoff-resume/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/result-option/

- `.mustflow/skills/result-option/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/retry-policy-integrity-review/

- `.mustflow/skills/retry-policy-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/runtime-target-selection/

- `.mustflow/skills/runtime-target-selection/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/rust-code-change/

- `.mustflow/skills/rust-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/search-ad-content-authoring/

- `.mustflow/skills/search-ad-content-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/search-index-integrity-review/

- `.mustflow/skills/search-index-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/secret-exposure-response/

- `.mustflow/skills/secret-exposure-response/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/security-flow-review/

- `.mustflow/skills/security-flow-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/security-privacy-review/

- `.mustflow/skills/security-privacy-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/security-regression-tests/

- `.mustflow/skills/security-regression-tests/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/service-boundary-architecture/

- `.mustflow/skills/service-boundary-architecture/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/shell-code-change/

- `.mustflow/skills/shell-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/skill-authoring/

- `.mustflow/skills/skill-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/skill-refresh/

- `.mustflow/skills/skill-refresh/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/small-service-platform-architecture-review/

- `.mustflow/skills/small-service-platform-architecture-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/source-anchor-authoring/

- `.mustflow/skills/source-anchor-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/source-freshness-check/

- `.mustflow/skills/source-freshness-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/split-refactor-residual-path-review/

- `.mustflow/skills/split-refactor-residual-path-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/sqlite-code-change/

- `.mustflow/skills/sqlite-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/state-machine-pattern/

- `.mustflow/skills/state-machine-pattern/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/strategy-pattern/

- `.mustflow/skills/strategy-pattern/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/structure-discovery-gate/

- `.mustflow/skills/structure-discovery-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/structure-first-engineering/

- `.mustflow/skills/structure-first-engineering/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/structured-config-change/

- `.mustflow/skills/structured-config-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/support-surface-advisor/

- `.mustflow/skills/support-surface-advisor/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/svelte-code-change/

- `.mustflow/skills/svelte-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/tailwind-code-change/

- `.mustflow/skills/tailwind-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/task-instruction-authoring/

- `.mustflow/skills/task-instruction-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/tauri-code-change/

- `.mustflow/skills/tauri-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/technology-stack-selection/

- `.mustflow/skills/technology-stack-selection/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/template-install-surface-sync/

- `.mustflow/skills/template-install-surface-sync/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/test-design-guard/

- `.mustflow/skills/test-design-guard/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/test-maintenance/

- `.mustflow/skills/test-maintenance/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/test-suite-performance-review/

- `.mustflow/skills/test-suite-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/testability-boundary-review/

- `.mustflow/skills/testability-boundary-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/third-party-api-integration-review/

- `.mustflow/skills/third-party-api-integration-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/threejs-code-change/

- `.mustflow/skills/threejs-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/transaction-boundary-integrity-review/

- `.mustflow/skills/transaction-boundary-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/type-state-modeling-review/

- `.mustflow/skills/type-state-modeling-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/typescript-code-change/

- `.mustflow/skills/typescript-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ui-quality-gate/

- `.mustflow/skills/ui-quality-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ui-state-resurrection-review/

- `.mustflow/skills/ui-state-resurrection-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/unocss-code-change/

- `.mustflow/skills/unocss-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/vector-search-integrity-review/

- `.mustflow/skills/vector-search-integrity-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/version-freshness-check/

- `.mustflow/skills/version-freshness-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/vertical-slice-tdd/

- `.mustflow/skills/vertical-slice-tdd/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/visual-review-artifact/

- `.mustflow/skills/visual-review-artifact/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/vite-code-change/

- `.mustflow/skills/vite-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/vue-code-change/

- `.mustflow/skills/vue-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/wails-code-change/

- `.mustflow/skills/wails-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/web-asset-optimization/

- `.mustflow/skills/web-asset-optimization/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/web-render-performance-review/

- `.mustflow/skills/web-render-performance-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/website-task-friction-review/

- `.mustflow/skills/website-task-friction-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/webview2-code-change/

- `.mustflow/skills/webview2-code-change/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/writing-elegance/

- `.mustflow/skills/writing-elegance/SKILL.md`: Procedural skill document for a repeatable agent task.

### docs-site/

- `docs-site/package.json`: Node.js package manifest for this directory.
- `docs-site/README.md`: Directory guide for this area.
- `docs-site/tsconfig.json`: TypeScript compiler configuration.

### docs-site/docs/i18n/

- `docs-site/docs/i18n/README.md`: Directory guide for this area.

### docs-site/src/config/

- `docs-site/src/config/README.md`: Directory guide for this area.

### docs-site/src/lib/

- `docs-site/src/lib/README.md`: Directory guide for this area.

### docs-site/src/styles/

- `docs-site/src/styles/README.md`: Directory guide for this area.

### docs/i18n/

- `docs/i18n/README.md`: Directory guide for this area.

### docs/i18n/es/

- `docs/i18n/es/README.md`: Directory guide for this area.

### docs/i18n/fr/

- `docs/i18n/fr/README.md`: Directory guide for this area.

### docs/i18n/hi/

- `docs/i18n/hi/README.md`: Directory guide for this area.

### docs/i18n/ko/

- `docs/i18n/ko/README.md`: Directory guide for this area.

### docs/i18n/zh/

- `docs/i18n/zh/README.md`: Directory guide for this area.

### docs/spec/

- `docs/spec/README.md`: Directory guide for this area.

### examples/

- `examples/README.md`: Directory guide for this area.

### examples/docs-only/

- `examples/docs-only/README.md`: Directory guide for this area.

### examples/host-instruction-conflicts/

- `examples/host-instruction-conflicts/README.md`: Directory guide for this area.

### examples/minimal-js/

- `examples/minimal-js/README.md`: Directory guide for this area.

### examples/missing-command-contracts/

- `examples/missing-command-contracts/README.md`: Directory guide for this area.

### examples/nested-repos/

- `examples/nested-repos/README.md`: Directory guide for this area.

### schemas/

- `schemas/README.md`: Directory guide for this area.

### tools/manifest-lock-accept/

- `tools/manifest-lock-accept/go.mod`: Go module definition and dependency boundary.

## Generated Files

- `REPO_MAP.md`: This generated navigation map. Do not treat it as a complete repository tree.

## Excluded Areas

- `.git/`
- `node_modules/`
- `dist/`, `build/`, and `coverage/`
- cache directories such as `.cache/`, `cache/`, and `.astro/`
