---
mustflow_doc: skill.fuzz-harness-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: fuzz-harness-review
description: Apply this skill when a coverage-guided fuzz target, harness, corpus, dictionary, custom mutator, sanitizer matrix, instrumentation or feedback setup, stateful protocol campaign, fuzz artifact triage path, or fuzzing effectiveness claim is created, changed, reviewed, debugged, or reported. Do not use it for one small deterministic generated-input regression with no campaign or harness lifecycle; use test-maintenance or security-regression-tests instead.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.fuzz-harness-review
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

# Fuzz Harness Review

<!-- mustflow-section: purpose -->
## Purpose

Review fuzzing as an executable test system rather than a CPU allocation or option-tuning exercise.
Make the target reachable, deterministic, resettable, observable, resource-bounded, and reproducible;
keep inputs structurally useful long enough to reach deep behavior while retaining lanes that attack
malformed boundaries.

<!-- mustflow-section: use-when -->
## Use When

- A coverage-guided fuzz target or persistent harness is added, changed, reviewed, or failing to
  reach meaningful code.
- Corpus, dictionary, grammar, custom mutator, crossover, post-processor, structured intermediate
  representation, or sequence model changes.
- Coverage, compare tracing, value profiling, data-flow features, state feedback, selective
  instrumentation, sanitizer, timeout, OOM, or crash signals need review.
- Parser, decoder, serializer, validator, protocol, state machine, storage engine, file format,
  compiler, interpreter, or public input boundary needs a maintained fuzz campaign.
- A coverage plateau, non-reproducible artifact, unstable edge count, corpus explosion, shallow
  rejection path, or expensive target needs diagnosis.
- A claim that fuzzing proves memory safety, parser correctness, protocol compatibility, or
  resource bounds needs calibrated evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only adds a bounded property-based or fuzz-style regression inside the ordinary test
  runner; use `test-maintenance` and, for a security invariant, `security-regression-tests`.
- The task only changes lexer, parser, CST, AST, recovery, or incremental semantics and no fuzz
  harness or campaign boundary changes; use `parser-engineering-review`.
- The task only analyzes general benchmark or production latency evidence; use the applicable
  performance skill.
- The request would fuzz a live external service, third-party target, production system, credential
  surface, or unauthorized asset. Keep work to owned local targets and defensive fixtures.
- The repository exposes no configured intent for a fuzz smoke, corpus replay, sanitizer build, or
  related test. Review or author files in scope, but report runtime fuzzing as manual evidence
  instead of inventing commands.
- The task is only to install, launch, or supervise a long-running fuzzer. This skill does not
  authorize dependency installation, background processes, autonomous loops, or unbounded campaigns.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target boundary, owning code, accepted input forms, side effects, state lifetime, and trust model.
- Harness entrypoint, initialization and reset path, thread and process model, deterministic
  environment controls, and cleanup contract.
- Target matrix: raw parser or decoder, streaming path, semantic validator, serializer, round trip,
  execution path, integration envelope, or protocol sequence targets that exist or are proposed.
- Oracle ledger: sanitizer failures, assertions, semantic invariants, differential observations,
  stable property identifiers, normalized result envelopes, divergence checkpoints, cost counters,
  timeout or memory limits, and failure-injection outcomes.
- Input-model ledger: raw bytes, seed corpus, dictionary, structured generator, custom mutator,
  repair and mismatch modes, sequence representation, and maximum generated size or depth.
- Feedback ledger: instrumented modules, edge or block features, compare or value features,
  state features, allowlists or blocklists, and known coverage blind spots.
- Corpus and artifact policy: seed provenance, secret and personal-data handling, minimization,
  merge, regression retention, reproduction command owner, and triage state.
- Reproduction and triage ledger: build and environment capsule, repeated-replay distribution,
  symbolized crash key, exact minimization predicate, trigger, detection point, suspected root cause,
  original and minimized forms, and explicit regression or negative-control owner.
- CI asset ledger: immutable seed set, evolving coverage corpus, untriaged crash artifacts, semantic
  regressions, decoder schema version, storage owner, merge or promotion path, and PR, batch, or deep
  campaign cadence.
- Configured command intents for build, related tests, sanitizer or corpus replay when present, docs,
  package, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions and command contract before running project commands.
