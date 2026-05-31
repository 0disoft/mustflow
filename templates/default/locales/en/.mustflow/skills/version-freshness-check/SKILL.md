---
mustflow_doc: skill.version-freshness-check
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: version-freshness-check
description: Apply this skill when generated or edited code, configuration, CI workflows, package metadata, install instructions, examples, Docker images, framework setup, runtime declarations, toolchain declarations, or migration-sensitive snippets introduce explicit external version references that may be stale.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.version-freshness-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Version Freshness Check

<!-- mustflow-section: purpose -->
## Purpose

Prevent agents from writing stale external version references from memory, while avoiding blind upgrades that ignore repository policy, compatibility, or migration cost.

<!-- mustflow-section: use-when -->
## Use When

- Generated or edited files introduce explicit external version references, action refs, package ranges, runtime versions, framework majors, Docker image tags, toolchain versions, setup actions, scaffold commands, install commands, or migration examples.
- CI workflows, release workflows, Dockerfiles, package metadata, lockfiles, runtime files, framework configuration, README examples, docs, tests, fixtures, or templates mention external versions such as GitHub Actions refs, Node, Bun, Deno, Python, Rust, Tauri, Astro, Next, SvelteKit, Electron, Docker images, package managers, SDKs, plugins, or generators.
- An agent proposes a versioned dependency, tool, framework, action, image, or runtime based on memory, copied snippets, older project examples, or user-provided text that may be stale.
- The task asks whether a newer stable, recommended, LTS, or security-patched version should replace a version the agent was about to write.
- A patch claims a version is latest, current, recommended, stable, LTS, supported, deprecated, end-of-life, or migration-safe.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The version reference is purely repository-local, such as an internal schema revision, fixture id, or package version already handled by `date-number-audit`.
- The task only preserves an existing pinned external version without touching code, docs, examples, package metadata, CI, Docker, runtime declarations, or compatibility claims.
- The task is a deliberate dependency upgrade, downgrade, lockfile refresh, or security advisory fix; use `dependency-upgrade-review` as the main skill and this skill only for freshness-specific claims if needed.
- The task only checks whether a dependency exists or whether a package name is real; use `dependency-reality-check` first.
- The user explicitly requests an offline-only draft and accepts that version freshness will be reported as unverified.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The versioned external reference being introduced, changed, preserved, or reported.
- Files that own or repeat the version: package metadata, lockfiles, workflow files, Dockerfiles, runtime files, framework config, docs, examples, templates, fixtures, and tests.
- Repository version policy if present: pinned ranges, lockfile expectations, LTS policy, security patch policy, supported runtime matrix, migration notes, downgrade constraints, or organization rules.
- Approved freshness evidence when available: official docs, upstream repository releases, package registry metadata, image registry metadata, official migration notes, security advisory ranges, or existing repository-maintained snapshots.
- Compatibility context: new project or existing project, patch/minor/major difference, framework adapter/plugin compatibility, runtime engine support, generated output, migration burden, rollback path, and whether the version touches a survival path.
- Relevant command-intent contract entries for build, tests, docs, packaging, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Freshness evidence can be gathered from allowed local files, configured tooling, approved connectors, official sources, package metadata, registry metadata, or the user-provided source text. If none is available, the check must be reported as unverified rather than guessed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Align versioned references across package metadata, workflow files, runtime declarations, templates, docs, examples, and tests when the repository policy and compatibility classification support the change.
- Replace stale generated defaults with a verified stable, recommended, LTS, or repository-pinned value when the change is compatible and within scope.
- Add conservative wording when a version was not refreshed or when multiple legitimate version tracks exist.
- Do not force the newest major version, floating tag, or broad range when the repository pins a different supported track.
- Do not claim a version is current, latest, stable, recommended, LTS, deprecated, or secure unless the claim was refreshed or clearly marked as snapshot-only.
- Do not add package-manager, registry, browser, or network commands to the skill. Use configured command intents or report missing verification.

<!-- mustflow-section: procedure -->
## Procedure

