---
mustflow_doc: skill.parser-engineering-review
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: parser-engineering-review
description: Apply this skill when a lexer, tokenizer, grammar, parser, lossless CST, surface AST, AST-to-HIR lowering pass, tree visitor, transformer or transactional rewriter, persistent node identity, tree serialization or compatibility format, tree schema or verifier, trivia or syntax-origin model, operator table, error recovery path, incremental parser, Unicode source-position layer, large-input path, parser resource limit, or parser fuzz harness is created, changed, reviewed, debugged, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.parser-engineering-review
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

# Parser Engineering Review

<!-- mustflow-section: purpose -->
## Purpose

Review parser pipelines as product boundaries rather than valid-input recognizers. Preserve source
truth, produce stable trees and diagnostics, converge after edits, keep position units explicit, and
fail within bounded CPU and memory on malformed or hostile input.

<!-- mustflow-section: use-when -->
## Use When

- Lexer rules, modes, trivia, raw or cooked token values, or token spans change.
- Grammar, parser algorithm, CST shape, surface AST schema, AST or HIR lowering, origin mapping,
  trivia attachment, tree identity or verification, operator precedence or associativity, formatter
  grouping, or semantic handoff changes.
- Visitor order, immutable transformation, rewrite conflict or termination policy, snapshot handles,
  analysis invalidation, tree serialization, schema evolution, or bounded decoding changes.
- Invalid-input diagnostics, repair, synchronization, delimiter handling, or IDE recovery changes.
- Incremental parsing, source buffers, changed ranges, cancellation, Unicode positions, streaming
  decode, large-file behavior, parser limits, or fuzzing needs implementation or review.
- A parser correctness, performance, or security claim needs current code and test evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only consumes or edits an ordinary structured configuration file; use
  `structured-config-change` or the closest installed route for that format.
- The task is a broad hot-path or benchmark review with no parser boundary; use the applicable
  performance skill.
- The stable parse tree already exists and only domain-state or type modeling changes; use
  `type-state-modeling-review` or the closest installed route.
- The task only changes upload, archive, transport, or container limits outside the parser pipeline;
  use the applicable security or boundary skill.
