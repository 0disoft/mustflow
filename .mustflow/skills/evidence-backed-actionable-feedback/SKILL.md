---
mustflow_doc: skill.evidence-backed-actionable-feedback
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: evidence-backed-actionable-feedback
description: Apply this skill when a PRD, requirement, proposal, policy, operating procedure, game rule, system design, API contract, data model, code-change plan, review comment, decision memo, or agent answer needs consequence-driven critique that replaces vague praise, hedging, false balance, abstract adjectives, or unactionable criticism with an evidence-backed judgment, plausible competing readings, the first divergent decision, a concrete failure and late-discovery path, calibrated severity, a bounded correction, and an observable completion criterion.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.evidence-backed-actionable-feedback
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Evidence-Backed Actionable Feedback

<!-- mustflow-section: purpose -->
## Purpose

Turn vague or diplomatic-sounding feedback into a decision-ready review. Each material finding must
state a judgment, point to observable evidence, show the realistic misreading or wrong action that
follows, prescribe the smallest sufficient correction, and define how a reviewer can tell that the
correction is complete.

This skill improves the decision contract of feedback. It does not demand hostility, pretend to read
the author's mind, or turn every wording preference into a defect.

<!-- mustflow-section: use-when -->
## Use When

- A user asks for concrete, actionable, evidence-backed, candid, direct, or decision-ready feedback.
- Existing feedback relies on phrases such as `unclear`, `weak`, `complex`, `needs detail`,
  `consider improving`, `both options have merit`, or generic praise without locating the defect.
- A review must explain how a document, design, plan, product flow, requirement, report, proposal,
  or answer can be misread and what action that misreading causes.
- Review comments need severity, confidence, correction cost, required versus recommended status,
  ownership, completion criteria, or downstream cost separated instead of blended into one opinion.
- Another review skill has already found a domain defect and the remaining task is to express that
  finding as bounded, falsifiable, usable feedback.
- A user supplies outside advice about feedback quality and asks to adapt the durable procedure into
  a mustflow skill.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The primary task is discovering code defects. Use `code-review`, the matching domain review, and
  `bug-claim-evidence-gate`; use this skill only when the findings also need actionable wording.
- The task is documentation prose cleanup, translationese removal, or AI-slop cleanup with no review
  decision. Use `docs-prose-review`.
- The task is only graceful wording after the facts and decisions are settled. Use
  `writing-elegance`.
- The task is drafting an implementation assignment, work order, or agent prompt rather than giving
  feedback on an artifact. Use `task-instruction-authoring`.
- The user asks for abuse, humiliation, manipulation, invented certainty, or a predetermined verdict
  unsupported by evidence.
- No artifact, statement, behavior, or observation can support a material judgment and the missing
  evidence cannot be obtained within scope.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The artifact, behavior, answer, proposal, or quoted passage being reviewed.
- The decision the feedback should enable and the person or team expected to act on it.
- The author's stated purpose, target reader, requested outcome, or success criterion when available.
- Concrete evidence locations such as a section, sentence, field, screen, state, diff, test, log,
  metric, or observed user action.
- Known constraints, non-goals, scope limits, and parts that should remain unchanged.
- Available exposure and cost evidence: affected actors, frequency, likelihood, repeated work,
  operational events, downstream dependencies, reversibility, or support burden.
- Higher-authority domain findings and verification evidence when another review skill owns defect
  discovery.
- Document stage and decision horizon: idea, discovery, implementation-ready contract, rollout plan,
  or operating procedure; which decisions must be fixed now and which details can safely remain open.
- Contract ledger when relevant: actor, trigger, input, decision rule, state transition, durable
  result, failure preservation, cancellation, retry, duplicate and ordering behavior, final owner,
  completion evidence, and invariants.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Facts, observed effects, stated intent, inferred intent, and reviewer preference can be kept
  separate.
- The requested feedback can remain within the user's scope and does not require invented evidence.
- Repository instructions and the command contract have been checked before editing repository
  artifacts.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or revise review comments, decision memos, issue findings, feedback sections, replacement
  wording, bounded correction plans, acceptance criteria, and directly synchronized tests or
  templates when the user requested repository changes.
