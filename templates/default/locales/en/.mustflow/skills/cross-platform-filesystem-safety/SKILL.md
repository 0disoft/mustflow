---
mustflow_doc: skill.cross-platform-filesystem-safety
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: cross-platform-filesystem-safety
description: Apply this skill when file paths, directories, symlinks, reparse points, real paths, path traversal, reserved names, null bytes, atomic file writes, temporary files, file copies, generated outputs, Windows/POSIX path behavior, line endings, file permissions, durable writes, or filesystem cleanup are created, changed, reviewed, or reported.
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

<!-- mustflow-section: procedure -->
## Procedure

1. Classify each path as trusted repository path, user input, generated state, template source, package artifact, temporary file, external path, or unknown.
2. Reject impossible or dangerous path text early. Check null bytes, empty segments, absolute paths where relative paths are required, Windows device names such as `CON` or `NUL`, namespace prefixes such as `\\?\`, alternate data streams using colon segments, trailing dots or spaces when Windows compatibility matters, and platform-invalid characters before writing.
3. Establish the base boundary. Use normalized repository-relative paths for storage and real-path checks for filesystem safety when symlinks may be present.
4. Use Unicode normalization for validation only when detecting platform aliases such as superscript Windows device-name variants. Do not rewrite or persist normalized filenames unless the repository policy explicitly says so.
5. Check containment with path-aware logic. Prefer relative-path or resolved-path containment helpers over raw string prefixes, and include a path-separator boundary so partial path traversal cannot let sibling names masquerade as children.
6. Check case behavior explicitly. Windows and many macOS volumes preserve case but compare case-insensitively by default; POSIX commonly compares case-sensitively. State whether the code preserves spelling, rejects conflicting names, or relies on the host filesystem.
7. Check symlink, reparse point, and junction behavior explicitly. Decide whether they are rejected, followed only within the root, or treated as ordinary path entries. Test dangling, outside-target, loop, and junction-like cases when relevant.
8. Close time-of-check to time-of-use gaps where practical. Prefer opening or writing through safe helpers that reject symlinks at the final operation, then verify the opened target when the platform and helper support it.
9. Treat high-level path APIs as incomplete defenses when the runtime cannot expose descriptor-relative open, no-follow, or opened-file verification. Do not claim race-free behavior from resolve-then-open code alone.
10. Check traversal and root handling across platforms. Account for absolute paths, drive letters, UNC-like paths, mixed separators, empty paths, dot segments, reserved names, long paths, and case sensitivity where relevant.
11. For writes, prefer same-directory temporary-file then rename or replace behavior when readers may observe the file. Keep the temporary file on the same volume, use unpredictable names, least-privilege creation permissions, and safe no-follow writes when the project already has that helper.
12. Treat atomic writes as platform-specific. POSIX rename semantics, Windows replacement behavior, cross-filesystem moves, network filesystems, fsync availability, and directory fsync support differ; report best-effort guarantees honestly.
13. When durable writes matter, include the full durability sequence where the platform supports it: write the temporary file, flush the file data, close it, rename or replace it, then flush the parent directory entry. If parent directory fsync is unavailable, downgrade the durability claim.
14. For copies and updates, close the check-then-write gap as much as the platform and existing helpers allow. Do not report symlink safety if the final write can still follow a changed symlink.
15. For privileged Windows services, check whether reparse-point traversal mitigations belong at process startup. If the code cannot enable or verify them, report the remaining junction risk instead of claiming system-level protection.
16. For deletes and cleanup, verify the resolved absolute target is inside the intended generated or temporary directory and narrow the deletion scope.
17. For scans, bound recursion, generated/vendor exclusions, file size, symlink traversal, reparse-point traversal, loop detection, and maximum path length or depth where relevant.
18. Keep path output stable for users and automation. Report repository-relative paths unless an absolute path is necessary for local diagnosis.
19. Add focused tests for the highest-risk path shapes instead of broad platform speculation.

<!-- mustflow-section: postconditions -->
## Postconditions

- Path boundaries, invalid-name policy, case policy, symlink and reparse-point policy, write strategy, cleanup strategy, durability expectations, and platform assumptions are explicit.
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
- If a test depends on platform-specific symlink support or permissions, state the platform boundary and keep assertions narrow.
- If cleanup might remove user data, do not proceed without a tighter generated-state boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Filesystem surface reviewed
- Path trust classes, invalid-name handling, case policy, and root boundary
- Null byte, reserved-name, Unicode normalization, namespace prefix, alternate data stream, symlink, reparse-point, traversal, race, atomic write, durability, permission, copy, delete, scan, and cleanup decisions
- Windows/POSIX assumptions and skipped platform checks
- Tests or fixtures added or reused
- Command intents run
- Remaining filesystem safety risk
