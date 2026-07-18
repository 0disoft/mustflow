# Fuzz Oracle, Triage, and CI Checklist

Use this reference when coverage-guided fuzzing is combined with property-based generation,
differential or metamorphic checking, crash minimization, sanitizer lanes, or CI corpus management.
Coverage finds unfamiliar execution. The oracle decides whether the behavior is wrong.

## Contents

1. [Evidence model](#1-evidence-model)
2. [Property-based entropy and abstract inputs](#2-property-based-entropy-and-abstract-inputs)
3. [Semantic result envelopes](#3-semantic-result-envelopes)
4. [Differential and metamorphic oracle ledger](#4-differential-and-metamorphic-oracle-ledger)
5. [Stable property and crash identities](#5-stable-property-and-crash-identities)
6. [Reproduction capsule and flaky classification](#6-reproduction-capsule-and-flaky-classification)
7. [Exact minimization and shrinking](#7-exact-minimization-and-shrinking)
8. [Trigger, detection, and root cause](#8-trigger-detection-and-root-cause)
9. [Sanitizer and assertion lanes](#9-sanitizer-and-assertion-lanes)
10. [CI cadence and asset classes](#10-ci-cadence-and-asset-classes)
11. [Regression promotion and negative controls](#11-regression-promotion-and-negative-controls)
12. [Primary reference anchors](#12-primary-reference-anchors)

## 1. Evidence model

Keep these roles separate:

| Surface | Role | Does not prove |
| --- | --- | --- |
| Edge or feature coverage | Search guidance | Correct result |
| Value, comparison, or distance signal | Proximity guidance | Failure |
| Corpus | Search cache and replay input | Permanent regression coverage |
| Sanitizer | Named runtime defect class | Semantic correctness |
| Property or invariant | Contract violation | Root cause by itself |
| Differential mismatch | Candidate disagreement | Which implementation is wrong |
| Crash artifact | Trigger evidence | Reproducibility or uniqueness |
| Explicit regression | Durable fixed contract | Current campaign breadth |

Do not fail an input because its semantic distance score is large. Distance may guide mutation, but
only a named oracle changes the outcome to failure.

## 2. Property-based entropy and abstract inputs

When a fuzzer drives a property-based generator:

- consume artifact bytes through one deterministic entropy provider;
- remove secondary calls to random APIs, current time, process-specific hash seeds, locale, or
  scheduler choices unless those facts are encoded in the artifact;
- make byte exhaustion deterministic and bounded;
- decode lengths from remaining capacity instead of allocating from untrusted declarations;
- select generated references from the current object or handle pool;
- bias reducible values toward zero, one, empty, singleton, and named boundaries; and
- reject only inputs outside the declared property domain, not inputs that are merely inconvenient.

Generate one abstract object or command sequence and derive compared representations from it.
Examples include old and new wire formats, JSON and binary encodings, or two backend inputs. State
whether the parser is under test: a shared parser or shared AST can intentionally remove parser
differences from the comparison.

Assign an `origin_id` to the abstract input and retain it on every metamorphic follow-up, result,
artifact, and minimized regression.

## 3. Semantic result envelopes

Normalize results into a versioned envelope before comparing implementations or builds:

| Field | Example meaning |
| --- | --- |
| `outcome` | accepted, rejected, property failure, runtime failure |
| `failure_class` | stable domain category, not renderer text |
| `value` | canonical semantic value or digest |
| `consumed` | input units consumed or trailing-data policy |
| `state_delta` | durable or in-memory state transition |
| `effects` | writes, events, messages, external calls, cleanup |
| `checkpoint` | earliest normalized stage reached or diverged |
| `property_id` | stable violated property or invariant |

Preserve raw stdout, stderr, exceptions, and values separately for triage. Normalize only declared
differences such as temporary paths, addresses, timestamps, map ordering, platform messages, locale,
NaN spelling, or generated identifiers. Over-normalization can erase the defect.

Use checkpoint digests for hot comparison only when the minimized artifact is later checked against
the full canonical checkpoint state.

## 4. Differential and metamorphic oracle ledger

For every differential comparison, record:

- the shared specified domain and excluded undefined or implementation-defined behavior;
- implementation independence, including shared parsers, libraries, generators, and helpers;
- compared envelope fields and explicitly ignored differences;
- reference model, third implementation, specification rule, or metamorphic relation used to
  assign fault; and
- version, optimization, feature-flag, integer-width, architecture, or compatibility axes.

Two implementations can share one bug. A mismatch is a candidate until independent evidence names
the violated contract.

For metamorphic testing, derive follow-ups from one origin and encode the relation's precondition.
Useful relations include:

- parse and canonical serialize round trip;
- normalization idempotence;
- equivalent chunk partitions;
- permutation of fields whose order is declared irrelevant;
- compression followed by decompression;
- failed transaction leaves the prior state unchanged; and
- monotonic or commutative behavior within a bounded declared domain.

Do not compare independently generated inputs and call the relation metamorphic.

## 5. Stable property and crash identities

Give every property a durable identifier such as `P037_ROUNDTRIP_LENGTH`. Include domain or tolerance
versions when they change meaning.

Construct a canonical failure key from applicable stable fields:

- runtime or sanitizer kind;
- access or operation type;
- property identifier;
- earliest divergence checkpoint;
- stable application frames after symbolization and runtime-frame removal; and
- target, build, architecture, or decoder-schema identity when required.

Do not route every property through one indistinguishable assertion site. Do not deduplicate by raw
program counter, complete stack text, allocator frames, temporary paths, or rendered messages.

## 6. Reproduction capsule and flaky classification

Bind each artifact to a reproduction capsule:

- binary and debug-symbol hashes;
- compiler, linker, runtime, and dependency versions;
- source revision and complete build flags;
- sanitizer, fuzzer, seed, timeout, memory, and campaign options;
- environment variables, locale, timezone, working directory, and filesystem fixture;
- dynamic libraries, operating system, kernel-relevant behavior, CPU, and architecture;
- thread count, scheduling or fault seed, forced yield points, and repetition count;
- network response ordering, delays, and close points when applicable; and
- raw artifact, decoder schema, canonical form, and expected failure key.

Before minimizing, replay the capsule several times and record every observed failure key. Classify:

- `deterministic`: the expected failure is stable;
- `probabilistic`: the expected failure appears with a measured frequency; or
- `multimodal`: multiple failure classes or checkpoints appear.

A mix of use-after-free, timeout, and success is not one ordinary crash. Preserve the distribution
and investigate state, scheduling, or undefined behavior before shrinking.

Do not derive a gate such as “N failures in M attempts” from one observed sample. Repetition count,
confidence rule, acceptable failure rate, and promotion threshold belong to a repository-owned,
versioned flaky-test policy. Without that policy, report the measured distribution, retain the
artifact in triage, and do not promote it to a deterministic regression gate.

## 7. Exact minimization and shrinking

The minimizer predicate must require the same failure, not merely a non-zero exit. Use the canonical
failure key or a documented subset that remains stable across reduction.

Alternate these reducers to a fixed point when both representations matter:

1. byte reduction removes padding, duplicate fragments, or irrelevant fields;
2. decode under the versioned harness schema;
3. semantic shrinking removes nodes, operations, branches, and references while preserving
   structural validity;
4. deterministic serialization rebuilds dependent lengths, checksums, or offsets; and
5. byte reduction runs again under the exact predicate.

Shrink every causal dimension. For concurrency, reduce thread count, schedule seed, yields, and
repetitions. For fault injection, reduce failing call index and one-shot or persistent mode. For
network behavior, reduce response order, delay, chunking, and close point.

Reject a reduction if it changes use-after-free into stack overflow, property failure into timeout,
or one divergence checkpoint into another.

## 8. Trigger, detection, and root cause

Record three different coordinates:

| Coordinate | Meaning |
| --- | --- |
| Trigger | Input and environment tuple that exposes the event |
| Detection point | Sanitizer, assertion, property, or timeout observation |
| Root cause | Earliest violated contract that created the invalid state |

Use state checkpoints, allocation and free histories, uninitialized-value origins, and per-command
invariants to move from detection toward creation. The top sanitizer frame is not automatically the
fix location.

For long sequences, find the last valid and first invalid checkpoint before bisecting source
history. Otherwise allocator or optimization changes can identify the first visible symptom rather
than the change that introduced the cause.

Separate timeout, OOM, stack overflow, leak, and infinite progress failure. Compare multiple limits
and input sizes, operation counts, CPU, maximum RSS, retained resources, and work counters to
distinguish a fixed threshold from quadratic, exponential, or cumulative behavior.

## 9. Sanitizer and assertion lanes

Use purpose-specific builds when compatibility or cost differs:

| Lane | Primary role |
| --- | --- |
| Fast coverage | Search volume and reachability |
| Address and leak | Bounds, lifetime, double free, retained allocations |
| Undefined and integer | UB, truncation, sign change, unintended overflow |
| Uninitialized read | Uninitialized data; origin tracking during focused triage |
| Race | Stateful sequence and replay under measured scheduling |
| Assertion-heavy | Internal preconditions, postconditions, ownership, locks, invariants |
| Production-equivalent replay | Confirm fuzz-friendly gates did not create a test-only result |

Terminate on undefined behavior in triage so corrupted-state follow-on symptoms do not become new
bugs. Scope integer checks explicitly; a generic undefined bundle is not proof against every
conversion or unsigned arithmetic defect.

Assertions should monitor internal contracts after external validation. Malformed input that is
supposed to be rejected should not be converted into a harness assertion crash.

Run invariants after each state transition, not only at the end. Prefer independent shadow checks:
stored count versus traversal count, index result versus full scan, free versus used set, parent
list versus child backlink, or actual resources versus tracked totals.

## 10. CI cadence and asset classes

Run bounded CI in this order:

1. explicit semantic regressions;
2. reviewed seed and minimized regression corpus replay; and
3. new mutation with the remaining budget.

Use separate time horizons:

- PR: changed-code targets, explicit regressions, bounded replay, short mutation;
- batch: periodic corpus growth and merge;
- deep: slower sanitizer, stateful, cross-build, and cross-platform campaigns.

Keep these asset classes separate:

| Asset | Owner and lifecycle |
| --- | --- |
| Seed set | Small, reviewed, mostly stable, checked in when appropriate |
| Coverage corpus | Evolving instrumentation-dependent search cache |
| Crash artifacts | Original untriaged evidence, immutable until classified |
| Semantic regressions | Minimized, explained, property-bound durable tests |

Version every corpus bundle with target, harness schema, engine and options, build and instrumentation
identity, sanitizer, creation time, parent corpus, and coverage fingerprint. On schema change, choose
`migrate`, `replay-only`, or `invalidate` explicitly.

Merge candidate corpora in staging, validate under the target decoder and instrumentation, then
promote atomically while preserving the previous snapshot. Do not let multiple engines write one
directory concurrently. Coverage pruning cannot delete semantic regressions it cannot observe.

Track executions per second, calibration or load time, valid-input ratio, feature yield, stable
unique failures, flaky rate, minimization success, and regression replay time. Line coverage alone
cannot distinguish deep semantic exploration from shallow early rejection.

## 11. Regression promotion and negative controls

Promote a discovery only when it:

- reproduces under its capsule;
- has an exact minimized failure predicate;
- represents a distinct contract or entry path rather than a duplicate symptom;
- has a canonical human-readable structure when the byte encoding is opaque;
- names the stable property or invariant; and
- can run in a bounded ordinary regression path.

Retain three related assets when valuable: original artifact bytes, canonical structured input, and
an explicit property-bound regression. A coverage corpus or property-based example database remains
a search cache, not the only permanent correctness record.

Prove the fix with the original, minimized, and nearby inputs plus applicable sanitizer lanes. Then
use a bounded negative control when practical: reintroduce the repaired violation or mutate the
guarded condition and require the regression to fail. If the negative control passes, the test may
only be hiding the detection point or avoiding the path.

Delete an old regression only when a stronger property demonstrably covers it and catches a
negative-control reintroduction of the historical defect.

Keep flaky artifacts in a measured reproduction lane with owner and deadline. Do not silently
delete them, and do not make an unstable artifact an endlessly ignored main-gate failure.

## 12. Primary reference anchors

Refresh tool-specific behavior from current primary documentation:

- [LLVM libFuzzer](https://llvm.org/docs/LibFuzzer.html) for deterministic narrow targets, corpus,
  replay, merge, minimization, value profiles, limits, artifacts, and fuzz-friendly builds.
- [Hypothesis external fuzzers](https://hypothesis.readthedocs.io/en/latest/how-to/external-fuzzers.html)
  for mapping external fuzzer bytes into one generated example.
- [Hypothesis stateful testing](https://hypothesis.readthedocs.io/en/latest/stateful.html) for
  command sequences, bundles, rules, and invariants.
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html),
  [UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html),
  [MemorySanitizer](https://clang.llvm.org/docs/MemorySanitizer.html), and
  [ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html) for current detector scope,
  options, compatibility, symbolization, and runtime cost guidance.
- [AFL++ fuzzing in depth](https://aflplus.plus/docs/fuzzing_in_depth/) for campaign setup,
  instrumentation, sanitizer instances, corpus minimization, dictionaries, analysis, and triage.
- [ClusterFuzzLite running guide](https://google.github.io/clusterfuzzlite/running-clusterfuzzlite/)
  for pull-request, batch, coverage, corpus pruning, and scheduled workflow roles.
- [SQLite testing](https://sqlite.org/testing.html) for independent harnesses, fault injection,
  assertions, multiple builds, regression tests, and mutation-based test validation.

Tool flags and cost ratios drift. Keep the skill's invariant stable and confirm exact options against
the repository's pinned engine, compiler, sanitizer, and CI version.
