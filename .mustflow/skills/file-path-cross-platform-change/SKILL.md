---
mustflow_doc: skill.file-path-cross-platform-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: file-path-cross-platform-change
description: Apply this skill when file path handling, cross-platform path behavior, path helpers, safe filesystem wrappers, clone or checkout destinations, scaffold roots, temp or cache paths, atomic writes, locks, archive extraction, uploads, downloads, scanners, CLI/API/schema path contracts, snapshots, generated outputs, or package artifact paths are created, changed, reviewed, or reported.
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
- Path behavior appears in CLI arguments, API request or response schemas, config files, snapshots, fixtures, generated output, package artifacts, logs, manifests, caches, temp directories, upload or download flows, archive extraction, repository clone or checkout destinations, project scaffolding, installer output, or scanner output.
- Code clones or checks out repositories, downloads and extracts templates, scaffolds projects, installs dependency trees, or cleans up partially materialized project folders after a filesystem or toolchain failure.
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
- For clone, checkout, scaffold, extract, and install flows: requested source, destination root, final project directory, deepest expected entry when known, path-length budget, component-length budget, byte budget, preflight coverage, partial-output owner, staging directory owner, promotion policy, cleanup policy, and failure classification contract.
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

1. Build a path ledger. List every path field, argument, helper, schema, snapshot, generated output, package artifact, archive entry, clone or checkout destination, scaffold output, installer output, upload/download filename, scanner root, temp/cache path, lock file, and cleanup target touched by the change.
2. Classify each path by trust and owner: trusted repository path, user input, generated state, template path, package artifact, temporary file, cache file, archive-contained path, external path, uploaded name, downloaded name, scanner root, or unknown.
3. Define the allowed root and representation. Decide whether the contract accepts relative paths, absolute paths, URLs, file URLs, archive entry names, package-relative paths, repository-relative paths, or display-only paths.
4. Reject dangerous path text before filesystem access: null bytes, empty names where not allowed, absolute paths where relative paths are required, dot segments where not allowed, Windows device names, drive-relative paths, UNC roots, namespace prefixes, alternate data streams, trailing dots or spaces, reserved characters, and mixed separator bypasses.
5. Treat Windows drive-relative paths such as `C:tmp.txt` as relative to a drive current directory, not as `C:\tmp.txt`.
6. Treat Windows reserved names as reserved even with extensions. Names such as `CON`, `PRN`, `AUX`, `NUL`, `COM1`, and `LPT1` must not become ordinary user filenames.
7. For clone, checkout, scaffold, extract, and install flows, use an explicit `preflight -> dangerous operation -> classifier -> safe cleanup` pipeline. Preflight must estimate the effective path budget before materializing files, including the destination root, project directory, generated path segments, archive or repository entry names when known, operating-system path limits, component-name limits, byte limits, and safety headroom.
8. For Git clone and checkout materialization, do not treat `clone` as one indivisible operation. When feasible, fetch repository metadata into an app-owned staging area without checkout, inspect the tree or manifest entries, check the final destination budget, Windows reserved names, byte limits, Unicode aliases, and case collisions, then perform checkout or promotion only after the destination is known to be safe.
9. Do not clone, extract, scaffold, or install directly into a user-selected final directory when the operation may partially materialize an externally sourced tree. Materialize into an owned staging directory, preserve diagnostics on failure, and promote or move into the final directory only after success.
10. On Windows Git checkout paths, do not assume the operating system long-path setting alone is enough. Product code that invokes Git should prefer per-invocation `core.longpaths=true` configuration when compatible, avoid mutating global Git config without explicit user intent, and still surface a path-specific error if checkout cannot create an entry.
11. Treat POSIX `ENAMETOOLONG`, component-length failures, case-only conflicts on case-sensitive filesystems, missing executable bits, watcher limits, descriptor limits, quota, and mount permission errors as platform failures, not generic application failures.
12. Count bytes where the platform counts bytes. A filename that looks short in characters can exceed component limits when it contains CJK, combining marks, emoji, or mixed normalization forms. Do not treat JavaScript string length, Python `len`, or UI character count as a filesystem byte-budget proof.
13. Do not silently hash, truncate, underscore-prefix, fullwidth-convert, or otherwise rename user, repository, archive, or generated filenames to dodge platform restrictions unless the product contract explicitly defines a reversible mapping, collision handling, display name, migration behavior, and user-facing explanation.
14. Treat macOS and Windows case-insensitive defaults as compatibility risks. Decide whether to reject case-only collisions, preserve spelling, normalize display only, or rely on the host filesystem.
15. Detect candidate collisions before writing when entries come from Git trees, archives, generators, uploads, or package artifacts. Include case collisions, Unicode normalization aliases, reserved names, trailing dot or space aliases, and duplicate archive entries.
16. Do not solve containment with string prefixes. Establish the base real path, resolve or canonicalize the candidate parent when possible, then use path-aware relative containment with a separator boundary.
17. For new files whose final path does not exist yet, canonicalize the existing parent directory and verify that parent remains inside the allowed root.
18. Recheck symlink, junction, reparse-point, and final-target behavior at the operation boundary where the runtime allows it. Do not claim race-free behavior from normalize-then-open code alone.
19. For uploads and downloads, separate displayed filename from storage key. Validate extension, size, content type, magic bytes when relevant, path separators, Unicode aliasing, reserved names, collision policy, overwrite policy, and tenant or user ownership.
20. For archive extraction, validate every entry before extraction. Reject absolute entries, parent traversal, empty names, platform-reserved names, symlink entries unless explicitly supported, hard links unless explicitly supported, duplicate or case-colliding entries, oversized entries, zip bombs, and extraction outside the target root.
21. Do not call extract-all behavior on untrusted archives unless the helper performs per-entry validation and bounded extraction.
22. Classify filesystem and platform errors before reporting a generic network, auth, dependency, or unknown failure. Use a stable taxonomy such as `path_too_long`, `filename_too_long`, `byte_limit_exceeded`, `invalid_path`, `reserved_name`, `case_collision`, `unicode_collision`, `symlink_escape`, `permission_denied`, `file_locked`, `cross_device_move`, `disk_full_or_quota`, `executable_bit_missing`, `line_ending_mismatch`, `watcher_limit`, and `descriptor_limit`.
23. Preserve bounded diagnostic evidence before cleaning up a failed clone, scaffold, extraction, install, or generated-output write. Cleanup may remove only an app-owned staging directory or owned partial output, never an ambiguous parent directory, an existing project directory, or a user-selected final folder.
24. For atomic writes, create the temporary file in the target directory on the same filesystem, use an unpredictable temp name, write, flush, close, replace or rename, and flush the parent directory when the platform and helper support it.
25. Scope atomicity claims. Cross-filesystem moves, network filesystems, Windows sharing violations, antivirus/indexer locks, and missing directory fsync support can downgrade a claim to best effort.
26. For Windows replace or rename failures caused by sharing violations, use bounded retry or report the platform limitation. Do not turn every transient lock into silent data loss.
27. For locks and mutexes, define owner token, stale lock policy, crash recovery, deletion race handling, PID reuse handling, and whether the lock works on local filesystems only. Do not treat a PID file alone as proof of ownership.
28. For scanners, set max depth, max file count, max file size, binary-file handling, ignored directories, hidden-file policy, permission-error behavior, symlink traversal policy, loop detection, deterministic ordering, and output path format.
29. For temp and cache paths, keep them under an owned root, avoid global temp rename into a target location, include cleanup bounds, and avoid leaking user data through predictable names.
30. For CLI, API, schema, snapshot, docs, and package artifact path changes, update every contract surface together. Path spelling, separators, slash policy, absolute/relative policy, escaping, sorting, and error messages are part of the contract.
31. Add focused tests for the riskiest path shapes: traversal, absolute input, drive-relative input, UNC-like input, reserved names, trailing dots or spaces, case collision, Unicode collision, long path, overlong filename, byte-limit overflow with multibyte names, symlink escape, archive traversal, duplicate archive entries, scanner loop, large file cap, clone checkout failure classification, and cleanup boundary.
32. Select verification from the command contract based on risk. Public CLI/API/schema/package artifact changes need broader checks than internal helper-only changes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Path trust classes, accepted path representation, invalid-name policy, case policy, root boundary, symlink and reparse-point policy, archive policy, upload/download policy, scanner policy, atomic-write policy, lock policy, temp/cache policy, and cleanup policy are explicit.
- Path contracts are synchronized across helpers, schemas, CLI/API docs, snapshots, fixtures, generated outputs, package artifacts, tests, and reports.
- Clone, checkout, scaffold, extract, and install flows have explicit preflight, staging, promotion, path-length, collision, platform-failure classification, diagnostic-preservation, and cleanup policies.
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
- If clone, checkout, scaffold, extraction, or install fails mid-materialization, classify filesystem and platform causes before network or auth causes, preserve bounded diagnostics, and cleanup only the owned staging directory or owned partial output.
- If atomic replace, file fsync, parent directory fsync, no-follow open, lock ownership, or final-target verification is unavailable, downgrade the claim and keep the operation bounded.
- If Windows, macOS, Linux, container, CI, or network-filesystem behavior differs and cannot be tested, state the untested platform boundary.
- If cleanup might remove user data or files outside generated state, do not proceed without a tighter owned root.

<!-- mustflow-section: output-format -->
## Output Format

- Path contract changed
- Path ledger and trust classes
- Accepted representation and base-root policy
- Windows, macOS, Linux, byte-limit, Unicode, archive, upload/download, scanner, lock, temp/cache, atomic-write, and cleanup decisions
- Clone, checkout, scaffold, extract, install, preflight, staging, promotion, failure-taxonomy, diagnostic-preservation, and safe-cleanup decisions
- CLI/API/schema/snapshot/generated-output/package artifact surfaces synchronized
- Tests or fixtures added or reused
- Command intents run
- Skipped platform checks and reasons
- Remaining file path cross-platform risk
