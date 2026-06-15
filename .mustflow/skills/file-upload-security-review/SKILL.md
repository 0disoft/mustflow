---
mustflow_doc: skill.file-upload-security-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: file-upload-security-review
description: Apply this skill when code is created, changed, reviewed, or reported and file upload, import, attachment, direct-to-storage upload, remote file fetch, archive extraction, thumbnailing, preview generation, image resizing, document conversion, virus scanning, CDR, file metadata, storage keys, public file URLs, signed upload or download URLs, CDN delivery, file download, uploaded filename display, or upload-related tests need security review across the full file lifecycle.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.file-upload-security-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# File Upload Security Review

<!-- mustflow-section: purpose -->
## Purpose

Review file upload security as a full lifecycle, not as an extension or MIME-type checklist.

The review question is not "does the upload route block `.exe`?" It is "what final bytes, filename,
storage key, parser, visibility state, authorization check, and response headers can this uploaded
file reach after it enters the system?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, refactor, docs, tests, or reports touch file uploads, imports,
  attachments, avatars, media libraries, document intake, CSV import or export, remote URL import,
  direct-to-object-storage uploads, signed upload URLs, signed download URLs, file downloads,
  thumbnails, previews, image resizing, metadata extraction, OCR, archive extraction, document
  conversion, antivirus scanning, CDR, storage key generation, CDN delivery, file cleanup, or file
  visibility states.
- A request, form, client state, queue payload, webhook, storage callback, or object metadata
  supplies a filename, extension, MIME type, content type, path, folder, key, bucket, URL, callback
  URL, content disposition, size, checksum, tenant id, project id, upload id, or visibility flag.
- A review needs security coverage for dangerous file types, path traversal, web-root execution,
  parser exploits, SVG or HTML rendering, PDF or Office active content, archive extraction, CSV
  formula injection, direct-to-storage race conditions, presigned URL policy, storage overwrite,
  download authorization, response headers, filename injection, resource exhaustion, or upload
  denial-case tests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only general source-to-sink security review beyond files; use `security-flow-review`.
- The task primarily changes API authorization, route guards, role models, or tenant policy; use
  `api-access-control-review` or `auth-permission-change` first, then this skill for file-specific
  surfaces.
- The task primarily models upload states, retries, or processing lifecycle transitions; use
  `state-machine-pattern` first, then this skill for security-specific file handling.
- The task primarily changes file metadata persistence, storage/database consistency, or cleanup
  rules; use `database-change-safety` or `adapter-boundary` first when those are the owning concern.
- The task asks for live exploit traffic, malware collection, credentialed cloud testing, or unsafe
  payload corpus generation. Stay within defensive local code review, safe fixtures, and configured
  tests.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, upload surface, and the file security claim being
  reviewed.
- Upload entrypoint ledger: routes, controllers, forms, mobile clients, SDK calls, GraphQL
  mutations, direct-to-storage URL issuers, storage callbacks, remote URL importers, batch imports,
  admin tools, and test helpers that can create or attach files.
- File identity ledger: original filename, normalized filename, final storage key, bucket or root,
  database record id, tenant or owner, checksum, size, content type, detected type, extension,
  visibility, status, and cleanup owner.
- Validation ledger: extension allowlist, decoding and normalization, content-type trust, signature
  checks, parser-based validation, image rewriting, metadata stripping, antivirus, CDR, size limits,
  count limits, quota, rate limits, and failure behavior.
- Processing ledger: thumbnailing, preview, image resize, OCR, PDF parsing, Office conversion,
  archive extraction, CSV handling, media transcoding, scanner execution, queue jobs, retries,
  sandboxing, timeout, memory, CPU, network, and privilege limits.
- Serving ledger: download authorization, signed URLs, CDN cache, response `Content-Type`,
  `Content-Disposition`, `X-Content-Type-Options`, CSP or origin isolation, filename display, logs,
  admin preview, email attachments, and public/private transition.
- Existing tests, abuse cases, security docs, storage policy docs, configured command intents, and
  any unavailable cloud or scanner evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing filename, key, parser, visibility, authorization,
  storage, scanner, or serving evidence can be reported without guessing.
- Treat client-provided filename, extension, MIME type, path, bucket, key, URL, size, checksum,
  tenant, owner, and visibility as untrusted until server-side evidence proves otherwise.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten server-side file type allowlists, decoded and normalized filename checks, generated
  storage keys, path containment checks, overwrite protection, upload size and count limits, quota
  checks, quarantine states, scanner gates, parser sandboxing, archive extraction guards, CSV formula
  neutralization, metadata stripping, image rewriting, signed URL constraints, download
  authorization, response headers, filename encoding, audit logs, cleanup rules, and focused
  denial-case tests.
- Update storage docs, security docs, API examples, role matrices, fixtures, template surfaces, and
  package tests that describe the same file lifecycle contract.
