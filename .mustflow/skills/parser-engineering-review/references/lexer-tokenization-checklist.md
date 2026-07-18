# Lexer and Tokenization Contract Checklist

Use this reference when `parser-engineering-review` reaches a lexer, tokenizer, token cache,
source-position layer, or incremental relexing boundary. Treat the examples as collision probes,
not as syntax that every language must accept. Freeze the language-specific decision before changing
implementation or tests.

## Contents

1. Token representation
2. Candidate selection and longest match
3. Identifiers and keywords
4. Operators, lexical modes, and goals
5. Encoding, Unicode, newlines, and positions
6. Strings and escapes
7. Numbers, comments, and malformed input
8. Streaming outcomes and recovery diagnostics
9. Incremental and large-input behavior
10. Hostile-input and resource budgets
11. Differential, fuzz, and property tests
12. Standards and implementation anchors

## 1. Token representation

Define one token contract before implementing scanner branches. Keep these concerns separate:

- `kind`: stable lexical classification, including explicit malformed or unterminated kinds when
  callers need recovery.
- `span`: canonical half-open source range, normally `[startByte, endByte)` over the original byte
  stream. Never make a decoded or normalized buffer the silent source of truth.
- `raw`: source slice identity or raw spelling. Avoid allocating a copied `rawText` for every token
  when an immutable source buffer can provide the same lossless view.
- `cooked`: decoded escape, normalized identifier key, or literal value representation. Make an
  invalid or unavailable cooked value explicit instead of overwriting raw source.
- `positions`: typed derived coordinates such as line index, UTF-16 offset, code-point offset, or
  display column. Name the unit and conversion owner.
- `trivia`: whitespace and comments with raw spans plus applicable newline effects. Do not erase a
  line break merely because the surrounding comment is skipped by the parser.
- `diagnostics`: stable code, severity, arguments, primary and related raw spans, fix-its, and
  recovery information. Preserve a token boundary even when cooking fails, and keep message
  rendering out of the scanner.

Require token and trivia spans to account for every original source byte exactly once, except for
declared zero-width synthetic insertions. Keep parser-inserted missing tokens separate from lexical
tokens that cover real input.

## 2. Candidate selection and longest match

Define selection as data, not rule-file folklore:

1. Start every candidate at the same input position.
2. Continue scanning while at least one candidate can progress.
3. Whenever a candidate accepts, record its last accepting rule, comparison end, actual token end,
   and any capture state required to emit it.
4. When no candidate can progress, choose the greatest comparison end. Use an explicit, stable
   priority only when comparison lengths tie.
5. Rewind to the chosen token end and emit. If no candidate ever accepted, consume one bounded
   invalid source unit while preserving its raw byte range and emit an error token.

Keep `comparisonEnd` distinct from `tokenEnd` when lookahead or trailing context participates in
candidate comparison but must remain unconsumed. Reject equal-length, equal-priority overlaps during
grammar or table generation. Reordering declarations must not change output when explicit priority
is unchanged.

Build fixed operators and punctuators as a trie or equivalent DFA. Generate collision cases for
every prefix relation rather than maintaining hand-written `if` order. Include follower predicates
in the accepting condition when the next code point changes whether a candidate is lexically valid.

Examples to classify together include:

- `>`, `>=`, `>>`, `>>=`
- `=`, `==`, `===`, `=>`
- `1`, `1.`, `1.0`, `1e3`, `1e+3`
- `.5`, `1..2`, `1...2`, `1.foo`, `1._x`, `1.e2`
- a complete fixed token at EOF and the same token followed by each permitted token-start class

## 3. Identifiers and keywords

Scan the complete identifier before hard-keyword classification. Use an exact lookup on the
language-defined semantic spelling; never split a keyword prefix from a longer identifier.

Record these policy choices explicitly:

- hard keywords emitted as fixed token kinds;
- contextual keywords retained as identifiers or annotated with a parser-consumed hint;
- whether identifier escapes are accepted and whether lookup uses raw or cooked spelling;
- whether identifiers are normalized, rejected when non-normalized, or compared without
  normalization;
- whether keyword matching is case-sensitive, ASCII-folded, or Unicode-folded;
- the pinned Unicode data version and the identifier profile, normally based on `XID_Start` and
  `XID_Continue` plus a named set of additions or removals.

Do not call locale-dependent lowercase functions for language keywords. Do not normalize the whole
source buffer. Apply identifier normalization or folding only at the declared semantic-key boundary
while retaining raw spelling and byte spans.

