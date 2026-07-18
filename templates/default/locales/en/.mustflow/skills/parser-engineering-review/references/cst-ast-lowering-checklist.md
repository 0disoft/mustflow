# CST to AST Lowering Checklist

Use this checklist when a parser produces a concrete syntax tree, surface AST, semantic AST, HIR,
or another lowered tree consumed by diagnostics, formatting, refactoring, compilation, or execution.

## Contents

1. [Layer contract ledger](#layer-contract-ledger)
2. [Lossless CST invariants](#lossless-cst-invariants)
3. [Surface AST boundary](#surface-ast-boundary)
4. [AST schema and local invariants](#ast-schema-and-local-invariants)
5. [Absence, recovery, and synthetic states](#absence-recovery-and-synthetic-states)
6. [Tokens, trivia, parentheses, and source views](#tokens-trivia-parentheses-and-source-views)
7. [Lowering map and origin evidence](#lowering-map-and-origin-evidence)
8. [Semantic-sensitive syntax](#semantic-sensitive-syntax)
9. [Evaluation order, scope, and reference semantics](#evaluation-order-scope-and-reference-semantics)
10. [Identity, side tables, and snapshots](#identity-side-tables-and-snapshots)
11. [Tree verification](#tree-verification)
12. [Test matrix](#test-matrix)
13. [Failure matrix](#failure-matrix)
14. [Invariants and handoffs](#invariants-and-handoffs)

## Layer contract ledger

Classify a tree by what it may lose, not by whether its type name contains `AST`, `syntax`, or
`parse tree`. Write one row per layer:

| Layer | Must preserve | May normalize | Primary consumers |
| --- | --- | --- | --- |
| Source and tokens | Original units, token boundaries, raw spelling, trivia, invalid input | Derived line and display coordinates | lexer, diagnostics, syntax tree |
| Lossless CST | Every source unit, delimiters, missing and unexpected syntax, exact order | Parser-only rule wrappers when reconstruction remains exact | formatter, refactoring, IDE, lowering |
| Surface AST | User-visible language constructs, semantic punctuation, order, scope owners, syntax origin | Pure grammar wrappers and non-semantic trivia | binder, type checker, source tools |
| HIR or core tree | Explicit evaluation order, normalized constructs, generated temporaries, origin map | Surface sugar and redundant grouping | semantic analysis, optimization, execution |
| Side tables | Symbols, types, constants, control-flow facts, phase and snapshot identity | Derived query indexes | later analyses and tools |

For every removed field or node, name the first layer that is allowed to remove it and the consumer
that no longer needs it. A successful parse is not evidence that the loss boundary is correct.

## Lossless CST invariants

- Account for every original source unit exactly once through tokens, trivia, skipped input, or
  unexpected-syntax nodes.
- Represent a required but absent token as a zero-width missing token at one insertion point. Do not
  print it as if the user wrote it.
- Keep unexpected tokens and recovery spans distinct from accepted children. Do not discard them or
  coerce them into plausible normal tokens.
- Preserve delimiter tokens and their exact order even when a later AST represents the resulting
  structure without punctuation nodes.
- Make reconstruction of the original source possible for valid and malformed input without asking
  the AST to guess whitespace, comments, escapes, or invalid bytes.
- Keep grammar-helper nodes only when they carry observable structure, recovery boundaries, or a
  stable incremental responsibility. Do not expose every factored production as a public tree API.

## Surface AST boundary

Use the question `must a downstream semantic or source-aware consumer distinguish these forms?` to
decide whether two CST forms may become one AST form.

- Collapse grammar wrappers that exist only for precedence encoding, conflict removal, or parser
  control flow.
- Preserve constructs whose evaluation, scope, binding, control flow, arity, reference behavior,
  diagnostics, or refactoring behavior differs.
- Classify punctuation as disposable separator, semantic field, or structural discriminator before
  removing it. An operator normally becomes a typed field; a comma, newline, or delimiter can decide
  tuple, elision, statement, pattern, or argument structure.
- Preserve explicit grouping through a syntax reference, grouping node, or ordered delimiter ranges
  when formatting, refactoring, diagnostics, or user-intent preservation needs it.
- Keep a surface construct until a dedicated lowering step can prove that desugaring preserves
  evaluation count, evaluation order, exceptions, scope, and source origin.
- Introduce a separate HIR or core layer when source tools need surface constructs but execution and
  analysis need normalized forms. Do not make one node schema alternate between both contracts.

## AST schema and local invariants

- Use closed tagged unions for material categories and variants. Make visitors exhaustive when a new
  expression, statement, declaration, pattern, type, or target is added.
- Separate `Expr`, `Stmt`, `Decl`, `Pattern`, `TypeNode`, and `AssignmentTarget` when their legal
  positions and invariants differ.
- Expose children through named fields. Keep repeated children in immutable source-order sequences;
  derive maps or sets as indexes rather than replacing order-bearing syntax.
- Encode cardinality in field types: required child, optional child, or non-null immutable sequence.
  Do not overload one null value with absence, error, not-yet-computed, and empty collection.
- Construct a complete immutable node in one step. Keep partially initialized builders private and
  prevent incomplete nodes from escaping.
- Enforce local invariants in constructors and context-dependent invariants in a separate validation
  pass. A child constructor cannot decide whether `break`, `await`, or a binding is legal in its
  eventual parent context.
- Give structural children one logical parent. Share immutable storage nodes or interned payloads,
  and derive parent views separately when structural reuse is required.

## Absence, recovery, and synthetic states

Model distinct states explicitly:

| State | Meaning |
| --- | --- |
| `Absent` | An optional construct was not written. |
| `Missing` | Required syntax was absent and recovery inserted a placeholder. |
| `Synthetic` | A tool or lowering pass created the node. |
| `Empty` | The user wrote a valid empty construct. |
| `Elided` | The language permits an omitted slot whose position remains meaningful. |
| `Error` | Source was present but no normal semantic node can truthfully represent it. |

- Keep category-specific error nodes such as `ErrorExpr`, `ErrorStmt`, or `ErrorPattern` so later
  passes remain type-safe without inventing executable meaning.
- Never replace missing names, numbers, operands, or delimiters with empty names, zero values, null
  literals, or normal tokens unless the language explicitly defines that recovery semantics.
- Give synthetic nodes a generation reason, originating node identity, and primary or secondary
  source origins. Do not rely on a single `isSynthetic` flag.
- Prevent compilation, execution, or serialization as valid code when a required error or missing
  state remains, unless the consumer explicitly accepts an incomplete-tree contract.

## Tokens, trivia, parentheses, and source views

- Keep original source storage and a lossless token stream as the source-aware truth. Let AST nodes
  refer to syntax instead of copying partial source fragments into every semantic node.
- Preserve token kind, canonical raw range, raw spelling or source slice, cooked value or invalid
  state, and applicable lexical provenance separately.
- Distinguish node span, full span including trivia, name span, operator span, and delimiter spans.
  Make each consumer request the range it actually needs.
- Treat token gaps as the canonical trivia location. Compute leading, trailing, dangling, preamble,
  end-of-file, and unattached ownership through a deterministic attachment policy.
- Preserve whitespace as source slices or typed runs when exact reconstruction matters. Do not
  collapse tabs, spaces, line endings, escaped newlines, or other whitespace into one count.
- Preserve nested parentheses and per-pair ranges through CST or syntax references. One boolean
  cannot represent repeated grouping, comments inside delimiters, or exact edit boundaries.
- Reuse unchanged source slices when printing unchanged syntax and format only changed subtrees.
  Reconcile boundary trivia explicitly instead of reformatting the whole file.

## Lowering map and origin evidence

Create a CST-to-AST loss ledger and a lowering entry for every concrete variant:

- input CST kind and accepted recovery states;
- output surface-AST kind and named fields;
- tokens, trivia, delimiters, and wrappers preserved by syntax reference;
- information intentionally consumed or normalized;
- diagnostics or error node produced when required evidence is missing;
- origin mapping for one-to-one, many-to-one, and one-to-many transformations;
- verifier expected before and after the transformation.

Do not lower irreversible semantic constructs inside parser callbacks. Publish a complete CST first,
then run a deterministic lowering pass whose inputs and outputs can be inspected independently.
Reject an unhandled concrete variant rather than silently returning null or a generic node.

For generated temporaries and expanded control flow, map the lowered nodes back to the originating
surface construct and material subexpressions. Preserve both a primary diagnostic origin and any
secondary origins needed to explain duplicated or reordered structure.

## Semantic-sensitive syntax

- Preserve parser decisions for contextual keywords, generic delimiters, patterns, and other forms
  that cannot be reconstructed from token spelling alone.
- Preserve tuple, argument, sequence, grouping, and elision distinctions before discarding commas or
  delimiters.
- Preserve statement boundaries and newline-sensitive decisions made by the grammar. Do not rebuild
  them from a trivia-stripped token list.
- Carry raw spelling and exact language-defined literal representation until conversion has a
  precise overflow, invalid-escape, suffix, and normalization contract.
- Keep pattern and assignment-target structure separate from expression structure when read, write,
  delete, binding, default, and rest rules differ.
- Use the parser's already established precedence and associativity tree. Do not flatten operators
  and re-fold them under a second, potentially divergent table.

## Evaluation order, scope, and reference semantics

- Lower compound assignment, optional access, logical assignment, comprehensions, iteration sugar,
  async forms, and similar constructs with explicit temporaries that evaluate each material operand
  the language-defined number of times and in the defined order.
- Preserve exceptions and side effects while introducing temporaries. Validate read, operation,
  write, short-circuit, and cleanup order separately.
- Preserve receiver or reference identity when a member call differs from loading a function value
  and calling it independently.
- Represent scope owners, binders, defaults, guards, and child evaluation regions explicitly. Do not
  flatten a construct whose children execute in different scopes.
- Keep duplicate and ordered elements in source order when evaluation, override, reflection,
  diagnostics, or tooling can observe them.
- Record desugaring decisions in the origin map so diagnostics point to user-written syntax rather
  than invented temporaries or control-flow nodes.

## Identity, side tables, and snapshots

- Keep `NodeId`, source span, and structural hash distinct. A span is a location, a hash compares
  content, and a node identity names one occurrence in a versioned tree.
- Exclude spans, trivia, and raw spelling from semantic structural equality when they do not affect
  meaning. Maintain a separate syntax or source hash when exact spelling matters.
- Keep resolved symbols, inferred types, constants, control-flow facts, and other phase results in
  generation-aware side tables keyed by node and snapshot identity. Do not replace syntax fields
  with resolved objects in place.
- Reuse syntax identity after an edit only when the unchanged subtree and its parser context remain
  valid. Invalidate dependent side-table entries by semantic dependency, not only by text overlap.
- Version syntax references and origin maps so a node cannot silently point into an obsolete source
  snapshot.
- When nodes move without semantic change, preserve semantic comparability without claiming that the
  old and new source occurrences are the same identity.

## Tree verification

Run a verifier after parsing and after every material lowering stage. Check:

- unique node identities within the declared identity scope;
- absence of structural cycles and illegal multi-parent ownership;
- child category, field cardinality, and source-order constraints;
- valid source ranges, delimiter ordering, and snapshot ownership;
- allowed missing, error, synthetic, and elided states for the current phase;
- complete lowering coverage and no parser-only wrapper in phases that forbid it;
- valid origin mapping for generated, merged, and split nodes;
- phase-specific rules such as no surface sugar after core lowering;
- side-table generation and node-snapshot compatibility.

Make verifier failures diagnostic and bounded. A malformed tree must not crash its printer, walker,
or diagnostic renderer before the verifier can identify the broken invariant.

## Test matrix

- Reconstruct exact original source from the CST for valid, invalid, incomplete, mixed-line-ending,
  escaped, commented, and delimiter-heavy inputs.
- Assert surface-AST shape for punctuation-sensitive forms, operator pairs and triples, grouping,
  contextual syntax, patterns, targets, scopes, and error nodes.
- Compare AST results across grammar refactors that change parser-only wrapper productions.
- Trace side effects and exceptions through sugar lowering to prove operand count, order, receiver,
  scope, short-circuit, and cleanup behavior.
- Exercise every absence state and verify that missing or erroneous syntax never becomes an ordinary
  executable value.
- Move and edit comments around empty containers, delimiters, preambles, and EOF; verify deterministic
  trivia ownership and minimal unchanged-source edits.
- Compare incremental CST, AST, origin maps, and side-table invalidation with a fresh full pipeline
  after edit sequences.
- Mutate each AST field and phase tag to prove the verifier rejects wrong categories, null required
  fields, duplicate identities, cycles, stale origins, and forbidden phase nodes.
- Test both semantic equality and exact syntax equality so a source move or spelling change does not
  accidentally poison semantic caches or disappear from source-aware tools.

## Failure matrix

| Symptom | Evidence to require |
| --- | --- |
| Formatter loses comments or whitespace. | Token gaps, trivia attachment, full spans, syntax references, and unchanged-slice reuse. |
| Grammar refactor changes public AST. | Concrete-variant lowering map, wrapper normalization rule, and AST golden diff. |
| Valid-looking AST came from malformed input. | Missing and unexpected CST nodes, category-specific error node, and execution gate. |
| Compound assignment evaluates a target twice. | Surface sugar node, temporary plan, evaluation trace, and origin map. |
| Rename or diagnostic points at the wrong text. | Snapshot identity, name span, raw token range, syntax reference, and origin generation. |
| Incremental analysis reuses stale facts. | Node and snapshot identity, changed semantic dependency, side-table generation, and full-pipeline differential. |
| Parentheses or commas change meaning after lowering. | Parser decision, structural discriminator, surface-AST shape, and semantic equality oracle. |
| Tree walker crashes after successful parse. | Constructor invariants, phase verifier, error-node schema, cycle and category checks. |

## Invariants and handoffs

- Every source unit is owned by the lossless syntax layer before any abstraction occurs.
- Every information loss names the owning lowering stage and a consumer contract that permits it.
- Every normal AST node represents written or explicitly synthetic meaning; recovery never forges a
  user-written value.
- Every order-bearing construct remains ordered until a later phase proves order unobservable.
- Every generated node has an origin and every side-table fact has a snapshot generation.
- Every lowering stage has an input verifier, output verifier, and differential or semantic oracle.
- Use `parser-engineering-review` for CST, AST, recovery, source, and incremental ownership.
- Use `compiler-engineering-review` for HIR or IR semantic refinement after the parser boundary.
- Use `interpreter-engineering-review` when lowered nodes directly define runtime evaluation.
- Use `name-resolution-integrity-review` when bindings and symbol side tables are the disputed layer.
- Use `observability-debuggability-review` when durable tree or lowering diagnostics change.
