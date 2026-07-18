# Input Boundary Security Checklist

Use this reference after selecting `input-boundary-validation-review`. It supplies ledgers and
format-specific review prompts; the skill remains the procedure and command-authority boundary.

## Contents

1. Representation ledger
2. Field identity policy
3. Decoder and transport policy
4. Parser and schema policy
5. Unicode and identifier policy
6. Structured sink policy
7. Format-specific parser limits
8. Shared resource budget
9. Boundary test matrix
10. Primary anchors

## 1. Representation ledger

Record every representation that can affect meaning, identity, authority, cost, or execution.

| Stage | Representation | Owner | Operation | Rejected conditions | Limit and unit | Forwarded value |
| --- | --- | --- | --- | --- | --- | --- |
| Transport | wire bytes | server or protocol adapter | framing and content coding | malformed framing, unsupported coding | wire bytes | bounded body stream |
| Expansion | decoded bytes | decompressor or container adapter | decompression or extraction | checksum, ratio, size, nesting | expanded bytes and ratio | bounded byte stream |
| Character | Unicode scalars | strict decoder | charset decode | malformed UTF-8, BOM, surrogate | scalar and byte counts | immutable text |
| Component | component text | URL, form, or escape decoder | one component decode | malformed or recursive escape | decoded component bytes | decoded field |
| Identity | canonical key | field policy | normalization and folding | disallowed script or control | code points and graphemes | canonical key plus display value |
| Syntax | parsed value | one parser | full parse | duplicate, trailing data, recovery | tokens, nodes, depth | immutable tree or DTO |
| Semantics | domain value | domain validator | range and relation checks | invalid state or combination | domain-specific | validated value |
| Authority | authorized operation | policy owner | actor-resource-action decision | deny, missing context, stale version | decision deadline | bound decision |
| Effect | structured sink input | repository or adapter | bind or compile | unmapped grammar slot | query, argv, path, output budget | side effect |

For every row, answer:

- Can another layer repeat the operation?
- Can a raw or earlier representation bypass the forwarded value?
- Can the operation change length, equality, separators, grammar characters, or resource identity?
- Does failure reject, repair, replace, truncate, ignore, choose a default, or continue with a
  warning?
- Does validation inspect the exact immutable value later authorized and executed?

A matching function name in two services does not prove matching behavior. Compare library,
version, options, locale, Unicode data, collation, duplicate policy, and error handling.

## 2. Field identity policy

Define policy by field role rather than applying one global sanitizer.

| Field role | Raw retained? | Normalization | Case policy | Script or character policy | Uniqueness owner | Display policy |
| --- | --- | --- | --- | --- | --- | --- |
| Opaque server id | normally no client normalization | none beyond format | exact | narrow protocol alphabet | database or registry | canonical id |
| Username or handle | audit raw only if policy permits | declared NFC or NFKC profile | declared full fold or exact | identifier profile, mixed-script rule | canonical-key unique index | original safe display |
| Human name | preserve | normally NFC | locale-aware display only | broad text with control policy | no identity inference | escaped and bidi-isolated |
| Email-like identity | product-specific profile | component-specific | domain and local rules differ | explicit internationalization policy | canonical-key constraint | preserve meaningful spelling |
| Hostname | optional raw for audit | selected IDNA or UTS #46 profile | profile-owned | label and script checks | canonical ASCII A-label | safe Unicode display separately |
| Filename label | preserve as metadata | platform-independent display policy | do not infer storage identity | control, separator, bidi policy | server storage key | encoded download label |
| Enum or sort field | no | none | exact unless contract says otherwise | closed application enum | code map | localized label |
| Free text | preserve | usually NFC only if required | preserve | reject only unsafe controls for the context | not an identity key | output-context encoding |

Check these invariants:

- Canonicalization is deterministic and idempotent.
- The canonical key is computed before uniqueness, cache lookup, authorization, signing, and storage
  decisions that depend on equality.
- Compatibility normalization is restricted to fields whose semantics permit distinctions to be
  erased.
- Confusable skeletons are collision or review signals, not replacement usernames.
- Default-ignorable, joining, variation, and bidi characters are governed by field and language
  context rather than globally deleted.
