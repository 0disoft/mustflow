---
mustflow_doc: skill.cross-platform-filesystem-safety
locale: en
canonical: true
revision: 9
lifecycle: mustflow-owned
authority: procedure
name: cross-platform-filesystem-safety
description: Apply this skill when file paths, URI path components, directories, file descriptors or handles, symlinks, hard links, reparse points, junctions, mount points, real paths, path traversal, reserved names, null bytes, NTFS alternate data streams, Windows 8.3 short names, Windows namespace prefixes, atomic file writes, temporary files, file copies, archive extraction, generated outputs, clone or checkout materialization, Windows/POSIX path behavior, TOCTOU safety, line endings, file permissions, durable writes, failure classification, or filesystem cleanup are created, changed, reviewed, or reported.
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

Keep filesystem behavior safe across Windows and POSIX while preventing path traversal, symlink escapes, hard-link aliases, reparse or mount escapes, check-use races, unsafe overwrites, stale generated output, and platform-only assumptions. Treat an opened object capability and its verified identity as the security boundary; lexical normalization or path-prefix agreement is only an early rejection signal.

<!-- mustflow-section: use-when -->
## Use When

- Code creates, reads, writes, deletes, copies, moves, normalizes, scans, watches, or reports files or directories.
- A change handles user-provided paths, repository-relative paths, real paths, symlinks, Windows reparse points or junctions, temporary files, generated output, backups, manifests, locks, caches, or latest pointers.
- Code materializes large or externally sourced trees such as Git checkouts, cloned repositories, project scaffolds, dependency trees, archive extractions, template installs, generated snapshots, or package artifacts.
- Behavior must work on Windows and POSIX path separators, drive roots, case differences, reserved names, maximum path lengths, executable extensions, line endings, permissions, or rename semantics.
- Code or config serves files to a browser, preview server, dev server, test UI, static asset server, attachment endpoint, snapshot endpoint, or package artifact where a denied path, filename alias, or platform-specific path form could expose private files.
- A test or final report claims a path is inside the project, symlink-safe, traversal-safe, race-safe, atomic, idempotent, cleanup-safe, or cross-platform.
- A URL or protocol path is decoded into a filesystem path, or a queue, scanner, converter, archive extractor, or later worker reopens a path after validation.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes in-memory strings and does not touch or claim filesystem behavior.
- The change only adjusts Git line-ending policy; use `line-ending-hygiene`.
- A generated artifact is only being packaged or referenced and not written or path-validated; use `artifact-integrity-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Affected path inputs, output paths, base directory, trust boundary, and whether each path is user-controlled, template-controlled, generated, or repository-owned.
- Current filesystem helpers, path validation rules, symlink policy, case-sensitivity policy, write strategy, cleanup strategy, temporary-file strategy, permission strategy, and platform expectations.
- Expected behavior for missing paths, existing files, directories, symlinks, dangling symlinks, reparse points or junctions, path traversal, null bytes, Windows namespace prefixes, Windows reserved names, NTFS alternate data streams, Windows 8.3 short names, trailing spaces or dots, collisions, long paths, large files, and permissions errors.
- Path-length, filename-length, collision, staging, promotion, and cleanup expectations for clone, checkout, scaffold, install, archive, and generated-tree flows, including the deepest known entry path when available.
- A representation ledger from raw bytes or URI component through decoder ownership and count, Unicode and separator policy, validated segments, platform path construction, and the final filesystem sink. Record every transform after validation.
- A root-capability ledger: trusted root directory descriptor or handle, root owner and permissions, device and inode or volume and file identity where available, mount policy, symlink policy, hard-link policy, reparse-point policy, and the credential or namespace performing lookup.
- A runtime-capability ledger: operating system, filesystem, runtime and provider version, descriptor-relative or handle-relative API actually returned, supported operations, link and mount guarantees, and any platform where the helper falls back to lexical or check-then-open behavior.
- An operation ledger for open, create, read, write, scan, transform, rename, publish, delete, cleanup, and queued work. Record atomic flags, same-descriptor or same-handle continuity, path-only reopen points, and object identity carried between stages.
- Failure classification expectations for filesystem and platform errors such as Windows path length, POSIX `ENAMETOOLONG`, reserved names, case collisions, Unicode aliases, file locks, permissions, quota, cross-device moves, missing executable bits, line endings, watcher limits, and descriptor limits.
- Whether atomicity requires best-effort rename, same-directory temporary files on the same volume, file fsync, parent directory fsync, Windows replacement behavior, or reader-safe latest pointers.
- Relevant command-intent entries for tests, docs, release, and mustflow validation.
- Read `references/path-containment-handle-checklist.md` when untrusted paths, traversal claims, URL decoding, symlinks, hard links, junctions, mounts, TOCTOU, archive extraction, or operating-system-specific open semantics are in scope.

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
- Do not treat `normalize`, `resolve`, `absolute`, `realpath`, `GetFullPathName`, or a separator-aware prefix check as proof that the object eventually opened remains below the trusted root.
- Do not lowercase paths as a universal containment strategy. Case-insensitive comparison may be appropriate for a specific platform boundary, but it must not collapse distinct POSIX paths or replace real containment checks.
- Do not accept null bytes, Windows device names, namespace bypass prefixes, alternate data streams, 8.3 short-name aliases, or platform-invalid path segments as ordinary filenames.
- Do not recursively delete, overwrite, or copy broad directories unless the target is resolved, bounded, and intentionally owned by the task.
- Do not claim operating-system mitigations such as Windows RedirectionGuard unless the application actually enables and verifies the mitigation in the relevant process boundary.
- Do not change system-wide or user-wide settings such as Windows registry long-path flags, global Git config, Developer Mode, WSL mount metadata, Linux sysctl limits, Docker Desktop storage backends, antivirus exclusions, or shell profile files from this skill. Report the missing prerequisite or require an explicit configured setup command.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify each path as trusted repository path, untrusted protocol input, generated state, template source, package artifact, temporary file, external path, or unknown. Prefer an opaque object identifier or server-generated single filename over accepting a path hierarchy.
2. Build the representation ledger before changing validation. For URL-like input, parse the protocol and select the path component first, decode that component exactly once under one named owner, apply the declared Unicode and separator policy, split into segments, validate the segments, freeze the validated representation, and only then construct the platform path. Reject a second decoder or any post-validation transform that can create a separator, dot segment, NUL, device name, namespace, or alternate stream.
3. Reject impossible or dangerous path text early. When a pure relative path is required, reject empty, `.` and `..` segments instead of normalizing them away. Check null bytes after decoding, absolute and root-relative forms, drive-relative forms such as `C:tmp`, UNC and device namespaces, Windows device names such as `CON` or `NUL`, namespace prefixes such as `\\?\` and `\\.\`, alternate data streams using colon segments, trailing dots or spaces, and platform-invalid characters.
4. Use Unicode normalization for validation only when detecting platform aliases such as superscript Windows device-name variants. Do not rewrite or persist normalized filenames unless the repository policy explicitly says so. Validate for the filesystem that will consume the path, not only the upstream host.
5. Establish the trusted root as an already opened directory descriptor or handle when the risk requires strong containment. Record its owner, permissions, namespace, device or volume identity, and whether attackers can rename or add children below it. Do not make current working directory part of the security decision.
6. Use lexical normalization, separator-aware relative checks, prefix checks, and `realpath` only for early rejection, diagnostics, and low-risk trusted paths. Keep separator boundaries so partial path traversal cannot make a sibling name look like a child, but do not mistake that lexical check for proof across a later lookup, symlink, junction, reparse point, mount, hard link, or attacker-controlled parent.
7. On Linux where the runtime exposes it, resolve untrusted paths relative to the trusted root descriptor with `openat2`. Choose `RESOLVE_BENEATH` or `RESOLVE_IN_ROOT` deliberately, add `RESOLVE_NO_MAGICLINKS` explicitly when magic links are forbidden, add `RESOLVE_NO_XDEV` when mount crossings are forbidden, and add `RESOLVE_NO_SYMLINKS` only when all symlinks are forbidden. Do not present `O_NOFOLLOW` as an all-component defense; it affects only the final component.
8. Prefer an audited runtime root-capability API when it preserves the needed operation on the actual platform. Go `os.Root` or `os.OpenInRoot` can provide root-relative operations, but its guarantees vary by target: it does not block Unix mount traversal, and targets without descriptor-relative support may retain check-use limitations. Java `SecureDirectoryStream` is useful only when the installed filesystem provider and operating system actually return that interface. Otherwise use an audited helper that walks one segment at a time relative to directory descriptors, opens intermediate directories with directory and no-follow constraints, and never reconstructs an absolute path mid-walk. Record the runtime, provider, filesystem, supported operation, and fallback limitation instead of claiming equivalence to `openat2`.
9. On Windows, prefer an opaque single filename below an application-owned directory. Reject drive-relative, root-relative, UNC, device-namespace, alternate-stream, reserved-device, trailing-dot, trailing-space, and mixed-separator aliases before opening. Open a HANDLE with the intended reparse behavior, inspect the opened object's reparse tag, final path, volume identity, and file identity where the API and runtime expose them, and use that same HANDLE for the operation. Do not claim that `GetFullPathName`, a final path string, or ordinary `CreateFile` behavior is a Windows equivalent of `openat2`.
10. Reject reparse points and junctions by default in attacker-writable trees unless the product has an explicit allow policy and can verify the opened target. For privileged Windows services, check whether process-level reparse traversal mitigations belong at startup; if the code cannot enable and verify them, report the remaining risk.
11. Open first under the path-resolution policy, inspect the opened object with `fstat` or the corresponding handle metadata, then read, write, scan, transform, or publish through that same descriptor or handle. `exists`, `access`, `lstat`, `realpath`, or metadata-check followed by an unrelated `open` is a time-of-check to time-of-use gap.
12. Treat hard links separately from symlinks. No-follow flags do not stop a hard link from naming an existing file. Where the policy forbids shared identities, verify device and inode or volume and file identity, consider link count as one signal, and ensure attackers cannot create links in the storage directory. Do not claim link-count checks alone prove ownership.
13. Treat mount boundaries separately from path boundaries. Use `RESOLVE_NO_XDEV`, mount identity, volume identity, or an equivalent owned-storage invariant when mount or bind-mount crossings are forbidden. State explicit compatibility exceptions for legitimate mount layouts.
14. Create new objects through the trusted parent descriptor or handle with one validated final segment and an atomic exclusive-create primitive such as `O_CREAT|O_EXCL` or `CREATE_NEW`. Do not precheck existence and then create.
15. For scanners, converters, antivirus, image processors, and other path-only tools, materialize an immutable application-owned staging object first. Bind the result to an object identifier, digest, size, and generation, and reject any stage that silently reopens an attacker-controlled path.
16. For queued work, store an immutable object identity, digest, and generation rather than a previously validated path. Reauthorize and revalidate the current object version at execution time; a queue delay turns a path string into stale authority.
17. For archive extraction, parse and validate the complete entry set before the first write when the format and bounded input permit it. Build one destination graph that rejects duplicate and platform-alias names, file-versus-directory prefix conflicts such as `a` and `a/b`, separator and Unicode collisions, and order-dependent link traversal. Carry the validated entry object into extraction instead of reparsing the raw name. Accept only regular files and directories by default; reject symlink, hard-link, device, FIFO, socket, reparse, and other special entries unless an explicit product contract proves them safe. Ignore archive-supplied owner, group, mode, setuid, setgid, sticky, ACL, xattr, capability, and timestamp metadata unless each field is allowlisted, and create files with service-owned permissions. Count actual emitted bytes, logical file size, allocated temporary storage, sparse extents, entry count, directories, depth, name length, compression work, nested archives, and elapsed time under one shared budget. Create every entry through the trusted root capability and use `file-upload-security-review` for the surrounding upload, parser, storage, serving, and cleanup lifecycle.
18. For externally sourced trees, use a `preflight -> dangerous operation -> classifier -> safe cleanup` pipeline. Estimate the materialized path budget before writing, including destination root, project directory, generated subdirectories, deepest known repository or archive entry, Windows path-length behavior, POSIX path and component limits, byte limits, case collisions, reserved names, and safety headroom.
19. For Git clone and checkout materialization, prefer an app-owned staging directory and no-checkout or metadata-first flow when feasible. Inspect repository entries before checkout, check them against the final destination, then promote the result only after success. Do not delete a user-selected final destination when checkout fails.
20. For Windows Git checkout or clone materialization, prefer a per-invocation `core.longpaths=true` setting when product code invokes Git. Do not mutate global Git config from application code unless the user explicitly chose that setup action. Long-path support still depends on operating-system, Git, filesystem, and downstream tool behavior, so checkout failures must remain classifiable.
21. For symlink-heavy repositories on Windows, detect whether checkout produced real links or plain-text symlink stubs before running build logic. Report missing Developer Mode, `core.symlinks`, or native symlink support as an environment prerequisite; do not silently replace file symlinks with junctions or copies unless the repository contract explicitly supports that compatibility mode.
22. For POSIX, do not assume that forward slashes make paths safe. Check `ENAMETOOLONG`, byte-based per-component name limits, mount permissions, executable bits, case-sensitive import paths, symlink loops, file descriptor limits, watcher limits, quota, and cross-device rename behavior.
23. Check case behavior explicitly. Windows and many macOS volumes preserve case but compare case-insensitively by default; POSIX commonly compares case-sensitively. State whether the code preserves spelling, rejects conflicting names, or relies on the host filesystem.
24. Check collisions before materializing Git trees, archives, generated files, uploaded names, or dependency trees. Include case-only collisions, Unicode normalization aliases, reserved Windows names with extensions, trailing dot or space aliases, duplicate archive entries, and byte-limit collisions from multibyte names.
25. Classify filesystem failures before generic network, auth, or unknown failures. Use stable categories such as `path_too_long`, `filename_too_long`, `byte_limit_exceeded`, `invalid_path`, `reserved_name`, `case_collision`, `unicode_collision`, `symlink_escape`, `mount_escape`, `identity_mismatch`, `permission_denied`, `file_locked`, `cross_device_move`, `disk_full_or_quota`, `executable_bit_missing`, `line_ending_mismatch`, `watcher_limit`, and `descriptor_limit`.
26. For writes, prefer same-directory temporary-file then rename or replace behavior when readers may observe the file. Keep the temporary file on the same volume, use unpredictable names, least-privilege creation permissions, and safe no-follow writes when the project already has that helper. For hostile tree materialization, use a new attacker-nonwritable staging directory with private Unix permissions or a dedicated Windows ACL, then publish only the verified tree.
27. Treat atomic writes as platform-specific. POSIX rename semantics, Windows replacement behavior, cross-filesystem moves, network filesystems, FUSE or overlay filesystems, fsync availability, and directory fsync support differ; report best-effort guarantees honestly.
28. When durable writes matter, include the full durability sequence where the platform supports it: write the temporary file, flush the file data, close it, rename or replace it, then flush the parent directory entry. If parent directory fsync is unavailable, downgrade the durability claim.
29. For copies and updates, keep the source and destination descriptors open through the operation where feasible. Do not report symlink safety if the final write or later consumer can still follow a changed link or reopen a mutable path.
30. Treat rename and delete as name-to-parent operations with their own races. Strong claims require an attacker-nonwritable parent or a platform primitive that binds the operation to the intended parent and object identity. Prefer atomic quarantine into application-owned storage before destructive cleanup; do not claim that a prior opened-handle check alone makes a later path-based delete safe.
31. For host environment limitations such as long-path registry flags, Developer Mode, WSL metadata mounts, Linux inotify/sysctl limits, Docker Desktop volume backend, network filesystems, or antivirus locks, classify and report the environment prerequisite. Do not perform privileged host repair from ordinary file logic.
32. Distinguish disk and quota errors from watch or descriptor exhaustion. In a watcher or scanner path, `ENOSPC` may mean an inotify watch limit rather than a full disk, and `EMFILE` or similar failures may indicate a per-process or per-user file-descriptor limit.
33. For deletes and cleanup, narrow the target to app-owned staging or generated state. Preserve bounded diagnostic evidence first, then revalidate the operation at the destructive boundary. Never remove the user-selected destination that the operation was supposed to populate.
34. For scans, bound recursion, generated/vendor exclusions, file size, symlink, hard-link, reparse-point and mount traversal, loop detection, maximum path length, depth, entry count, and total bytes.
35. Keep path output stable for users and automation. Report repository-relative display paths separately from security identities; never reuse a display path as authorization.
36. Add focused tests for decode order and double decoding, NUL after decode, dot segments, mixed separators, drive-relative and namespace forms, alias collisions, middle and final symlink swaps, hard links, bind mounts, junctions and reparse points, exclusive-create collisions, same-handle identity, queued stale paths, destructive-operation races, archive order attacks, file-directory prefix conflicts, metadata restoration attempts, sparse logical-size exhaustion, runtime-provider fallback, and unsupported-filesystem behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- The chain from raw representation through one decoder, immutable validated segments, trusted root capability, opened object identity, and same-descriptor or same-handle operation is explicit.
- Runtime and provider capability claims identify the actual platform implementation and do not silently promote lexical or check-then-open fallbacks to race-resistant guarantees.
- Path boundaries, invalid-name policy, case policy, symlink, hard-link, reparse-point, junction, and mount policy, write strategy, cleanup strategy, durability expectations, and platform assumptions are explicit.
- Clone, checkout, scaffold, install, extraction, and generated-tree flows have preflight, whole-entry collision mapping, metadata policy, staging, promotion, path-length, logical and emitted-byte limits, symlink-stub, collision, diagnostic-preservation, cleanup, and failure-taxonomy policies.
- Host setting prerequisites are reported without unapproved registry, global config, WSL, sysctl, Docker Desktop, antivirus, or shell-profile mutation.
- Dangerous file operations are bounded to known repository-owned or generated locations.
- Atomicity, containment, identity, and race-safety claims are scoped to what the current helpers, kernel, runtime, and filesystem can actually guarantee.
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
- If validation and use cannot share an opened descriptor, handle, or immutable object identity, fail closed for hostile paths or report the exact reopen race.
- If the platform cannot prove symlink-safe behavior, fail closed or document the exact remaining gap.
- If atomic replace, file fsync, parent directory fsync, no-follow open, or final-target verification is not available on the platform, downgrade the claim to best-effort and keep the write boundary narrow.
- If Unicode normalization, Windows namespace prefixes, alternate data streams, 8.3 short names, or reparse points could change the effective target, fail closed or report the exact unhandled path class.
- If clone, checkout, scaffold, install, extraction, or generated-tree materialization fails, classify filesystem and platform causes before reporting network, token, auth, dependency, or unknown causes.
- If a fix requires elevated host settings or global user configuration, stop at a clear prerequisite report unless an explicit configured command intent and user request authorize the setup.
- If a test depends on platform-specific symlink support or permissions, state the platform boundary and keep assertions narrow.
- If cleanup might remove user data, do not proceed without a tighter app-owned staging or generated-state boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Filesystem surface reviewed
- Path trust classes, invalid-name handling, case policy, and root boundary
- Decode and representation ledger; trusted root capability; opened-object identity; same-descriptor or same-handle continuity
- Null byte, reserved-name, Unicode normalization, namespace prefix, alternate data stream, 8.3 short-name, symlink, hard-link, mount, reparse-point, traversal, race, atomic write, durability, permission, copy, queue, delete, scan, and cleanup decisions
- Clone, checkout, scaffold, install, extraction, whole-entry collision graph, archive metadata, sparse-file budget, runtime capability, preflight, staging, promotion, path-length, collision, failure-taxonomy, and diagnostic-preservation decisions
- Host-setting prerequisites reported or deferred
- Windows/POSIX assumptions and skipped platform checks
- Tests or fixtures added or reused
- Command intents run
- Remaining filesystem safety risk
