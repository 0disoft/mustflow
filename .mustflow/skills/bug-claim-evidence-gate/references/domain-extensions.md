# Domain Extensions

Read only the sections that match the candidate. These rules extend the core gate; they do not
replace obligation, witness, scope, reachability, attribution, or deduplication checks.

## Security and privacy

Distinguish a confirmed security-policy defect from a currently exploitable vulnerability. Confirm
the policy defect with a finite executable or mechanical witness when safe. Claim exploitability
only after establishing attacker capability, supported reachability, attacker influence over the
security-sensitive operation, relevant defenses, and an unauthorized outcome.

Source-to-sink proximity alone is insufficient. Do not upgrade a memory-safety issue to code
execution, or an authorization concern to cross-tenant disclosure, without the missing path. Keep
intrinsic product behavior separate from deployment exposure and compensating controls.

## Data integrity and side effects

Model state as more than the database. Include external side-effect history, message history,
authorization state, durable retries, and user-observable output when they affect the invariant.

A finite supported trace that violates an explicit or necessary invariant can confirm a bug before
a production incident occurs. A compensation is adequate only when its trigger is durable, retries
are persistent and idempotent, poison cases remain inspectable, the deadline is bounded, and the
compensation does not create a second violation.

## Nondeterminism and concurrency

Do not merge different failure signatures into one flaky rate. Prefer deterministic replay, a
high-specificity trace, a mechanically checked interleaving, or a predeclared statistical plan.
Never choose a universal run count or probability threshold inside this skill; use the selected
system's declared reliability policy.

A race detector can confirm a data race without proving every downstream impact. A model-described
interleaving without an executable or mechanical witness remains a risk. One passing rerun does not
close a nondeterministic finding.

## Invalid, unsupported, and hostile input

Separate the semantic success domain from the boundary safety domain. Unsupported input need not
succeed, but a public or untrusted boundary must fail in a bounded safe way when a binding safety
rule requires it.

Unsupported input does not excuse process-wide crash, undefined behavior, corruption, secret
disclosure, privilege escalation, partial durable side effects, or unbounded resource consumption.
Treat an input as supported only with applicable evidence such as an official client, maintained
upstream specification, compatibility promise, or the system's own persisted data. Telemetry alone
shows demand, not a support contract.

## Resource and performance claims

Complexity or allocation shape alone is not a performance bug. Tie the supported trigger to an
applicable SLO, resource limit, availability invariant, or bounded safety requirement. Otherwise
classify it as a risk, smell, or improvement with the missing workload and limit evidence.