Keep lexical validity separate from identifier-security diagnostics. Mixed-script, confusable,
bidirectional-control, and restricted-format checks belong to a named security pass unless the
language contract explicitly makes them lexical errors.

Probe at least `if`, `ifx`, `xif`, `while2`, `_return`, `return_`, escaped spellings that cook to a
keyword, normalized and decomposed equivalents, mixed scripts, and EOF immediately after an
identifier.

## 4. Operators, lexical modes, and goals

Make the current lexical mode physically restrict the candidate rule set. Use stack frames when a
mode can nest or must retain parameters such as delimiter count, interpolation brace depth, comment
depth, indentation state, or embedded-language identity.

Do not reduce nested strings or interpolation to one `insideString` boolean. Emit structural string
segments and ordinary expression tokens so the parser can see embedded expressions while preserving
raw text segments.

Recognize comment openers only in modes where comments can begin. Recognize string prefixes only
after the complete opener is confirmed; otherwise return to ordinary identifier or punctuation
rules. Preserve `/`, `//`, `/*`, and `/=` as competing candidates in code mode without applying
comment rules inside strings or comments.

When a token class depends on syntactic context, define a parser-supplied lexical goal or an
equivalent integrated scanner-parser contract. Do not infer division versus regular expression,
generic delimiter versus shift, or template tail versus right brace from a brittle previous-token
heuristic.

## 5. Encoding, Unicode, newlines, and positions

Separate raw-byte acquisition, decoding, lexical matching, and external position conversion:

- Decode using the declared source encoding while retaining a mapping from scanner code-point
  boundaries to original byte offsets.
- On invalid encoding, preserve the exact failing byte range and guarantee progress. At an
  uncommitted chunk boundary, distinguish an incomplete code-unit sequence that needs more input
  from a sequence already proven invalid. Do not silently collapse distinct invalid byte sequences
  into indistinguishable source.
- Recognize a BOM only at a contract-defined stream start. If an encoding declaration exists, sniff
  only its bounded raw-byte prefix and define conflict behavior before full decoding.
- Pin the Unicode data version used by compiler, formatter, language server, and token cache. Treat a
  Unicode version change as a compatibility change with identifier fixtures.
- Treat code points as lexical matching units unless the language explicitly says otherwise. Use
  grapheme clusters and display width only for user-interface rendering.
- Define the accepted line terminator set. Count CRLF as one terminator sequence when supported and
  distinguish physical lines from logical lines.
- Keep byte offsets, UTF-16 code-unit offsets, code-point offsets, line indices, and display columns
  as distinct types or named conversions. Negotiate the external protocol position encoding instead
  of assuming compiler byte columns equal editor columns.

Test multibyte identifiers, combining marks, emoji before diagnostics, CRLF and lone CR where
supported, mixed newline files, tabs, invalid encoding followed by valid syntax, and round trips
between the canonical byte span and every external position unit.

## 6. Strings and escapes

Scan strings with a state machine, not one lazy regular expression. Separate opener, ordinary text,
escape, interpolation opener, closing delimiter, forbidden newline, and EOF transitions.

- Consume an escape production atomically when its backslash is seen. Do not decide whether a quote
  is escaped by inspecting only the immediately preceding character.
- Preserve raw spelling and compute cooked content separately. Keep a stable token or segment when
  escape decoding fails.
- Store parameterized raw-string delimiter state from the opener and accept only an exactly matching
  closer. Bound delimiter length according to the language contract.
- For interpolation, push an expression frame with its own brace depth. Permit nested strings and
  interpolations by stacking frames rather than sharing one global depth.
- End an unterminated single-line string at its declared recovery boundary, usually before the
  newline. Let multiline strings reach their declared closer or EOF. Emit an explicit unterminated
  token or segment and leave the scanner in a progress-making state.
- Define every escape family: exact digit count or bounded variable count, valid scalar range,
  surrogate rejection, unknown-escape policy, and whether line continuation contributes cooked
  content.

Probe even and odd backslash runs before quotes, invalid escapes, escaped newlines, interpolation
with nested braces, nested interpolation, raw delimiters containing shorter false closers, prefixes
that are also valid identifier starts, newline recovery, and EOF after every opener state.

## 7. Numbers, comments, and malformed input

