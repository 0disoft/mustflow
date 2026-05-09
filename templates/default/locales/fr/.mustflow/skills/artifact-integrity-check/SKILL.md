---
mustflow_doc: skill.artifact-integrity-check
locale: fr
canonical: false
revision: 1
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
4. Verify existence, format, and expected inclusion using the narrowest configured command intent available.
5. If a generated artifact is stale or missing, regenerate it only through a configured command intent or report the missing command.
6. If an artifact should not be versioned, ensure the final report does not imply that it was committed or distributed.
7. Report artifact evidence precisely: path checked, command intent run, and any remaining unverified attribute.

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
