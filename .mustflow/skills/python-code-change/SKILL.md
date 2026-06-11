---
mustflow_doc: skill.python-code-change
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: python-code-change
description: Apply this skill when Python source, standard-library API usage, packaging, runtime version, import layout, type checking, linting, tests, or CLI entry points are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.python-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# Python Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Python runtime, standard-library, packaging, import, async resource, public API, typing, lint, and test boundaries while making a focused change.

<!-- mustflow-section: use-when -->
## Use When

- `.py`, `pyproject.toml`, `setup.py`, `setup.cfg`, requirements files, lockfiles, tox, nox, pytest, mypy, pyright, Ruff, or Python CI config changes.
- The task touches standard-library feature usage, package layout, CLI entry points, imports, type hints, dependency declarations, virtual environment assumptions, or tests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only edits generated Python output that should not be maintained manually.
- The repository does not contain Python behavior and the file is only documentation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Python version source: `requires-python`, `.python-version`, tool version files, CI matrix, or container base image.
- Standard-library feature and runtime-behavior assumptions, especially when using Python-version-gated APIs or changed security defaults.
- Packaging and dependency files, test config, lint config, and type checker config.
- Package layout: `src` layout, flat layout, namespace package, distribution name, import package name, package discovery settings, CLI entry points, plugin entry points, and nearby tests.
- Async ownership and resource cleanup surface when coroutines, tasks, context managers, sessions, clients, pools, files, async generators, subprocesses, or logging change.
- Public contract surface when imports, signatures, exceptions, return shapes, CLI behavior, config, environment variables, extras, Python version support, or typing stubs change.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Determine the lowest supported Python version before choosing syntax or typing features.
- Determine the lowest supported Python version before choosing standard-library features, changed defaults, syntax, or typing features.
- Read package layout and import style before editing imports.
- Treat global machine Python state as irrelevant unless the project explicitly declares it.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep existing packaging tools and layout unless the user explicitly asks for a packaging migration.
- Add or adjust type hints at public boundaries, complex return values, and external input boundaries.
- Follow existing test style, fixtures, parametrization, and lint/type strictness.
- Do not lower Ruff, mypy, pyright, pytest, or packaging strictness to hide a failure.
- Keep import fixes in package metadata, package discovery, entry points, or test invocation contracts instead of path hacks.
- Make resource ownership explicit: code closes only the resources it creates.

<!-- mustflow-section: procedure -->
## Procedure

1. Read project metadata, Python version constraints, dependency files, and test/lint/type configs.
2. Identify the boundary touched: runtime version, package API, import root, packaging metadata, CLI entry, test fixture, async resource ownership, external input, or dependency contract.
3. For packaging and import changes, separate the distribution name from the import package name. Check package directory mapping, package discovery settings, namespace package behavior, package data, entry points, optional dependencies, and `requires-python` before touching imports.
4. Treat `src` layout as an installation contract. Importable code under `src/` should be tested through the supported installed-package path, not by making repository files accidentally importable from the working directory.
5. Match existing package layout and import conventions. Do not add `sys.path`, `site.addsitedir`, `PYTHONPATH`, pytest `pythonpath`, ad hoc import loading, or test `conftest.py` import hacks to make package imports pass.
6. Do not add `__init__.py` to tests as a blind fix. Add it only when tests are intentionally a package and the import-mode behavior remains explicit.
7. For packaging changes, distinguish development and release contracts:
   - editable installs prove the local development path;
   - wheel installs or equivalent built artifacts prove the release path;
   - entry point, dependency, optional dependency, metadata, and package data changes require reinstall-oriented verification when a configured intent exists;
   - installed console scripts or plugin entry points should be smoke-tested through the installed entry point contract, not by directly running a source file.
8. Verify import origin when packaging risk is present. The public package should resolve from the installed environment intended by the project, not from accidental repository-root files.
9. Validate unknown external data before treating it as typed domain data.
10. Choose standard-library helpers by semantic contract and supported Python version:
   - prefer cardinality-explicit iteration such as `zip(strict=True)`, `itertools.batched(..., strict=True)`, or Python 3.14+ `map(strict=True)` only when unequal lengths are a bug and the declared runtime supports the API;
   - do not use `itertools.groupby` as a database-style grouping primitive unless input ordering and group materialization are intentional;
   - avoid shared mutable defaults; use `default_factory` or an existing local construction pattern for per-instance mutable state;
   - prefer `importlib.resources` for packaged data, `tomllib` for TOML reads, and `Path.walk()` only after checking version support, pruning behavior, symlink recursion, ordering, and cycle risks;
   - use dataclass options such as `slots`, `frozen`, and `kw_only`, `StrEnum`, `TypedDict`, or `Protocol` only when they match the public shape and runtime/type-checker support;
   - treat `functools.cache`, `lru_cache`, `cached_property`, `partial`, and Python 3.14+ `Placeholder` as state, memory, concurrency, and versioned-API choices rather than harmless terseness.
