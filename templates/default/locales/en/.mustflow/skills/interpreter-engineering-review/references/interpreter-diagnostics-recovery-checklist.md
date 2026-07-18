# Interpreter Diagnostics and Recovery Checklist

Use this checklist when an interpreter owns guest-language diagnostics, recovered syntax reaches
semantic phases, runtime failures need source and logical-stack evidence, or automated fixes are
part of the public tooling contract.

## Contents

1. [Structured diagnostic envelope](#structured-diagnostic-envelope)
2. [Source snapshot and range contract](#source-snapshot-and-range-contract)
3. [Recovered-input provenance](#recovered-input-provenance)
4. [Cause graph and suppression](#cause-graph-and-suppression)
5. [Safe runtime value rendering](#safe-runtime-value-rendering)
6. [Logical guest stacks](#logical-guest-stacks)
7. [Dynamic dispatch evidence](#dynamic-dispatch-evidence)
8. [Stable codes and fingerprints](#stable-codes-and-fingerprints)
9. [Fix validation](#fix-validation)
10. [Renderer and audience separation](#renderer-and-audience-separation)
11. [Diagnostic contract tests](#diagnostic-contract-tests)
12. [Failure matrix](#failure-matrix)
13. [Invariants](#invariants)
14. [Skill handoffs](#skill-handoffs)

## Structured diagnostic envelope

Keep detection separate from presentation. The authoritative diagnostic should carry structured
fields such as:

- stable error code and guest-language phase;
- severity and terminal versus recoverable classification;
- primary source snapshot and half-open byte range;
- related ranges with roles or labels;
- cause, dependency, and suppression links;
- bounded notes and recovery-oriented help;
- zero or more validated edits with confidence or applicability;
- captured logical guest frames;
- safe runtime facts and dispatch evidence;
- resource-limit or cancellation facts where relevant;
- stable internal fingerprint inputs;
- public, IDE, support, operator, and maintainer disclosure policy.

CLI text, IDE protocol objects, JSON, logs, snapshots, and telemetry are consumers of this envelope.
Do not let ANSI styling, indentation, translated prose, or renderer-specific line wrapping become
the source of truth.

## Source snapshot and range contract

Bind each range to an immutable source snapshot. Store source coordinates internally as half-open
byte ranges and compute line, display column, UTF-16 position, tab expansion, and excerpts only for
the selected renderer.

Preserve origin through:

- recovered and synthetic tokens;
- normalized or desugared syntax;
- typed or executable IR;
- bytecode instructions and handler tables;
- cached compiled artifacts;
- active and suspended frames;
- native-to-guest callbacks;
- generated code and hot-reload generations.

Choose one primary range that remains useful when an IDE shows no secondary context. Use related
ranges for declarations, conflicting values, conversion sites, operator candidates, or generated
origins. Do not attach a current line and column to stale source bytes after an edit.

## Recovered-input provenance

Parser recovery belongs to `parser-engineering-review`, but interpreter diagnostics must preserve
its downstream provenance. A synthetic token, repaired node, poison type, unknown binding, or
suppressed executable node should identify the diagnostic that introduced it.

For every recovered value or node, define:

- original source snapshot and damaged range;
- recovery action and bounded cost;
- synthetic or replaced token identities;
- originating diagnostic ID;
- phases permitted to continue;
- semantic facts that remain trustworthy;
- downstream diagnostics to suppress, attach as notes, or emit independently;
- point where execution must be refused.

Do not turn every recovered subtree into one undifferentiated error node. Do not execute a program
whose semantic authority depends on guessed syntax unless the language explicitly defines a safe
partial-execution mode.

## Cause graph and suppression

Model diagnostic candidates as a graph rather than an unordered list. Record at least:

- `causedBy`: this failure follows from a root failure;
- `dependsOn`: this check could not complete without another fact;
- `suppressedBy`: a stronger or earlier diagnostic makes this one noise;
- `relatedTo`: independent evidence helps explain the same defect.

Prefer independent root failures in default output. Preserve derived failures for IDE expansion,
debug evidence, or a note explaining why a check stopped. A missing binding that causes an unknown
type, unresolved operator, and return mismatch should not appear as four unrelated user mistakes.

Suppression must not hide an engine invariant, capability denial, security boundary, resource
limit, or a second independent root failure.

## Safe runtime value rendering

Diagnostic generation must not execute guest behavior. The safe renderer must not call guest
string conversion, representation hooks, getters, iterators, proxy traps, equality, hashing,
destructors, finalizers, or arbitrary native callbacks.

Allow only bounded facts such as:

- semantic type and runtime kind;
- stable non-address object identity where permitted;
- primitive payloads after redaction;
- collection length without iteration when stored directly;
- selected immutable field names or summaries;
- explicit truncation, depth, byte, element, and time limits;
- cycle detection and already-rendering guard;
- safe placeholder when an object is partially initialized or corrupted.

If safe rendering itself fails, preserve the original diagnostic and attach a maintainer-only
renderer failure. Never replace the original guest failure with a second formatting exception.

## Logical guest stacks

Capture stack evidence before destructive unwind. A logical frame may need:

- function display name and stable function identity;
- call-site range and definition range;
- module identity and semantic generation;
- executable code or bytecode identity;
- async, coroutine, generator, or scheduler parent;
- native boundary marker without unsafe host details;
- tail-call or inlined logical ancestry when promised;
- source-map generation and hot-reload compatibility.

Separate guest frames from host frames. Guest failures expose the language stack. Engine defects
retain host evidence for maintainers. Native adapters attach a bounded boundary cause without
leaking secrets, raw addresses, credentials, or unrelated host state.

## Dynamic dispatch evidence

For an operator, conversion, property, or call dispatch failure, preserve the semantic candidate
trace without exposing implementation-only cache layout.

Record:

- operation and operand semantic types;
- directed conversions attempted;
- left, right, reflected, subtype-priority, or protocol candidates in specified order;
- candidate outcome: handled, declined, rejected by constraint, or thrown;
- selected candidate and proof identity on success;
- source range for a user implementation that threw;
- relevant metaobject generation when stale-cache diagnosis is needed.

`Declined` is a protocol result, not an exception. A user implementation that throws must remain a
guest failure and must not silently trigger a fallback candidate.

## Stable codes and fingerprints

Use stable codes for public semantic categories. Keep translated prose, source path, line number,
object address, randomized hash, and renderer layout out of the code.

Use a separate internal fingerprint to group equivalent failures across source movement and message
changes. Candidate fingerprint inputs include:

- stable code and phase;
- executable node or opcode kind;
- operator or conversion identity;
- normalized semantic type tuple;
- root cause category;
- stable logical-frame prefix;
- invariant or property ID;
- budget kind or native capability where relevant.

Do not use a fingerprint as public identity or infer semantic equivalence solely from a matching
stack hash.

## Fix validation

Treat an automated edit as executable behavior. Before advertising a fix as machine-applicable:

1. bind edits to the exact source snapshot;
2. reject overlapping or out-of-range edits;
3. apply them transactionally in memory;
4. re-run the required lexical, parse, resolve, semantic, and policy phases;
5. prove the target diagnostic is removed or transformed as intended;
6. reject fixes that introduce a stronger root failure;
7. preserve observable semantics for warning-only fixes unless the contract says otherwise;
8. downgrade low-confidence candidates to explanatory help.

A renderer showing plausible replacement text is not fix validation.

## Renderer and audience separation

Define independent consumers for:

- concise interactive CLI output;
- rich terminal output with excerpts;
- IDE or editor structured output;
- deterministic test representation;
- support or operator correlation fields;
- maintainer-only engine evidence.

Each consumer needs its own redaction, truncation, locale, path, source-excerpt, and stack policy.
Keep stable machine fields available even when prose is shortened. Do not expose host paths, raw
source, secret-bearing values, native payloads, or engine stacks merely because the diagnostic is
structured.

## Diagnostic contract tests

Test structure and rendering separately.

Structural assertions should cover:

- stable code, phase, severity, and terminal class;
- primary snapshot and exact half-open byte range;
- roles and ranges of related labels;
- root and derived cause relationships;
- absence of unexpected extra root failures;
- fix ranges, snapshot binding, and post-fix reanalysis;
- safe rendering under cycles, deep values, partial objects, and hostile hooks;
- logical frames across native callbacks, suspension, tail behavior, and unwind;
- public versus internal redaction;
- stable fingerprints across path, line, locale, and prose changes.

Rendered snapshots can still protect layout, but they should not be the only oracle. Include
multibyte text, tabs, CRLF, invalid bytes, truncated input, generated origins, stale snapshots, and
budget-limited diagnostic production.

## Failure matrix

| Failure | Required behavior |
| --- | --- |
| Recovered token causes later type noise. | Preserve recovery origin and suppress only derived diagnostics. |
| Diagnostic value has a hostile representation hook. | Safe renderer never invokes it. |
| Error occurs during stack unwind. | Original logical frames were captured before destruction. |
| Operator candidate declines. | Continue only through the specified fallback order. |
| Operator implementation throws. | Preserve that guest failure; do not reinterpret it as decline. |
| Source changed after analysis. | Snapshot mismatch prevents misleading ranges or fixes. |
| Fix removes one error but adds a stronger root error. | Reject or downgrade the fix. |
| Renderer exceeds its budget. | Emit a bounded truncation while preserving stable machine fields. |
| Engine invariant fails while formatting a guest error. | Keep the engine defect separate from the guest diagnostic. |

## Invariants

- Diagnostics are structured facts before they are prose.
- Every range is bound to one immutable source snapshot.
- Recovered syntax retains its originating diagnostic and trust boundary.
- Cause and suppression edges never erase independent root failures.
- Diagnostic rendering cannot execute guest code.
- Logical guest stacks are captured before unwind and remain separate from host stacks.
- Decline and throw are distinct dynamic-dispatch outcomes.
- Public codes and internal fingerprints serve different contracts.
- Machine-applicable fixes are reanalyzed against the exact edited snapshot.

## Skill handoffs

- Use `interpreter-engineering-review` for guest diagnostic structure, runtime values, dispatch
  traces, logical guest stacks, execution refusal, and engine fault separation.
- Use `parser-engineering-review` for token repair, recovery search, parser progress, and syntax-tree
  construction.
- Use `error-message-integrity-review` for broader audience, actionability, stable code, redaction,
  support, logging, API, and CLI message concerns outside the guest runtime.
- Use `compiler-engineering-review` when diagnostics originate in compiler IR, optimization,
  code-generation, ABI, assembler, or linker stages.
- Use `security-privacy-review` for sensitive source, guest values, paths, stack, or tenant data.