1. Build a version ledger before editing: each external version reference, where it appears, whether it is new or existing, and whether it is code, config, CI, Docker, package metadata, docs, template, fixture, or test data.
2. Check repository policy before upstream freshness: package and lock metadata, runtime files, CI matrices, Docker tags, supported-version docs, migration notes, existing examples, and command contracts.
3. Identify the intended track for each reference: repository-pinned, lockfile-resolved, latest stable, recommended major, LTS, security-patched minimum, compatibility range, floating tag, digest-pinned image, or snapshot-only example.
4. Refresh stale-sensitive external facts with the highest-authority allowed source available. Prefer official docs, upstream releases, package registry metadata, official migration notes, official image metadata, or user-provided current evidence over secondary summaries.
5. If freshness cannot be checked with the available tools or permissions, keep the version conservative, avoid current-version claims, and report the unchecked source boundary.
6. Compare the proposed value, repository policy, and upstream evidence. Classify the difference as `same`, `patch`, `minor`, `major`, `migration-required`, `security-minimum`, `policy-pinned`, `floating`, or `unknown`.
7. Treat major, migration-required, pre-1.0, framework, runtime-engine, CI-action, Docker-image, generator, native, security-sensitive, and survival-path changes as higher risk even when the version number looks small.
8. For new projects or new examples, prefer the verified stable or officially recommended track unless the repository policy pins another track.
9. For existing projects, do not cross a major, migration-required, engine, framework, CI-image, or generated-output boundary without user approval or explicit repository policy.
10. For patch, security-minimum, and low-risk minor differences, update only when the declaration, examples, lockfile policy, and verification surface can stay aligned. Otherwise report the proposed change and leave the pinned value unchanged.
11. For GitHub Actions and CI tools, review the action source, major tag policy, runtime support, cache behavior, permissions, and organization pinning rule. Do not assume a newer major is safe only because it exists.
12. For framework and runtime majors such as Astro, Tauri, Electron, Next, SvelteKit, Node, Bun, Deno, Python, Rust, or Java, check migration notes, config schema, plugin and adapter compatibility, generated files, security model, deployment target, and rollback path before recommending a major change.
13. For Docker images, decide whether the project prefers semver tags, distro tags, LTS tags, date tags, or digests. Do not replace a digest or pinned base image with a floating tag unless the repository policy says so.
14. Synchronize every accepted version decision across package metadata, lockfiles when intentionally updated, CI, Docker, runtime files, docs, examples, templates, tests, and release notes.
15. Run the narrowest configured verification that covers the changed versioned surface. Use broader verification for major, migration-required, runtime, framework, generated-output, package-publish, Docker, CI, or security-sensitive changes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every touched external version reference has a ledger entry with repository policy, freshness evidence, compatibility classification, and final decision.
- Stale model defaults are not silently written as if they were current.
- Repository-pinned versions are preserved unless the task, policy, and compatibility classification support changing them.
- Major or migration-required changes are either explicitly approved, deferred with a recommendation, or left unchanged with the risk reported.
- Docs and examples do not make unverifiable current-version claims.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured intent that proves the changed versioned surface. Report missing dependency, package, docs, Docker, CI, or release verification instead of inventing commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If repository policy and upstream evidence disagree, preserve the repository policy unless the user explicitly chooses a migration or the existing version is outside a required security or support range.
- If official sources conflict, prefer the source that owns the artifact being referenced and report the conflict.
- If a freshness check requires network, credentials, or a connector that is not available, report the boundary and avoid current-version claims.
- If a proposed major or migration-required version is better for greenfield work but risky for the existing project, present both choices and ask before changing the project.
- If verification fails after a freshness update, do not weaken tests, lower type checks, delete lockfiles, or widen ranges to make the update pass. Revert or narrow the version decision unless the behavior change is intentional.

<!-- mustflow-section: output-format -->
## Output Format

- Versioned surfaces checked
- Repository version policy found or missing
- Freshness source checked or unavailable
- Proposed and selected version track
- Compatibility classification: `same`, `patch`, `minor`, `major`, `migration-required`, `security-minimum`, `policy-pinned`, `floating`, or `unknown`
- User approval needed or not, with reason
- Surfaces synchronized
- Command intents run
- Skipped freshness or verification checks and reasons
- Remaining version freshness risk