- Database collation, application comparison, cache keys, and downstream services agree or use the
  same stored canonical key.

## 3. Decoder and transport policy

Inventory all possible decoders:

- HTTP framing and chunking;
- content transfer and content coding;
- compression and archive layers;
- declared or default charset;
- UTF-8 or UTF-16 decoding;
- percent, form, JSON, XML, HTML, shell, or language escapes;
- base64, quoted-printable, multipart, protobuf, and custom envelopes;
- URL component parsing and IDNA conversion.

For each decoder:

1. Name the exact input and output type.
2. Reject malformed encoding rather than replacing, skipping, or guessing.
3. Decide whether BOM is permitted and where.
4. Bound input, output, ratio, nesting, and work before materialization.
5. Reject trailing bytes or concatenated streams unless the format explicitly supports them.
6. Prevent a later proxy, router, framework, database, filesystem, or client from decoding the value
   again under another policy.

Test malformed percent escapes, encoded separators, mixed separators, double encoding, invalid UTF-8,
overlong forms, truncated multibyte sequences, unexpected BOMs, embedded NUL, lone surrogate input,
and a chunk boundary inside each multibyte or escaped sequence.

## 4. Parser and schema policy

Use one row per externally controlled format.

| Concern | Required decision |
| --- | --- |
| Parser | implementation, version, dialect, and option source |
| Full consumption | EOF required, document count, trailing whitespace policy |
| Recovery | disabled, or exact compatible cases that remain external-contract safe |
| Duplicate names | reject before map binding; explicitly model genuine multi-value fields |
| Unknown fields | reject, preserve, or ignore under one versioned forward-compatibility contract |
| Coercion | exact accepted input types and every permitted conversion |
| Numbers | lexical length, integer and fraction digits, exponent, finite range, precision model |
| Strings | raw bytes, decoded scalar count, normalized length, allowed controls |
| Containers | maximum depth, keys, elements, attributes, aliases, and total nodes |
| Polymorphism | closed discriminator map; no client-selected runtime class |
| External resources | resolver, include, schema, entity, import, and network policy |
| Side effects | none until complete syntax and semantic acceptance |

Danger signs:

- gateway validates the first duplicate while the application uses the last;
- query parser turns one occurrence into a scalar and two into an array;
- schema validator coerces a string but business code reads the original raw value;
- security gate uses strict JSON while a downstream service accepts comments, trailing commas, or
  multiple documents;
- a generic map erases duplicate names before the validator sees them;
- unknown enum or schema version becomes `DEFAULT`;
- validation timeout or parser warning falls through to an allow path;
- deserialization chooses a runtime class from `$type`, `@class`, tag, or user-owned discriminator;
- a parsed DTO is discarded and the raw string is reparsed for execution.

## 5. Unicode and identifier policy

Review these as separate dimensions:

| Dimension | Questions |
| --- | --- |
| Encoding | Is the external charset fixed? Are malformed sequences rejected? |
| Scalar validity | Are lone surrogates, noncharacters when relevant, and NUL handled explicitly? |
| Normalization | Is NFC, NFD, NFKC, or NFKD selected per field and applied before validation? |
| Case | Is exact comparison, locale-independent full folding, or locale display casing intended? |
| Scripts | Are permitted scripts, mixed-script cases, and digit-set mixing explicit? |
| Confusables | Is collision detection separate from stored identity? |
| Ignorables | Are joining controls, variation selectors, soft hyphen, and BOM contextually handled? |
| Bidi | Are identifiers restricted and displayed text isolated? Are logs escaped visibly? |
| Length | Which limits use bytes, code points, grapheme clusters, display width, or normalized form? |
| IDNA | Which profile and version produce the canonical ASCII hostname? |

Keep storage and network protection limits in bytes and code points. Use grapheme clusters only for
user-visible character counts. Bound combining sequences and post-normalization growth separately
when they affect cost or storage.

Do not use a visual rendering, lowercase call, or normalization form as an authorization proof.
Bind authority to the stored canonical identity produced by the declared field policy.

## 6. Structured sink policy

### SQL

- Bind every data value through the driver.
- Map table, column, sort direction, operator, function, and grouping choice from a closed application
  enum to fixed code.