- Edit the reviewed artifact only when the user also asked to apply the feedback.
- Keep corrections inside the named finding and explicitly preserve unaffected sections or behavior.
- Do not implement product, code, policy, schema, migration, release, or deployment changes merely
  because the feedback recommends them.
- Do not invent intent, user research, frequency, monetary loss, confidence, or consensus.

<!-- mustflow-section: severity-contract -->
## Severity Contract

- Use `BLOCKER` only when two incompatible implementations are both justified, a required state,
  calculation, ownership, failure, money, permission, security, privacy, or durable-data contract is
  absent, a relied-on uniqueness or ordering invariant is unenforced, or two rules cannot both hold.
  State the stop condition and the evidence required to resume.
- Use `MAJOR` when a realistic reading difference reaches integration or operation as substantial
  rework, or when ownership, priority, cancellation, retry, duplicate, partial-failure, or observable
  success behavior is missing but a coherent bounded correction exists.
- Use `MINOR` when reasonable readers converge on the same behavior and the defect only slows local
  comprehension or review. Do not inflate wording friction into architecture failure.
- Keep severity separate from confidence, correction cost, and priority. If the failure chain cannot
  be shown, treat the observation as preference or missing evidence rather than a structural defect.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the decision. Identify whether the receiver needs to approve, reject, revise, redesign,
   prioritize, investigate, or choose between alternatives. Do not start with throat-clearing praise.
2. Separate intent from result. Record the author's stated goal and the result produced by the
   current artifact. If intent is inferred, label it as a hypothesis and name the evidence and the
   condition that would disprove it.
3. Lead with a bounded judgment. Use a state such as `pass`, `needs revision`, `redesign`, `blocked
   on evidence`, or another domain-owned verdict. State the strongest supported reason in the first
   paragraph.
4. Keep one finding to one decision. Split comments that ask the receiver to restructure, clarify,
   reprioritize, and rewrite at once. Order findings by decision impact, not by document position or
   the number of observations collected.
5. Anchor the finding. Use the smallest sufficient location and observable fact: quoted fragment,
   heading, field, screen state, API behavior, test result, log event, or measured path. An adjective
   without a witness is not a finding.
6. Translate the defect into a failure scene. State who encounters it, at what moment, which
   interpretation or action becomes plausible, and how that differs from the intended result.
   Replace `confusing` with the concrete wrong answer, branch, delay, or repeated action.
7. Test competing readings. Write the current plausible reading as A and the intended or safer
   reading as B. Use the artifact's title, body, call to action, defaults, exceptions, examples,
   resource allocation, and success measure to decide which reading the artifact currently supports.
8. Find the first divergent decision. Ask whether two competent, diligent readers can follow the
   artifact and still choose incompatible defaults. Name the exact value, state, calculation,
   priority, owner, transition, or failure rule where their outputs first separate; reject contrived
   readings that no plausible role would choose.
9. Reconstruct only the contracts required by the artifact's current stage. Check actor, trigger,
   input, decision rule, state transition, durable result, failure preservation, cancellation,
   retry, duplicate and ordering behavior, final owner, completion evidence, and invariant where
   omitting that item would invalidate the next stage. Do not demand an operating manual from an
   early idea, but do not let `draft` excuse a missing ownership or feasibility premise.
10. Explain consequence without fear theater. When material, trace `missing or conflicting rule ->
    role-specific default -> divergent artifact or behavior -> first detection point -> work that
    must be discarded, migrated, restored, or repeated`. Continue into operational, time, money,
    data, security, or user consequences only while evidence supports the next link.
11. Distinguish rewrite from redesign. If the intended rule is sound but the artifact does not force
    it, require a contract rewrite. If the intended rules cannot coexist or depend on an unenforced
    premise, require redesign. A later author explanation confirms intent but does not repair text
    that still permits the wrong implementation.
12. Size exposure honestly. Use likelihood, frequency, affected population, work units, and loss per
   event when available. If numbers are unavailable, name observable units such as extra decisions,
   clicks, support cases, retries, review rounds, blocked teams, recovery steps, or migration surfaces.
13. Separate classification axes. Record severity, confidence, correction cost, and priority
    independently. Distinguish `required` from `recommended`; a severe but low-confidence concern may
    require investigation rather than immediate redesign.
