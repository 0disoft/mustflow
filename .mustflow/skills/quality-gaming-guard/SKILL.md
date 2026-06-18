---
mustflow_doc: skill.quality-gaming-guard
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: quality-gaming-guard
description: Apply this skill when quality metrics, line-count limits, complexity budgets, lint/type/test gates, or agent-authored changes may be gamed instead of satisfying the intended engineering goal.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.quality-gaming-guard
  command_intents:
    - quality_gaming_check
    - changes_status
    - changes_diff_summary
    - test_related
    - lint
    - build
    - mustflow_check
---

# Quality Gaming Guard

<!-- mustflow-section: purpose -->
## Purpose

Prevent agents from satisfying visible quality metrics through cheaper evasions such as line
stuffing, validation suppressions, placeholder implementations, test bypass markers, broad type
escapes, empty catch swallowing, junk-drawer helpers, or generated/vendor logic hiding.

This skill treats numeric limits as smoke alarms, not as the whole design objective. The target is
the underlying engineering contract: responsibility separation, readable diffs, meaningful tests,
preserved validation, and maintainable ownership.

<!-- mustflow-section: use-when -->
## Use When

- A task mentions line counts, file size, method size, class size, complexity, lint warnings, type
  errors, test coverage, benchmark thresholds, or quality gates.
- Assistant-authored code could satisfy a visible metric while making maintainability worse.
- A change adds or touches tests, validators, lint/type suppressions, generated files, vendor files,
  helper/util/manager/common containers, configuration-as-logic, placeholder behavior, or error
  swallowing.
- A repository has a configured `quality_gaming_check` intent or the command contract should expose
  one.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is documentation-only and does not define or change a quality gate.
- The task is a normal code review with no quality metric or agent-gaming risk; use the narrower
  review or language skill.
- The repository has no observable files, command contract, or diff evidence to inspect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal and the intended quality outcome behind any numeric metric.
- Current changed-file list and diff summary.
- Relevant quality gates, formatter rules, lint/type/test command intents, and command-contract
  entries.
- Nearby source, tests, generated/vendor policy, helper naming conventions, and existing
  suppression baseline.
- Any failing command output or previous workaround evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The intended quality goal has been separated from the visible metric.
- Higher-priority repository instructions and `.mustflow/config/commands.toml` have been checked.
- Command execution remains governed by configured command intents only.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Refactor code toward real responsibility ownership instead of only reducing line counts.
- Add or strengthen focused tests that prove the behavior or quality invariant being protected.
- Remove newly introduced suppressions, broad type escapes, test bypass markers, placeholder
  implementations, or metric-stuffing shapes when they are in scope.
- Add or update the bounded `quality_gaming_check` command contract only when the repository can run
  it as a one-shot, read-only intent.
- Do not weaken tests, assertions, type checking, lint rules, benchmarks, schema validation, or
  command gates to make a metric pass.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the real engineering goal behind the visible metric. Examples: separate domain ownership,
   keep diffs reviewable, preserve validation strength, keep tests meaningful, or make a hot path
   cheaper.
2. Inspect the diff for gaming patterns:
   - long-line stuffing after line-count limits;
   - multiple statements on one line;
   - new lint, type, coverage, or formatter suppressions;
   - `.skip`, `.only`, disabled, xfail, or todo test markers;
   - broad `any`, double assertions, or unsafe non-null assertions;
   - placeholder returns, `not implemented`, `pass`, empty fallbacks, empty catch blocks, or broad
     catch swallowing;
   - logic moved into generated/vendor files, giant config blobs, regex tables, dispatch maps, or
     helper/util/manager/common containers.
3. When a gaming pattern exists, fix the underlying design rather than only deleting the marker.
   Split by domain responsibility, ownership, input/output boundary, policy owner, or dependency
   direction.
4. Prefer formatter, lint, type, test, and architecture evidence that checks multiple dimensions
   together. Do not rely on one numeric gate as proof of design quality.
5. For legacy code, distinguish existing baseline from new regression. Existing debt can be reported
   while new debt should be removed or explicitly justified.
6. If `quality_gaming_check` is configured, run it after the relevant implementation change. Treat a
   nonzero result as a real quality-gaming finding unless the specific file is intentionally
   excluded by current repository policy.
7. Run the narrowest configured verification intents that cover the changed code, tests, command
   contract, and public behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- The visible metric and the underlying engineering goal are both addressed.
- No new validation suppression, test bypass, type escape, placeholder, empty catch swallowing,
  long-line stuffing, or generated/vendor hiding remains without an explicit risk note.
- Any helper/util/manager/common extraction has a real domain responsibility or is reported as a
  remaining design risk.
- Quality-gaming check results and skipped verification are visible in the final report.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `quality_gaming_check`
- `changes_status`
- `changes_diff_summary`
- `test_related`
- `lint`
- `build`
- `mustflow_check`

Use broader configured tests only when the changed behavior or gate is cross-cutting and no narrower
intent covers it.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If `quality_gaming_check` reports risks, inspect the file and either remove the gaming pattern or
  report why the repository policy intentionally permits it.
- If the check is missing, report that the repository has no configured quality-gaming guard instead
  of inventing a command.
- If a metric conflicts with the real engineering goal, report the conflict and prefer the stronger
  maintainability contract over a cosmetic number.
- If legacy baseline violations are too broad to fix safely, prevent new violations and report the
  ratchet boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Quality goal behind the metric
- Gaming patterns inspected
- Gaming patterns removed, prevented, or intentionally left
- Baseline versus new-regression decision
- Command intents run
- Skipped checks and reasons
- Remaining quality-gaming risk
