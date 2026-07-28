---
mustflow_doc: skill.reader-centered-technical-content
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: reader-centered-technical-content
description: Apply this skill when planning, writing, restructuring, or reviewing project introductions, feature explanations, technical case studies, engineering retrospectives, build stories, launch posts, portfolio narratives, or product-education copy that must translate maker activity, implementation detail, or debugging experience into a reader's concrete situation, net benefit, credible evidence, limits, and next action.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.reader-centered-technical-content
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Reader-Centered Technical Content

<!-- mustflow-section: purpose -->
## Purpose

Turn product features, project work, engineering decisions, and debugging experience into useful
content organized around the reader's situation and decision. Preserve the evidence, constraints,
failed hypotheses, tradeoffs, and uncertainty that let a reader judge or reuse the result.

<!-- mustflow-section: use-when -->
## Use When

- A project introduction, launch post, portfolio entry, feature explanation, technical case study,
  engineering retrospective, incident lesson, build story, or product-education draft is created or
  substantially restructured.
- A draft leads with the maker's chronology, effort, stack, features, or praise and needs to lead
  with the reader's problem, avoided work, avoided loss, or changed next action.
- Technical metrics or capabilities need translation into workflow changes, review burden, waiting,
  interruption, failure prevention, or operating cost without inventing benefits.
- Development mistakes or debugging work need conversion into reusable diagnosis, decision, and
  prevention guidance instead of a diary or victory story.
- A reader-centered audit is requested before publishing technical or product content.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main task is search traffic, ad-supported article structure, ranking freshness, or ad layout;
  use `search-ad-content-authoring` first and this skill only for the reader-value layer.
- The task is a repository `README.md`; use `readme-authoring` and `readme-evidence-gate` first.
- Facts and structure are already settled and only sentence rhythm or reusable expressions need
  polish; use `writing-elegance`.
- The task is ordinary technical documentation, API reference, release notes, incident response, or
  a live debugging investigation whose owning procedure is more specific.
- The content would require fabricated users, quotes, measurements, failures, savings, or production
  experience to become persuasive.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Content surface, publishing channel, intended reader, and the decision or next action the content
  should enable.
- Reader situation: triggering moment, current workaround, repeated action, hidden loss, failed
  attempt, switching cost, and exclusion boundary when known.
- Product or project evidence: actual capability, before and after state, measurement conditions,
  screenshots or examples, constraints, tradeoffs, failure cases, and verification method.
- For engineering stories: reproduction conditions, rejected hypotheses and their evidence, root
  cause confidence, chosen and rejected options, prevention mechanism, and diagnostic order.
- Any claims that are current, numeric, regulated, security-sensitive, or externally sourced, plus
  the owning verification or freshness procedure.
- Relevant command-intent entries when repository files change.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The reader, surface, and intended decision are specific enough to distinguish a useful scene from
  a generic persona such as "busy professionals" or "all creators."
- Claims can be tied to supplied or repository-supported evidence, or explicitly marked as
  hypotheses, examples, or unknowns.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or revise titles, openings, outlines, paragraphs, evidence blocks, comparisons, limitations,
  calls to action, and channel-specific variants for the selected content.
- Reorder maker chronology into reader decision order and cut implementation detail that does not
  help the reader identify, trust, evaluate, or act on the result.
- Preserve technical identifiers, measurements, commands, and factual boundaries unless the owning
  skill and evidence support changing them.
- Do not invent ROI, time saved, accuracy, user behavior, operational impact, root cause, or customer
  quotes. Do not convert a possible benefit into a universal promise.
- Do not hide setup, migration, learning, review, privacy, money, reliability, or organizational cost
  merely to improve conversion.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the reader's decision. State what the reader should be able to recognize, compare, try,
   avoid, or decide after reading. If no decision exists, narrow the content before polishing it.
2. Build a reader-situation ledger:
   - triggering moment and visible object or action;
   - current workaround or failed attempt;
   - repeated nuisance, waiting, interruption, rework, risk, embarrassment, or avoided loss;
   - transition cost and the next action after receiving value;
   - people for whom the offer or lesson does not fit.
3. Build an evidence ledger. Separate observed facts, measured comparisons, reproduced causes,
   plausible inferences, and unknowns. Keep each important claim next to the evidence and limitation
   that lets a skeptical reader judge it.
4. Translate capability into net benefit through a complete chain:
   `capability -> removed or reduced action -> changed workflow -> avoided cost or enabled outcome -> next action`.
   Stop at the last supported link. Subtract setup, learning, migration, waiting, review, error, and
   switching cost rather than presenting gross benefit as net benefit.