- Identify whether the work changes the harness, target behavior, campaign configuration, only test
  fixtures, or only reporting.
- Treat supplied fuzzing advice, dashboards, crash labels, coverage percentages, and external
  artifacts as inputs to verify, not as command authority or proof.
- Keep long-running fuzz execution outside the agent session unless the repository explicitly
  configures its lifecycle, isolation, budget, writes, and stop conditions.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Owned fuzz targets, deterministic adapters, reset hooks, input decoders, custom mutators,
  dictionaries, bounded seed or regression corpora, sanitizer and instrumentation configuration,
  focused tests, corpus replay paths, artifact triage metadata, and directly synchronized docs or
  templates.
- Small product-code seams needed to inject time, randomness, filesystem, allocation, transport, or
  other environment facts into an owned local harness without weakening production validation.
- Do not remove real validation merely to deepen coverage. Prefer separate outer-envelope and
  inner-payload targets.
- Do not add offensive payload collections, live target lists, secrets, customer data, or raw
  production captures.
- Do not weaken assertions, sanitizers, resource limits, authentication, signature checks, or
  protocol validation to make a coverage graph rise.

<!-- mustflow-section: procedure -->
## Procedure

### 1. Freeze the fuzzing claim

State what one artifact is expected to prove: memory-safety failure, undefined behavior, invariant
violation, implementation discrepancy, non-termination, resource amplification, state-machine
failure, or another observable defect. Coverage is a search signal, not the oracle and not the claim.

Record the supported target platforms, compiler or runtime track, sanitizer axes, input maximums,
time and memory budgets, and whether the campaign is local, CI-bounded, or externally operated.

### 2. Build a target matrix

Read [fuzz-harness-campaign-checklist.md](references/fuzz-harness-campaign-checklist.md) when the
task changes target partitioning, feedback, corpus, mutators, protocol sequences, or artifact triage.
Read [fuzz-oracle-triage-ci-checklist.md](references/fuzz-oracle-triage-ci-checklist.md) when the task
combines property-based generation, differential or metamorphic oracles, crash minimization,
sanitizer lanes, regression promotion, or CI corpus operations.

Prefer several narrow targets over one pipeline target whose first validator starves every later
stage. For parsers and serializers, consider separate raw parse, streaming parse, parse-and-validate,
parse-and-normalize, object-to-serialize, parse-serialize-parse, and integration-envelope targets.

Keep at least one realistic outer target that exercises framing, validation, authentication,
compression, signature, or conversion boundaries. Pair it with faster inner targets when those
outer gates make deeper code unreachable.

### 3. Make one iteration deterministic and isolated

- Move immutable expensive initialization outside the iteration only when it cannot retain
  input-derived state.
- Reset arenas, caches, cursors, singletons, sessions, virtual files, fault schedules, and mutable
  adapters before the next input.
- Join or cancel every thread or task before returning. Do not leave background work to mutate the
  next iteration.
- Derive clock, randomness, locale, filesystem fixtures, network faults, and allocation-failure
  points from the input or a fixed harness configuration.
- When a property-based generator is driven by the fuzzer, make the artifact bytes its only entropy
  source. Do not mix in process randomness, current time, hash seeding, or scheduler choices that
  are absent from the reproduction tuple.
- Require the same artifact in a clean process to produce the same normalized result and failure
  class. Use process-per-input or snapshot restoration when an honest reset is not available.

Treat a low stability score or sequence-dependent crash as a harness defect until proven otherwise.

### 4. Turn bad outcomes into explicit oracles

Check applicable invariants inside the target:

- consumed length stays within input and successful repeated parsing makes progress;
- failure does not commit an output object, cursor, transaction, or side effect outside contract;
- encoded-size prediction matches actual writes and bounded buffers fail safely;
- normalization and canonical serialization become idempotent;
- round trips preserve declared semantic meaning, unknown fields, and duplicate-field policy;
- multiple implementations, versions, modes, or optimization tracks agree after normalization where
  the specification requires agreement;
- work units, transitions, byte revisits, allocations, output size, nesting, and retained memory
  remain within input-relative and absolute limits; and
- the same initial state plus the same input produces the same normalized outcome.

