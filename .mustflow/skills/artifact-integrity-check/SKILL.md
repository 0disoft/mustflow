---
mustflow_doc: skill.artifact-integrity-check
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: artifact-integrity-check
description: Apply this skill when a task creates, replaces, packages, references, or reports on generated artifacts or binary assets.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.artifact-integrity-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_release
    - build
    - mustflow_check
---

# Artifact Integrity Check

<!-- mustflow-section: purpose -->
## Purpose

Ensure generated artifacts, packaged files, media assets, reports, and downloadable outputs exist, match their intended source, and are not reported as verified without evidence.

<!-- mustflow-section: use-when -->
## Use When

- A task creates, replaces, moves, deletes, packages, or references an artifact or binary asset.
- A final report claims that a file was generated, optimized, exported, included in a package, or safe to use.
- A build or packaging step writes files that may be stale, missing, oversized, or excluded from distribution.
- A document, README, manifest, or test points to a generated file or asset path.
- A release, package publish, workflow, or trusted publishing path can modify artifacts before publication.
- A code-scanning or workflow-security alert involves published artifacts, uploaded artifacts, SARIF files, package tarballs, Pages output, cache contents, or release credentials.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is source-only and does not mention generated, packaged, exported, or binary files.
- Another narrower skill already verifies the exact artifact path, package surface, and output claim.
- The user explicitly asks for a conceptual plan without producing or validating files.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Artifact paths or expected output locations.
- Source files, generation steps, or package rules that should produce the artifact.
- Any size, format, hash, manifest, package, or documentation expectation.
- Relevant command-intent contract entries for build, packaging, validation, or asset optimization.
- Workflow steps, action references, publish credentials, OIDC permissions, package registry identity, and pre-publish lifecycle scripts when artifacts are released.
- Code-scanning artifact paths, upload steps, credential scope, and whether the uploaded artifact can contain checkout credentials, generated secrets, or tampered package contents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update only the artifact, source reference, manifest, package metadata, test, or documentation needed to keep the artifact claim true.
- Do not commit generated caches, transient build output, or local state unless the repository explicitly versions that artifact.
- Do not invent hashes, dimensions, file sizes, export results, or package inclusion evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. List each artifact or binary asset affected by the task and the claim being made about it.
2. Identify whether the artifact is source-controlled, generated, packaged, ignored local state, or external output.
3. Check that source references, manifests, package includes, docs links, and tests point to the same path and format.
4. For publish workflows, inspect code that runs before artifact publication. Treat mutable third-party actions, lifecycle scripts, package manifests, and generated files as artifact mutation points.
5. For workflow artifact alerts, check whether checkout credentials persist into the workspace, whether artifacts are uploaded after untrusted code runs, and whether the job permission is broader than the artifact operation needs.
6. Verify existence, format, and expected inclusion using the narrowest configured command intent available.
7. If a generated artifact is stale or missing, regenerate it only through a configured command intent or report the missing command.
8. If an artifact should not be versioned, ensure the final report does not imply that it was committed or distributed.
9. Report artifact evidence precisely: path checked, command intent run, and any remaining unverified attribute.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every artifact claim in code, docs, manifests, tests, and the final report is backed by observed evidence or explicitly marked unverified.
- Generated and ignored outputs are not treated as project truth unless the repository declares them versioned.
- Package or distribution claims are verified with the relevant configured intent when available.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_release`
- `build`
- `mustflow_check`

Use a narrower configured asset or documentation validation intent when it better covers the artifact.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the artifact cannot be generated or inspected, report the missing tool, command intent, or source file.
- If package inclusion and source references disagree, fix the manifest or docs before reporting the artifact as shipped.
- If a privileged release workflow runs mutable actions or repository-controlled code before publishing, report the artifact integrity risk or isolate and pin the publish path before claiming the package is trustworthy.
- If an artifact is too large, stale, or in the wrong format, report the issue and avoid claiming it is production-ready.
- If verification would require external services or unavailable tools, stop at that boundary and name the unchecked artifact property.

<!-- mustflow-section: output-format -->
## Output Format

- Artifact paths checked
- Artifact source or generation path
- Inclusion, format, or size evidence
- Command intents run
- Skipped artifact checks and reasons
- Remaining artifact integrity risk