Keep unary signs outside numeric tokens unless the sign occurs in a grammar-defined exponent.
Specify numeric syntax independently from host-language conversion:

- base prefixes and the minimum digits after each prefix;
- digit classes per base;
- separator positions, repetition, and trailing policy;
- fraction, exponent marker, optional exponent sign, and required exponent digits;
- suffix start and allowed suffixes;
- dot follower restrictions and collisions with range or member-access tokens;
- forbidden followers after an otherwise valid numeric prefix;
- the recovery boundary for a malformed numeric token.

Lex numeric structure first and perform value conversion in a separate literal-semantic pass. Do not
let host `parseFloat`, fixed-width integer overflow, or locale parsing define lexical validity.

When the language wants one useful diagnostic, consume inputs such as `0xG`, `1e+foo`, `123abc`, or
invalid separator runs as one bounded malformed token instead of reporting a valid prefix followed
by misleading unrelated tokens. The exact malformed boundary is language policy and must be tested.

For malformed candidates, keep the accepted-language grammar narrow and define a separate bounded
candidate envelope for recovery. Record `firstFault`, `terminationReason`, and a capped
`secondaryFaultCount`; do not rescan the same token once per bad character. Keep these locations
separate:

- `primarySpan` or `faultOffset`: what the diagnostic should underline first;
- `recoverySpan`: all source consumed to regain a stable token boundary;
- `originSpan`: the opener or prefix that created the current lexical state; and
- a related termination span for newline, EOF, or a mismatched closer.

For an unterminated construct, the primary span normally points at the opener rather than an empty
EOF location. EOF or the forbidden newline can be a related span.

Preserve comments as trivia when formatting, documentation, source maps, or newline-sensitive syntax
needs them. Define whether block comments nest and whether a comment containing a line terminator has
newline semantics. At EOF, emit one unterminated-comment trivia item from opener to EOF.

## 8. Streaming outcomes and recovery diagnostics

Treat a buffer boundary, committed source EOF, malformed input, and resource exhaustion as different
outcomes. A streaming scanner should expose an equivalent of:

- `Token(token)`: emits a token that covers real input, or one declared bounded state-changing
  insertion;
- `EndOfInput`: a terminal outcome observed once, not a repeatedly emitted zero-width token;
- `NeedMoreInput`: current bytes are a valid prefix of a candidate and source EOF is not yet known;
  and
- `ResourceLimitExceeded(kind, offset, observed, limit)`: bounded termination with structured
  evidence rather than an allocation failure or hang.

At committed EOF, emit an identifier, number, or fixed token when the current state accepts. Convert
an incomplete encoding sequence or open string, interpolation, raw delimiter, or comment to the
declared malformed or unterminated result. Do not return `NeedMoreInput` after EOF is known, and do
not emit the same zero-width error or EOF result twice.

Model buffer refill as a lexer state transition. Preserve or relocate every live position and state:
`cursor`, `limit`, `tokenStart`, last accepting marker and captures, trailing-context marker,
decoder partial state, mode stack, lexical goal, and EOF knowledge. A refill that keeps only the
cursor silently corrupts tokens spanning chunks.

Keep diagnostics as structured data, for example `code`, `severity`, `args`, `primarySpan`,
`relatedSpans`, `fixIts`, `recoverySpan`, `snapshotId`, and `mode`. The low-level scanner
should not localize or render a finished sentence.

Define synchronization by lexical mode. A code-mode invalid byte, string escape, interpolation
expression, raw string, and nested comment do not share one safe recovery delimiter. Coalesce
adjacent secondary failures into a contamination region, cap diagnostic volume, and emit one
aggregate omission diagnostic when the cap is reached.

Treat a fix-it as executable behavior. Apply it to a temporary immutable snapshot, lex again, and
require the intended token plus downstream token-and-state convergence. Reject a fix-it that only
makes the highlighted bytes look plausible while shifting the lexer into a different mode.

## 9. Incremental and large-input behavior

Checkpoint every state that can affect future candidates, including mode stack, lexical goal,
delimiter parameters, comment or interpolation depth, indentation or newline state, decoder partial
state, and any previous significant-token category required by the language contract. Checkpoint
density may be adaptive, but checkpoint contents must be complete.

