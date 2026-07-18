---
mustflow_doc: skill.input-boundary-validation-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: input-boundary-validation-review
description: Apply this skill when untrusted bytes, text, URL components, headers, query parameters, JSON, XML, YAML, CSV, identifiers, filenames, filters, sort keys, template values, process arguments, database inputs, or structured payloads are created, changed, reviewed, debugged, or reported and safety depends on strict decoding, field-specific canonicalization, duplicate handling, type coercion, full parsing, semantic validation, authorization handoff, resource budgets, or separation of data from executable grammar.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.input-boundary-validation-review
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

# Input Boundary Validation Review

<!-- mustflow-section: purpose -->
## Purpose

Review input validation as one representation pipeline from untrusted bytes to a structured sink.
Prevent two layers from approving and executing different values, and prevent a syntactically valid
value from becoming authority or executable grammar by accident.

The security boundary is not a list of bad strings. It is an explicit chain such as raw bytes,
strict decode, field-specific canonical form, one parser, typed value, semantic validation,
authorization, and a structure-preserving execution API.

<!-- mustflow-section: use-when -->
## Use When

- A request, message, file, environment value, queue payload, webhook, import, or stored value crosses
  byte, character, normalization, parsing, schema, type, authorization, or execution boundaries.
- Code decodes percent escapes, content encodings, UTF-8, JSON escapes, form values, IDNA names,
  base64, compression, archives, or another nested representation.
- A field uses allowlists, denylists, regular expressions, sanitization, coercion, defaults, Unicode
  normalization, case folding, duplicate-key policy, unknown-field policy, or parser recovery.
- SQL, NoSQL, process, path, URL, header, template, expression, query-language, or spreadsheet output
  safety depends on keeping user data out of grammar positions.
- JSON, XML, YAML, CSV, regular expressions, multipart data, or another parser accepts hostile or
  expanding input and needs full-consumption and resource-budget review.
- A validation, canonicalization, injection-resistance, parser-differential, or input-safety claim
  needs current implementation and denial-case evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes lexer, grammar, CST, AST, recovery, incremental parsing, or parser implementation
  semantics; use `parser-engineering-review` as the primary owner and this skill only for the outer
  application boundary.
- The task is a general source-to-sink, actor, resource, tenant, or privilege review without a
  representation mismatch; use `security-flow-review`.
- The task changes the authorization model itself; use `auth-permission-change` or the closest
  access-control skill, then use this skill only for the validated handoff into that decision.
- The task changes only a caller-facing API request or response contract; use `api-contract-change`
  as the primary owner and this skill only when decoding, canonicalization, coercion, or sink safety
  is material.
- The task changes only a file-upload lifecycle, archive pipeline, preview, storage, or download
  surface; use `file-upload-security-review` as the primary owner.
- The task changes only YAML, TOML, frontmatter, or repository configuration semantics; use
  `structured-config-change` as the primary owner.
- The task needs only abuse-case regression tests after the boundary is understood; use
  `security-regression-tests` for that part.
- The task asks for live exploit traffic, credential guessing, offensive payload collection, or
  unowned external testing. Stay within defensive code, contracts, safe fixtures, and configured
  verification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Entry points, raw transport representation, content encoding, character encoding, parser, schema,
  typed model, semantic rules, authorization call, and final sinks.
- Every transformation that decodes, normalizes, folds, trims, repairs, defaults, coerces, expands,
  concatenates, serializes, or reparses the value.
- Field identity policy: display value, comparison key, storage value, allowed character or script
  profile, case sensitivity, normalization form, duplicate policy, and uniqueness owner.
- Parser policy: dialect, strictness, duplicate and unknown-field behavior, full-consumption rule,
  recovery behavior, scalar and numeric model, and configured resource limits.
- Sink policy: fixed grammar, permitted dynamic slots, parameter or object binding, path or URL
  construction, process invocation, template context, and authorization scope.
- Positive, boundary, malformed, ambiguous, duplicate, equivalent, resource-exhaustion, and denial
  fixtures plus configured command intents.

Read [input-boundary-security-checklist.md](references/input-boundary-security-checklist.md) when the
task spans more than one decoder or parser, uses Unicode identity, reaches an executable sink, or
needs a format-specific resource matrix.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions and command contract before running project commands.
- Name the selected repository and the exact boundary under review.
- Treat framework validation, static types, frontend controls, content-type labels, generated
  clients, and a successful parse as evidence candidates, not proof of end-to-end safety.
- Record unknown decoder, parser, normalization, collation, or sink behavior instead of guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Strict decoders, field-specific normalizers, duplicate-aware parsers, schemas, DTOs, typed query or
  command compilers, safe sink adapters, resource budgets, denial tests, and directly synchronized
  documentation or templates owned by the selected boundary.