- Reject generic "safe SQL fragment" strings and review ORM raw, native-query, string predicate,
  relation-path, and order-clause escape hatches.
- Scope authorization in the query or repository operation, not as a format check before an
  unscoped lookup.

### NoSQL, search, and expression engines

- Accept a bounded business DTO, not a client-owned query object or DSL.
- Construct operator trees server-side from a closed mapping.
- Reject unexpected nested objects, operator-prefixed keys, scripts, unbounded regular expressions,
  raw aggregation stages, and arbitrary field selection.
- Bound clause count, array size, date range, regex length, sort fields, result count, and query cost.

### Processes

- Prefer a library API.
- Fix executable, subcommand, options, environment, working directory, privilege, network policy,
  time, and output limits.
- Use an argument array without a shell, but still reject or terminate option parsing for operands
  that can begin with `-`.
- Prefer stdin or an already-open file handle for large data. Close inherited file descriptors and
  terminate descendants on timeout.

### Filesystem and URL resources

- Prefer opaque server-owned resource IDs.
- Parse URLs into components and compare the canonical host under one IDNA policy.
- Resolve filesystem access relative to a trusted opened directory or equivalent capability.
- Treat symlinks, junctions, reparse points, case folding, device namespaces, alternate data streams,
  trailing dots or spaces, short-name aliases, and time-of-check/time-of-use races as platform
  concerns, not string-normalization details.
- Carry the opened handle or verified capability forward rather than reopening a checked string.

### Templates and rendered output

- Treat template source, include names, expressions, and filter selection as deployed code.
- Copy only inert values into the template context; do not expose request, ORM, configuration,
  classes, functions, or capability-bearing objects.
- Encode for the final output context. HTML escaping does not secure JavaScript, CSS, URL, CSV,
  shell, or template grammar.
- Bound template CPU, memory, recursion, and output even when a sandbox is enabled.

## 7. Format-specific parser limits

### JSON

- Reject duplicate names, trailing garbage, multiple top-level values, invalid escapes, and lone
  surrogate values that cannot satisfy the selected interoperability profile.
- Bound number text before arbitrary-precision conversion: total digits, fraction digits, exponent,
  and domain range.
- Disable untrusted polymorphic type selection and bind into a closed DTO.

### XML

- Reject `DOCTYPE` when the contract does not require it.
- Disable external general and parameter entities, external DTDs, XInclude, network and filesystem
  resolvers, schema imports, and transformation-time external access.
- Bound entity expansion, element depth, attribute count, namespace declarations, name length,
  text-node length, total nodes, and total decoded characters.
- Treat "secure processing" as a starting configuration whose effective provider limits must be
  verified, not a magic flag.

### YAML

- Use a safe data loader and a restricted schema. Disable runtime object construction, custom tags,
  class lookup, and function invocation.
- Decide whether anchors, aliases, merge keys, directives, and multiple documents are needed; reject
  them otherwise.
- Bound alias count, expansion work, depth, nodes, scalar size, and code points before object
  construction.
- Validate the loaded data against an explicit DTO or schema after syntax parsing.

### CSV and spreadsheet export

- Use a real CSV parser with fixed charset, delimiter, quote, escape, and newline policy.
- Bound rows, columns, record length, field length, total decoded bytes, and parse errors.
- Treat spreadsheet formula interpretation as a separate output sink. CSV quoting is not formula
  neutralization; prefer a format with explicit text cell types when possible.
- Do not commit imported rows to production state until the complete bounded import validates.

### Regular expressions

- Prefer a linear-time engine or a structurally safe subset for untrusted text.
- Require whole-string matching for field validation and check host-language anchor semantics.
- Bound pattern length, input length, captures, and execution work. Do not accept arbitrary
  user-supplied patterns unless a dedicated constrained language owns them.
- Treat a timeout as a last stop, not the proof that a backtracking pattern is safe.

## 8. Shared resource budget

Use one budget or bounded child views across transformations. Do not reset counters at decoder,
parser, nested-document, or subservice boundaries.