Make checkpoint serialization a tested continuation contract: lexing a suffix after
serialize/deserialize must equal uninterrupted lexing. Restart before an edit at a checkpoint valid
for the new immutable snapshot. Stop only when canonical token kind, length, flags, and complete
outgoing state converge with the old snapshot at the same source position. A block hash is only a
fast inequality filter; verify actual fields after a hash match. Never use one equal token, a fixed
number of equal tokens, one line, or a fixed character radius as the correctness boundary.

Tie work and publication to `snapshotId`. Check cancellation or staleness at bounded work
intervals, discard partial results, and publish atomically only when the result still targets the
current snapshot. Arbitrary parallel chunks are unsafe unless each starts from a proven complete
state.

Keep the hot path narrow:

- use an ASCII fast path and a Unicode slow path whose results are identical at their boundary;
- if delimiter search is vectorized, test scalar tails and every chunk alignment;
- store source ranges in compact token records and move diagnostics, cooked values, and uncommon
  payloads to side tables;
- defer unescaping, numeric conversion, normalization, and interning until a consumer requests them;
- compute line and display columns from a line-start index rather than updating every coordinate on
  every byte; and
- align source and token blocks so edits replace bounded blocks, using relative offsets plus an
  aggregate index instead of rewriting all following absolute positions.

Define snapshot lifetime and release policy. Zero-copy is not free if a ten-byte token retains an
obsolete multi-gigabyte snapshot; use chunk ownership or promote a small long-lived slice to owned
storage when that is cheaper.

Measure the editing product, not only clean-file throughput: `relexedBytesPerEdit`,
`reusedTokenRatio`, allocations per edit, diagnostic latency, peak live bytes, and p50/p95/p99 edit
latency. Keep counters available in tests so a wall-clock threshold is not the only complexity
oracle.

## 10. Hostile-input and resource budgets

Use one request-scoped multidimensional budget. Applicable counters include input bytes, raw token
bytes, cooked or decoded bytes, emitted token and trivia count, diagnostic count, nesting depth,
checkpoint count, retained source bytes, allocation bytes, and cooperative work units. Charge before
allocation or publication and return the exhausted dimension.

- Keep raw-token and cooked-value limits separate. Escape decoding, normalization, and conversion
  can expand or allocate even when the raw spelling is bounded.
- Keep the recognition hot path linear. Do not hand hostile text to a backtracking regular-expression
  engine or recursively descend once per nested comment opener.
- Track nested comments and interpolation with checked iterative counters. Bound retained opener
  history instead of storing every nesting position.
- Scan a huge token as a range while updating only bounded metadata. Do not append every byte to a
  builder or join all source chunks merely to classify the token.
- Bound output amplification: a small input must not create unbounded tiny tokens, diagnostics,
  checkpoints, or interned identifiers. Coalesce compatible trivia and contamination regions.
- Treat NUL as input data unless the language forbids it. Keep EOF as separate state, and prove any
  sentinel or padding cannot become a valid lexeme suffix or cause an out-of-bounds read.
- Use checked addition, multiplication, growth, and narrowing for positions, token-table sizes,
  display-coordinate conversion, and allocation requests.
- Bound snapshot retention and identifier interning. Prefer request-local interning with a distinct
  identifier budget and collision-resistant storage.
- Check cooperative cancellation after bounded bytes or state transitions, at refills and mode
  changes, and inside very long tokens. Discard the incomplete snapshot result on cancellation.

## 11. Differential, fuzz, and property tests

Require applicable properties in addition to example fixtures:

- Raw token, trivia, skipped, and error spans are half-open, ordered, non-overlapping, and partition
  the input without gaps; concatenating their raw slices reconstructs the exact input bytes.
- Every scanner step consumes source, reaches committed EOF, returns `NeedMoreInput`, or performs
  one declared bounded state-changing insertion.
- No longer valid candidate exists at the chosen token start under the active mode and lexical goal.
- Equal-length selection follows explicit priority and remains stable when declaration order changes.
- Every fixed operator prefix pair receives generated surrounding-character and EOF cases.
- Hard keyword prefixes remain identifiers when the complete spelling is not an exact keyword.
- One-shot and chunked scanning agree for all short split positions and biased splits inside
  multibyte encodings, escapes, numbers, comments, delimiters, and last-accept checkpoints.
- Full and incremental lexing agree after every edit in randomized edit sequences, including edits
  that propagate string, comment, delimiter, indentation, or lexical-goal state.
- Checkpoint serialize/deserialize followed by suffix scanning equals uninterrupted scanning.
- Malformed-input scanning terminates within token, diagnostic, transition, revisit, allocation, and
  retained-source budgets.

