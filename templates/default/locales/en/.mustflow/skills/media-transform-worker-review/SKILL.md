---
mustflow_doc: skill.media-transform-worker-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: media-transform-worker-review
description: Apply this skill when image, video, PDF, or document conversion and transformation need security review, including one-shot transform workers, ImageMagick, FFmpeg, Ghostscript, LibreOffice, codec and protocol allowlists, format allowlists, decoded resource limits, PDF sanitization, output re-verification, transform state machines, worker isolation, or transformation reproduction records.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.media-transform-worker-review
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

# Media Transform Worker Review

<!-- mustflow-section: purpose -->
## Purpose

Review media conversion and transformation as execution of potentially compromised binaries, not as
a helper function call.

The review question is not "does the resize work?" It is "if the ImageMagick, FFmpeg, Ghostscript, or
LibreOffice process is compromised, what can it reach, what can it produce, and how is the output
re-verified before it becomes visible?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports image resizing, thumbnail or preview generation, video
  transcoding, PDF rendering or sanitization, document conversion, OCR, or any transformation that
  feeds attacker-controlled files into third-party parsers or converters.
- A change affects how a transform worker is isolated, which codecs and protocols are allowed, how
  decoded resources are bounded, how outputs are re-validated, or how transform jobs are tracked.
- A review needs proof that a parser compromise cannot reach the service account, internal network,
  or other tenants' files.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is the full file upload, validation, storage, or download lifecycle; use
  `file-upload-security-review` first and this skill for the transform worker itself.
- The task is file encryption, signing, or integrity verification; use
  `file-encryption-integrity-review`.
- The task is a general parser or interpreter implementation; use `parser-engineering-review` or the
  matching language skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Transform ledger: which tools run, which input and output formats are reachable, and which codecs,
  demuxers, decoders, protocols, delegates, and features are enabled.
- Worker-isolation ledger: user, network, filesystem, credential, and resource boundaries of each
  transform process or container.
- Resource-budget ledger: decoded pixels, frames, pages, objects, streams, samples, and container
  memory, CPU, disk, output, open-file, process, and wall-time limits.
- Output-revalidation ledger: how outputs are opened by an independent validator and promoted.
- State-machine ledger: accepted, staged, processing, validating, published, failed, and cleaned
  states with lease and heartbeat behavior.
- Existing security docs and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing transform, isolation, budget, or revalidation evidence
  can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten worker isolation, codec and protocol allowlists, decoded-resource budgets, PDF
  sanitization, output re-validation, transform state machines, and reproduction records, and
  directly synchronized documentation or templates owned by the selected boundary.
- Update transform runbooks, docs, and tests that describe the same contract.
- Do not add raw ImageMagick, FFmpeg, or Ghostscript commands, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Treat transform programs as potentially compromised executables.
   - ImageMagick, FFmpeg, Ghostscript, and LibreOffice read complex attacker-controlled binaries; a
     parser bug can take the service account and internal network access with it.
   - Run transforms in separate one-shot workers with network fully disabled, a non-root user, a
     read-only root filesystem, minimal seccomp or AppArmor, a restricted working directory, and no
     service configuration, environment variables, or cloud credentials. Give input directories
     read-only access and output directories write-only access, and discard the process or container
     after each job.
2. Decide format by actual decoding, not extension or declared MIME.
   - Extension and Content-Type are attacker claims. Cross-check extension, declared MIME, and magic
     bytes, then read the real header and stream structure with an allowed decoder.
   - Treat images with appended files, video containers with attached files or data streams, and
     PDFs with JavaScript or embedded files as separate inspection targets. The inspection program
     reads hostile input, so it also runs inside the isolated worker.
3. Limit decoded resources, not only file size.
   - A 5MB image can declare billions of pixels, a short animation can hold hundreds of thousands of
     frames, and a small PDF can contain a huge object graph with compressed streams. Bound image
     width, height, total pixels, frames, and profile size; video resolution, FPS, duration, stream
     count, and sample count; and PDF page count, page size, nested objects, embedded files, and
     render DPI.
   - Add container-level memory, CPU time, disk usage, output size, open-file count, process count,
     and total execution-time limits.
4. Use allowlists for codecs and protocols, never denylists.
   - For ImageMagick, deny all coders and delegates first and allow only the formats the product
     needs. For FFmpeg, strip unneeded protocols, demuxers, and decoders at build time and restrict
     runtime inputs with a protocol allowlist such as `file` and `pipe`.
   - FFmpeg can reach HTTP, FTP, SFTP, AMQP, concat, and HLS and nested protocols; default
     configuration on a file-conversion server is an SSRF and internal-file access path.
5. Never treat a re-saved PDF as a safe PDF.
   - PDFs are executable containers with scripts, actions, forms, links, attachments, fonts, images,
     and object references. If only a preview is needed, render pages to images and serve the
     images instead of the original PDF.
   - When the PDF itself must be served, remove JavaScript, Launch actions, embedded files, external
     references, and form actions, and re-inspect the output structure with a separate parser. For
     Ghostscript, do not rely on `SAFER` defaults alone; narrow read and write paths with
     `permit_file_read` and `permit_file_write`.
6. Re-verify outputs as attacker-created files.
   - Exit code 0 does not mean the output is valid. Write the output under a temporary name, close
     the file, and have an independent validator open it to check format, size, frames, pages,
     codecs, and metadata before promoting it to the final object key.
   - Discard partial, zero-byte, limit-exceeding, and unparseable outputs together with the whole
     working directory, and never expose them on a download path before validation.
7. Run file processing as an explicit state machine.
   - Track `accepted`, `staged`, `processing`, `validating`, `published`, `failed`, and `cleaned`,
     and keep pre-published outputs invisible. Use leases and heartbeats so a dead worker or server
     restart does not misread `processing` as complete; expire and retry or clean stuck jobs.
   - Isolate image, video, and PDF workers in separate container images and permissions so one
     parser compromise does not spread across processing types, and record tool versions, enabled
     codecs, limits, and command arguments per job so an incident file can be reproduced in the same
     environment.

<!-- mustflow-section: postconditions -->
## Postconditions

- Transform tools, reachable formats, worker isolation, codec and protocol allowlists,
  decoded-resource budgets, PDF sanitization, output re-validation, and the transform state machine
  are explicit.
- Transformers running in the web-server process, default protocol surfaces, re-saved-PDF-as-safe,
  and unvalidated outputs are fixed or reported.
- Transform-security claims are backed by configured tests, worker-isolation evidence, or labeled as
  manual-only or missing.

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

Prefer the narrowest configured tests that prove protocol and codec allowlists reject hostile
inputs, decoded-resource limits trip, outputs are re-validated before publication, and a dead worker
is not treated as complete.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If transform, isolation, budget, or revalidation evidence is missing, report the gap instead of
  approving the conversion path.
- If a transform tool must run in the application process, report the blast radius and the required
  worker move.
- If the fix requires upload, encryption, or parser changes, use the matching skill before editing
  that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Media transform worker reviewed
- Tool and format reachability findings
- Worker isolation and credential findings
- Codec and protocol allowlist findings
- Decoded-resource and container-budget findings
- PDF sanitization and output re-validation findings
- State machine and reproduction-record findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining transform-worker risk