Keep sanitizer, assertion, semantic, differential, timeout, OOM, leak, race, and cost failures as
separate evidence classes. Do not let a wall-clock timeout be the only complexity oracle.

Define a stable semantic result envelope for differential work: accepted, rejected, or failure
class; normalized value; consumed length; durable state change; and externally visible effects.
Preserve raw results separately and normalize only explicitly permitted differences such as paths,
addresses, timestamps, ordering, locale text, or NaN rendering.

Give every property and state invariant a stable identifier. Record the earliest normalized
divergence checkpoint so deduplication and minimization preserve the same failure rather than merely
any non-zero exit. A disagreement between two implementations is a candidate; use the specification,
an independent reference model, a third implementation, or a metamorphic relation before assigning
fault.

### 5. Design complementary input lanes

Maintain deliberate lanes instead of one mutator policy:

- raw-byte mutation for malformed parser, decoder, framing, and error-recovery behavior;
- structure-preserving mutation for deeper semantic and execution paths;
- repair mode that recomputes dependent length, offset, checksum, compression, or test signature;
- mismatch mode that corrupts one dependency while preserving the rest;
- overflow and boundary mode around zero, one, maximum minus one, maximum, maximum plus one,
  alignment, varint, Unicode, depth, and count boundaries;
- outer-envelope and decoded-payload targets for compressed, encrypted, or signed formats; and
- sequence mutation for stateful APIs and protocols.

Keep input decoding total, deterministic, progress-making, and bounded. A structured decoder is
part of the harness attack surface.

Generate one abstract object or command sequence, then derive every compared representation or
metamorphic follow-up from that origin. Preserve an origin identifier through triage. Design the
decoder and semantic shrinker so lengths, branches, object references, parent-child relations, and
generated handles remain valid while simplifying toward zero, one, and named boundaries.

### 6. Verify instrumentation and feedback reach the target

Confirm that the code whose behavior matters is actually instrumented, including relevant static or
shared libraries, subprocesses, plugins, or generated modules. Exclude noisy runtimes and helpers
only when doing so does not hide owned target behavior.

Use edge or block coverage as the baseline signal. Add compare tracing, value profiles, data-flow
features, context, n-gram, AST shape, protocol state, or semantic features only for a named barrier.
Measure feature growth, collision or cardinality risk, execution cost, and corpus growth.

Do not conclude that a target is healthy from total coverage alone. Track the fraction reaching each
pipeline stage and the last meaningful frontier.

### 7. Maintain corpus and dictionary as source artifacts

- Keep a minimal seed basis that opens distinct syntax, semantic, state, and error features.
- Prefer small seeds that preserve the same useful features and execute faster.
- Sanitize production-derived inputs and retain provenance without storing secrets or personal data.
- Keep prior bug, timeout, OOM, and discrepancy reproducers as regression seeds after repair.
- Build dictionaries from actual grammar terminals, magic values, field names, escape forms,
  versions, extensions, and observed comparison constants that are expressible in the input.
- Merge and minimize without dropping semantic or protocol-state distinctions that plain edge
  coverage cannot see.

A large corpus is not evidence of a good campaign; record feature yield, execution cost, and
redundancy.

### 8. Fuzz state, failures, and environment

For streaming inputs, make chunk sizes, empty reads, short reads, EOF placement, and retryable errors
part of the artifact. For serializers and stores, make output capacity, partial writes, and the
N-th allocation or I/O failure input-controlled.

Represent a stateful target as an operation or message sequence. Mutate operations and payloads
separately with insert, delete, duplicate, reorder, replay, reconnect, and fault-schedule changes.
Seed legitimate paths that reach authenticated or transaction states without embedding real
credentials.

Prefer explicit stable state identifiers. If state feedback is inferred from memory or responses,
normalize addresses, timestamps, padding, transient buffers, and other high-cardinality noise.

### 9. Split sanitizer and assertion lanes by purpose

Keep a fast coverage lane separate from address and leak, undefined and integer, uninitialized-read,
race, and assertion-heavy lanes when tool compatibility or cost differs. Use fail-fast behavior after
undefined behavior so later symptoms from corrupted state are not treated as independent defects.

Do not claim that a generic undefined-behavior bundle covers implicit truncation, sign changes, or
every intentional-looking unsigned overflow. Scope integer checks explicitly and suppress only
proven intentional operations. Use expensive origin tracking or race exploration on minimized or
high-value stateful inputs when full-campaign cost would destroy useful execution volume.

