---
mustflow_doc: skill.dart-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: dart-code-change
description: Apply this skill when Dart source, pub package metadata, null safety, async Futures or Streams, isolates, analyzer lints, tests, CLI entry points, or public package APIs are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.dart-code-change
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

# Dart Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Dart null-safety, async, stream, isolate, package API, analyzer, and test boundaries. Treat `!`, `late`, `dynamic`, broad casts, `.cast<T>()`, `.asBroadcastStream()`, and `unawaited()` as risk markers, not fixes.

<!-- mustflow-section: use-when -->
## Use When

- `.dart`, `pubspec.yaml`, `analysis_options.yaml`, lockfiles, `lib`, `bin`, `test`, `example`, or public exports change.
- The task touches nullable types, `!`, `late`, `dynamic`, casts, raw generics, `Future`, `Stream`, `StreamController`, `StreamSubscription`, isolates, analyzer lints, pub package layout, package exports, `bin` entrypoints, README examples, or package versioning.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is Flutter widget or platform UI behavior; use `flutter-code-change` and this skill only as an adjunct for shared Dart package/API risk.
- Dart files are read only for orientation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- `pubspec.yaml`, analyzer config, package layout, public export files, `lib/src` exports, examples, README snippets, CLI entrypoints, tests, and lockfile policy.
- Existing null-safety, async, exception, and package API conventions.
- SDK constraints, dependency constraints, executables, public dependency types, and versioning policy when package API changes.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify whether the change affects public exports, `lib/src` exposure, internal implementation, CLI behavior, async lifecycle, package metadata, or tests.
- Treat nullable values, decoded data, map lookups, user input, streams, subscriptions, ports, and isolate messages as boundaries that need explicit ownership and validation.
- Classify any public nullability, callback, `Future<T>`, `Stream<T>`, generic bound, or default-value change before editing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Narrow nullable values at boundaries and keep core logic non-null where truthful.
- Use `unawaited` only when detached behavior is intentional, documented, and has local error handling.
- Cancel subscriptions, close controllers, and document isolate message shape where relevant.
- Keep public API changes synchronized with examples and docs.
- Strengthen analyzer boundaries when the project already uses strict linting; do not weaken analyzer or lint rules to pass the current patch.

<!-- mustflow-section: procedure -->
## Procedure

1. Read package metadata, analyzer config, public exports, nearby implementation, tests, and examples.
2. Classify the touched boundary: nullability, public API, package layout, async `Future`, `Stream`, isolate, exception mapping, or test-only.
3. Identify every nullable boundary: JSON decode, HTTP response, DB row, environment variable, CLI args, platform channel, isolate message, external callback, cache miss, map lookup, and dependency lookup.
4. Accept external or decoded data as `Object?` at the boundary, validate it in a parser or codec layer, and let only typed domain objects leave that boundary. Do not let `dynamic` flow into internal code.
5. Distinguish missing optional data from invalid required data. Optional business facts may stay nullable; required facts should be validated once and remain non-nullable afterward.
6. Do not use `!`, `dynamic`, `late`, broad `as` casts, raw generic types, or `.cast<T>()` as shortcuts around design uncertainty.
7. Allow `!` only when the same local block has a visible guard proving non-null and flow analysis cannot express it. Prefer early return, throw, or local-variable promotion.
8. Avoid `late` fields for initialization-order problems. Prefer constructor injection, async factory construction, explicit state objects, or stored `Future<T>` initialization. `late final` still needs read-after-initialize evidence when public behavior depends on it.
9. Replace broad JSON and collection casts with checked parsers that report the failing field path when feasible.
10. Ensure every `Future` is awaited, returned, stored for later awaiting or cancellation, or intentionally detached with documented `unawaited` plus local error handling.
11. Use `Future<void>` for public async APIs that complete later or can fail but do not produce a value. Avoid public `void async` except where a framework callback type requires it.
12. Ensure every stream subscription, controller, sink, timer, socket, file watcher, receive port, or isolate has an owner and explicit shutdown path. Await cleanup futures when the API exposes them.
13. Do not use `.asBroadcastStream()` to hide accidental multiple listens. Determine whether the source is truly broadcast, or create an explicit fan-out owner.
14. For `StreamController`, connect external resource creation and pause/resume/cancel behavior to the controller lifecycle when buffering or resource usage matters.
15. For `async*` functions wrapping external resources or upstream subscriptions, release resources in a `finally` path.
16. For long-lived isolates, define startup, request and response message shapes, error propagation, shutdown messages, receive-port closing, and isolate termination.
17. Do not import another package's `src` implementation. Treat symbols exported from this package's public libraries as public API even when their files live under `lib/src`.
18. If public exports change, update examples, README snippets, CLI smoke surfaces, and tests that represent consumer behavior when present.
19. Choose configured verification intents that cover analyzer, formatting, tests, package build, dependency bounds, publish dry-run, examples, CLI behavior, and public API risk when available.

