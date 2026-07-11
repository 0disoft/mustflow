---
mustflow_doc: skill.python-code-change
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: python-code-change
description: Apply this skill when Python source, standard-library API usage, packaging, runtime version, import layout, architecture boundaries, type checking, async tasks, exception/logging/retry behavior, performance-sensitive collection usage, pytest fixtures/mocks, linting, tests, or CLI entry points are created or changed.
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

Preserve Python runtime, standard-library, packaging, import, architecture, async resource, failure, performance, public API, typing, lint, and test boundaries while making a focused change.

<!-- mustflow-section: use-when -->
## Use When

- `.py`, `pyproject.toml`, `setup.py`, `setup.cfg`, requirements files, lockfiles, tox, nox, pytest, mypy, pyright, Ruff, or Python CI config changes.
- The task touches standard-library feature usage, package layout, CLI entry points, imports, type hints, dependency declarations, virtual environment assumptions, async task lifecycles, exceptions, logging, retry, fallback, collection performance, or tests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only edits generated Python output that should not be maintained manually.
- The repository does not contain Python behavior and the file is only documentation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Python version source: `requires-python`, `.python-version`, tool version files, CI matrix, or container base image.
- Standard-library feature and runtime-behavior assumptions, especially when using Python-version-gated APIs or changed security defaults.
- Packaging and dependency files, build backend, package manager, lockfile owner, test config, lint config, and type checker config.
- Package layout: `src` layout, flat layout, namespace package, distribution name, import package name, package discovery settings, CLI entry points, plugin entry points, and nearby tests.
- Architecture boundary: external adapters, framework request/response objects, ORM models, environment input, DTOs, domain value objects, import direction, and shared utility ownership.
- Async ownership and resource cleanup surface when coroutines, tasks, context managers, sessions, clients, pools, files, async generators, subprocesses, or logging change.
- Failure surface when exceptions, logging config, retry, timeout, fallback, degraded responses, or observability fields change.
- Public contract surface when imports, signatures, exceptions, return shapes, CLI behavior, config, environment variables, extras, Python version support, or typing stubs change.
- Runtime truth boundary for type hints: external input validation, `Any`, casts, ignores, protocols, guards, stubs, and `py.typed` when present.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Determine the lowest supported Python version before choosing syntax or typing features.
- Determine the lowest supported Python version before choosing standard-library features, changed defaults, syntax, or typing features.
- Read package layout and import style before editing imports.
- Read framework, adapter, or entry-point boundaries before moving data shapes across layers.
- Treat global machine Python state as irrelevant unless the project explicitly declares it.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep existing packaging tools and layout unless the user explicitly asks for a packaging migration.
- Add or adjust type hints at public boundaries, complex return values, and external input boundaries.
- Follow existing test style, fixtures, parametrization, and lint/type strictness.
- Do not lower Ruff, mypy, pyright, pytest, or packaging strictness to hide a failure.
- Keep import fixes in package metadata, package discovery, entry points, or test invocation contracts instead of path hacks.
- Make resource ownership explicit: code closes only the resources it creates.
- Translate external data and third-party failures at boundaries instead of leaking framework, SDK, ORM, raw JSON, or environment shapes into domain logic.

<!-- mustflow-section: procedure -->
## Procedure

1. Read project metadata, Python version constraints, dependency files, and test/lint/type configs.
2. Identify the boundary touched: runtime version, package API, import root, packaging metadata, architecture layer, CLI entry, test fixture, async resource ownership, external input, exception/logging/retry path, performance-sensitive collection path, or dependency contract.
3. For packaging and import changes, separate the distribution name from the import package name. Check package directory mapping, package discovery settings, namespace package behavior, package data, entry points, optional dependencies, and `requires-python` before touching imports.
4. For `pyproject.toml`, keep build metadata, package metadata, and tool settings separate:
   - `[build-system]` names the build backend and build requirements;
   - `[project]` names distribution metadata, runtime dependencies, Python support, scripts, optional dependencies, and package typing signals;
   - `[tool.*]`, dependency groups, uv or Poetry settings, and lockfiles are tool or environment contracts, not a substitute for wheel metadata.