Assertions should monitor internal preconditions, postconditions, ownership, lock state, progress,
and state integrity after external input has been validated. Malformed input should follow its
specified rejection path rather than becoming an assertion crash.

Replay artifacts against a production-equivalent build when fuzz-friendly compilation bypasses or
fixes checksums, compression, randomness, signatures, or other reachability barriers.

### 10. Diversify campaigns by hypothesis

Do not duplicate one configuration across every worker. Assign bounded roles such as raw bytes,
structure-aware mutation, compare barriers, rare paths, state sequences, sanitizer replay, or
directed frontier work. Merge useful corpus artifacts through an owned process.

Treat specific fuzzer flags, power schedules, mutators, and instrumentation modes as versioned
tool configuration, not timeless skill rules. Refresh them from the pinned tool's official source.

### 11. Diagnose a coverage plateau

Find the last reached meaningful stage and classify the next barrier:

- validation or magic barrier;
- comparison barrier;
- structural dependency barrier;
- compression, encryption, or signature barrier;
- state-sequence barrier;
- environment or fault barrier;
- uninstrumented code or feature collision;
- per-iteration overhead or resource barrier;
- queue-energy starvation; or
- genuinely unreachable or dead code.

Choose the smallest matching correction: seed, dictionary, compare feedback, custom mutator,
repair lane, inner target, sequence model, injectable adapter, instrumentation repair, or dead-code
decision. More CPU is not a diagnosis.

### 12. Make artifacts independently reproducible

Record target identity, binary and symbol hashes, compiler and linker, flags, sanitizer and fuzzer
options, seed, limits, libraries, platform and architecture, input bytes, structured decoding
version, environment and fault schedule, expected failure class, and minimization state. Reproduce
from a clean process before claiming a product defect.

Replay repeatedly before minimization and classify the event as deterministic, probabilistic, or
multimodal. Symbolize before deduplication. Build a stable crash key from failure class, sanitizer
kind and access type, property identifier, earliest divergence checkpoint, and a small set of stable
application frames after removing runtime noise.

Do not invent replay counts, failure-rate thresholds, or statistical acceptance rules. Use a
repository-owned versioned flaky policy when one exists; otherwise preserve the observed
distribution as triage evidence and keep the artifact out of deterministic merge gates.

Separate trigger, detection point, and root cause. A sanitizer's top frame is evidence of detection,
not proof of the earliest contract violation.

Minimize input, operation sequence, chunk schedule, options, and environmental facts while
preserving the exact normalized failure predicate. Alternate byte reduction with semantic shrinking
when either alone loses structure or byte-level noise. For flaky failures, shrink the full failure
tuple including thread count, schedule or fault seed, yield points, response ordering, and repetition
count. Separate non-reproducible artifacts, harness failures, target defects, specification
discrepancies, duplicates, unsupported inputs, and timeout, OOM, stack, leak, or complexity events.

Prove a root-cause fix with the original artifact, minimized artifact, nearby variants, applicable
sanitizer lanes, and related properties. Use a bounded negative control or mutation when practical:
reintroducing the repaired invariant violation should make the regression fail.

Enable detailed traces only in replay or triage mode; avoid high-volume logs in the hot loop.

### 13. Keep campaigns and CI assets from rotting

Build targets with ordinary project checks when configured. Replay seed and regression corpora in a
bounded deterministic test path with applicable sanitizers or assertions. Keep dictionaries,
schemas, custom mutators, and artifact decoders versioned beside their targets.

Run CI in evidence order: explicit semantic regressions, bounded seed or regression corpus replay,
then new mutation if budget remains. Use PR campaigns for changed code and fast replay, periodic
batch campaigns to grow the coverage corpus, and slower sanitizer, stateful, or cross-platform lanes
on a deeper cadence.

Keep four asset classes physically and logically separate:

- a small reviewed seed set;
- an evolving instrumentation-dependent coverage corpus;
- original untriaged crash, timeout, OOM, or discrepancy artifacts; and
- minimized, explained semantic regressions with stable property identifiers.