14. Prescribe the minimum sufficient correction. Use a terminating verb such as `delete`, `split`,
    `replace`, `move`, `block`, `rewrite`, `verify`, or `rollback`. State what must change, what may
    remain, and who owns the next action when ownership matters.
15. Provide a usable correction at the point of criticism. Supply replacement wording, a corrected
    structure, an exact decision rule, or a minimal example whenever the evidence is sufficient.
    `Clarify this` and `rewrite this section` merely return the work to the receiver.
16. Define completion from the result, not effort. A document finding is complete when independent
    readers derive the required decision; a UI finding when users can choose the next action; a code
    finding when the owning verification proves the behavior and forbidden effects. Avoid completion
    criteria such as `make it clearer` or `improve consistency`.
17. Add a falsification check. Ask what observation would show that the finding or inferred intent
    is wrong. For material ambiguity, compare at least two plausible readers, implementers, or
    downstream consumers and check whether they independently reach the same answer.
18. Control tone through precision. Remove generic praise, praise-sandwich openings, false balance,
    and `may want to consider` hedging when evidence supports a decision. Preserve uncertainty where
    evidence is incomplete, and criticize the artifact and consequence rather than the author's
    character.
19. Run the omission check. For each material finding, confirm the output contains: judgment,
    evidence, plausible misread or failure action, intent conflict, consequence when material,
    correction, preserved scope, completion criterion, confidence, and next owner or stop state.

<!-- mustflow-section: postconditions -->
## Postconditions

- The opening states a bounded verdict and strongest supported reason.
- Each material finding contains one decision, a concrete evidence anchor, a realistic misreading or
  wrong action, a bounded correction, preserved scope, and an observable completion criterion.
- Facts, stated intent, inferred intent, severity, confidence, correction cost, and priority remain
  distinct.
- Each structural finding identifies the first divergent decision, plausible role-specific outputs,
  first detection point, resulting rework or recovery, and whether the remedy is rewrite or redesign.
- `BLOCKER`, `MAJOR`, and `MINOR` follow consequence and stage evidence rather than emotional tone or
  a requested finding count.
- Generic praise, false balance, abstract adjectives, and unsupported consequence claims do not
  substitute for evidence.
- Required actions, recommendations, owners, unresolved evidence, and stop states are explicit.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when repository files change and the intents are available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the owning domain skill's configured verification for the underlying defect. This skill verifies
feedback structure and evidence discipline; it does not independently prove code, security, product,
or production behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If evidence supports concern but not a verdict, return `blocked on evidence` or a bounded risk and
  name the exact observation needed next.
- If the author's intent is unknown, judge the observable result and present intent as a conditional
  hypothesis rather than psychologizing.
- If the author later confirms an intent, update the intent classification but keep the finding open
  until the artifact itself forces that intent. Close it only when the explanation proves there was
  no reachable competing reading or the artifact is corrected.
- If the document is early-stage, defer details that cannot invalidate the next decision, but keep
  ownership, feasibility, invariant, money, permission, security, privacy, and durable-data premises
  blocking when downstream work would otherwise start from incompatible assumptions.
- If exposure cannot be quantified, use observable work units and identify the cost bearer; do not
  fabricate percentages, revenue loss, or incident counts.
- If two options remain genuinely tied, name the missing discriminator and the cheapest experiment
  that resolves it instead of manufacturing a compromise.
- If a proposed correction expands beyond the finding, split it into a required local correction and
  a separately justified recommendation.
- If a high-stakes domain finding lacks the owning security, legal, financial, medical, data, or
  operational evidence, route to the relevant qualified review and do not amplify confidence through
  stronger prose.

<!-- mustflow-section: output-format -->
## Output Format

- Verdict and strongest reason
- Decision owner and intended outcome
- Findings ordered by `BLOCKER`, `MAJOR`, and `MINOR`, then by decision impact
- For each finding: evidence location, observed fact, plausible reading or wrong action, intent
  conflict, first divergent decision, role-specific outputs, first detection point, rework or
  recovery consequence, rewrite-or-redesign classification, severity, confidence, correction cost,
  priority, required or recommended status, minimum correction, preserved scope, completion
  criterion, and owner
- Replacement wording, structure, or decision rule when evidence permits
- Falsification condition and missing evidence
- Commands run, skipped checks, and remaining risk when repository files changed
