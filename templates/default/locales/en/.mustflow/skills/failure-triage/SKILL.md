---
mustflow_doc: skill.failure-triage
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: failure-triage
description: Apply this skill when a configured command intent or verification step fails.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.failure-triage
  command_intents:
    - mustflow_check
---

# Failure Triage

<!-- mustflow-section: purpose -->
## Purpose

Identify the most probable root cause of a failed command or verification step before modifying files.

<!-- mustflow-section: use-when -->
## Use When

- A configured command intent returns a non-zero exit code.
- Validation, build, test, or documentation checks fail.
- A local release or publish path succeeded, but a remote CI job, check suite, or platform-specific
  runner still shows a failure for the pushed branch, tag, or commit.
- The root cause of the failure is not yet apparent.
- A test or build failure may have been caused by an overlapping run, orphaned process, stale lock, or deleted build output.
- Several failures appear together and the first root cause needs to be separated from follow-on noise.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The failure is fully understood and a targeted fix is available; apply the relevant implementation or test skill instead.
- The user has requested only a high-level summary.
- A bug or runtime symptom is not yet reproducible; use `repro-first-debug` first unless the command failure itself is the reproduction.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Original command intent
- Exit code
- Truncated stdout and stderr output
- Remote run context when applicable: branch, tag, commit SHA, job name, runner OS, matrix entry,
  and whether the failure belongs to a push, pull request, tag, release, or scheduled run
- Recently modified files
- Relevant command contract entry
- Active or recently active build/test/profile processes when the failure mentions missing compiled files, stale output, port/resource conflicts, or unexpected file deletion

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Preserve the original failing intent name.
2. Analyze the first actionable error.
3. Classify the probable failure domain before editing:
   - `code`: implementation behavior, public output, or data transformation changed.
   - `test`: assertion, fixture, helper, scheduler grouping, or test isolation changed.
   - `configuration`: command contract, schema, template metadata, preferences, or package metadata drifted.
   - `documentation`: docs navigation, frontmatter, generated content, or localized metadata drifted.
   - `environment`: missing tool, platform difference, path, permission, lock, stale build output, or orphaned process.
   - `tool_runner`: the verification runner, scheduler, cache, or build wrapper failed independently from the code under test.
4. For remote CI failures, record the failing ref, commit, job name, runner OS, and matrix before
   editing. Compare that runner to local verification instead of assuming local success covers the
   remote job.
5. Treat Windows-only, path-only, or runner-only failures as real until proven otherwise. If the
   error mentions `inside the current root`, `.mustflow/cache/**`, `.mustflow/review/docs.toml`,
   symlinks, junctions, realpaths, drive-letter casing, path separators, or root containment, inspect
   path normalization and containment helpers first. Add or update a regression test that models the
   platform/root-alias behavior instead of weakening containment checks.
6. If several failures appear, triage in this order: environment and overlapping processes, build or generated output, configuration/schema drift, fixture setup, then behavior logic.
7. For failures involving `dist/`, generated output, temporary files, ports, databases, or abrupt test termination, check whether another build/test/profile process for the same repository is still running.
8. If an orphaned or overlapping process is found, stop or wait for it before changing source files, then rerun the narrowest failing intent to confirm the failure is reproducible.
9. Pick one rerun target:
   - the original failing intent when it is narrow enough;
   - `test_related` when changed files map to a focused suite;
   - `docs_validate_fast` for docs navigation or content-only failures;
   - `test_release` for package, template, schema, or release metadata drift;
   - `mustflow_check` for workflow, skill, command-contract, or manifest-lock failures.
10. Examine the most relevant files.
11. Develop a single hypothesis and verify it using the most targeted configured intent. When the
    failure came from remote CI, also confirm the replacement run or check suite for the affected
    ref before reporting that the remote failure is fixed.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Re-run the original failing intent when possible. If that is too broad, run the most targeted configured
intent that isolates the same failure area.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- Avoid bundling unrelated fixes.
- If the failure is due to missing tools, report the missing tool and the command that revealed the issue.
- If the failure was caused by an orphaned or overlapping process, report that the original run was invalid and add or use a guard that prevents the same overlap before taking new measurements.
- If rerunning the same intent produces a different failure without code changes, classify the issue as flaky or environmental and avoid weakening assertions until the unstable dependency is identified.
- If publication, release creation, or artifact upload succeeded while another check on the same
  pushed commit failed, report those as separate states and triage the failed check before using
  all-clear language.
- If sensitive data appears in the output, cease copying raw output and summarize the information safely.

<!-- mustflow-section: output-format -->
## Output Format

- Failing intent
- Probable root cause
- Evidence
- Fix applied or recommended
- Verification run
- Remaining risk
