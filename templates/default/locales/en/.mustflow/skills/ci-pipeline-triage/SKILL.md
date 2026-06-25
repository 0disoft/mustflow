---
mustflow_doc: skill.ci-pipeline-triage
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: ci-pipeline-triage
description: Apply this skill when a CI/CD workflow, pipeline, job, runner, matrix, trigger, cache, artifact, deployment job, required check, or post-deploy verification is failing, skipped, queued, flaky, slow, green despite broken output, or not yet localized to trigger, runner, environment, build, test, artifact, deploy, or verification boundaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ci-pipeline-triage
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# CI Pipeline Triage

<!-- mustflow-section: purpose -->
## Purpose

Localize CI/CD failures by splitting trigger, runner, environment, build, test, artifact, deploy,
and verification boundaries before editing code or workflow files.

The first question is not "what is the last red log line?" It is "which pipeline boundary first
changed from the last known-good run, and what evidence would disprove each boundary hypothesis?"

<!-- mustflow-section: use-when -->
## Use When

- A CI workflow, pipeline, job, matrix, required check, runner, cache, artifact, deployment step, or
  smoke check fails, hangs, is skipped, is queued too long, passes while output is broken, or becomes
  flaky.
- A failure is not yet localized to trigger filters, workflow parsing, runner selection, environment
  setup, tool versions, dependency cache, build output, test isolation, artifact transfer,
  deployment permissions, rollout completion, or post-deploy verification.
- A pipeline suddenly breaks without application-code changes, or only fails on forks, protected
  branches, specific runners, specific regions, specific matrix entries, or reruns.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The failing command is a local configured intent and CI is not involved; use `failure-triage`.
- The deployment is already localized and the risk is rollout, rollback, probes, migrations, or
  runtime safety; use `deployment-rollout-safety-review`.
- The task is only test-suite speed after the CI boundary is known; use
  `test-suite-performance-review`.
- The task requires live production secrets, destructive deploys, cloud-console writes, or
  unconfigured remote commands. Preserve static evidence and report the manual boundary.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Failure classification: pipeline not created, queued, job failed, flaky rerun, succeeded with bad
  service output, deployment failed, or post-deploy verification failed.
- Run identity ledger: commit SHA, branch or tag, trigger event, workflow file revision, matrix
  entry, runner label and image, architecture, region, toolchain versions, package-manager version,
  execution time, and run or job id.
- Last-good comparison: last successful commit and first failing commit, including workflow files,
  lockfiles, base images, shared scripts, secrets or permission scopes, runner labels, cache keys,
  feature flags, deployment config, and required-check settings.
- Boundary ledger: trigger, parsed job graph, matrix expansion, queue time, runner assignment,
  checkout, environment variables, tool setup, dependency restore, build, tests, cache, artifacts,
  deploy, smoke, and final status aggregation.
- Evidence constraints: redaction needs for secrets, tokens, private URLs, environment values,
  debug logs, artifacts, and diagnostic files.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Required CI evidence is available, or missing evidence can be reported without guessing.
- Secrets and private data are summarized as presence, length, hash, key name, or permission scope;
  never copy raw secret values into logs, fixtures, docs, commits, or final reports.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten workflow triggers, path filters, matrix guards, version pinning, cache keys,
  artifact manifests, status aggregation, debug evidence collection, secret-safe diagnostics,
  timeout classification, runner labels, concurrency locks, environment validation, smoke checks,
  test isolation, docs, and focused fixtures.
- Add tests or docs that prove workflow contract behavior, package metadata, template output,
  release checks, artifact identity, or command-contract mapping when the repository owns those
  surfaces.
- Do not add broad reruns, `continue-on-error`, `allow_failure`, `|| true`, blanket cache wipes,
  floating `latest` references, unbounded debug logging, live deploy commands, or workflow rewrites
  before the failing boundary is localized.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the failure shape: not created, queued, job failed, flaky, green-but-bad-output,
   deployment failed, or verification failed.
2. Compare the last success with the first failure. Include workflow, lockfile, base image, shared
   script, secret scope, runner, matrix, cache, environment, feature flag, and deployment changes.
3. Preserve run identity before reruns overwrite the evidence. Record safe run id, commit, trigger,
   runner, matrix, tool versions, queue time, start time, and artifact identity.
