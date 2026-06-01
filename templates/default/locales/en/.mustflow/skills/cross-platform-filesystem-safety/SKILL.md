---
mustflow_doc: skill.cross-platform-filesystem-safety
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: cross-platform-filesystem-safety
description: Apply this skill when file paths, directories, symlinks, reparse points, real paths, path traversal, reserved names, null bytes, atomic file writes, temporary files, file copies, generated outputs, clone or checkout materialization, Windows/POSIX path behavior, line endings, file permissions, durable writes, failure classification, or filesystem cleanup are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cross-platform-filesystem-safety
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Cross-Platform Filesystem Safety

<!-- mustflow-section: purpose -->
## Purpose

Keep filesystem behavior safe across Windows and POSIX while preventing path traversal, symlink escapes, unsafe overwrites, stale generated output, and platform-only assumptions.

<!-- mustflow-section: use-when -->
## Use When

- Code creates, reads, writes, deletes, copies, moves, normalizes, scans, watches, or reports files or directories.
- A change handles user-provided paths, repository-relative paths, real paths, symlinks, Windows reparse points or junctions, temporary files, generated output, backups, manifests, locks, caches, or latest pointers.
- Code materializes large or externally sourced trees such as Git checkouts, cloned repositories, project scaffolds, dependency trees, archive extractions, template installs, generated snapshots, or package artifacts.
- Behavior must work on Windows and POSIX path separators, drive roots, case differences, reserved names, maximum path lengths, executable extensions, line endings, permissions, or rename semantics.
- A test or final report claims a path is inside the project, symlink-safe, traversal-safe, race-safe, atomic, idempotent, cleanup-safe, or cross-platform.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes in-memory strings and does not touch or claim filesystem behavior.
- The change only adjusts Git line-ending policy; use `line-ending-hygiene`.
- A generated artifact is only being packaged or referenced and not written or path-validated; use `artifact-integrity-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Affected path inputs, output paths, base directory, trust boundary, and whether each path is user-controlled, template-controlled, generated, or repository-owned.
- Current filesystem helpers, path validation rules, symlink policy, case-sensitivity policy, write strategy, cleanup strategy, temporary-file strategy, permission strategy, and platform expectations.
- Expected behavior for missing paths, existing files, directories, symlinks, dangling symlinks, reparse points or junctions, path traversal, null bytes, Windows namespace prefixes, Windows reserved names, alternate data streams, trailing spaces or dots, collisions, long paths, large files, and permissions errors.
- Path-length, filename-length, collision, staging, promotion, and cleanup expectations for clone, checkout, scaffold, install, archive, and generated-tree flows, including the deepest known entry path when available.
- Failure classification expectations for filesystem and platform errors such as Windows path length, POSIX `ENAMETOOLONG`, reserved names, case collisions, Unicode aliases, file locks, permissions, quota, cross-device moves, missing executable bits, line endings, watcher limits, and descriptor limits.
- Whether atomicity requires best-effort rename, same-directory temporary files on the same volume, file fsync, parent directory fsync, Windows replacement behavior, or reader-safe latest pointers.
- Relevant command-intent entries for tests, docs, release, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Existing repository filesystem helpers have been inspected before adding a new helper.
- Security and privacy review is applied first when paths can expose secrets, personal data, or files outside the project.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update path validation, file helpers, tests, templates, docs, and call sites needed for safe filesystem behavior.
- Prefer repository-local safe helpers over ad hoc path string checks.
- Do not rely on string prefix checks alone when symlinks, drive roots, or real paths matter.
- Do not lowercase paths as a universal containment strategy. Case-insensitive comparison may be appropriate for a specific platform boundary, but it must not collapse distinct POSIX paths or replace real containment checks.
- Do not accept null bytes, Windows device names, namespace bypass prefixes, alternate data streams, or platform-invalid path segments as ordinary filenames.
- Do not recursively delete, overwrite, or copy broad directories unless the target is resolved, bounded, and intentionally owned by the task.
- Do not claim operating-system mitigations such as Windows RedirectionGuard unless the application actually enables and verifies the mitigation in the relevant process boundary.
- Do not change system-wide or user-wide settings such as Windows registry long-path flags, global Git config, Developer Mode, WSL mount metadata, Linux sysctl limits, Docker Desktop storage backends, antivirus exclusions, or shell profile files from this skill. Report the missing prerequisite or require an explicit configured setup command.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify each path as trusted repository path, user input, generated state, template source, package artifact, temporary file, external path, or unknown.
2. Reject impossible or dangerous path text early. Check null bytes, empty segments, absolute paths where relative paths are required, Windows device names such as `CON` or `NUL`, namespace prefixes such as `\\?\`, alternate data streams using colon segments, trailing dots or spaces when Windows compatibility matters, and platform-invalid characters before writing.
3. Establish the base boundary. Use normalized repository-relative paths for storage and real-path checks for filesystem safety when symlinks may be present.
4. Use Unicode normalization for validation only when detecting platform aliases such as superscript Windows device-name variants. Do not rewrite or persist normalized filenames unless the repository policy explicitly says so.
5. For externally sourced trees, use a `preflight -> dangerous operation -> classifier -> safe cleanup` pipeline. Estimate the materialized path budget before writing, including destination root, project directory, generated subdirectories, deepest known repository or archive entry, Windows path-length behavior, POSIX path and component limits, byte limits, case collisions, reserved names, and safety headroom.
6. For Git clone and checkout materialization, prefer an app-owned staging directory and no-checkout or metadata-first flow when feasible. Inspect repository entries before checkout, check them against the final destination, then promote the result only after success. Do not delete a user-selected final destination when checkout fails.
7. For Windows Git checkout or clone materialization, prefer a per-invocation `core.longpaths=true` setting when product code invokes Git. Do not mutate global Git config from application code unless the user explicitly chose that setup action. Long-path support still depends on operating-system, Git, filesystem, and downstream tool behavior, so checkout failures must remain classifiable.
8. For symlink-heavy repositories on Windows, detect whether checkout produced real links or plain-text symlink stubs before running build logic. Report missing Developer Mode, `core.symlinks`, or native symlink support as an environment prerequisite; do not silently replace file symlinks with junctions or copies unless the repository contract explicitly supports that compatibility mode.
9. For POSIX, do not assume that forward slashes make paths safe. Check `ENAMETOOLONG`, byte-based per-component name limits, mount permissions, executable bits, case-sensitive import paths, symlink loops, file descriptor limits, watcher limits, quota, and cross-device rename behavior.
10. Check containment with path-aware logic. Prefer relative-path or resolved-path containment helpers over raw string prefixes, and include a path-separator boundary so partial path traversal cannot let sibling names masquerade as children.
11. Check case behavior explicitly. Windows and many macOS volumes preserve case but compare case-insensitively by default; POSIX commonly compares case-sensitively. State whether the code preserves spelling, rejects conflicting names, or relies on the host filesystem.
12. Check collisions before materializing Git trees, archives, generated files, uploaded names, or dependency trees. Include case-only collisions, Unicode normalization aliases, reserved Windows names with extensions, trailing dot or space aliases, duplicate archive entries, and byte-limit collisions from multibyte names.
13. Check symlink, reparse point, and junction behavior explicitly. Decide whether they are rejected, followed only within the root, or treated as ordinary path entries. Test dangling, outside-target, loop, text-stub, and junction-like cases when relevant.
14. Close time-of-check to time-of-use gaps where practical. Prefer opening or writing through safe helpers that reject symlinks at the final operation, then verify the opened target when the platform and helper support it.
15. Treat high-level path APIs as incomplete defenses when the runtime cannot expose descriptor-relative open, no-follow, or opened-file verification. Do not claim race-free behavior from resolve-then-open code alone.
16. Check traversal and root handling across platforms. Account for absolute paths, drive letters, UNC-like paths, mixed separators, empty paths, dot segments, reserved names, long paths, and case sensitivity where relevant.
17. Classify filesystem failures before generic network, auth, or unknown failures. Use stable categories such as `path_too_long`, `filename_too_long`, `byte_limit_exceeded`, `invalid_path`, `reserved_name`, `case_collision`, `unicode_collision`, `symlink_escape`, `permission_denied`, `file_locked`, `cross_device_move`, `disk_full_or_quota`, `executable_bit_missing`, `line_ending_mismatch`, `watcher_limit`, and `descriptor_limit`.
18. For writes, prefer same-directory temporary-file then rename or replace behavior when readers may observe the file. Keep the temporary file on the same volume, use unpredictable names, least-privilege creation permissions, and safe no-follow writes when the project already has that helper.
19. Treat atomic writes as platform-specific. POSIX rename semantics, Windows replacement behavior, cross-filesystem moves, network filesystems, fsync availability, and directory fsync support differ; report best-effort guarantees honestly.
20. When durable writes matter, include the full durability sequence where the platform supports it: write the temporary file, flush the file data, close it, rename or replace it, then flush the parent directory entry. If parent directory fsync is unavailable, downgrade the durability claim.
21. For copies and updates, close the check-then-write gap as much as the platform and existing helpers allow. Do not report symlink safety if the final write can still follow a changed symlink.
22. For privileged Windows services, check whether reparse-point traversal mitigations belong at process startup. If the code cannot enable or verify them, report the remaining junction risk instead of claiming system-level protection.
23. For host environment limitations such as long-path registry flags, Developer Mode, WSL metadata mounts, Linux inotify/sysctl limits, Docker Desktop volume backend, or antivirus locks, classify and report the environment prerequisite. Do not perform privileged host repair from ordinary file logic.
24. Distinguish disk and quota errors from watch or descriptor exhaustion. In a watcher or scanner path, `ENOSPC` may mean an inotify watch limit rather than a full disk, and `EMFILE` or similar failures may indicate a per-process or per-user file-descriptor limit.
25. For deletes and cleanup, verify the resolved absolute target is inside the intended generated or temporary directory and narrow the deletion scope. Preserve bounded diagnostic evidence before deleting partial clone, checkout, scaffold, install, extraction, or generated output. Cleanup may remove only app-owned staging or generated-state paths, never the user-selected destination that the operation was supposed to populate.
26. For scans, bound recursion, generated/vendor exclusions, file size, symlink traversal, reparse-point traversal, loop detection, and maximum path length or depth where relevant.
27. Keep path output stable for users and automation. Report repository-relative paths unless an absolute path is necessary for local diagnosis.
28. Add focused tests for the highest-risk path shapes and failure categories instead of broad platform speculation.

<!-- mustflow-section: postconditions -->
## Postconditions

- Path boundaries, invalid-name policy, case policy, symlink and reparse-point policy, write strategy, cleanup strategy, durability expectations, and platform assumptions are explicit.
- Clone, checkout, scaffold, install, extraction, and generated-tree flows have preflight, staging, promotion, path-length, byte-limit, symlink-stub, collision, diagnostic-preservation, cleanup, and failure-taxonomy policies.
- Host setting prerequisites are reported without unapproved registry, global config, WSL, sysctl, Docker Desktop, antivirus, or shell-profile mutation.
- Dangerous file operations are bounded to known repository-owned or generated locations.
- Atomicity and race-safety claims are scoped to what the current helpers and platform can actually guarantee.
- Any untested platform behavior is reported as remaining risk instead of claimed safe.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use release checks when template files, package artifacts, or installed workflow files are affected.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If root containment is unclear, stop before writing or deleting and report the ambiguous path owner.
- If the platform cannot prove symlink-safe behavior, fail closed or document the exact remaining gap.
- If atomic replace, file fsync, parent directory fsync, no-follow open, or final-target verification is not available on the platform, downgrade the claim to best-effort and keep the write boundary narrow.
- If Unicode normalization, Windows namespace prefixes, alternate data streams, or reparse points could change the effective target, fail closed or report the exact unhandled path class.
- If clone, checkout, scaffold, install, extraction, or generated-tree materialization fails, classify filesystem and platform causes before reporting network, token, auth, dependency, or unknown causes.
- If a fix requires elevated host settings or global user configuration, stop at a clear prerequisite report unless an explicit configured command intent and user request authorize the setup.
- If a test depends on platform-specific symlink support or permissions, state the platform boundary and keep assertions narrow.
- If cleanup might remove user data, do not proceed without a tighter app-owned staging or generated-state boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Filesystem surface reviewed
- Path trust classes, invalid-name handling, case policy, and root boundary
- Null byte, reserved-name, Unicode normalization, namespace prefix, alternate data stream, symlink, reparse-point, traversal, race, atomic write, durability, permission, copy, delete, scan, and cleanup decisions
- Clone, checkout, scaffold, install, extraction, preflight, staging, promotion, path-length, collision, failure-taxonomy, and diagnostic-preservation decisions
- Host-setting prerequisites reported or deferred
- Windows/POSIX assumptions and skipped platform checks
- Tests or fixtures added or reused
- Command intents run
- Remaining filesystem safety risk