- Stable error codes and bounded metrics that identify the rejected stage without logging the raw
  hostile or sensitive value.
- Do not silently broaden accepted syntax, normalize arbitrary display text, delete invalid bytes or
  characters, add a generic sanitizer, or replace a structure-preserving API with string assembly.
- Do not add offensive corpora, live scanners, dependency installs, background workers, or raw
  command examples under this skill.

<!-- mustflow-section: procedure -->
## Procedure

### 1. Build a representation ledger

Trace one value through every representation:

1. wire or file bytes;
2. decompressed or decoded bytes;
3. decoded Unicode scalar values;
4. field-specific normalized or comparison form;
5. parsed tree or typed DTO;
6. semantically validated domain value;
7. authorization decision input; and
8. structure-preserving sink input.

For each edge, name the owner, operation, failure behavior, size unit, retained raw form, and whether
another layer can repeat or reinterpret the operation. The same validated typed value should reach
authorization and execution; validating one string and reparsing another is a split boundary.

### 2. Decode each protocol layer exactly once

- Assign percent decoding, transfer decoding, decompression, charset decoding, escape processing,
  and container extraction to one named layer each. Do not recursively decode until a value "looks
  clean."
- Use strict decoding for security identifiers and protocol fields. Reject malformed percent escapes,
  invalid UTF-8, overlong sequences, unexpected BOMs, lone surrogates, truncated escapes, trailing
  compressed data, and decoder warnings when the selected format forbids them.
- Bound raw bytes, decoded bytes, expansion ratio, decoded scalar count, and work before allocating
  or forwarding the expanded representation.
- Preserve raw evidence separately when diagnostics, signatures, audit, or compatibility require it;
  do not let downstream code reinterpret the raw value after the typed value exists.

### 3. Define canonicalization per field

- Separate display value, storage value, and canonical comparison key. A single global
  `normalizeInput` function is not a field policy.
- Choose NFC, NFKC, case folding, whitespace handling, IDNA processing, script restrictions,
  default-ignorable handling, and confusable detection only where the field's identity semantics
  require them.
- Apply the selected transformation before allowlist validation, uniqueness, cache keys,
  authorization lookup, signatures, and persistence that depend on equivalence.
- Make canonicalization deterministic and idempotent. Back canonical uniqueness with the owning
  database index or registry constraint; an application pre-check alone races.
- Reject invalid values rather than deleting characters. Permit repair only when a documented
  business rule defines the unique repaired value, then validate the repaired result again.

### 4. Parse one complete value under one policy

- Use one authoritative parser and configuration for validation and consumption. Pass the parsed
  immutable value forward instead of reparsing the original text in another layer.
- Require full input consumption. Reject trailing garbage, multiple documents where one is expected,
  warnings, recovery output, unknown encoding switches, and partial-prefix success.
- Reject duplicate object names and duplicate single-valued parameters before a map or framework
  binding discards their multiplicity. Declare ordered multi-value fields explicitly.
- Disable implicit string-to-number, number-to-boolean, scalar-to-array, empty-to-null, and runtime
  class binding unless each coercion is part of the public contract and tested at every consumer.
- Reject unknown fields, schema versions, discriminators, enums, and validation timeouts for
  security-sensitive objects unless an explicit forward-compatibility contract proves they are
  ignored by every downstream consumer.

### 5. Separate syntax, semantics, and authority

- Validate syntax with a real parser, enum, or whole-string recognizer. Character allowlists do not
  prove grammar, and substring matches do not prove whole-field validity.
- Validate semantics against business facts such as range, ordering, state, existence, and allowed
  combinations. Do not turn a parse success into a business-valid claim.
- Perform authorization with trusted actor and tenant context against the final canonical resource
  identity and action. A valid UUID, tenant id, path, or enum is not permission.
- Fail closed on unknown fields, unknown versions, missing context, parser disagreement, timeout,
  and unavailable validation for security-sensitive decisions. Do not map validation failure to a
  permissive default.

### 6. Keep data out of executable grammar

- Use parameter binding for SQL values. Map dynamic identifiers, sort directions, operators, and
  field selections from typed application enums to fixed code fragments.
- Build NoSQL, search, filter, and expression trees server-side from a bounded DTO. Do not pass a
  client-owned object or raw query language to the driver.
- Prefer library APIs over child processes. When a process is unavoidable, fix the executable,
  subcommand, options, environment, working directory, and resource limits in code; pass data as a
  distinct argument, stdin stream, or already-open handle, and account for option injection.
- Prefer opaque resource IDs and opened handles over client path strings. Resolve under the owning
  filesystem boundary and keep symlink, race, platform alias, and containment policy with the open
  operation rather than a detached prefix check.
- Keep templates as trusted deployed code and user content as inert values. HTML escaping protects
  an output context; it does not make untrusted template source safe.