5. Treat `src` layout as an installation contract. Importable code under `src/` should be tested through the supported installed-package path, not by making repository files accidentally importable from the working directory.
6. Match existing package layout and import conventions. Do not add `sys.path`, `site.addsitedir`, `PYTHONPATH`, pytest `pythonpath`, ad hoc import loading, or test `conftest.py` import hacks to make package imports pass.
7. Do not add `__init__.py` to tests as a blind fix. Add it only when tests are intentionally a package and the import-mode behavior remains explicit.
8. For packaging changes, distinguish development and release contracts:
   - editable installs prove the local development path;
   - wheel installs or equivalent built artifacts prove the release path;
   - editable installs may not reflect entry point, dependency, package metadata, C extension, or package data changes until reinstall or rebuild;
   - build dependencies, runtime dependencies, optional dependencies, and dependency groups are different contracts;
   - apps should pin or lock environments; libraries should publish compatible dependency ranges instead of over-pinning downstream users;
   - uv, Poetry, pip, and build backends each own different parts of the workflow; do not mix their metadata as competing sources of truth;
   - entry point, dependency, optional dependency, metadata, and package data changes require reinstall-oriented verification when a configured intent exists;
   - installed console scripts or plugin entry points should be smoke-tested through the installed entry point contract, not by directly running a source file.
9. Verify import origin when packaging risk is present. The public package should resolve from the installed environment intended by the project, not from accidental repository-root files.
10. Preserve architecture boundaries:
   - keep framework request objects, ORM models, SDK clients, raw JSON, environment variables, and CLI parser output in adapter layers;
   - convert external input into explicit DTOs, dataclasses, value objects, or validated models before domain logic uses it;
   - name modules by responsibility instead of dumping shared behavior into `utils.py`, `helpers.py`, or `common.py`;
   - keep import direction one-way and treat circular imports as architecture evidence, not only a runtime nuisance;
   - prefer protocols or narrow callable/data contracts over inheritance when callers only need behavior shape.
11. Validate unknown external data before treating it as typed domain data. Type hints do not enforce runtime values; boundary validation owns JSON, form, CSV, queue, environment, and third-party API input.
12. Keep type-checking honest:
   - treat `Any`, bare generics, untyped imports, `cast`, broad `type: ignore`, false `TypeGuard` or `TypeIs`, and runtime `Protocol` checks as trust-boundary risks;
   - prefer `object` plus narrowing over `Any` when a value is unknown but operations must be checked;
   - require scoped `# type: ignore[...]` with a local reason when the project policy allows ignores;
   - do not use `cast()` as conversion; add parsing, validation, or a checked adapter when runtime shape is uncertain;
   - keep `None` explicit in signatures and return shapes instead of returning `None` from non-optional contracts;
   - when publishing typed packages, keep `py.typed`, stubs, and public exports aligned.
13. Choose standard-library helpers by semantic contract and supported Python version:
   - prefer cardinality-explicit iteration such as `zip(strict=True)`, `itertools.batched(..., strict=True)`, or Python 3.14+ `map(strict=True)` only when unequal lengths are a bug and the declared runtime supports the API;
   - do not use `itertools.groupby` as a database-style grouping primitive unless input ordering and group materialization are intentional;
   - avoid shared mutable defaults; use `default_factory` or an existing local construction pattern for per-instance mutable state;
   - prefer `importlib.resources` for packaged data, `tomllib` for TOML reads, and `Path.walk()` only after checking version support, pruning behavior, symlink recursion, ordering, and cycle risks;
   - use dataclass options such as `slots`, `frozen`, and `kw_only`, `StrEnum`, `TypedDict`, or `Protocol` only when they match the public shape and runtime/type-checker support;
   - treat `functools.cache`, `lru_cache`, `cached_property`, `partial`, and Python 3.14+ `Placeholder` as state, memory, concurrency, and versioned-API choices rather than harmless terseness.
14. Review collection and iterator performance when code can scale with input size:
   - avoid list membership inside large loops, `pop(0)`, repeated list concatenation, large loop slices, and hot-path `deepcopy`;
   - use `set`, `dict`, `deque`, `Counter`, `heapq`, `join`, comprehensions, or `itertools` when they match the data contract;
   - treat generators as one-shot streams; do not add hidden `list()`, `sorted()`, `len()`, `tee()`, or `cycle()` materialization without memory reasoning;
   - rebuild large dicts after bulk deletion when long-lived memory and iteration cost matter;
   - avoid eager default factories hidden in `dict.get(key, expensive())` or `setdefault(key, expensive())`.
