# Claim Classification

Use these axes independently. Do not collapse them into one label or infer one axis from another.

## Core axes

| Axis | Values | Decision boundary |
| --- | --- | --- |
| Claim kind | `bug`, `risk`, `code_smell`, `improvement` | What is being claimed now |
| Proof state | `confirmed`, `incomplete`, `disproved`, `blocked` | Whether the claim passed its evidence gate |
| Temporal relation | `introduced`, `regression`, `pre_existing`, `unknown`, `not_applicable` | Relationship to the relevant change or baseline |
| Scope | `in_scope`, `affected_dependency`, `out_of_scope`, `critical_out_of_scope` | Relationship to the frozen claim scope |
| Responsible domain | `product`, `test_oracle`, `test_harness`, `fixture`, `platform`, `toolchain_ci`, `external`, `unknown` | System that owns the divergence |
| Obligation kind | `explicit_contract`, `compatibility_contract`, `security_policy`, `data_invariant`, `language_runtime_rule`, `boundary_safety_rule`, `operational_slo` | Rule used to judge the result |

Classify a `bug` only when a binding or necessary obligation, supported trigger, current witness,
reachability, violation, and target attribution are all established. Classify a `risk` when a
realistic causal path exists but at least one of those gates remains open. Classify a `code_smell`
when no current obligation violation is established but the structure raises maintenance or future
defect cost. Classify an `improvement` when current behavior is allowed and the proposal serves a
non-required objective.

`code_smell` and `improvement` are not lifecycle states. A smell can motivate an improvement, but
neither label automatically turns into the other.

## Evidence and confidence

Use categorical evidence grades only as summaries of named evidence:

- `E0`: model assertion, generic pattern, or unsupported possibility.
- `E1`: concrete path with a material obligation, reachability, or precondition gap.
- `E2`: current-revision focused witness or complete mechanical proof tied to an applicable
  obligation.
- `E3`: E2 plus an independent corroborator, controlled baseline, or documented counterevidence
  review.

Assess three confidence axes separately:

- existence: confidence that the prohibited behavior occurs;
- causality: confidence in the named causal mechanism or fix unit;
- closure: confidence that the original prohibited behavior no longer occurs under its declared
  trigger and oracle.

Do not convert confidence to invented percentages. A production incident may establish existence
while leaving causality open. High causal confidence does not prove that the claimed impact exists.

## Impact and action

Keep these separate:

- severity: impact if triggered;
- likelihood: frequency of the trigger in supported conditions;
- investigation priority: urgency of resolving evidence or cause gaps;
- remediation priority: urgency of changing the responsible system after the fix unit is known;
- release disposition: policy decision derived from validated fields.

An uncertain catastrophic risk can require immediate investigation while remediation remains
blocked. A certain minor bug can remain low priority. Do not let a model-supplied priority or
severity bypass missing evidence.

## Regression

Assign `regression` only when the same applicable contract is compared and at least one holds:

- the same-environment baseline passes while the current revision fails;
- trustworthy evidence identifies a first-failing version;
- a binding compatibility promise establishes that the removed behavior was supported.

If baseline and current revision both fail, classify the bug as pre-existing or keep the temporal
relation unknown. File presence, blame, stack position, and proximity to the diff do not prove
regression causality.

## Scope and responsibility

Scope does not erase claim kind. A confirmed bug may be out of the current change scope. Route a
critical out-of-scope claim without counting it as a current-change finding.

Separate trigger domain from responsible domain. A test may trigger a product defect; a product
input may expose a test-oracle defect; an environment may reveal rather than own a bug.
