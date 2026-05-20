---
mustflow_doc: skill.dependency-reality-check
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: dependency-reality-check
description: Apply this skill when a task assumes, adds, removes, imports, invokes, installs, audits, or documents a package, runtime, tool, command, service, or platform capability, especially for AI-suggested dependencies or supply-chain-sensitive changes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.dependency-reality-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_release
    - mustflow_check
---

# Dependency Reality Check

<!-- mustflow-section: purpose -->
## Purpose

Prevent code, docs, tests, and final reports from assuming unavailable packages, tools, commands, runtimes, services, or platform capabilities.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, removes, renames, imports, invokes, or documents a dependency, tool, runtime, command, plugin, service, or platform feature.
- An AI-generated patch, assistant suggestion, copied snippet, or generated docs introduce a package name that could be hallucinated, misspelled, abandoned, lookalike, or unnecessary.
- A change adds package-manager scripts, package lifecycle hooks, build downloads, binary installers, lockfile changes, audit suppression, vulnerability scanner output, or CI dependency gates.
- A solution relies on a package manager, binary, environment variable, browser API, operating-system command, hosted service, or optional integration.
- A generated instruction tells another agent or user to run a tool that may not be declared in the repository.
- A failure may be caused by a missing install, mismatched version, unsupported runtime, or unavailable command.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes repository-local prose and does not mention tools, runtime behavior, package metadata, or commands.
- The dependency is already proven by the current task context and no dependency-facing surface changes.
- The user explicitly asks for a speculative design that should not be implemented or verified yet.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The dependency, tool, command, runtime, service, or platform capability being assumed.
- Package, lock, config, import, script, command-intent, or documentation files that declare or reference it.
- The minimum version, capability, or availability claim if one is required.
- Registry name, package scope, lockfile entry, provenance or maintainer expectation, install script risk, and whether the dependency is runtime, development, fixture-only, transitive, or optional.
- Vulnerability, license, audit, lifecycle-script, binary-download, package-age, maintainer-change, and fork-or-replacement context when those details are available from approved repository tooling or existing metadata.
- Relevant command-intent contract entries for build, package, test, or documentation verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Align dependency declarations, imports, scripts, command metadata, tests, and docs that describe the same capability.
- Prefer existing repository dependencies and declared command intents before adding new packages or tools.
- Do not install packages, widen runtime requirements, or introduce new external services unless the user request and repository contract support it.
- Do not claim a dependency is available just because it exists on the internet or in another project.
- Do not add an AI-suggested dependency merely because its name sounds plausible. Treat plausible-but-undeclared packages as hallucination or slopsquatting risk until repository evidence or explicit user approval supports them.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the assumed dependency or capability and where the task relies on it.
2. Check the repository declarations first: package metadata, lockfiles, config files, imports, command intents, docs, and templates.
3. Decide whether the dependency is present, absent, optional, transitive, host-provided, or external.
4. For AI-suggested names, check for hallucination and lookalike risk before accepting the import: exact package name, namespace, known local precedent, lockfile presence, and whether an existing dependency already solves the need.
5. If present, verify that the requested capability and version expectation match the declared dependency.
6. If absent, prefer an existing local alternative. Add a new dependency only when it is necessary, within the task scope, and reflected in the package metadata and lockfile policy.
7. Treat package scripts and lifecycle hooks as executable code. Review `preinstall`, `install`, `postinstall`, `prepare`, build-time downloads, generated binaries, and shell-spawning scripts before accepting them.
8. Check supply-chain-sensitive metadata when available through approved tooling or existing files: package scope, maintainer or organization expectation, package age, maintainer changes, install scripts, binary downloads, transitive dependency impact, license constraints, and fixture-only versus runtime use.
9. For vulnerability or audit output, separate runtime dependencies from fixture-only or intentionally vulnerable samples. Do not weaken audit gates, delete lockfiles, or add broad suppressions without a repository-owned reason.
10. For new dependencies, prefer pinned or lockfile-backed versions according to project policy. Avoid widening ranges or removing lockfiles to satisfy generated code.
11. Do not introduce new package-manager wrappers, vulnerability scanners, registry queries, or install commands inside this skill. Use configured command intents or report the missing verification surface.
12. Keep all dependency-facing surfaces aligned: package metadata, lockfiles when intentionally updated, command contract, docs, tests, and installation notes.
13. Run the narrowest configured verification that proves the dependency path used by the change.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every dependency or tool claim is backed by a repository declaration, configured command, host boundary, or explicit unverified-risk note.
- New dependency requirements are reflected in the appropriate metadata and public documentation.
- The final report states whether the dependency was existing, added, optional, unavailable, or intentionally not verified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_release`
- `mustflow_check`

Use a narrower configured test, package, or docs intent when it better proves the dependency path.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the dependency is missing, report the missing declaration or command instead of silently adding a workaround.
- If a package name appears hallucinated, lookalike, unowned, or unrelated to the project, reject it or ask for explicit approval before adding it.
- If a package adds lifecycle scripts, binary downloads, audit suppressions, broad version ranges, or lockfile deletion, treat the change as supply-chain-sensitive and escalate to a security review before continuing.
- If the declared version lacks the needed capability, report the mismatch and avoid claiming support.
- If a dependency requires network, credentials, operating-system setup, or service access, stop at that boundary and name the unchecked requirement.
- If generated docs would instruct users to run undeclared tools, rewrite the docs to use declared commands or mark the tool as a manual prerequisite.

<!-- mustflow-section: output-format -->
## Output Format

- Dependency or capability checked
- Repository declaration or absence
- Surfaces synchronized
- Command intents run
- Skipped dependency checks and reasons
- Remaining dependency risk