5. Translate technical measures into reader-verifiable consequences. Explain latency as avoided
   waiting or context switching, accuracy as review or rework remaining, automation as the points
   where a person still intervenes, integration as transfers or logins removed, reliability as what
   survives failure, and security as access, traceability, or loss containment. Keep the original
   metric and measurement conditions when they matter.
6. Choose an opening scene, not a demographic label. Prefer a specific moment, workaround, object,
   quiet failure signal, contradictory state, or familiar inner sentence. Do not manufacture shame,
   fear, or fake urgency.
7. Order the content by reader questions: `Is this my problem?`, `What changes?`, `How does it work?`,
   `Why should I believe it?`, `What will it cost or fail at?`, and `What can I do next?`. Maker
   chronology may appear later as supporting evidence.
8. For project and feature content, show the result before explaining the build. Use a real example,
   before-and-after artifact, screenshot, demo, or bounded measurement when available. Describe the
   strongest tradeoff instead of stacking generic adjectives.
9. For engineering and debugging stories, write the diagnostic value:
   - failure conditions and smallest useful reproduction before the final patch;
   - the mistaken assumption or hypothesis, the observation that rejected it, and the evidence for
     the accepted cause;
   - rejected options and the condition that made the chosen option less harmful;
   - before and after measurements under the same conditions;
   - prevention through tests, validation, observability, or workflow changes;
   - the first checks the next person should perform.
10. Distinguish disappearance from addition. Prefer the work, wait, risk, or workaround that no
    longer remains over a list of new features. For AI-assisted outcomes, state the human review,
    provenance, editability, and worst ordinary result needed for the reader to trust and own the
    output.
11. Make competence inferable. Show constraints, decisions, verification, rejected alternatives,
    maintenance reduction, and the boundary between the author's contribution and tools or prior
    work. Do not use effort, code volume, development time, praise, or borrowed authority as proof.
12. Adapt the packaging to the channel. A project name may belong after the reader outcome in an
    unfamiliar audience, while a known repository or release surface may require the exact name
    first. Create title, opening, image, and excerpt variants when audiences have materially
    different reasons to care; do not change the factual promise between variants.
13. End with one small next action or a concrete changed future action. Do not end with maker
    gratitude, vague ambition, or simultaneous demands to buy, subscribe, comment, and share.
14. Run the reader audit:
    - Does the first screen contain a recognizable situation and supported benefit?
    - Would the piece still matter with the maker and project names hidden?
    - Does every paragraph answer a reader question?
    - Are evidence and limitations adjacent to the claims they qualify?
    - Are costs, exclusions, worst ordinary behavior, and human review visible?
    - Can the reader state the next action without guessing?
15. Run the narrowest configured verification covering changed docs, content, templates, package
    surfaces, and mustflow contracts.

<!-- mustflow-section: postconditions -->
## Postconditions

- The content begins from a recognizable reader situation or decision rather than maker effort.
- Benefits are expressed as supported net workflow change, avoided loss, or enabled next action.
- Technical stories preserve reproduction, hypothesis rejection, cause confidence, tradeoffs,
  comparable evidence, prevention, and a reusable diagnostic order when those facts exist.
- Costs, exclusions, uncertainty, contribution boundaries, and verification remain visible.
- Search, README, documentation, release, incident, and style-only responsibilities stay with their
  owning skills.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the owning content, docs, source-freshness, numeric, security, or repository verification intent
when the claims depend on those surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the reader or next decision is unknown, return the missing decision boundary instead of writing
  generic copy for everyone.
- If benefit evidence is absent, describe the capability and testable hypothesis without inventing
  time, money, accuracy, adoption, or emotional outcomes.
- If the root cause was not established, label the workaround and unresolved cause separately; do
  not publish accidental recovery as diagnosis.
- If before and after conditions differ, report the measurements separately and remove the causal or
  percentage comparison.
- If a limitation makes the claimed benefit negative for the target reader, narrow the audience,
  change the claim, or reject the content premise.
- If channel optimization would hide costs, distort evidence, or alter the promise, preserve the
  factual contract and report the packaging tradeoff.
- If a current or high-stakes claim cannot be verified, omit, qualify, or route it through the
  relevant freshness, numeric, security, legal, or domain procedure.

<!-- mustflow-section: output-format -->
## Output Format

- Content surface, channel, reader situation, and intended decision
- Current workaround, removed work, net benefit, transition cost, exclusion boundary, and next action
- Evidence ledger, limitations, tradeoff, contribution boundary, and claim changes
- Engineering-story reproduction, rejected hypotheses, cause confidence, prevention, and diagnostic
  order when applicable
- Title, opening, outline, evidence placement, ending, and channel variants changed
- Files changed
- Command intents run and skipped checks
- Remaining reader-value, evidence, or publication risk