| Counter | Charged when | Typical failure class |
| --- | --- | --- |
| `wireBytes` | bytes arrive | request too large |
| `decodedBytes` | transfer or charset output is produced | decoded input too large |
| `expandedBytes` | decompression, entity, alias, or archive output is produced | expansion limit |
| `codePoints` | scalar values are decoded | text limit |
| `numberDigits` | numeric token is scanned | numeric complexity limit |
| `tokenCount` | token is accepted | syntax work limit |
| `nodeCount` | node allocation is attempted | structure limit |
| `maxDepth` | nested container is entered | nesting limit |
| `containerItems` | key, value, element, attribute, or row is accepted | breadth limit |
| `workUnits` | scan, comparison, normalization, regex, or recovery work occurs | complexity limit |
| `outputBytes` | result, log, rendered text, or child output is produced | output limit |
| deadline | bounded operation checks time | deadline exceeded |

Charge before allocation or effect. Report the stage, observed amount, configured limit, and stable
error class without echoing the hostile payload.

## 9. Boundary test matrix

Minimum lanes:

1. Smallest valid value and representative normal values.
2. Empty, missing, null, wrong scalar type, wrong container type, and scalar-versus-array cases.
3. Exact lower and upper business bounds plus one step outside.
4. Whole-string mismatch, trailing newline, trailing garbage, and multiple-document cases.
5. Duplicate key or parameter with equal values, conflicting values, and order reversal.
6. Unknown field, enum, discriminator, and schema version.
7. Invalid UTF-8, truncated escape, NUL, unexpected BOM, and invalid scalar sequence.
8. NFC/NFD equivalents, NFKC-changing forms, case-fold expansion, mixed scripts, confusables,
   default ignorables, bidi controls, and combining-mark growth.
9. Raw, decoded, normalized, parsed, and output limits immediately below, at, and above the cap.
10. Deep, wide, long-scalar, huge-number, alias, entity, regex, compression, and output-cost cases.
11. Dynamic SQL identifier, NoSQL operator, process option, path separator, URL host, template
    expression, and spreadsheet-formula attempts at the exact grammar boundary.
12. Valid identifier without ownership, tenant membership, state permission, or action permission.
13. Gateway-versus-application and application-versus-database differential cases.
14. No side effect after every rejection, timeout, parser warning, and exhausted budget.

For accepted inputs, assert the canonical typed value and final structured sink shape. For rejected
inputs, assert the earliest stable rejection stage, error code, bounded work, and absence of side
effects or permissive defaults.

## 10. Primary anchors

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html): syntactic versus semantic validation, early validation, allowlists, whole-string regular expressions, and the boundary between input validation and injection defenses.
- [WHATWG URL Standard](https://url.spec.whatwg.org/): component parsing, percent encoding and decoding, host processing, UTF-8 behavior, and URL validation errors.
- [RFC 3629](https://www.rfc-editor.org/rfc/rfc3629): UTF-8 validity, shortest-form encoding, scalar range, and decoder security considerations.
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259): JSON grammar, interoperability, duplicate member names, numbers, strings, and parser behavior.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785): JSON canonicalization input constraints and deterministic serialization requirements.
- [Unicode Standard Annex #15](https://www.unicode.org/reports/tr15/): canonical and compatibility normalization forms, stability, idempotence, and the warning against blindly applying compatibility normalization to arbitrary text.
- [Unicode Technical Standard #39](https://www.unicode.org/reports/tr39/): identifier profiles, restriction levels, mixed scripts, confusables, and security mechanisms.
- [Unicode Technical Standard #46](https://www.unicode.org/reports/tr46/): IDNA compatibility processing and Unicode-to-ASCII domain mapping.
- [Unicode Standard Annex #29](https://www.unicode.org/reports/tr29/): grapheme-cluster segmentation for user-visible character counts.
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html): parameter binding and fixed mappings for dynamic SQL identifiers.
- [OWASP NoSQL Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html): server-owned query construction, operator control, and query resource limits.
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html): avoiding OS commands, data and command separation, argument injection, and option termination.
- [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html): DTD, entity, XInclude, resolver, and secure-processing controls.
- [YAML 1.2.2](https://yaml.org/spec/1.2.2/): YAML representation, serialization, presentation, schema, tag, anchor, alias, and document semantics.
- [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180): CSV quoting, embedded delimiters, and embedded line breaks.
- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS): catastrophic backtracking and regular-expression denial-of-service risk.