4. Rerun only to test determinism. If the same commit and inputs produce different outcomes, treat
   cache, time, order, network, shared resources, or runner state as first-class suspects.
5. Check trigger and graph before job logs. Path filters, branch or tag filters, skipped required
   checks, inherited workflows, matrix expansion, `needs`, and conditional steps can prevent the
   intended job from existing.
6. Check false green paths. Look for `continue-on-error`, allowed failures, shell pipelines that
   ignore non-zero exits, status aggregation that only reads the final notification step, and tests
   that upload failures as artifacts but return success.
7. Split queue wait from execution time. Long queue time points to runner labels, concurrency
   limits, unavailable images, resource quotas, or protected environment approvals, not build code.
8. Reproduce in a clean environment only after the boundary is known. Prefer the same image,
   architecture, tool versions, env shape, and lockfile over a developer machine with hidden global
   state.
9. Pin floating execution inputs. Base images, actions, plugins, package managers, runtime versions,
   and shared script refs need stable identities or an explicit freshness policy.
10. Inspect environment without leaking values. Compare variable presence, safe hashes, lengths,
    names, permission scopes, timezone, locale, charset, clock, disk, inode, file descriptor,
    process, and memory limits.
11. Treat external calls as boundary evidence. Separate DNS, proxy, certificate, HTTP status,
    retry count, response time, and credential scope, with secrets redacted.
12. Replace sleeps with readiness evidence. Service containers, databases, queues, and app servers
    should prove readiness through real health, query, or protocol checks.
13. Classify cache and artifact separately. Cache is disposable acceleration; artifact is the built
    output passed forward. Cache keys need lockfile, OS, architecture, runtime, and package-manager
    dimensions. Artifacts need file list, size, hash, build SHA, and download verification.
14. Verify that the tested artifact is the deployed artifact. Rebuilding during deploy can make CI
    test one thing and production receive another.
15. Check auth and permissions by execution context. Fork PRs, protected branches, environments,
    OIDC identity, package publishing identity, cloud role, and repository token scopes can differ
    across otherwise similar runs.
16. For deployment jobs, require rollout evidence, readiness, smoke checks, error and latency
    thresholds, and environment concurrency locks instead of treating a zero exit code as success.
17. Preserve evidence before cleanup. Do not delete runners, caches, artifacts, temporary dirs, or
    diagnostic logs until the boundary and redaction plan are clear.
18. Apply the smallest localized fix and verify with the narrowest configured intent that covers the
    changed workflow, package, docs, template, or test surface.

<!-- mustflow-section: postconditions -->
## Postconditions

- The pipeline failure is localized to trigger, runner, environment, build, test, artifact, deploy,
  verification, or a named evidence gap.
- Last-good versus first-failure comparison, run identity, false-green risk, cache and artifact
  behavior, permission scope, and rerun determinism are explicit where relevant.
- Follow-up deployment, test performance, security, command-contract, or package-release work is
  selected only after the CI boundary is localized.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured intent that covers workflow docs, package metadata, template output,
test fixtures, local reproduced behavior, or release-sensitive pipeline surfaces. Do not infer raw
CI reruns, deploys, cloud shell commands, or provider dashboard writes outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If run identity, last-good comparison, trigger graph, runner, cache, artifact, or permission
  evidence is missing, report the missing field instead of guessing.
- If debug logs contain secrets or private data, stop copying raw output and summarize safely.
- If CI evidence requires remote provider access that is unavailable or unconfigured, report the
  manual evidence boundary and continue with local workflow or static evidence.
- If the boundary points to tests, deployment, secrets, permissions, artifacts, or command contracts,
  switch to the narrower matching skill before editing that part.

<!-- mustflow-section: output-format -->
## Output Format

- CI pipeline triaged
- Failure shape and localized boundary
- Run identity and last-good comparison
- Trigger, runner, environment, build, test, cache, artifact, deploy, and verification findings
- Hypotheses killed, still open, and selected follow-up boundary
- Fix applied or recommended
- Evidence level: provider run evidence, configured-test evidence, static review risk, manual-only,
  missing, or not applicable
- Command intents run
- Skipped diagnostics and reasons
- Remaining CI pipeline risk