For differential testing, normalize each implementation to an observation such as
`(canonicalKind, rawStart, rawEnd, flags)`. Filter specification-permitted differences before
comparison, and treat disagreement as a candidate defect rather than majority proof. Keep an
intentionally slow reference lexer independent of production tables, character classifiers, and
candidate-selection helpers; sharing the same recognition code only reproduces the same bug twice.

Combine a grammar-aware generator with raw byte mutation. Bias lengths to zero, one, maximum minus
one, maximum, maximum plus one, powers of two, chunk size boundaries, delimiter lengths, and Unicode
sequence widths. Add metamorphic relations only with explicit preconditions, such as inserting
trivia where trivia is grammar-neutral or changing chunk partitions without changing bytes.

Instrument transitions, byte revisits, allocations, maximum stack or mode depth, and reprocessed
bytes. Use sanitizers or equivalent memory-safety instrumentation where supported. When shrinking a
failure, minimize not only input bytes but also edit history, chunk splits, checkpoint placement,
options, and the normalized mismatch while preserving the triggering phenomenon.

Keep minimized failures as regression seeds. Classify whether each seed proves a language-contract
decision, implementation defect, host-runtime disagreement, or unsupported input.

## 12. Standards and implementation anchors

Use these primary sources as examples of explicit lexical contracts, not as permission to copy one
language's decisions into another:

- [flex input matching](https://westes.github.io/flex/manual/Matching.html): longest input first,
  then tie handling, including trailing-context comparison length.
- [ECMAScript lexical grammar](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html):
  longest input elements, numeric followers, line terminators, templates, and parser-selected
  lexical goals.
- [Rust token grammar](https://doc.rust-lang.org/reference/tokens.html): raw delimiters, escapes,
  identifier classes, and dot follower restrictions for floating literals.
- [ANTLR lexer rules](https://github.com/antlr/antlr4/blob/master/doc/lexer-rules.md): mode-specific
  sublexers and lexer mode transitions.
- [Go language specification](https://go.dev/ref/spec): comment boundaries, comment newline effects,
  numeric separators, and semicolon insertion inputs.
- [Python lexical analysis](https://docs.python.org/3/reference/lexical_analysis.html): source
  decoding, bounded encoding declarations, physical and logical lines, strings, and indentation.
- [Unicode UAX #31](https://www.unicode.org/reports/tr31/): identifier profiles, `XID_Start`,
  `XID_Continue`, normalization, and version-sensitive Unicode data.
- [Unicode UTS #39](https://www.unicode.org/reports/tr39/): identifier restriction and confusable
  detection mechanisms that belong in a separately declared security policy.
- [Unicode UAX #29](https://www.unicode.org/reports/tr29/): grapheme boundaries for display and
  cursor behavior rather than ordinary lexer grammar units.
- [Language Server Protocol 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/):
  negotiated position encoding and the UTF-16 compatibility default.
- [Go `bufio.Scanner` source](https://go.dev/src/bufio/scan.go): partial-input split outcomes,
  progress checks, invalid advance rejection, token-size limits, buffer relocation, and empty-token
  termination guards.
- [Tree-sitter external scanners](https://tree-sitter.github.io/tree-sitter/creating-parsers/4-external-scanners.html):
  complete scanner-state serialization, explicit EOF distinct from NUL, column-query cost, and
  zero-width-token loop hazards.
- [re2c end-of-input and refill manual](https://re2c.org/manual/manual_d.html#eof):
  cursor, limit, token start, markers, refill relocation, sentinel, padding, and bounds-check
  invariants.
- [RE2](https://github.com/google/re2): linear-time matching, bounded memory, non-recursive
  execution, and graceful budget exhaustion for untrusted patterns and text.
- [Clang diagnostics internals](https://clang.llvm.org/docs/InternalsManual.html#the-diagnostics-subsystem):
  stable diagnostic IDs, typed arguments, source ranges, renderer separation, and executable fix-it
  constraints.
- [Rust `rustc_lexer`](https://github.com/rust-lang/rust/blob/main/compiler/rustc_lexer/src/lib.rs):
  compact token results that retain termination and malformed-literal state for later diagnosis.
- [LLVM libFuzzer](https://llvm.org/docs/LibFuzzer.html): deterministic and bounded fuzz targets,
  structured mutators, corpus reduction, sanitizers, and memory or timeout failure oracles.