Version the harness decoder and corpus schema. Stage and validate corpus merges before atomic
promotion; retain the previous snapshot for rollback. Do not let different engines write one shared
directory concurrently, and do not let coverage minimization delete semantic regressions it cannot
observe. Isolate flaky artifacts in a measured reproduction lane rather than deleting them or making
the main gate noisy.

Do not equate a short corpus replay with a completed fuzz campaign. Report bounded smoke, historical
regression replay, current coverage evidence, and long-running campaign state separately.

### 14. Verify and report within command authority

Use only configured oneshot intents. Do not launch a watcher, server, background fuzzer, distributed
worker, or unbounded loop merely because the harness exists. When a sanitizer build, fuzz smoke,
corpus replay, coverage report, or artifact reproducer is missing from the command contract, report
the manual evidence gap and keep other validation honest.

<!-- mustflow-section: postconditions -->
## Postconditions

- Each target owns a narrow stage and at least one oracle beyond coverage.
- Iterations are deterministic or their remaining nondeterminism is measured and reported.
- Reset, cleanup, state, environment, and fault injection have explicit ownership.
- Raw and structure-preserving lanes cover both malformed boundaries and deep behavior.
- Instrumentation and feedback include the actual target code and have bounded cardinality.
- Corpus, dictionary, regression seeds, and artifacts have provenance, minimization, and privacy
  policies.
- Property-based entropy, semantic result envelopes, property identifiers, divergence checkpoints,
  crash keys, and exact minimization predicates are deterministic and versioned where applicable.
- Seed, coverage, crash, and semantic-regression assets are separated, and CI cadence distinguishes
  replay, short mutation, batch growth, and deeper sanitizer or stateful campaigns.
- Stateful or streaming artifacts contain the sequence, chunk, environment, and fault facts needed
  for independent reproduction.
- Runtime evidence distinguishes bounded replay, active campaign, coverage, sanitizer, semantic,
  differential, and resource-oracle results.

<!-- mustflow-section: verification -->
## Verification

- Inspect changed files with `changes_status` and `changes_diff_summary` when configured.
- Use `lint` and `build` for harness source, instrumentation, sanitizer, or generated input code.
- Prefer `test_related`; use `test` for shared target infrastructure and `test_audit` when test
  selection or coverage claims need evidence.
- Use `docs_validate_fast` for changed guidance, `test_release` for packaged harness or template
  surfaces, and `mustflow_check` for Mustflow documents or contracts.
- Record missing fuzz smoke, sanitizer, corpus replay, coverage, artifact replay, or long-running
  campaign intents instead of inventing raw commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If an artifact does not reproduce in a clean process, inspect reset, global state, threads,
  environment, build identity, and prior-input dependency before changing target code.
- If most inputs die at one validation gate, keep the outer target and add the narrowest seed,
  dictionary, repair lane, or inner target needed to test the next stage.
- If coverage grows only in harness or dependency code, repair instrumentation ownership before
  tuning schedules.
- If a structured mutator starves malformed handling, retain or restore a raw-byte lane.
- If raw mutation cannot preserve framing long enough to reach semantics, add a bounded structured or
  repair lane without disabling outer validation.
- If corpus minimization drops semantic or protocol-state diversity, include the missing stable
  feature in the minimization contract.
- If fuzz execution is unconfigured, long-running, networked, destructive, credentialed, or targets
  an unowned system, stop at code review, bounded fixtures, and a manual campaign plan.
- If a discrepancy lies in unspecified behavior, retain it as a discrepancy candidate and require a
  specification or product decision before calling it a defect.

<!-- mustflow-section: output-format -->
## Output Format

- Fuzzing claim and target matrix
- Harness determinism, reset, environment, and cleanup decisions
- Oracle classes and resource budgets
- Input lanes, corpus, dictionary, and mutator decisions
- Instrumentation and feedback boundary
- Stateful, streaming, fault-injection, and campaign-diversity decisions
- Artifact reproduction and triage result
- Differential or metamorphic outcome envelope, property identifier, exact failure predicate, and
  trigger, detection-point, and root-cause decision
- Sanitizer-lane and CI asset-lifecycle decisions
- Files changed
- Configured command intents run
- Missing or skipped fuzz, sanitizer, coverage, replay, and long-running evidence
- Remaining harness, target, corpus, privacy, nondeterminism, and campaign risk