15. Treat newer syntax and typing features as semantic tools, not style trophies:
   - use Python 3.14+ template string literals only when a handler needs the static and interpolated parts separately, such as SQL builders, shell command objects, logging templates, or markup renderers; do not replace ordinary f-strings when the result is just a string;
   - when runtime code reads annotations, use Python 3.14+ `annotationlib` or the official inspection API supported by the declared runtime, and choose the intended format explicitly instead of assuming `__annotations__` already contains runtime values;
   - use sentinel values to distinguish "argument omitted" from `None`, but compare sentinels by identity and keep public signatures readable; in the official snapshot checked on 2026-07-11, the built-in sentinel facility was Python 3.15+ prerelease-only, so refresh the current release status before adoption;
   - prefer `Mapping` or narrower read-only protocols for read-only inputs so immutable mapping implementations are not rejected accidentally;
   - use closed or extra-key `TypedDict` forms only when the supported Python and type-checker versions agree with that shape; the Python 3.15-only forms were prerelease-only in the official snapshot checked on 2026-07-11, so refresh status before adoption.
16. Keep `finally` as cleanup, not outcome selection. Do not add `return`, `break`, or `continue` inside `finally` blocks because they can mask exceptions and cancellation; move result decisions outside cleanup or make suppression an explicit documented contract.
17. Use Python 3.15+ explicit lazy imports only for startup-sensitive module-scope dependencies after checking version support and import-time side effects. The syntax was prerelease-only in the official snapshot checked on 2026-07-11; refresh the current Python 3.15 release status before placing it in stable-target examples. Do not lazily import plugins, registries, monkey patches, model definitions, ORM mappings, or observability setup whose import side effects are part of startup correctness.
18. Keep process, archive, and concurrency safety explicit:
   - subprocess calls use argument lists, checked failure handling, timeouts, bounded captured output, and a narrow `shell=True` exception when the project already permits it;
   - archive extraction, including `tarfile`, keeps untrusted archive inspection, extraction filters, partial-extract cleanup, and older-runtime defaults visible;
   - `asyncio.TaskGroup`, `asyncio.timeout`, and `asyncio.to_thread` are used only when their cancellation, timeout, blocking-work, and Python-version semantics fit the surrounding lifecycle.
19. Use runtime diagnostics as evidence, not as permanent workaround code. Interpreter or library diagnostics such as import timing, `tracemalloc`, `faulthandler`, profiling, and allocation tracing should go through configured diagnostic or verification intents when available, and missing intents should be reported instead of adding ad hoc command recipes to the skill.
20. Preserve async and resource ownership:
   - every coroutine is awaited, returned by contract, or scheduled as an owned and tracked task;
   - raw background task creation is allowed only through the project's owner or spawn helper, a task group, or an equivalent lifecycle mechanism;
   - background tasks keep a strong reference, have a shutdown path, and retrieve failures instead of leaving never-retrieved exceptions;
   - cancellation is control flow, so cleanup uses `finally` and cancellation is re-raised after cleanup unless suppression is the documented behavior;
   - choose `TaskGroup` over `gather()` when sibling task failure must cancel the rest;
   - bound fan-out with semaphores, queues, worker pools, or an existing local concurrency primitive;
   - propagate absolute deadlines or remaining budgets through nested calls instead of resetting relative timeouts at every layer;
   - cancel and await pending tasks after `asyncio.wait()` timeouts;
   - async functions do not call blocking I/O, blocking sleeps, long CPU work, or blocking subprocess waits directly unless the project has an explicit executor or isolation pattern;
   - context managers and async context managers do not suppress exceptions unless suppression is the feature;
   - context-manager helpers that catch exceptions for logging re-raise after logging;
   - early-exit async generators have an explicit close path.
21. Preserve failure evidence:
   - translate external exceptions into domain exceptions at boundaries with `raise ... from exc`;
   - do not use `except Exception: pass`, broad `BaseException` catches, or fallback returns that hide failures;
   - use `logger.exception()` only inside exception handlers or preserve exception info explicitly;
   - configure logging so module loggers propagate through a deliberate root or parent handler, existing loggers are not disabled accidentally, and slow handlers are isolated when request latency matters;
   - keep retry finite, jittered or backed off where appropriate, idempotent, and owned by one layer;
   - make fallback a visible degraded path with logs, metrics, or response metadata rather than silent success.
22. Preserve public contracts:
   - treat public imports, public signatures, exceptions, return shapes, CLI behavior, entry points, config keys, environment variables, dependency metadata, extras, Python version support, and typing stubs as compatibility-sensitive;
   - do not change sync functions into async functions, accepted input shapes, nullable behavior, documented exception types, tuple/dict/dataclass return shapes, config precedence, or environment variable semantics without a compatibility review;
   - typed packages should keep runtime and typing surfaces aligned, including `py.typed` and stubs when present.
