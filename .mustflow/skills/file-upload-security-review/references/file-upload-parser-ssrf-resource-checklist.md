# File Upload Parser, SSRF, and Resource Checklist

Use this reference when the short procedure needs concrete review ledgers for complex parsers,
archive extraction, direct object-storage uploads, remote imports, or resource-exhaustion claims.
It is a review aid, not a universal numeric policy. Record repository-specific limits and evidence.

## Contents

1. [Lifecycle and publication states](#1-lifecycle-and-publication-states)
2. [Byte lineage and immutable objects](#2-byte-lineage-and-immutable-objects)
3. [Type and parser decision matrix](#3-type-and-parser-decision-matrix)
4. [Decoded media and document budgets](#4-decoded-media-and-document-budgets)
5. [Archive extraction ledger](#5-archive-extraction-ledger)
6. [Remote-fetch SSRF ledger](#6-remote-fetch-ssrf-ledger)
7. [Parser sandbox and capability matrix](#7-parser-sandbox-and-capability-matrix)
8. [Resource, concurrency, and cost budget](#8-resource-concurrency-and-cost-budget)
9. [Layer responsibility handoff](#9-layer-responsibility-handoff)
10. [Denial and differential test matrix](#10-denial-and-differential-test-matrix)
11. [Primary reference anchors](#11-primary-reference-anchors)

## 1. Lifecycle and publication states

Model visibility as an explicit state machine. A useful minimum is:

`receiving -> quarantined -> inspecting -> approved -> published`

Terminal or side states include `rejected`, `processing_failed`, `expired`, and `deleted`.

For every state, record:

| Question | Evidence |
| --- | --- |
| Who may write or replace bytes? | Storage policy and application authorization |
| Who may read bytes? | Download, preview, worker, admin, and support paths |
| Which parser may run? | Tool and policy version |
| Can a CDN, indexer, emailer, or previewer observe it? | Publication gate |
| What advances the state? | Atomic condition and authenticated actor |
| What happens on timeout, crash, or unavailable scanner? | Fail-closed transition |

Do not treat a `clean = true` column as the state machine. The decision must identify the exact
bytes inspected and the exact bytes made visible.

## 2. Byte lineage and immutable objects

Maintain this ledger across receive, inspect, transform, promote, and serve:

| Field | Required meaning |
| --- | --- |
| `upload_id` | Server-issued lifecycle identifier |
| `quarantine_key` | Server-generated private location |
| `quarantine_version` | Immutable object version or equivalent generation id |
| `received_digest` | Digest computed from bytes actually received |
| `inspected_digest` | Digest of exact scanner/parser input |
| `inspection_policy_version` | Allowlist, parser, scanner, and budget policy identity |
| `derived_digest` | Digest of rewritten or converted output when applicable |
| `approved_key` and `approved_version` | Exact immutable object selected for serving |
| `approved_digest` | Digest verified during promotion or copy |
| `publication_event` | Atomic operation that made the object visible |

Reject these broken chains:

- the client can overwrite a quarantined object after inspection;
- the scanner reads `key` without an immutable version while the uploader can replace `key`;
- metadata is approved but a later download resolves a different object generation;
- transformation output is public before its own type and resource checks finish;
- promotion copies the latest object instead of the inspected object;
- retries overwrite a prior approved destination without an explicit replacement policy.

Keep these identities separate:

| Identity | Security role |
| --- | --- |
| Public `file_id` | Opaque request identifier with no path meaning. |
| `(tenant, object_id, version)` | Authorization lookup tuple resolved before any storage locator is used. |
| Original filename | Display metadata only; never a storage key or authorization fact. |
| Exact object key and immutable version | Server-owned object-store locator returned by the authorized record. Prefix agreement is not authorization. |
| Local root capability and validated relative entry | Filesystem adapter authority; never exposed as a controller or queue string. |

Require one storage adapter to own raw path and object-key APIs. Controllers, workers, thumbnailers,
archive tools, admin surfaces, and serving code should consume typed file identities or opened streams
rather than reconstructing paths or prefixes independently.

## 3. Type and parser decision matrix

Do not ask whether one detector is authoritative. Ask which parser the product needs and which
evidence is sufficient to select it.

| Signal | Use | Never proves alone |
| --- | --- | --- |
| Normalized extension | Product allowlist and UX | Actual byte format |
| Request `Content-Type` | Logging and disagreement detection | Safe parser choice |
| Signature or magic | Candidate family | Entire container safety |
| Structural parser | Format conformance | Safe active content or bounded cost |
| Rewrite/conversion | Produces controlled derivative | Safety if parser is unbounded |

Record disagreement policy. An allowed extension with a mismatched signature or parser result
should not silently choose whichever interpretation is most permissive.

For raster-only products, prefer decode-to-pixels and deterministic rewrite. Apply orientation,
then enforce dimensions, select a fixed output format and color space, and add back only required
metadata. Do not preserve arbitrary original chunks or trailing bytes.

Treat SVG, HTML, PDF, Office, media containers, fonts, and archives as parser-bearing formats with
their own active-content and resource policies.

## 4. Decoded media and document budgets

Compressed bytes are only the wire envelope. Record limits on decoded work:

| Format family | Minimum budget dimensions |
| --- | --- |
| Raster image | Width, height, total pixels, channels, bit depth, output bytes |
| Animated image | Per-frame pixels, cumulative frame pixels, frame count, duration |
| Layered image | Layers, cumulative layer pixels, memory, temporary disk |
| PDF | Pages, objects, recursion, embedded files, render pixels, output bytes |
| Office document | Entries, XML nodes, relationships, embedded objects, pages or slides |
| Audio/video | Duration, tracks, dimensions, frames, decoded bytes, transcode time |
| OCR | Input pixels or pages, languages, CPU, elapsed time, output text bytes |

Limits must apply before or during allocation. A check performed only after a decoder has allocated
the full image or document does not protect the process.

For multi-item containers, track both per-item and cumulative budgets. An animation with many small
frames or a PDF with many modest pages can exhaust resources while each item passes alone.

## 5. Archive extraction ledger

Before extraction, define allowed archive families and allowed entry types. During extraction,
record and enforce:

| Budget or invariant | Enforcement point |
| --- | --- |
| Complete bounded entry inventory | Before the first filesystem write when the format permits it |
| File-directory prefix graph | Before accepting both `a` and `a/b` or another order-dependent topology |
| Normalized contained path | Before creating each entry |
| Duplicate normalized name | Before overwrite or allocation |
| Entry type | Before filesystem operation |
| Metadata allowlist | Before applying owner, group, mode, timestamp, ACL, xattr, or capability fields |
| Per-entry emitted bytes | While streaming output |
| Logical size and sparse extents | Before and during allocation |
| Cumulative emitted bytes | Shared counter across all entries |
| Entry count | Before accepting the next entry |
| Nesting depth | Before opening a nested container |
| Parser CPU and elapsed time | Whole extraction deadline |
| Temporary disk and files | Sandbox or quota boundary |

Reject symlinks, hardlinks, devices, FIFOs, absolute paths, traversal, alternate separators,
reserved names, and duplicate normalized destinations unless the product has a narrower explicit
contract. Do not trust declared uncompressed sizes; stop when actual emitted bytes exceed budget.

Reject case, Unicode, trailing-dot, trailing-space, short-name, and separator aliases under the
final consumer platform. Preserve the validated entry object through extraction so a second parser
cannot reinterpret the raw name. Accept regular files and directories only by default, use exclusive
creation below a root capability, and never merge into an existing or attacker-writable tree.

Do not restore archive uid, gid, owner names, original modes, setuid, setgid, sticky bits, ACLs,
xattrs, capabilities, or timestamps by default. Sparse entries require both logical-size and actual
storage budgets. Extract into a new private staging directory and publish only the verified tree.

Library path cleanup, extraction filters, or non-local-name warnings are versioned defense in depth.
Pin the runtime and API option, but keep the application entry, collision, metadata, capability,
and resource policies independent of the current library default.

Each extracted regular file re-enters filename, type, parser, authorization, and publication
checks. Nested containers consume the same parent budget. They do not get a fresh unlimited quota.

## 6. Remote-fetch SSRF ledger

Arbitrary URL import combines network authority with the upload pipeline. Prefer provider-owned ids
or preconfigured integrations. If arbitrary URLs are necessary, record every decision:

| Phase | Required evidence |
| --- | --- |
| Parse | One strict parser result; no validate-with-one, connect-with-another split |
| Scheme and method | Small fixed allowlist, normally `https` and `GET` |
| Host | Canonical host and IDNA result; reject ambiguous userinfo and fragments |
| Port | Fixed or narrow allowlist |
| Resolve | Every A and AAAA result plus relevant CNAME outcome |
| Address policy | Normalized IPv4, IPv6, and mapped-address classification |
| Connect | One validated address bound to the socket |
| TLS and HTTP | Canonical hostname retained for certificate and host semantics |
| Redirect | Every hop reparsed, resolved, classified, and budgeted |
| Headers | No inbound auth, cookies, proxy credentials, or arbitrary user headers |
| Egress | Network firewall or proxy independently blocks forbidden ranges |
| Response | Header, body, decoded-work, connect, read, and total deadline limits |
| Handoff | Response enters quarantine as a new hostile upload |

Reject loopback, private, link-local, multicast, unspecified, reserved, and infrastructure metadata
destinations according to deployment policy. Check both address families. A hostname with one public
and one forbidden result is not safely public just because the first answer looked acceptable.

Disable redirects by default. When enabled, cap hop count and treat each `Location` as fresh input.
Do not let a generic HTTP client silently re-resolve or follow a proxy path that bypasses the
validated address.

## 7. Parser sandbox and capability matrix

For each native tool, library, delegate, or subprocess, record:

| Capability | Policy question |
| --- | --- |
| Input formats | Which coders or parsers are enabled? |
| Delegates | Can input launch another interpreter or executable? |
| Filesystem read | Can it read outside the isolated input directory? |
| Filesystem write | Can it write outside bounded temporary and output directories? |
| Network | Is outbound access disabled by runtime policy? |
| Processes | Can it spawn children, and how many? |
| Privilege | Which user, group, namespace, or container runs it? |
| Resources | CPU, memory, map, disk, files, descriptors, threads, wall time, output |
| Failure | What happens on crash, timeout, truncation, or partial output? |
| Version | Which tool and security policy version made the decision? |

An application timeout without process termination is incomplete. Cancellation must stop child
work, close streams, prevent publication, and clean bounded temporary artifacts.

## 8. Resource, concurrency, and cost budget

Build one budget ledger from edge to worker instead of isolated `10MB` checks:

- wire bytes: request body, file, multipart overhead, chunks, remote response;
- structure: files, archive entries, pages, frames, layers, tracks, nodes, relationships;
- decoded work: pixels, samples, decompressed bytes, parser tokens or objects;
- runtime: CPU, memory, temporary disk, descriptors, processes, threads, elapsed time;
- outputs: thumbnails, previews, rewritten objects, extracted files, logs, metadata;
- concurrency: per-user, per-tenant, per-worker, global in-flight jobs, queue depth;
- retries and lifecycle: attempts, total age, stale partials, cleanup backlog;
- durable cost: storage bytes, CDN bytes, scanner calls, OCR pages, transcode minutes.

Define reservation and release points. A quota checked after expensive conversion or after object
storage has already grown is accounting, not prevention.

## 9. Layer responsibility handoff

Keep every layer honest about what it can prove:

| Layer | Owns | Does not prove |
| --- | --- | --- |
| Frontend | Early feedback, picker hints, progress | Security or final type |
| Edge/proxy | Wire envelope, coarse rate and timeout | Parser semantics |
| Upload API | Strict multipart syntax, auth, quarantine identity | Safe derived output |
| Domain service | Allowed use, owner, state transition, publication policy | Native parser isolation |
| Storage | Immutability, versioning, conditional writes, retention | Content safety |
| Worker | Exact-version parsing, budgets, derived output, result evidence | Download authorization |
| Database | Constraints and atomic state transitions | Object bytes by itself |
| Serving layer | Current authorization, headers, origin, exact approved object, immutable asset manifest | Prior client checks or path-prefix ownership |

Queue consumers must revalidate durable facts. A queued message carrying `approved = true` is not a
substitute for loading current state and the immutable object identity.

For downloads, resolve authorization before the exact object key, treat `Content-Disposition`
filenames as presentation, remove CR/LF and path components, and generate a conservative ASCII
`filename` fallback plus a correctly encoded UTF-8 `filename*`. Never reuse either header value as a
storage locator. Serve built assets through an immutable URL-to-asset manifest; a SPA fallback should
return one fixed `index.html` only after route classification, not probe alternate filesystem names.

Escape control characters in rejected filenames before logging. Store a bounded display value and a
stable policy code rather than allowing raw names to forge log lines.

## 10. Denial and differential test matrix

Use safe synthetic fixtures. Cover at least the paths present in the product:

- extension, request MIME, signature, and structural parser disagree;
- image dimensions, frames, layers, or metadata exceed cumulative budgets;
- document page or object counts exceed policy before unbounded rendering;
- archive traversal, absolute path, alternate separator, duplicate normalized name, symlink,
  hardlink, device, FIFO, file-directory prefix conflict, order-dependent link, metadata restore,
  sparse logical-size overflow, false size header, nested-budget exhaustion;
- parser timeout, crash, partial output, unavailable scanner, and cancellation;
- quarantine object replaced between upload and inspection or inspection and promotion;
- promotion reads latest generation instead of the recorded immutable version;
- hostname resolves to mixed public and forbidden addresses;
- redirect changes scheme, port, host, address class, or exhausts the total budget;
- DNS re-resolution or proxy routing chooses a different address than the validated one;
- inbound credentials or cookies would be forwarded to a remote target;
- remote response passes network policy but fails ordinary upload type or parser policy;
- rejected or failed files remain unavailable through download, preview, CDN, email, admin, search,
  and derived-object paths.
- public path or prefix input cannot bypass opaque-id authorization and exact-version lookup;
- `Content-Disposition` CR/LF and path fragments cannot alter headers or storage lookup;
- static extension probing and raw-name log injection are rejected.

Where two detectors or parsers exist, add differential fixtures so disagreement is an explicit
failure or policy branch rather than an accidental first-match winner.

## 11. Primary reference anchors

Use current primary documentation when refreshing claims:

- OWASP File Upload Cheat Sheet for defense-in-depth upload controls, generated names, storage
  placement, type signals, size limits, scanning, CDR, and archive expansion limits.
- OWASP SSRF Prevention Cheat Sheet for URL allowlisting limits, redirect control, scheme policy,
  DNS pinning checks, and A/AAAA review.
- OWASP API Security API4 for memory, CPU, file descriptor, process, upload, operation-count, page,
  and third-party spending limits.
- ImageMagick security policy documentation for coder, delegate, path, memory, map, disk, file,
  thread, time, width, height, and list-length controls when ImageMagick is in the parser path.
- Go `os.Root` and Java `SecureDirectoryStream` official documentation for root-relative runtime
  capabilities and their platform or provider limits.
- Python `tarfile` and `zipfile`, plus Go `archive/zip`, for versioned extraction filters, caller-owned
  path validation, special entry metadata, sparse members, and non-local-name diagnostics.
- RFC 6266 for treating response filenames as advisory presentation values and handling path
  components, control characters, device names, `filename`, and `filename*` safely.

External guidance is a floor. The repository's concrete parser, object-storage, network, tenant,
and serving contracts decide the actual implementation and test evidence.