- The task is cosmetic formatting with no parse-print, grouping, or source-preservation contract.
- The task only changes a general fuzz target, corpus, mutator, instrumentation, campaign, or
  artifact-triage boundary without changing parser semantics; use `fuzz-harness-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The bytes or text accepted, supported encodings, source-position consumers, and maximum expected
  input size.
- Lexer rules and modes, grammar or parser code, tree schemas, lowering and formatting paths, and
  current valid and invalid fixtures.
- The tree-layer contract: information preserved or discarded by tokens, CST, surface AST, HIR or
  core trees, side tables, and every source-aware or semantic consumer of those layers.
- Traversal and persistence contracts when applicable: visit order and edge model, transform result
  algebra, edit conflict and commit rules, rewrite termination, handle generations, preserved
  analyses, artifact lifetime, wire schema, compatibility window, decode budgets, and verifier layers.
- The token contract when lexing is in scope: canonical span unit, raw and cooked representations,
  diagnostics and trivia ownership, longest-match and tie policy, keyword policy, literal grammar,
  Unicode profile, lexical goals, streaming outcomes, and incremental restart state.
- The parser role: batch compiler, editor service, protocol boundary, configuration loader, query
  engine, or another explicit consumer.
- Existing resource limits, incremental snapshot model, diagnostics contract, fuzz harness, and
  configured command intents.
- For review-only work with incomplete inputs, continue from the supplied artifact only when the
  visible lexer or parser boundary can support concrete findings. Mark every missing contract,
  implementation path, fixture, and runtime result as unknown; do not turn those gaps into edits or
  confirmed defects.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions and command contract before running project commands.
- Decide whether the task changes language semantics, only implementation, or both. Do not silently
  change accepted syntax, precedence, recovery, normalization, or compatibility behavior.
- Record unknown encoding, recovery, or resource-limit behavior as unknown instead of inventing it.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Lexer, parser, grammar, token, CST, AST, lowering, formatter, diagnostic, source-buffer,
  incremental-analysis, budget, and fuzz-harness files required by the selected parser boundary.
- Focused fixtures, property tests, benchmarks, schemas, generated-parser inputs, and directly
  synchronized documentation or templates.
- Do not replace the parsing algorithm, normalize source text, or widen accepted syntax without
  evidence that the compatibility, recovery, and resource contracts remain correct.

<!-- mustflow-section: procedure -->
## Procedure

### 1. Freeze the parser contract

Write a compact ledger before editing:

- Input boundary: bytes, decoded text, chunks, encoding, and full-consumption rule.
- Output boundary: lossless CST, AST, semantic value, diagnostics, changed ranges, or combinations.
- Operating mode: batch, interactive, streaming, strict, compatible, or recovery-first.
- Compatibility boundary: accepted syntax, contextual keywords, newline rules, normalization, and
  malformed-input behavior that callers already observe.
- Risk boundary: expected size, maximum size, latency target, cancellation owner, and untrusted input.

### 2. Map the real pipeline

Trace bytes through decode, source storage, lexing, tokens and trivia, CST, AST lowering, semantic
validation, formatting, and downstream analysis. Identify every place that copies, decodes,
normalizes, expands, retries, caches, or converts positions. A limit on only the final parser input
does not bound earlier transformations.

### 3. Make source and position truth explicit

- Use half-open byte spans as the canonical source anchor when an original byte stream is the input
  contract. For a text-native host boundary, declare its canonical unit explicitly and retain a
  lossless mapping to wire bytes whenever decoding, diagnostics, or security claims depend on them.
  Keep byte offset, UTF-16 offset, Unicode scalar index, line index, and display column as distinct
  types or named conversions; never compare them as interchangeable integers.
- Preserve raw source separately from decoded or cooked token values. Maintain a mapping when
  escapes, normalization, or decoding changes length.
- Treat NUL as data unless the format forbids it. Recognize a BOM only where the format permits it,
  normally at stream start. Define CRLF handling and avoid splitting UTF-8 sequences or UTF-16
  surrogate pairs across chunks and edits.
- Use grapheme clusters or display width only for user-interface columns. Do not make them the
  parser's storage coordinate.

### 4. Enforce lexer progress and fidelity

When lexing or tokenization is in scope, read
[lexer-tokenization-checklist.md](references/lexer-tokenization-checklist.md) before accepting the
token contract, implementation, or test matrix.

- Require every lexer step to reach EOF, consume at least one input unit, or emit a bounded
  synthetic token while changing state. An error token must cover real input unless it represents a
  declared zero-width insertion.
- Distinguish a committed source EOF from a temporary buffer boundary. Return `NeedMoreInput` only
  while a current candidate can still become valid and the source EOF is unknown; once EOF is
  committed, emit one final token, one bounded malformed or unterminated token, or the terminal EOF
  outcome. Never repeat a zero-width error or EOF token.
- Implement longest match around the last accepting checkpoint, not the first accepting state.
  Compare candidate extent before an explicit, stable tie priority; keep comparison end separate
  from token end when lookahead or trailing context participates. Reject unresolved equal-length,
  equal-priority overlaps instead of letting source declaration order become an accidental contract.
- Scan a complete identifier before exact hard-keyword reclassification. Keep contextual keywords
  as identifiers or parser-consumed hints, and define whether escapes, normalization, or case
  folding affect the semantic spelling used for lookup.
- Treat follower restrictions, such as a forbidden identifier start after a number or a dot that
  belongs to a range or member access, as lexical boundary predicates. Preserve one bounded
  malformed token when the language contract requires one diagnostic instead of a misleading valid
  prefix followed by unrelated tokens.
- Restrict candidate rules by the current lexical mode or parser-supplied lexical goal. Use stack
  frames for nested interpolation, raw-string delimiters, comments, and embedded expressions; a
  single inside-string boolean is not sufficient.
- Make mode stacks and restart checkpoints serializable when incremental lexing is supported.
  Relex until both token content and restart state converge, not for a fixed line or character
  radius.
- Preserve token raw spans, raw spelling or source slices, cooked values or invalid states, trivia,
  newline effects, invalid bytes or characters, token-local diagnostics, and recovery provenance
  needed by a lossless CST and precise diagnostics.
- Keep diagnosis separate from rendering. Record a stable code and arguments plus the opener or
  first-fault span, related termination span, consumed recovery span, origin span, snapshot, and
  mode. Coalesce cascades by contamination region, and validate automatic fix-its by applying them
  to a temporary snapshot and relexing until token and outgoing-state convergence.

### 5. Separate CST, AST, and semantic meaning

When CST shape, AST schema, lowering, syntax origins, tree identity, trivia attachment, or tree
verification is in scope, read
[cst-ast-lowering-checklist.md](references/cst-ast-lowering-checklist.md) before accepting the layer
contract or test matrix.

When visitor order, transformation, rewriting, structural sharing, persistent syntax identity,
snapshot handles, or analysis preservation is in scope, read
[tree-traversal-rewrite-checklist.md](references/tree-traversal-rewrite-checklist.md).

When a tree or analysis snapshot is serialized, cached, exchanged across versions, migrated,
decoded from untrusted bytes, or fuzzed as a format, read
[tree-serialization-compatibility-checklist.md](references/tree-serialization-compatibility-checklist.md).

- Let a lossless CST account for every source byte exactly once through tokens, trivia, skipped
  input, and unexpected syntax. Represent missing tokens as zero-width evidence at a precise
  insertion point without printing them as user-written text.
- Write a CST-to-AST loss ledger. For every removed wrapper, delimiter, spelling, grouping, recovery
  marker, or source relation, name the lowering stage and the consumer contract that permits loss.
- Keep a surface AST distinct from HIR or core trees when source tools need user-written constructs
  but semantic consumers need normalized forms. Preserve evaluation count, order, scope, receiver
  identity, errors, and origins through desugaring.
- Distinguish absent, missing, synthetic, empty, elided, and erroneous states. Never turn malformed
  syntax into an ordinary executable name, literal, operand, or delimiter merely to complete a node.
- Keep node identity, source span, structural hash, syntax reference, and phase side-table generation
  separate. Run a phase-specific verifier after parsing and every material lowering step.
- Keep name resolution, type rules, assignment validity, and other semantic rejection outside the
  syntax layer unless the grammar contract explicitly owns them.

### 6. Choose the parser algorithm from the operating contract

- Prefer recursive descent with Pratt parsing for a new deterministic language with complex
  expressions, readable recovery, and hand-maintained grammar.
- Prefer PEG when ordered choice and long contextual prefixes are central, while budgeting memoized
  state and making cuts or commits explicit.
- Prefer IELR or LR when a large declarative grammar and conflict reports are more valuable than
  hand-written control flow.
- Use GLR only for genuine ambiguity that the product intends to preserve or resolve later. Budget
  parse-forest growth and ambiguity work explicitly.

Do not choose from a slogan such as "fastest parser." Judge recovery quality, output shape,
incremental restart state, grammar evolution, ambiguity, and hostile-input cost together.

### 7. Make operator behavior executable

- Store each operator's left binding power, right binding power, fixity, chain policy, grouping
  restrictions, and AST constructor in one executable table used by parser tests and formatter logic.
- In a Pratt loop that continues while the next left binding power is at least the current minimum,
  encode left associativity as `lbp = p, rbp = p + 1` and right associativity as
  `lbp = p, rbp = p`. Verify the actual loop comparison before applying this formula.
- Parse prefix, infix, and postfix roles separately. Treat calls, indexing, member access, and other
  postfix forms as a repeatable chain.
- Decide exponent-versus-unary binding, comparison chaining, non-associative operators, ternary or
  mixfix delimiters, forbidden operator-group mixing, and newline restrictions explicitly.
- Test AST shape for operator pairs and triples. Evaluation tests alone can hide a wrong tree when
  values happen to coincide.

### 8. Make speculation transactional

Use mark, rewind, and commit semantics for ambiguous prefixes. Do not publish diagnostics, mutate
symbol state, allocate irreversible semantic objects, or advance shared cursors before commitment.
Bound speculative work and memoization under the same parser budget.

### 9. Recover with bounded progress

- At every recovery site, consume input, insert one declared missing token, synchronize to a bounded
  set, or exit the current production. Cap insertions, deletions, repairs, diagnostics, and skipped
  distance.
- Make synchronization sets depend on grammar context and delimiter depth. Track open delimiters so
  an inner error does not discard an outer construct.
- Preserve Missing and Error nodes plus repair provenance. Suppress cascades that are downstream of
  the same repair, but do not hide independent errors.
- Emit structured diagnostics with stable code, primary span, related spans, expected items, repair,
  and fix confidence. Never use a prettier message as a substitute for a correct span and tree.

### 10. Prove incremental convergence

- Use immutable, versioned snapshots. Apply the exact edit to the old tree and discard results whose
  source version is stale.
- Store enough restart state for lexical mode, delimiter or indentation context, and parser state.
  Reparse until both token content and restart state converge; a fixed character radius is not a
  correctness boundary.
- Treat checkpoint serialization as a continuation contract: restoring a checkpoint and lexing the
  suffix must match uninterrupted lexing. Use hashes only to reject unequal blocks quickly; verify
  canonical token fields and complete outgoing state before declaring convergence.
- Prefer relative subtree positions and aggregate lengths so a prefix edit does not rewrite every
  following absolute offset. Use rope, piece-tree, or equivalent chunked storage instead of forcing
  a full source string.
- Make parsing cancellable and expose changed ranges. Invalidate downstream semantic dependencies
  from those ranges rather than recomputing everything or trusting subtree reuse alone.
- Compare incremental output with a fresh full parse after edit sequences, including edits near
  quotes, comments, escapes, indentation, delimiters, and mode transitions.

### 11. Bound storage and large-input work

- Avoid per-callback or per-node source copies. Define whether callbacks borrow stable chunks and how
  long those chunks remain valid.
- Prefer compact nodes, arenas, tree buffers, and indexed side tables over one heavyweight object per
  token or node. Measure retained source, token, tree, diagnostic, and downstream-analysis memory.
- Define snapshot ownership so a tiny long-lived token cannot retain an obsolete multi-gigabyte
  buffer. Keep hot token records compact, move uncommon payloads to side tables, and defer literal
  cooking, normalization, and interning until a consumer requests them under its own budget.
- Support partial parsing only with a declared incomplete-tree contract and cancellation behavior.
- Measure p50, p95, and p99 edit latency, `relexedBytesPerEdit`, reused-token or node ratio,
  allocations per edit, diagnostic latency, post-processing time, and peak live memory. Throughput
  on one clean file is not incremental-performance evidence.

### 12. Share one hostile-input budget

Define one `ParseBudget` that follows the input through decode, decompression or expansion, lexing,
parsing, recovery, and post-processing. Include applicable counters such as `wireBytes`,
`decodedBytes`, `expandedBytes`, `tokenCount`, `nodeCount`, `maxDepth`, `maxContainerItems`,
`scalarBytes`, `numberDigits`, `workUnits`, and a deadline.

Declare what charges each counter, whether the charge occurs before allocation or side effects, and
the stable error returned on exhaustion. Pass the same budget object or a bounded child view through
nested and composed parsers; do not reset counters at transformation or subgrammar boundaries.

- Count while reading or producing data, not after materializing it. Bound expansion by absolute
  bytes, ratio, operation count, and nesting depth.
- Bound breadth as well as nesting: token count, node count, container items, scalar length, numeric
  digits, repairs, diagnostics, and retained chunks.
- Charge work units for scans, backtracking, memo entries, ambiguity branches, decode operations, and
  recovery attempts. A wall-clock timeout is a final stop, not the primary complexity model.
- Use a linear-time regular-expression engine or structurally safe patterns for untrusted text.
  Streaming does not remove token-count or retention limits.
- Validate and execute the same immutable parse result for the same source version. Reusing the same
  parser implementation for an unvalidated second parse is not sufficient. If reparsing is
  unavoidable, revalidate input identity, source version, limits, and the exact result before any
  side effect. Isolate complex native or generated parsers in a process when a crash or memory fault
  must not take down the caller.
- Apply aggregate concurrency budgets, bounded logs, and no automatic retry for deterministic parser
  exhaustion.

### 13. Build a parser-specific test matrix

When a coverage-guided fuzz harness, corpus, custom mutator, feedback signal, sanitizer matrix,
campaign lifecycle, or artifact-triage path is in scope, apply `fuzz-harness-review` as the campaign
owner while keeping this skill responsible for parser-specific semantics and invariants.

Cover all applicable lanes:

- Valid corpus, invalid corpus, and near-valid single insert, delete, and replace mutations.
- Token-span coverage, lossless CST reconstruction, parse-print-parse grouping, and full-consumption
  properties.
- Generated lexer-boundary matrices for operator prefixes, keyword prefixes, numeric followers,
  dot-versus-range cases, string prefixes, raw delimiters, escapes, comment newline effects, EOF,
  invalid encoding, and rule-order permutation where explicit priority should make order irrelevant.
- Operator pair and triple AST matrices, postfix chains, ternary forms, comparison chains, and
  forbidden mixes.
- Full-parse versus incremental-parse differential tests over versioned edit sequences.
- One-shot input versus multiple chunk partitions, including boundaries inside multibyte sequences,
  escapes, numbers, comments, and delimiters.
- Normalized differential oracles against an intentionally independent implementation when
  available, plus scanner-state serialize/deserialize continuation, round-trip, and preconditioned
  metamorphic properties that do not require identical internal trees.
- Structured grammar-aware mutation, sanitizer or fault-injection lanes where supported, and
  boundary cases immediately below, at, and above every budget.
- Growth-rate checks for time, work units, allocations, and retained bytes. Preserve the triggering
  phenomenon while shrinking failures, then keep the minimized input as a regression seed.

### 14. Implement the narrowest complete correction

Change the smallest owning layer that restores the contract, then synchronize dependent lexer,
tree, lowering, formatter, diagnostic, incremental, budget, test, documentation, and template
surfaces. Do not fix a parser bug only in a downstream consumer that leaves other callers exposed.

### 15. Verify each claim

Use the narrowest configured intents that cover the changed language, generated parser, tests,
documentation, and release surface. Distinguish directly verified behavior, code-supported
inference, and remaining unknowns. A passing valid corpus does not prove recovery, incrementality,
Unicode correctness, or hostile-input safety.

<!-- mustflow-section: postconditions -->
## Postconditions

- Input is consumed fully or rejected explicitly, and every preserved source unit has an accountable
  raw span.
- CST, surface AST, HIR or core tree, origin map, and side-table information-loss boundaries are
  explicit, and missing or erroneous syntax cannot masquerade as normal executable meaning.
- Tree traversal, immutable transformation, transactional rewrite, persistent-handle, analysis-
  invalidation, serialization, compatibility, bounded-decoding, and verifier contracts are explicit
  when those surfaces exist.
- Lexer candidate selection, tie priority, identifier and keyword spelling, literal boundaries,
  lexical goals, newline effects, Unicode profile, and malformed-token recovery are explicit rather
  than inherited from host-library behavior.
- Lexer, speculation, recovery, and incremental reparsing have observable progress or budget exits.
- Position units and conversions are explicit at every external boundary.
- Operator grouping is defined by executable data and proven by AST-shape tests.
- Incremental results are compared against full parses across state-changing edits.
- Malformed, wide, deep, expanding, and chunked inputs have bounded fixtures and budget behavior.
- Verification records separate results, supported inferences, skipped checks, and remaining risk.

<!-- mustflow-section: verification -->
## Verification

- Inspect the change with `changes_status` and `changes_diff_summary` when configured.
- Use `lint` and `build` when parser source, generated grammar, or type contracts change.
- Prefer `test_related`; use `test` when shared parser behavior or broad fixtures change, and
  `test_audit` when test-selection or coverage claims need evidence.
- Use `docs_validate_fast` for changed documentation, `test_release` for packaged grammar, template,
  or public parser surfaces, and `mustflow_check` for Mustflow document or contract changes.
- Record unconfigured, blocked, timed-out, or environment-dependent checks instead of replacing them
  with raw commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the accepted language or compatibility contract is unclear, stop semantic edits and report the
  smallest disputed examples with their current trees and diagnostics.
- If the parser can fail to advance, exhaust a budget, overflow recursion, or retain unbounded input,
  treat it as a correctness or availability defect before tuning messages or throughput.
- If incremental and full parses disagree, disable or narrow reuse at the smallest unsafe boundary;
  do not bless the incremental tree from visual similarity.
- If position units cannot be mapped exactly, preserve raw spans and mark derived positions unknown
  rather than guessing a column.
- If a configured verification fails, preserve the failure output, activate the applicable failure
  triage procedure, and do not broaden the change until the failure is classified.

<!-- mustflow-section: output-format -->
## Output Format

Report:

- Parser role and contract boundary.
- Source, token-selection, identifier and keyword, literal, mode and lexical-goal, CST, surface AST,
  lowering, origin, traversal, transformation, rewriting, tree identity and verifier, serialization,
  compatibility, operator, recovery, incremental, Unicode, storage, and budget decisions that were
  applicable.
- Files changed and compatibility behavior preserved or intentionally changed.
- Positive, boundary, counterexample, chunking, differential, and resource-limit evidence.
- Configured verification intents and results.
- Remaining ambiguity, unverified scale, environment limits, and residual parser risk.
- For review-only work, report files changed and verification intents as none or not run, rather
  than implying that an implementation or runtime check occurred.