- Keep changes scoped to file upload, file processing, and file serving boundaries.
- Do not add broad malware scanners, live external probes, dependency installs, production storage
  operations, offensive payload collections, or unrelated hardening work under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Draw the file lifecycle before judging the first check.
   - Name each step from upload entrypoint to final serving path: receive, normalize, validate,
     store, record metadata, scan, transform, promote, preview, download, delete, and cleanup.
   - Include admin preview, email attachment, export, CDN, search index, and worker paths when they
     can read the uploaded bytes.
2. Treat frontend restrictions as usability only.
   - `<input accept>`, client-side size checks, mobile picker filters, and JavaScript extension
     checks do not prove security.
   - Require equivalent server-side validation or report the boundary gap.
3. Decode and normalize before extension checks.
   - Check URL encoding, repeated decoding, case, trailing dots or spaces, Unicode confusables,
     null-like separators, double extensions, and platform-specific separators before extension
     allowlist decisions.
4. Prefer allowlists over blocklists.
   - Business-required file types should be explicit.
   - Blocklists for `.php`, `.jsp`, `.asp`, `.html`, `.svg`, config files, legacy plugin types, or
     executable server extensions are not enough by themselves.
5. Validate the final storage name and key, not only the original filename.
   - Confirm the server generates the stored basename, object key, upload id, and path.
   - Treat `destination`, `folder`, `key`, `path`, `filename`, `bucket`, and callback-provided
     storage locations as attacker-controlled unless derived on the server.
6. Prove path containment after normalization and symlink resolution.
   - `path.join(uploadDir, userName)` is not enough.
   - Check real path containment, absolute paths, drive letters, backslashes, `..`, symlinks,
     hardlinks, case-insensitive filesystems, and reserved names when local files are used.
7. Bound filenames and storage keys.
   - Check filename length, full path length, database column length, object-storage key length, log
     field length, CDN cache-key length, and error behavior for oversized or malformed names.
8. Prevent overwrite and key guessing.
   - Check duplicate names, fixed keys such as `avatar.png`, public key predictability, tenant key
     collisions, and presigned upload reuse.
   - Existing object replacement should require an explicit server-side policy and authorization.
9. Keep uploaded bytes outside executable web roots.
   - Prefer private object storage or a non-executable file root served through an authorized
     application handler.
   - Check web server handlers for PHP, CGI, ASP.NET, JSP, SSI, `.htaccess`, `web.config`, and
     similar config-file replacement paths.
10. Do not trust request MIME labels.
    - `Content-Type`, `file.mimetype`, `$_FILES['type']`, and client metadata are claims, not
      evidence.
    - Compare them with detected type only as a signal, never as the only security decision.
11. Treat magic bytes as necessary but not sufficient.
    - Polyglot files, metadata payloads, trailing content, and container formats can pass simple
      signature checks while still reaching dangerous parsers.
12. Re-encode images when possible.
    - Decode and write a new image instead of storing user bytes directly when the product only
      needs raster images.
    - Strip EXIF, comments, thumbnails, ICC surprises, and other metadata unless product policy
      intentionally preserves them.
13. Treat SVG and HTML as active content.
    - Do not group SVG with ordinary raster images.
    - If SVG is allowed, require sanitization or rasterization, separate origin or strict CSP,
      attachment disposition, external reference controls, and download/header review.
14. Treat PDF and Office documents as active document bundles.
    - Check macros, embedded objects, JavaScript, external links, parser vulnerabilities, preview
      isolation, antivirus or CDR, and whether downloads are safer than inline rendering.
15. Review archive extraction as the main feature.
    - For ZIP, tar, and nested archives, validate every entry path after normalization and prove it
      stays inside the extraction root.
    - Bound extracted file count, total uncompressed bytes, compression ratio, nesting depth,
      symlinks, hardlinks, absolute paths, duplicate entries, and processing time.
16. Review CSV import and export for formula injection.
    - If user-supplied cells may later be opened in spreadsheets, handle cells beginning with `=`,
      `+`, `-`, `@`, tabs, carriage returns, line feeds, separators, quotes, and confusable
      variants according to local policy.
17. Review remote URL import as SSRF plus upload.
    - Check scheme allowlists, redirect chains, DNS rebinding, localhost, private networks,
      link-local metadata endpoints, non-HTTP schemes, credential forwarding, response size,
      timeout, and final file validation.
18. Keep scanner and conversion work behind a publication gate.
    - A file that is pending scan, failed scan, pending conversion, or failed conversion should not
      be public, previewable, downloadable, indexed, or emailed unless policy explicitly allows it.
19. Sandbox file parsers and scanners.
    - ImageMagick, ffmpeg, LibreOffice, PDF parsers, OCR tools, unzip, antivirus, and CDR engines
      need low privilege, no unnecessary network, timeouts, memory and CPU limits, temporary
      directory isolation, and controlled input paths.
