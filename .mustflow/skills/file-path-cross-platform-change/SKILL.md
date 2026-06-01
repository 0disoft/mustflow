---
mustflow_doc: skill.file-path-cross-platform-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: file-path-cross-platform-change
description: Apply this skill when file path handling, cross-platform path behavior, path helpers, safe filesystem wrappers, temp or cache paths, atomic writes, locks, archive extraction, uploads, downloads, scanners, CLI/API/schema path contracts, snapshots, generated outputs, or package artifact paths are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.file-path-cross-platform-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# File Path Cross-Platform Change

<!-- mustflow-section: purpose -->
## Purpose

Treat file paths as security boundaries and operating-system contracts, not as ordinary strings.

<!-- mustflow-section: use-when -->
## Use When

- Code accepts, stores, serializes, validates, normalizes, joins, resolves, compares, scans, extracts, uploads, downloads, writes, deletes, locks, packages, or reports paths.
- Path behavior appears in CLI arguments, API request or response schemas, config files, snapshots, fixtures, generated output, package artifacts, logs, manifests, caches, temp directories, upload or download flows, archive extraction, or scanner output.
- A change claims path traversal safety, base-directory containment, symlink safety, junction or reparse-point safety, archive extraction safety, atomic write behavior, durable write behavior, lock ownership, cleanup safety, deterministic scanning, or Windows/macOS/Linux compatibility.
- A test or docs example includes paths that must behave consistently across Windows, macOS, Linux, CI, containers, archives, package artifacts, or user machines.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes in-memory labels and no path is interpreted by an OS, runtime, CLI, API, archive, scanner, package manager, or filesystem helper.
- The task only changes Git line-ending policy; use `line-ending-hygiene`.
- A generated artifact is only referenced or packaged and no path validation, path generation, or artifact path contract changes; use `artifact-integrity-check`.
- The task is only a narrow low-level filesystem helper change with no public path contract; `cross-platform-filesystem-safety` can be used as the narrower adjunct.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Every path input and output, including user input, CLI args, API fields, config fields, archive entries, generated files, temp files, cache paths, lock files, uploaded filenames, download filenames, scanner roots, package artifact paths, and logs.
- The path owner and trust class: user-controlled, repository-owned, generated, temp, cache, archive-contained, package artifact, external file, or unknown.
- The base directory or allowed root, expected relative/absolute policy, symlink and reparse-point policy, case-sensitivity policy, invalid-name policy, atomic-write policy, lock policy, archive extraction policy, scanner bounds, cleanup policy, and platform expectations.
- Current path helpers, safe filesystem wrappers, temp/cache helpers, archive helpers, upload/download helpers, scanners, schema validators, snapshots, and tests.
- Relevant command-intent entries for build, tests, docs, release, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Existing path helpers and safe filesystem wrappers have been inspected before adding a new helper.
- Security and privacy review is applied first when paths can expose secrets, personal data, uploaded files, downloaded files, or files outside an owned root.
- The path contract is classified before editing: internal helper, public CLI, public API, schema, generated output, snapshot, package artifact, archive, upload/download, scanner, temp/cache, lock, or cleanup.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update path validators, path helpers, safe filesystem wrappers, schemas, CLI parsing, API contracts, snapshots, fixtures, docs, tests, package metadata, generated-output paths, archive extraction, scanner bounds, temp/cache handling, locks, and cleanup code that are directly needed for safe path behavior.
- Prefer existing repository path helpers and one shared path contract over ad hoc string manipulation.
- Keep path display format stable for users and automation. Prefer repository-relative paths in output unless absolute paths are required for local diagnosis.
- Do not broaden filesystem access, cleanup roots, scanner roots, archive extraction roots, package artifact globs, or upload/download destinations to make a path bug disappear.

<!-- mustflow-section: procedure -->
## Procedure

