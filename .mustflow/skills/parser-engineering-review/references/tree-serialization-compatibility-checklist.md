# Tree Serialization and Compatibility Checklist

Use this checklist when a CST, AST, HIR, analysis index, or related tree snapshot is serialized,
cached, exchanged across versions, deserialized from untrusted bytes, migrated, or fuzzed.

## Contents

1. [Artifact lifetime contract](#artifact-lifetime-contract)
2. [Memory model and wire schema](#memory-model-and-wire-schema)
3. [Header and early rejection](#header-and-early-rejection)
4. [Schema evolution and presence](#schema-evolution-and-presence)
5. [Bounded decoding](#bounded-decoding)
6. [Two-phase graph reconstruction](#two-phase-graph-reconstruction)
7. [Validation layers](#validation-layers)
8. [Deterministic encoding](#deterministic-encoding)
9. [Cross-version and migration matrix](#cross-version-and-migration-matrix)
10. [Identity and snapshot scope](#identity-and-snapshot-scope)
11. [Fuzz targets and oracles](#fuzz-targets-and-oracles)
12. [Invariants and handoffs](#invariants-and-handoffs)

## Artifact lifetime contract

Decide first whether the artifact is:

- a disposable cache that may reject incompatible data and regenerate;
- a build or IDE exchange artifact with a bounded compatibility window;
- a durable user or ecosystem format requiring migration and unknown-data preservation.

Name readers, writers, retention, privacy, trust boundary, regeneration source, and supported version
matrix. Do not burden a disposable cache with indefinite migration or treat durable data as safely
discardable.

## Memory model and wire schema

Separate runtime nodes from the wire contract. Define stable integer widths, signedness, byte order,
string encoding, node-kind numbers, field numbers, union tags, presence, list lengths, reference IDs,
and ordering rules. Never serialize pointers, allocator slots, object padding, host enum ordinals, or
compiler-dependent layouts as a portable format.

Keep encoder and decoder adapters between the wire schema and current in-memory representation. A
node-class refactor must not silently reinterpret old bytes.

## Header and early rejection

Validate a bounded fixed header before decompression, allocation, or graph construction. Include
applicable magic, schema major and minor, language or dialect identity, feature bitmap, payload and
expanded lengths, compression mode, checksum or digest, producer diagnostics, and artifact class.

Treat producer version as evidence for diagnostics, not permission to trust the payload. Reject
unsupported mandatory features, impossible lengths, incompatible major versions, and policy limits
before expensive work.

## Schema evolution and presence

- Assign stable node-kind and field numbers. Reserve removed numbers and never reuse them for a new
  meaning.
- Distinguish absent fields from fields explicitly set to their default when migration or semantics
  can observe presence.
- Add optional fields with safe reader behavior. Do not add required fields that older writers cannot
  provide inside a claimed compatibility window.
- Define unknown field and unknown variant behavior: preserve, skip, quarantine, or reject by field
  criticality and artifact contract.
- Keep migrations pure, ordered, restartable, and independently testable. Preserve extensions that a
  migration does not understand when the durable-format contract requires round trips.

## Bounded decoding

Charge limits before allocation and expansion. Bound compressed and expanded bytes, strings, node
count, children per node, total edges, reference tables, diagnostics, nesting, work units, and wall-
clock deadline. Use an explicit stack when attacker-controlled depth could overflow the call stack.

Require integer arithmetic for lengths and offsets to reject overflow, overlap, truncation, and
out-of-range slices. A checksum detects corruption; it does not establish safe structure or meaning.

## Two-phase graph reconstruction

Decode bounded tables and node records without creating raw pointers. In a second phase, resolve IDs
and verify:

- reference range and expected target kind;
- ID uniqueness and owning document, item, or body;
- single structural parent where a tree contract requires it;
- absence of structural cycles;
- list cardinality and source-order constraints;
- separation of ownership edges from symbol, use-def, or control-flow references.

Do not expose a partially linked graph to visitors, destructors, plugins, or semantic consumers.

## Validation layers

Keep four results distinct:

1. wire validity: lengths, tags, encoding, checksum, and feature framing;
2. structural validity: node kinds, fields, IDs, edges, cycles, and cardinality;
3. semantic validity: scopes, symbol kinds, types, effects, and source relationships;
4. phase validity: invariants promised by CST, AST, typed HIR, MIR, or another declared layer.

A successful decoder proves only the earlier layers it actually checked. Run the owning tree or IR
verifier before publishing the artifact as usable.

## Deterministic encoding

Make one supported writer emit canonical bytes for the same declared semantic or syntax identity.
Normalize map order, string tables, temporary IDs, diagnostic order, feature ordering, and equivalent
encodings. Do not make readers depend on field arrival order unless the wire schema requires it.

Define whether source spelling, trivia, positions, nondeterministic analysis facts, and producer-only
metadata participate in the canonical identity. Keep semantic and exact-source hashes separate.

## Cross-version and migration matrix

Maintain golden artifacts from every supported writer version and verify every promised reader and
writer pairing. Cover oldest-supported to current migrations, current writer to older compatible
reader where promised, unknown fields, retired fields, optional presence, unsupported features, and
corrupt headers.

Compare migration chains with direct construction of the latest schema. Make the support window and
rejection diagnostic executable rather than relying on prose compatibility claims.

## Identity and snapshot scope

Do not serialize raw snapshot-local IDs as durable semantic identity. Namespace serialized IDs by
artifact and owner, remap them on load, and preserve explicit origin or definition identities only
when their stability contract spans the artifact boundary.

Bind cached analysis to source or tree fingerprint, language options, dependency generations, schema
version, and producer contract. Reject a structurally valid cache whose semantic dependency capsule
does not match the current workspace.

## Fuzz targets and oracles

Keep complementary bounded targets:

- raw bytes for framing, length, decoder, and rejection safety;
- schema-aware near-valid records for deep structural validation;
- valid generated trees for semantic verifier, encode, decode, rewrite, and migration paths;
- API sequences such as decode, verify, rewrite, encode, reload, and discard-old-snapshot.

Use oracles beyond crashes:

- decode then encode produces canonical bytes for accepted artifacts;
- encode then decode preserves the declared semantic and source-aware identity;
- migrations agree with direct latest-schema construction;
- repeated canonical encoding is deterministic;
- invalid graphs are rejected by the correct validation layer;
- work, memory, depth, and output stay within budgets;
- stale handles and snapshot references do not resolve after replacement.

Keep raw mutation, structured generation, campaign feedback, corpora, minimization, sanitizer lanes,
and long-running execution under `fuzz-harness-review`. This checklist owns tree-format semantics and
oracles, not campaign authority.

## Invariants and handoffs

- Every artifact declares cache, exchange, or durable lifetime semantics.
- Every accepted payload passes bounded wire, structural, semantic, and phase checks as applicable.
- Every schema number and presence rule has an evolution contract.
- Every durable identity is distinct from runtime pointers and snapshot-local IDs.
- Every compatibility claim names tested reader and writer versions.
- Every fuzz claim names a semantic, determinism, validation, or resource oracle beyond coverage.
- Use `parser-engineering-review` for CST and AST wire or snapshot contracts.
- Use `compiler-engineering-review` for persisted HIR, MIR, IR, and compiler metadata semantics.
- Use `fuzz-harness-review` for maintained campaigns, mutators, corpora, and sanitizer execution.
- Use the matching public-contract or data-migration skill for durable external formats.