### 7. Budget hostile structure before materialization

Define a boundary budget with applicable counters for wire bytes, decoded bytes, expanded bytes,
scalar count, numeric digits, token count, node count, depth, container items, object keys, aliases,
attributes, text-node length, regular-expression work, output bytes, and deadline.

- Charge before allocation, object construction, external fetch, database write, or file effect.
- Bound breadth and scalar size as well as nesting depth. A shallow million-element array is still
  hostile.
- Disable parser features that can fetch resources, instantiate runtime objects, execute tags or
  callbacks, include other documents, or expand aliases when the input contract does not need them.
- Treat streaming as a memory strategy, not permission for unbounded total work or partial effects.

### 8. Delay side effects until acceptance

- Do not mutate production state while a document, stream, archive, CSV import, or message is only
  partially parsed or validated.
- For bounded inputs, parse and validate into an immutable intermediate value before one atomic
  effect. For large inputs, use a bounded staging area and publish only after complete validation.
- Bind the authorized decision to the exact canonical identity, source version, schema version, and
  typed operation executed. Revalidation against a different representation is not equivalent.

### 9. Build a boundary-focused test matrix

Cover applicable pairs and transitions:

- valid raw bytes, malformed encoding, truncated escape, invalid BOM, and nested or double encoding;
- pre-normalized and canonically equivalent forms, compatibility forms, mixed scripts, default
  ignorables, bidi controls, NUL, and length changes after normalization;
- duplicate keys and parameters, unknown fields, wrong types, coercion candidates, numeric extremes,
  trailing data, multiple documents, and parser warnings;
- valid grammar positions and rejected attempts to supply operators, identifiers, options, paths,
  templates, or query objects as data;
- limits immediately below, at, and above every raw, decoded, expanded, structural, numeric, and
  output budget;
- syntactically valid but semantically invalid values, valid resource identifiers without
  permission, and stale or mismatched schema versions;
- differential fixtures when gateways, frameworks, databases, caches, or downstream services may
  parse, normalize, collate, or choose duplicates differently.

Assert the stable stage and error class, no side effect, and the exact structured sink shape. Do not
assert only that a generic 400 or exception occurred.

### 10. Implement the narrowest complete correction

Fix the earliest owning layer that can make every downstream consumer observe the same accepted
value. Synchronize schemas, typed models, safe adapters, uniqueness rules, tests, docs, templates,
and error contracts that describe that boundary. Do not patch only the last sink while another
consumer still receives the ambiguous representation.

### 11. Verify each claim

Use the narrowest configured intents that cover the changed decoder, parser, schema, sink adapter,
tests, documentation, and installed template. Separate directly executed evidence from code-supported
inference and unverified runtime behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every transformation from raw input to sink has one owner, one failure policy, and explicit size
  units.
- Validation, authorization, and execution consume the same canonical typed identity or a proven
  lossless derivation of it.
- Duplicate, unknown, coercion, full-consumption, normalization, and parser-recovery policies are
  explicit.
- Dynamic grammar positions are fixed or mapped from typed server-owned choices; user data remains
  data.
- Hostile input work is bounded before side effects, and denial tests name the rejected stage.
- Verification records distinguish passed checks, supported inferences, skipped checks, and
  remaining representation or sink risk.

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

Prefer focused denial, differential, and resource-boundary tests. Use `security-regression-tests`
when creating abuse-case coverage, and `parser-engineering-review` when the parser implementation
itself changes.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If two layers decode, normalize, parse, collate, or choose duplicate values differently, stop the
  safety claim and identify which representation reaches authorization and the sink.
- If the accepted syntax, identity policy, schema version, collation, or forward-compatibility rule
  is unknown, preserve current behavior and report the smallest missing decision.
- If a parser feature cannot be disabled or bounded, isolate or remove that input path rather than
  claiming validation makes it safe.
- If a safe structured API cannot express the required operation, redesign the external DTO or
  isolate a fixed compiler; do not fall back to escaping arbitrary executable text.
- If a configured verification fails, activate the applicable failure-triage procedure and do not
  broaden the change until the failure is classified.
- If verification requires live attack traffic, production data, credentials, or an unconfigured
  long-running scanner, skip it and report the remaining evidence gap.

<!-- mustflow-section: output-format -->
## Output Format

- Input boundary and representation ledger
- Decoder, canonicalization, duplicate, coercion, parser, schema, and budget decisions
- Syntax, semantic, authorization, and sink separation
- Safe API or typed compiler decision
- Files changed and compatibility behavior preserved or intentionally changed
- Positive, malformed, equivalent, differential, denial, and resource-boundary evidence
- Configured command intents and results
- Skipped checks and reasons
- Remaining representation, parser, authorization-handoff, or sink risk