20. Validate direct-to-storage uploads in two phases.
    - Before issuing a signed upload URL, authorize the target resource and fix method, bucket, key,
      prefix, content type policy, checksum, size range, overwrite policy, and expiration.
    - After upload completion, verify actual object metadata before promoting it out of quarantine.
21. Treat presigned URLs as delegated authority.
    - Check method, bucket, key, prefix, expiry, reuse, checksum, content-length range, content type,
      ACL or public-read flags, revocation behavior, CDN caching, and whether the creator's
      privileges are too broad.
22. Enforce tenant boundaries in storage keys and metadata.
    - Server-generated keys should include trusted tenant, organization, project, or resource
      context plus a random id when multi-tenant isolation matters.
    - Reads, writes, deletes, overwrites, cleanup, and promotion must use the same boundary.
23. Recheck authorization at download and preview time.
    - Upload permission is not download permission.
    - Check owner, tenant, project membership, billing or entitlement state, deleted state, scanner
      state, visibility, share links, admin scope, and service-account scope before serving bytes.
24. Set response headers deliberately.
    - Use safe `Content-Type`; default ambiguous private downloads to `application/octet-stream`.
    - Use `Content-Disposition: attachment` when inline rendering is not required.
    - Add `X-Content-Type-Options: nosniff` and review CSP, origin isolation, and CDN header
      preservation where browser execution risk exists.
25. Treat filename display as an injection surface.
    - Escape original filenames in HTML, email, admin tables, JSON-in-script, logs, and support
      views.
    - For `Content-Disposition`, remove CR/LF and encode filenames safely for header context.
26. Apply resource limits at every layer.
    - Bound request body size, per-file size, file count, concurrent uploads, chunk count, multipart
      sessions, user quota, tenant quota, daily quota, extracted size, transformed size, preview
      time, and retry volume.
27. Revalidate chunked and multipart uploads at assembly time.
    - Check final file size, content type, signature, chunk order, chunk count, checksum, session
      expiration, stale partial cleanup, and final key ownership after assembly.
28. Review upload endpoint auth, CSRF, and rate limits.
    - Browser-cookie upload endpoints need CSRF posture.
    - Import, admin upload, remote fetch, and chunk completion endpoints need authentication,
      authorization, anti-automation controls, and audit logs.
29. Check storage cleanup without breaking authorization.
    - Find orphaned objects, database rows without objects, failed conversions, stale quarantine,
      abandoned multipart uploads, deleted records waiting for physical removal, and public CDN
      cache invalidation.
30. Test denial cases from the attacker's path.
    - Cover disallowed type, spoofed MIME, renamed extension, encoded extension, double extension,
      oversize body, quota exceeded, path traversal, archive escape, zip bomb, SVG active content,
      CSV formula, unauthorized upload target, unauthorized download, pending-scan download,
      presigned overwrite, stale multipart session, and remote URL SSRF where relevant.

<!-- mustflow-section: postconditions -->
## Postconditions

- The file lifecycle names entrypoints, final filename or key, storage root or bucket, metadata
  record, validation gates, processing tools, visibility state, serving path, and cleanup owner.
- Client-provided filenames, MIME labels, paths, keys, URLs, sizes, checksums, tenants, owners, and
  visibility flags are either ignored, verified, or explicitly reported as risky.
- File type validation is tied to normalized final names and actual bytes, not only extension or
  request headers.
- Upload, processing, promotion, preview, download, CDN, email, admin, and cleanup paths are checked
  or explicitly scoped out.
- Denial-case tests or missing evidence are named from the attacker-controlled file lifecycle.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured tests that prove file lifecycle denial behavior: disallowed type,
spoofed MIME, normalized extension bypass, path traversal, archive escape, resource limit,
unauthorized upload target, unauthorized download, pending-scan access, presigned policy, and remote
URL rejection.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If filename, key, storage, parser, scanner, visibility, tenant, authorization, or response-header
  evidence is missing, report the gap instead of claiming the upload path is safe.
- If the fix requires broad auth model changes, use `auth-permission-change` or
  `api-access-control-review` before editing that scope.
- If a sensitive filename, URL, token, storage key, signed URL, user content, or malware-like sample
  appears in logs, diffs, fixtures, screenshots, command output, or final reports, stop repeating it
  and use `secret-exposure-response` when it may be sensitive.
- If a command fails, use `failure-triage` before further edits.
- If verification would require live storage credentials, production files, malware samples, or
  unsafe network probes, skip that path and report the remaining risk.

<!-- mustflow-section: output-format -->
## Output Format

- File upload security reviewed
- Upload entrypoints, file identity, storage, validation, processing, serving, and cleanup map
- Filename, type, path, overwrite, web-root, parser, archive, CSV, remote URL, scanner, signed URL,
  tenant, authorization, header, and resource-limit findings
- Fixes made or recommendation
- Denial tests, fixtures, or invariant evidence
- Command intents run
- Skipped checks and reasons
- Remaining file-upload security risk