11. Keep process, archive, and concurrency safety explicit:
   - subprocess calls use argument lists, checked failure handling, timeouts, bounded captured output, and a narrow `shell=True` exception when the project already permits it;
   - archive extraction, including `tarfile`, keeps untrusted archive inspection, extraction filters, partial-extract cleanup, and older-runtime defaults visible;
   - `asyncio.TaskGroup`, `asyncio.timeout`, and `asyncio.to_thread` are used only when their cancellation, timeout, blocking-work, and Python-version semantics fit the surrounding lifecycle.
12. Use runtime diagnostics as evidence, not as permanent workaround code. Interpreter or library diagnostics such as import timing, `tracemalloc`, `faulthandler`, profiling, and allocation tracing should go through configured diagnostic or verification intents when available, and missing intents should be reported instead of adding ad hoc command recipes to the skill.
13. Preserve async and resource ownership:
   - every coroutine is awaited, returned by contract, or scheduled as an owned and tracked task;
   - raw background task creation is allowed only through the project's owner or spawn helper, a task group, or an equivalent lifecycle mechanism;
   - background tasks keep a strong reference, have a shutdown path, and retrieve failures instead of leaving never-retrieved exceptions;
   - cancellation is control flow, so cleanup uses `finally` and cancellation is re-raised after cleanup unless suppression is the documented behavior;
   - async functions do not call blocking I/O, blocking sleeps, long CPU work, or blocking subprocess waits directly unless the project has an explicit executor or isolation pattern;
   - context managers and async context managers do not suppress exceptions unless suppression is the feature;
   - context-manager helpers that catch exceptions for logging re-raise after logging;
   - early-exit async generators have an explicit close path.
14. Preserve traceback evidence. Logging inside exception handlers should retain exception information instead of logging only the exception message.
15. Preserve public contracts:
   - treat public imports, public signatures, exceptions, return shapes, CLI behavior, entry points, config keys, environment variables, dependency metadata, extras, Python version support, and typing stubs as compatibility-sensitive;
   - do not change sync functions into async functions, accepted input shapes, nullable behavior, documented exception types, tuple/dict/dataclass return shapes, config precedence, or environment variable semantics without a compatibility review;
   - typed packages should keep runtime and typing surfaces aligned, including `py.typed` and stubs when present.
16. Avoid mutable default arguments, broad `except Exception: pass`, broad `BaseException` catches outside process boundaries, global state hidden behind module imports, and path handling that ignores existing `pathlib` or OS conventions.
17. Use `# type: ignore[...]` only when tightly scoped, justified, and consistent with local policy.
18. If packaging, public API, CLI, config, or typing contracts change, synchronize README examples, entry point tests, build metadata, docs, fixtures, and downstream-style examples that describe installation or usage.
19. Choose configured verification intents that cover formatting, lint, type checking, tests, package build, installed-package smoke checks, and CLI smoke risk when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- The code respects the declared Python version and packaging layout.
- Python-version-gated standard-library features and changed runtime defaults are accepted only when the declared support matrix allows them.
- Imports work from the project-supported execution path.
- Packaging changes distinguish development imports from release artifact imports.
- Async tasks, context managers, files, clients, pools, subprocesses, and generators have visible ownership and cleanup.
- Public API, CLI, config, environment, dependency metadata, and typing contract changes are called out.
- Type and lint strictness are not weakened.
- Tests or skipped verification are tied to the changed behavior.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing package, type, or test intents rather than inventing raw tool commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If import resolution fails, inspect package metadata and test invocation before adding path hacks.
- If a test only passes because repository root, `src`, or `tests` is injected into import paths, reject the fix and repair packaging or test layout instead.
- If packaging correctness matters but only repository-root tests can run, report that wheel or installed-artifact verification is missing.
- If the supported Python version blocks a syntax choice, rewrite to the supported form.
- If the supported Python version blocks a standard-library feature, changed default, diagnostic flag, or helper API, use the supported equivalent or report the runtime-support decision instead of silently raising `requires-python`.
- If third-party stubs or package metadata are wrong, document the local workaround and keep it narrow.
- If a background task lacks owner, shutdown, strong reference, or exception retrieval, do not add it.
- If cancellation or context-manager behavior is swallowed accidentally, restore propagation or document the intentional suppression contract.
- If resource cleanup cannot be proven, use the project's context manager, exit stack, fixture, or lifecycle pattern before broadening tests.
- If public contracts change without compatibility evidence, stop and report the breaking-change or deprecation requirement.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Runtime and packaging assumptions
- Files changed
- Type, lint, and import notes
- Command intents run
- Skipped checks and reasons
- Remaining Python risk
