---
mustflow_doc: skill.behavior-preserving-refactor
locale: zh
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: behavior-preserving-refactor
description: Apply this skill when refactoring should reduce change cost while preserving existing behavior and keeping behavior changes separate.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.behavior-preserving-refactor
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Behavior-Preserving Refactor

<!-- mustflow-section: purpose -->
## Purpose

Guide refactoring that lowers future change cost without silently changing runtime behavior.

Refactoring is not cleanup for aesthetics. It is a controlled way to make code easier to understand, test, and change while keeping bug fixes, feature work, and behavior changes separate.

<!-- mustflow-section: use-when -->
## Use When

- The user asks to refactor, clean up, reorganize, simplify, split, extract, rename, remove duplication, or improve structure.
- A planned change risks mixing renames, moves, extractions, deduplication, bug fixes, and feature behavior in one diff.
- Existing code is hard to change because responsibilities, names, branches, dependencies, or tests are unclear.
- The task touches legacy or weakly tested code and needs a safer refactoring order.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The requested task is primarily a bug fix or failure diagnosis; use `repro-first-debug` first.
- The change introduces new folders, modules, routing, data models, or external service boundaries before refactoring scope is clear; use `structure-discovery-gate`.
- The task is only to review an already completed diff; use `diff-risk-review` or `code-review`.
- The target code is about to be deleted, the requirement is still unclear, or the next step requires a product decision rather than a refactor.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The refactoring goal, target files or area, and the concrete pain being reduced.
- Current behavior evidence, such as tests, examples, fixtures, command output, or observed input and output cases.
- Existing local patterns for naming, file boundaries, dependencies, and tests.
- Current changed-file list when the worktree is already dirty.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The expected behavior to preserve is known, or the unknown behavior has been reported before edits begin.
- If the area is unfamiliar, `codebase-orientation` or `pattern-scout` has been used to avoid inventing a parallel structure.
- If tests are absent or weak, the first safe step is to add characterization coverage, capture input and output cases, or explicitly report the verification gap.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Rename unclear identifiers when the rename improves call-site meaning without changing behavior.
- Extract small functions, policies, or helpers when they have a clear concept, inputs, outputs, and test value.
- Flatten conditional flow when it preserves the same guard conditions and error behavior.
- Separate responsibilities, dependencies, or side effects in the smallest useful step.
- Add or update tests that preserve current behavior or make the refactoring safe.
- Do not mix behavior changes, bug fixes, new features, broad formatting churn, or unrelated cleanup into the refactor.

<!-- mustflow-section: procedure -->
## Procedure

在大范围查找重构候选时，先压缩候选，再阅读文件。

- 排序候选前，先排除生成文件、打包文件、锁文件、依赖目录、大型 fixture、snapshot、构建产物、压缩文件和 source map。
- 将 `[refactoring.hotspots]` 偏好作为扫描限制：`large_file_candidate_kb` 是第一轮大小信号，`history_days` 是近期变更和修复历史窗口，候选限制值决定每个深度最多检查多少文件。
- 优先看多个低成本信号重叠的文件，而不是单一指标：大小、近期变更频率、修复历史、import/export 数量、TODO/FIXME/HACK 数量、类型或 lint 绕过、附近缺少测试、跨架构边界 import。
- 将强组合提高优先级，例如大文件 + 频繁变更 + 无测试，安全/支付/权限相关小文件 + 反复修复，大型 React 客户端组件 + 多个 effect，以及混合验证、授权、业务逻辑、数据库访问和响应格式化的 API/controller 文件。
- 不要阅读所有候选。第一轮保留数量不超过配置的主候选上限，再缩小到结构检查候选上限，只有配置允许的少数候选才阅读全文。
- 打开候选时，先检查 import、export、声明列表、TODO 或类型绕过附近，以及最大或分支最多的函数，必要时再阅读全文。

1. Diagnose whether refactoring is needed.
   - Name the real problem: change cost, unclear responsibility, repeated bug risk, test difficulty, dependency coupling, or confusing flow.
   - Do not refactor only because code looks long, old, or stylistically uneven.
2. Identify behavior that must stay fixed.
   - Prefer existing tests or examples.
   - If coverage is missing, record representative input and output cases or add focused characterization tests before structural edits.
   - Treat suspected bugs as separate follow-up fixes unless the user explicitly asks to change behavior.
3. Choose the safest refactoring ladder.
   - Start with names and local clarity.
   - Then extract small concepts with clear inputs and outputs.
   - Then flatten conditions or isolate policies.
   - Then remove duplication only when the duplicated code changes for the same reason.
   - Move files, introduce abstractions, or split modules only after local behavior is easier to see.
4. Check duplication before merging code.
   - Keep duplication when code only looks similar or will change for different reasons.
   - Prefer common code only when it represents the same rule, simplifies call sites, and does not add parameter or branch complexity.
   - Prefer explicit duplication over a misleading abstraction.
5. Check extracted functions and names.
   - Extract only concepts that can be named precisely.
   - Avoid vague names such as `process`, `handle`, `do`, or `helper` unless they match established local style.
   - Boolean functions should read naturally at call sites and reveal the condition being tested.
6. Handle conditional complexity by finding the policy.
   - Use early exits for simple guard conditions when they preserve behavior.
   - Separate state, type, permission, and exceptional-rule branches when they are mixed.
   - Avoid replacing clear branches with a strategy object, table, or abstraction before the policy boundary is proven.
7. Keep commits and reports reviewable.
   - Separate renames, moves, extractions, deduplication, tests, and behavior changes when possible.
   - If behavior changes are discovered, stop and report them as a separate fix path.
8. Verify with the narrowest configured command intents that cover the changed code and contract surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- Existing behavior is preserved or any behavior change is clearly separated and reported.
- The refactor has a named purpose tied to lower change cost, lower defect risk, or better testability.
- The diff is small enough for a reviewer to distinguish mechanical changes from semantic changes.
- Tests or verification evidence cover the behavior most likely to regress.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured test or build intent that proves the refactored behavior. Use documentation and release checks only when the refactor changes public docs, templates, schemas, package metadata, or release-sensitive surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If current behavior cannot be observed, stop before broad restructuring and report the missing safety evidence.
- If a refactor uncovers a bug, keep the refactor behavior-preserving and propose the fix as a separate change.
- If deduplication creates more options, branches, or vague names, undo or postpone that abstraction.
- If tests fail after a supposedly behavior-preserving edit, diagnose the behavior difference before continuing.
- If the next useful step is a large module move or public boundary change, use `structure-discovery-gate` and `contract-sync-check` before proceeding.

<!-- mustflow-section: output-format -->
## Output Format

- Refactoring goal
- Behavior preservation evidence
- Structural risk signals found
- Refactoring ladder chosen
- Changes made or analysis-only recommendation
- Behavior changes intentionally excluded
- Verification intents run
- Skipped checks and reasons
- Remaining risks or follow-up fix path