23. Preserve test truth:
   - keep pytest fixtures small, with one state-changing responsibility and cleanup coupled to that state;
   - treat fixture scope and autouse as isolation decisions, not speed knobs;
   - avoid mutable `parametrize` values unless each case receives a fresh object;
   - use `tmp_path`, scoped `monkeypatch`, and patch the namespace where code looks up the object;
   - prefer mock `autospec`, `spec_set`, and `AsyncMock` await assertions so tests cannot lie about signatures or async execution;
   - use log assertions to check operational signals, not only message text;
   - use property-based tests when behavior is an invariant over an input space and existing project dependencies support it.
24. Avoid mutable default arguments, broad `except Exception: pass`, broad `BaseException` catches outside process boundaries, global state hidden behind module imports, `finally` masking, and path handling that ignores existing `pathlib` or OS conventions.
25. Use `# type: ignore[...]` only when tightly scoped, justified, and consistent with local policy.
26. If packaging, public API, CLI, config, typing, async, retry, logging, or test contracts change, synchronize README examples, entry point tests, build metadata, docs, fixtures, and downstream-style examples that describe installation or usage.
27. Choose configured verification intents that cover formatting, lint, type checking, tests, package build, installed-package smoke checks, and CLI smoke risk when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- The code respects the declared Python version and packaging layout.
- Python-version-gated standard-library features and changed runtime defaults are accepted only when the declared support matrix allows them.
- Imports work from the project-supported execution path.
- Packaging changes distinguish development imports from release artifact imports.
- Framework, ORM, SDK, raw input, and environment data stay outside the domain core unless intentionally adapted.
- Runtime validation, type hints, and published typing metadata agree at public and external-input boundaries.
- Async tasks, context managers, files, clients, pools, subprocesses, and generators have visible ownership and cleanup.
- Exceptions, logs, retries, timeouts, and fallback paths preserve cause, deadline, idempotency, and degraded-state evidence.
- Collection and iterator changes have size, copy, and materialization behavior reviewed when relevant.
- Public API, CLI, config, environment, dependency metadata, and typing contract changes are called out.
- Type and lint strictness are not weakened.
- Tests or skipped verification are tied to the changed behavior, with fixture/mock/async/logging risks named when relevant.

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
- If build backend, package manager, lockfile, dependency group, optional dependency, or editable-install behavior is ambiguous, keep the existing owner and report the missing packaging contract instead of migrating tools.
- If the supported Python version blocks a syntax choice, rewrite to the supported form.
- If the supported Python version blocks a standard-library feature, changed default, diagnostic flag, or helper API, use the supported equivalent or report the runtime-support decision instead of silently raising `requires-python`.
- If Python 3.14 template strings or annotation inspection are useful but the project supports older runtimes, keep a fallback or report the required stable-runtime bump.
- If Python 3.15 lazy imports, built-in sentinels or immutable mappings, or advanced `TypedDict`
  shapes are useful, first refresh the official release and feature status. When the target remains
  prerelease, keep them out of stable-target code and examples unless the repository explicitly
  adopts that prerelease track.
- If third-party stubs or package metadata are wrong, document the local workaround and keep it narrow.
- If `Any`, `cast`, `type: ignore`, runtime `Protocol`, or type guard behavior is needed, keep it local, justified, and backed by runtime validation or tests where the type claim can lie.
- If performance risk appears in collections, generators, copies, or caches, report the input-size assumption or use an existing benchmark/profile intent when configured.
- If a background task lacks owner, shutdown, strong reference, or exception retrieval, do not add it.
- If cancellation or context-manager behavior is swallowed accidentally, restore propagation or document the intentional suppression contract.
- If retry, timeout, or fallback lacks idempotency, deadline, owner layer, or degraded-state evidence, keep the failure explicit instead of adding hidden recovery.
- If resource cleanup cannot be proven, use the project's context manager, exit stack, fixture, or lifecycle pattern before broadening tests.
- If tests require broad fixtures, autouse state, unscoped monkeypatching, bare mocks, or mutable parametrization, narrow the test seam before trusting the result.
- If public contracts change without compatibility evidence, stop and report the breaking-change or deprecation requirement.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Runtime and packaging assumptions
- Files changed
- Architecture, type, lint, import, async, failure, performance, and test notes
- Command intents run
- Skipped checks and reasons
- Remaining Python risk