1. Build a path ledger. List every path field, argument, helper, schema, snapshot, generated output, package artifact, archive entry, upload/download filename, scanner root, temp/cache path, lock file, and cleanup target touched by the change.
2. Classify each path by trust and owner: trusted repository path, user input, generated state, template path, package artifact, temporary file, cache file, archive-contained path, external path, uploaded name, downloaded name, scanner root, or unknown.
3. Define the allowed root and representation. Decide whether the contract accepts relative paths, absolute paths, URLs, file URLs, archive entry names, package-relative paths, repository-relative paths, or display-only paths.
4. Reject dangerous path text before filesystem access: null bytes, empty names where not allowed, absolute paths where relative paths are required, dot segments where not allowed, Windows device names, drive-relative paths, UNC roots, namespace prefixes, alternate data streams, trailing dots or spaces, reserved characters, and mixed separator bypasses.
5. Treat Windows drive-relative paths such as `C:tmp.txt` as relative to a drive current directory, not as `C:\tmp.txt`.
6. Treat Windows reserved names as reserved even with extensions. Names such as `CON`, `PRN`, `AUX`, `NUL`, `COM1`, and `LPT1` must not become ordinary user filenames.
7. Treat macOS and Windows case-insensitive defaults as compatibility risks. Decide whether to reject case-only collisions, preserve spelling, normalize display only, or rely on the host filesystem.
8. Do not solve containment with string prefixes. Establish the base real path, resolve or canonicalize the candidate parent when possible, then use path-aware relative containment with a separator boundary.
9. For new files whose final path does not exist yet, canonicalize the existing parent directory and verify that parent remains inside the allowed root.
10. Recheck symlink, junction, reparse-point, and final-target behavior at the operation boundary where the runtime allows it. Do not claim race-free behavior from normalize-then-open code alone.
11. For uploads and downloads, separate displayed filename from storage key. Validate extension, size, content type, magic bytes when relevant, path separators, Unicode aliasing, reserved names, collision policy, overwrite policy, and tenant or user ownership.
12. For archive extraction, validate every entry before extraction. Reject absolute entries, parent traversal, empty names, platform-reserved names, symlink entries unless explicitly supported, hard links unless explicitly supported, duplicate or case-colliding entries, oversized entries, zip bombs, and extraction outside the target root.
13. Do not call extract-all behavior on untrusted archives unless the helper performs per-entry validation and bounded extraction.
14. For atomic writes, create the temporary file in the target directory on the same filesystem, use an unpredictable temp name, write, flush, close, replace or rename, and flush the parent directory when the platform and helper support it.
15. Scope atomicity claims. Cross-filesystem moves, network filesystems, Windows sharing violations, antivirus/indexer locks, and missing directory fsync support can downgrade a claim to best effort.
16. For Windows replace or rename failures caused by sharing violations, use bounded retry or report the platform limitation. Do not turn every transient lock into silent data loss.
17. For locks and mutexes, define owner token, stale lock policy, crash recovery, deletion race handling, PID reuse handling, and whether the lock works on local filesystems only. Do not treat a PID file alone as proof of ownership.
18. For scanners, set max depth, max file count, max file size, binary-file handling, ignored directories, hidden-file policy, permission-error behavior, symlink traversal policy, loop detection, deterministic ordering, and output path format.
19. For temp and cache paths, keep them under an owned root, avoid global temp rename into a target location, include cleanup bounds, and avoid leaking user data through predictable names.
20. For CLI, API, schema, snapshot, docs, and package artifact path changes, update every contract surface together. Path spelling, separators, slash policy, absolute/relative policy, escaping, sorting, and error messages are part of the contract.
21. Add focused tests for the riskiest path shapes: traversal, absolute input, drive-relative input, UNC-like input, reserved names, trailing dots or spaces, case collision, symlink escape, archive traversal, duplicate archive entries, scanner loop, large file cap, and cleanup boundary.
22. Select verification from the command contract based on risk. Public CLI/API/schema/package artifact changes need broader checks than internal helper-only changes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Path trust classes, accepted path representation, invalid-name policy, case policy, root boundary, symlink and reparse-point policy, archive policy, upload/download policy, scanner policy, atomic-write policy, lock policy, temp/cache policy, and cleanup policy are explicit.
- Path contracts are synchronized across helpers, schemas, CLI/API docs, snapshots, fixtures, generated outputs, package artifacts, tests, and reports.
- Any race-safety, atomicity, durability, lock, or cross-platform claim is scoped to what the current runtime and helpers can actually guarantee.
- Platform behavior that was not tested is reported as remaining risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer focused tests for helper-only path changes. Use release or package checks when CLI output, schemas, snapshots, generated outputs, package artifacts, template paths, or installed workflow files change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If root containment is unclear, stop before writing, deleting, extracting, scanning, or opening and report the ambiguous path owner.
- If the platform cannot prove symlink-safe behavior, fail closed or report the exact remaining gap.
- If archive entries cannot be validated before extraction, do not extract the archive.
- If atomic replace, file fsync, parent directory fsync, no-follow open, lock ownership, or final-target verification is unavailable, downgrade the claim and keep the operation bounded.
- If Windows, macOS, Linux, container, CI, or network-filesystem behavior differs and cannot be tested, state the untested platform boundary.
- If cleanup might remove user data or files outside generated state, do not proceed without a tighter owned root.

<!-- mustflow-section: output-format -->
## Output Format

- Path contract changed
- Path ledger and trust classes
- Accepted representation and base-root policy
- Windows, macOS, Linux, archive, upload/download, scanner, lock, temp/cache, atomic-write, and cleanup decisions
- CLI/API/schema/snapshot/generated-output/package artifact surfaces synchronized
- Tests or fixtures added or reused
- Command intents run
- Skipped platform checks and reasons
- Remaining file path cross-platform risk