<!-- mustflow-section: null-safety-policy -->
## Null-Safety Policy

- `!`, `late`, `dynamic`, broad `as`, raw generic types, `.cast<T>()`, and nullable-to-non-nullable casts are risk markers.
- Nullable values should be narrowed at the boundary. Core domain objects should be non-nullable when the value is required.
- `Object?` is preferred over `dynamic` for raw external input because it forces validation before use.
- Required fields that are missing should fail at the parser or constructor boundary. Do not make required domain fields nullable only to avoid validation.
- `late` should not hide initialization order. Use it only when local construction or framework lifecycle makes the initialization proof clear and the risk is reported.
- Public API nullability changes require compatibility classification before version changes.

<!-- mustflow-section: async-resource-policy -->
## Async And Resource Policy

- Every future expression must be awaited, returned, stored for later awaiting or cancellation, or intentionally detached with documented `unawaited` and local error handling.
- `unawaited` must not be used only to silence analyzer warnings. Detached work needs an error sink and a reason.
- `Future` error handling should be attached before the future completes; prefer straightforward `await` with try/catch where local recovery is needed.
- Every `StreamSubscription` needs an owner and a lifecycle method that cancels it.
- Every `StreamController`, sink, timer, socket, watcher, port, or isolate needs an explicit close, cancel, kill, or shutdown path.
- Long-lived isolates must define message contracts, errors, shutdown, port ownership, and termination behavior.

<!-- mustflow-section: public-api-policy -->
## Package Public API Policy

Public surface includes importable files under `lib`, exports from the main library, exported `lib/src` symbols, public classes, functions, typedefs, extensions, enums, constructors, fields, getters, setters, generic bounds, callback signatures, future and stream element types, documented errors, and `bin` executables.

- Do not treat `lib/src` as public unless a public library exports it.
- Do not import another package's `lib/src`.
- Nullability, required named parameters, default values, generic bounds, callback signatures, `Future<T>` and `Stream<T>` element types, dependency types in public signatures, CLI args, stdout/stderr shape, and exit codes are compatibility-sensitive.
- If a public API exposes a dependency type, dependency constraints become part of the public contract. Check lower-bound and upper-range compatibility when configured verification exists.
- README and `example` code are consumer smoke surfaces. Keep them aligned with public API changes.
- CLI entries under `bin` are public behavior. Command names, args, exit codes, and output formats need compatibility review.

<!-- mustflow-section: rejection-criteria -->
## Review Rejection Criteria

Reject or revise the patch when any of these appear without explicit evidence and risk reporting:

- New `!`, `late`, `dynamic`, raw generic types, broad `as`, `.cast<T>()`, nullable-to-non-nullable casts, or analyzer ignores used only to make errors disappear.
- Decoded JSON, platform messages, isolate messages, CLI args, environment values, map lookups, or external callbacks trusted without boundary parsing.
- Required domain values made nullable instead of validating the boundary.
- A future expression is neither awaited, returned, stored, nor intentionally detached with error handling.
- Public `void async` is added where `Future<void>` would preserve completion and error signaling.
- Stream subscriptions, controllers, ports, timers, sockets, watchers, or isolates are created without cleanup ownership.
- `.asBroadcastStream()` is used to hide a design problem around multiple listeners.
- Public nullability, generic bound, callback, `Future<T>`, `Stream<T>`, export, CLI, SDK constraint, dependency constraint, or executable behavior changes without compatibility classification.

<!-- mustflow-section: postconditions -->
## Postconditions

- Nullability and async ownership are explicit.
- Public package API impact is known.
- Analyzer and tests were preserved or skipped with reason.
- No safety boundary was hidden behind `!`, `dynamic`, `late`, casts, `unawaited`, or analyzer ignores without a risk note.
- Examples, README snippets, CLI entrypoints, and package metadata are synchronized when public behavior changes.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing package publish or analyzer verification intents rather than inventing tool commands.

When the repository exposes configured intents for these surfaces, cover strict analyzer checks, tests, package dry-run, dependency lower and upper bound checks, example or README analysis, CLI smoke behavior, and consumer-style public-import checks.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If nullable data cannot be narrowed safely, report the missing validation boundary.
- If stream or isolate lifetime is unclear, avoid adding more asynchronous ownership until the owner is identified.
- If public API compatibility is unclear, report the consumer risk and the changed public symbols or executables.
- If analyzer/lint rules block the patch, fix the code or report the real boundary issue instead of weakening analysis.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Nullability, async, stream, or API notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Dart risk
