# Path Containment and Opened-Object Checklist

Use this reference when a filesystem boundary accepts untrusted names, decodes URL components, crosses process or queue stages, extracts archives, or claims resistance to traversal, links, mounts, or check-use races.

## Contents

1. Security pipeline
2. Representation and decode ledger
3. Pure-relative segment policy
4. Windows lexical hazards
5. Root capability and object identity
6. Linux resolution policy
7. POSIX fallback boundaries
8. Windows HANDLE and reparse policy
9. Hard-link and mount identity
10. TOCTOU operation matrix
11. Creation, staging, publication, deletion, and queues
12. Archive extraction
13. Test matrix
14. Primary anchors

## 1. Security Pipeline

Use this order for hostile input:

`raw bytes -> protocol parse -> select one path component -> strict decode once -> Unicode and separator policy -> segment validation -> immutable relative representation -> lookup below trusted root -> validate opened object -> operate through the same descriptor or handle`

Every arrow needs one owner. A second decoder, normalizer, separator conversion, case fold, Unicode rewrite, environment expansion, archive library, shell, or downstream tool after validation can create a new path language and invalidate the earlier decision.

Prefer an opaque object identifier and server-generated storage name. Accept a hierarchy only when the product actually needs user-selected hierarchy.

## 2. Representation and Decode Ledger

Record:

| Stage | Questions |
| --- | --- |
| Transport | Are inputs bytes, a URL, a URL path component, form data, JSON, a header, or an archive entry? |
| Parser | Which parser owns component boundaries? Is a whole URL ever decoded before parsing? |
| Decoder | Which component is decoded, how many times, and how are malformed sequences handled? |
| Unicode | Is normalization used only for alias detection, or does it rewrite the stored name? |
| Separators | Which characters become separators on the final sink platform? Can a later layer reinterpret `/`, `\\`, `%2f`, `%5c`, or lookalikes? |
| Segments | Are empty, `.`, `..`, NUL, absolute, rooted, namespace, stream, and reserved segments rejected? |
| Construction | Is the validated immutable segment list combined only with a trusted root capability? |
| Sink | Which kernel, filesystem, container namespace, network share, archive library, or Windows API performs the final lookup? |

Do not decode the entire URI before locating its components. Do not validate encoded text and then decode it. Do not decode repeatedly until the text stops changing.

## 3. Pure-Relative Segment Policy

For an untrusted path below a fixed root:

- require a non-empty relative segment sequence;
- reject empty segments when duplicate separators are not part of the contract;
- reject `.` and `..` rather than repairing them with normalization;
- reject NUL after decoding;
- reject absolute, root-relative, drive-relative, UNC, and device-namespace forms;
- reject a segment that the final filesystem aliases to a reserved or different name;
- freeze the accepted segment sequence so downstream layers cannot reinterpret raw input;
- keep display spelling separate from the object identity used for authorization.

Lexical rejection reduces attack surface. It does not replace kernel-constrained lookup.

## 4. Windows Lexical Hazards

Check the final Windows sink for:

- both slash directions as potential separators;
- drive-absolute paths such as `C:\\x` and drive-relative paths such as `C:x`;
- root-relative paths such as `\\x`;
- UNC shares and device or extended namespaces such as `\\\\server\\share`, `\\\\?\\`, and `\\\\.\\`;
- NTFS alternate data streams introduced by colon syntax;
- reserved device names, including device names followed by extensions and documented superscript-digit aliases;
- trailing spaces and periods that Win32 or shell layers may trim or alias;
- short 8.3 aliases when the volume generates them;
- case and Unicode aliases under the actual volume policy;
- reparse points, junctions, mount folders, and volume changes;
- final consumer APIs that may apply different normalization or namespace rules.

`GetFullPathName` computes a path string. It does not freeze the directory tree or prove what a later open reaches.

## 5. Root Capability and Object Identity

Treat the trusted root as a capability, not a string:

- open the root directory before processing hostile names;
- keep the root descriptor or HANDLE alive for the operation;
- record which principal and mount or volume namespace opened it;
- ensure attackers cannot replace the root or mutate its parent;
- resolve children relative to that root where the platform supports it;
- inspect the opened target rather than trusting the requested spelling;
- carry the opened descriptor, HANDLE, or immutable object identity into later stages.

Useful identity signals include POSIX device and inode, mount identity, Windows volume serial or volume identity, file ID, object type, reparse tag, and final path from an already opened HANDLE. No one signal is universally sufficient; select the set that proves the repository's policy.

## 6. Linux Resolution Policy

When Linux `openat2` is available through the runtime or an audited native helper, choose resolution flags by policy:

| Policy | Resolution decision |
| --- | --- |
| A relative path must not escape the root | Resolve relative to the root `dirfd` with `RESOLVE_BENEATH`. |
| Absolute-looking input and absolute symlinks should be scoped as if the root were `/` | Consider `RESOLVE_IN_ROOT`; do not combine its different semantics with a `BENEATH` claim. |
| Magic links are forbidden | Add `RESOLVE_NO_MAGICLINKS` explicitly. Do not rely on another flag's current incidental behavior. |
| All symlinks are forbidden | Add `RESOLVE_NO_SYMLINKS`; note that this also forbids legitimate symlink layouts. |
| Mount and bind-mount crossings are forbidden | Add `RESOLVE_NO_XDEV`; document legitimate mount compatibility exceptions. |
| Only the final component must not be a symlink | `O_NOFOLLOW` can enforce that narrower rule, but not all-component safety. |

Handle `EAGAIN`, `EXDEV`, `ELOOP`, unsupported-kernel behavior, and runtime wrapper gaps explicitly. Bound retries for race-related `EAGAIN`; never fall back silently to an unconstrained absolute open.

## 7. POSIX Fallback Boundaries

If `openat2` is unavailable:

1. Start from an opened trusted root directory descriptor.
2. Walk one validated segment at a time with descriptor-relative operations.
3. Open intermediate components as directories and reject symlink following.
4. Keep the current directory descriptor alive until the next descriptor is secured.
5. Apply the final operation relative to the verified parent descriptor.
6. Inspect the opened object and operate through that same descriptor.

An audited fallback still needs tests for renames, mount changes, network filesystems, FUSE, overlay filesystems, and runtime flag support. A language runtime that only exposes `realpath` plus path-based `open` cannot honestly claim the same boundary.

### Runtime root-capability APIs

Use runtime helpers only after proving what the deployed platform returns:

| Runtime API | Useful boundary | Required caveat |
| --- | --- | --- |
| Go `os.Root` or `os.OpenInRoot` | Root-relative file operations with traversal-resistant behavior on supported targets. | Record the Go version and target. Unix mount and bind-mount traversal is not blocked; GOOS targets without descriptor-relative primitives can retain TOCTOU limits; WASI inherits implementation quality. |
| Java `SecureDirectoryStream` | Relative open, attribute, move, and delete operations through an open directory stream, with `NOFOLLOW_LINKS` where specified. | Support depends on the operating system and filesystem provider. Check that `Files.newDirectoryStream` actually returns `SecureDirectoryStream`; do not cast or claim support blindly. |
| High-level path helper only | Lexical rejection and diagnostics. | `normalize`, `realpath`, `abspath`, or prefix comparison does not become a root capability merely because the runtime documents it as safe for ordinary paths. |

For every wrapper, inventory open, exclusive create, mkdir, rename, delete, stat, and link behavior separately. A wrapper that safely opens files may still lack a parent-bound rename or delete primitive.

## 8. Windows HANDLE and Reparse Policy

Windows does not have a drop-in `openat2` equivalent. Keep the claim narrow:

1. Prefer an application-owned directory whose parents are not attacker-writable.
2. Prefer one server-generated child name rather than a user hierarchy.
3. Reject lexical namespaces, streams, rooted forms, separators, reserved aliases, and trailing-dot or trailing-space forms before opening.
4. Open a HANDLE with the access, sharing, creation disposition, and reparse behavior intended by the policy.
5. Inspect metadata from that opened HANDLE: object type, attributes and reparse tag, final path, volume identity, and file identity where available.
6. Reject reparse points by default in an untrusted tree unless the product explicitly follows and verifies them.
7. Use the same HANDLE for I/O. Do not validate the HANDLE and then reopen the original path.
8. For creation, use an atomic exclusive disposition such as `CREATE_NEW`; do not call an existence check first.

Opening a reparse point itself and opening its target are different operations. The implementation must state which object it inspects and which object it later uses.

## 9. Hard-Link and Mount Identity

No-follow policies address path redirection through symbolic links or reparse points. They do not stop a hard link from naming the same underlying file.

For storage that must not share identities with outside objects:

- keep the storage directory non-writable by attackers;
- compare device and inode or volume and file identity where a known expected object exists;
- use link count only as a warning or policy signal, not a universal proof;
- control who can create links and where;
- use a private staging filesystem or object store when ownership cannot be established.

Mounts and bind mounts can redirect a lexically contained path into a different filesystem. Use a no-cross-device resolution policy or verify mount or volume identity when that crossing is forbidden. Be explicit when container, Kubernetes, WSL, network-share, or application layouts require legitimate crossings.

## 10. TOCTOU Operation Matrix

| Weak sequence | Safer contract |
| --- | --- |
| `exists -> open` | Attempt the intended open directly and classify the result. |
| `lstat -> open` | Open under the resolution policy, inspect the opened object, use the same descriptor. |
| `realpath -> startsWith -> open` | Resolve below the trusted root capability and keep the returned descriptor or HANDLE. |
| `scan(path) -> publish(path)` | Scan an immutable staging object and publish that exact object or verified digest and generation. |
| `validate(path) -> enqueue(path)` | Enqueue immutable object ID, digest, size, and generation; reauthorize on execution. |
| `validate -> create` | Exclusive create through the trusted parent descriptor or HANDLE. |
| `open -> close -> delete(path)` | Quarantine atomically into attacker-nonwritable storage, or use a parent-and-identity-bound delete primitive where available. |

Shortening the time window is not a proof. The design should remove the second name lookup or bind it to the same trusted parent and object identity.

## 11. Creation, Staging, Publication, Deletion, and Queues

- Create below a trusted parent with exactly one validated final segment and atomic exclusivity.
- Use private, least-privilege, unpredictable staging names on the same filesystem when same-filesystem atomic promotion is required.
- Feed scanners and converters an opened descriptor or immutable staging object. If a tool accepts only paths, make that path application-owned and non-replaceable by the attacker.
- Bind scan and transform results to a digest, size, object ID, and generation.
- Publish by atomic same-filesystem rename or replacement only when the target platform and filesystem contract supports the claimed reader behavior.
- Do not claim cross-filesystem copy-and-delete is atomic.
- Treat deletion and rename as separate security-sensitive operations. A verified read handle does not automatically authorize a later path-based delete.
- Put immutable object identity in queues and receipts. A pathname is a mutable locator, not durable authority.

## 12. Archive Extraction

Before the first write, parse the complete bounded entry set when feasible and build one immutable extraction plan. Reject:

- duplicate raw or normalized destinations;
- case, Unicode, separator, reserved-name, trailing-dot, trailing-space, and 8.3 aliases under the final consumer platform;
- file-versus-directory prefix conflicts such as a regular file `a` plus `a/b`;
- an entry whose type or link target changes the meaning of a later entry;
- undecodable or ambiguous names instead of repairing them;
- a plan whose own entry count, name bytes, or graph size exceeds budget.

Carry the validated entry object into extraction. Do not validate one parsed name and ask another library layer to parse the raw name again.

For every planned entry:

- parse the archive format once and inspect the declared entry type;
- reject absolute, rooted, drive-relative, namespace, stream, empty, `.` and `..` segment forms;
- apply final-platform separator and alias rules;
- reject duplicate names plus case, Unicode, reserved-name, trailing-dot, trailing-space, and 8.3 collisions;
- reject symlink, hard-link, device, FIFO, socket, reparse, and other special entries unless the product has an explicit safe policy;
- create directories and files through the trusted extraction root capability;
- use atomic exclusive creation and reject a destination that already exists;
- never extract first and inspect later in an attacker-visible destination;
- ignore archive-supplied uid, gid, owner names, mode, setuid, setgid, sticky bits, ACLs, xattrs, capabilities, and timestamps unless each field is explicitly required and safely allowlisted;
- create with service-owned permissions inside a fresh attacker-nonwritable staging directory;
- enforce entry count, directory count, name length, depth, actual total emitted bytes, per-entry bytes, logical file size, allocated temporary storage, sparse extents, compression work, CPU or time, and nested-archive budgets;
- publish only a fully verified app-owned staging tree.

Treat library filters and non-local-path warnings as versioned defense in depth. Pin the runtime and archive API behavior, set security options explicitly where available, and keep the application entry-type, collision, root-capability, metadata, and resource policies independent of library defaults.

## 13. Test Matrix

Cover the strongest claim with deterministic tests and platform-specific integration tests where possible:

- percent-encoded separators, dot segments, malformed encoding, double decoding, and NUL after decoding;
- mixed separators, `C:relative`, root-relative, UNC, device namespaces, alternate streams, reserved names, trailing spaces or dots, short aliases, case and Unicode collisions;
- a symlink in a middle component, final-component symlink, dangling link, loop, magic link, junction, reparse point, bind mount, and volume crossing;
- hard-link identity and link-count policy;
- archive entry-order swaps, file-directory prefix conflicts, duplicate parser views, metadata restoration attempts, and sparse logical-size exhaustion;
- attacker swaps a component between validation and open;
- attacker swaps a path after enqueue, scan, or transform;
- exclusive-create collision and attacker-controlled parent;
- opened-object identity remains constant through read, scan, transform, and publish;
- delete or rename races and quarantine behavior;
- network filesystem, FUSE, overlay, WSL, or unsupported-runtime behavior is rejected or reported rather than silently downgraded.
- Go or Java runtime/provider fallback is detected and the claim is narrowed instead of silently using path-only operations.

Do not invent success-rate, timing, or race-frequency thresholds. A single permitted counterexample falsifies a universal containment or race-free claim.

## 14. Primary Anchors

- [RFC 3986: URI generic syntax](https://www.rfc-editor.org/rfc/rfc3986.html) for component boundaries, percent encoding, and dot-segment semantics.
- [Linux `openat2(2)`](https://man7.org/linux/man-pages/man2/openat2.2.html) for descriptor-relative resolution and `RESOLVE_*` behavior.
- [Microsoft: Naming Files, Paths, and Namespaces](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) for Windows naming, namespaces, reserved names, separators, and 8.3 aliases.
- [Microsoft: `CreateFileW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) for HANDLE creation, creation dispositions, and reparse behavior.
- [Microsoft: `GetFinalPathNameByHandleW`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfinalpathnamebyhandlew) for inspecting the final path of an opened HANDLE.
- [Microsoft: `GetFileInformationByHandleEx`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileinformationbyhandleex) for opened-object metadata classes available to the implementation.
- [CWE-367](https://cwe.mitre.org/data/definitions/367.html) for the check-use race class and why shortening a race window is not elimination.
- [Go: traversal-resistant file APIs](https://go.dev/blog/osroot) and [`os.Root`](https://pkg.go.dev/os#Root) for runtime root-relative operations and documented target-specific caveats.
- [Java `SecureDirectoryStream`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/SecureDirectoryStream.html) for provider-dependent relative operations through an open directory stream.
- [Python `tarfile`](https://docs.python.org/3/library/tarfile.html) and [`zipfile`](https://docs.python.org/3/library/zipfile.html) for archive entry types, metadata, sparse members, extraction-filter version changes, and caller-owned `zipfile.Path` validation.
- [Go `archive/zip`](https://pkg.go.dev/archive/zip) for the current opt-in `zipinsecurepath` non-local-name behavior; do not treat a possible future default as current policy.
