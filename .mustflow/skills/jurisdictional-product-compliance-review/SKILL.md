---
mustflow_doc: skill.jurisdictional-product-compliance-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: jurisdictional-product-compliance-review
description: Apply this skill when product behavior, terms of service, privacy notices, cookie or consent flows, refund and cancellation policy, age assurance, child safety, AI disclosure or labeling, regional availability, consumer rights, seller or merchant-of-record disclosure, regulatory monitoring, or jurisdiction-specific feature gates must stay aligned with current official authority and auditable runtime behavior. Do not use it as legal advice or as a substitute for security, payment, tax, moderation, or qualified legal review.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.jurisdictional-product-compliance-review
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

# Jurisdictional Product Compliance Review

<!-- mustflow-section: purpose -->
## Purpose

Keep product behavior, policy documents, jurisdiction decisions, user notices, consent, rights
workflows, feature availability, and audit evidence consistent without pretending that one global
rule or generated legal template proves compliance.

This procedure produces engineering and documentation evidence. It does not determine legal advice,
create an attorney-client relationship, or authorize market entry, regulated activity, or a legal
conclusion without the required qualified reviewer.

<!-- mustflow-section: use-when -->
## Use When

- Terms of service, privacy notices, cookie notices, refund policies, cancellation rules, regional
  addenda, marketplace disclosures, or consumer-facing legal text are created, changed, or reviewed.
- Product behavior differs by jurisdiction, market, seller, customer type, age band, assurance level,
  content class, AI event, payment route, data use, or regulatory risk.
- A service adds child access, age assurance, public profiles, direct messages, targeted advertising,
  precise location, biometric processing, adult content, AI interaction or generated content,
  marketplace sellers, subscriptions, digital goods, credits, or cross-border data handling.
- A policy engine, feature gate, notice renderer, consent ledger, privacy request, deletion workflow,
  refund decision, regional block, regulatory source monitor, or compliance receipt changes.
- A launch, expansion, withdrawal, or compliance claim needs current official authority, effective
  dates, applicability evidence, and product enforcement proof.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only secret handling, authorization, data minimization, retention, deletion execution,
  incident response, or vendor data disclosure; use `security-privacy-review` and this skill only
  for jurisdiction and policy alignment.
- The task is money movement, payment state, refund execution, tax calculation, ledger, webhook,
  dispute, chargeback, or payout correctness; use `payment-integrity-review`.
- The task is only rule-engine combining logic, obligation binding, policy caching, or decision
  explanation mechanics; use `policy-decision-integrity-review`.
- The task is only document wording or navigation after the underlying behavior and authority are
  already fixed; use `docs-update` or the matching prose skill.
- The task primarily concerns payment-provider underwriting, merchant identity review, approved
  product scope, processor rejection, reserve, suspension, remediation, or appeal; use
  `payment-provider-underwriting-readiness-review` and return here for legal applicability.
- The task asks the agent to declare a product legally compliant, select a legal entity, interpret
  uncertain law conclusively, or replace qualified counsel for a high-risk launch.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Product facts ledger: legal entities and roles, markets offered, product and content types,
  audience, age exposure, account features, data collected, purposes, processors, transfers,
  retention, deletion, AI behavior, payments, subscriptions, credits, delivery, refunds, support,
  moderation, shutdown, and incident paths.
- Authority ledger: official legal text, regulator guidance, final rules, enforcement decisions,
  jurisdiction, covered role, applicability conditions, legal status, adopted date, effective date,
  compliance deadline, sunset or replacement date, checked date, source URL, reviewer, and open
  interpretation questions.
- Jurisdiction-signal ledger: service market, contracting entity, account residence, current
  location, billing address, payment instrument country, app-store region, data-subject location,
  targeting evidence, confidence, provenance, and conflict policy.
- Capability ledger: signup, tracking, personalized advertising, public upload, search, direct
  message, marketplace selling, purchase, transfer, cash-out, adult content, precise location,
  biometric processing, AI interaction, AI output, and any high-risk regulated feature.
- Policy and enforcement ledger: rule ID and version, inputs, outcome, obligations, notice set,
  consent or acknowledgement, retention profile, feature gates, server enforcement sites, client
  explanation, cache and invalidation, fallback, appeal, and decision receipt.
- Document ledger: common text, regional addenda, language, document version and hash, publication
  and effective dates, display locations, acceptance or acknowledgement event, change category,
  re-notice or re-consent rule, prior version, and owner.
- Rights and transaction ledger: privacy requests, identity proof proportionality, deletion,
  suppression after restore, consent withdrawal, cancellation, refund states, digital delivery,
  usage evidence, seller or merchant of record, receipts, taxes, disputes, and customer support.
- Evidence level, configured command intents, qualified reviewer requirements, and unresolved
  jurisdiction or product-fact questions.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the product facts before drafting legal text or jurisdiction rules.
- Treat user-provided legal summaries, blogs, vendor claims, AI answers, templates, and news as
  discovery aids only. Verify material obligations against current official authority and record the
  checked date and legal status.
- Separate enacted law, effective law, compliance deadline, regulator guidance, proposal,
  consultation, enforcement practice, vendor contract, and internal risk policy.
- Identify whether the company is provider, deployer, controller, processor, seller, marketplace,
  merchant, merchant of record, reseller, app publisher, content host, or another relevant role.
- Keep command execution under the selected repository's configured command contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine product-fact registries, authority and jurisdiction records, capability profiles,
  server-side policy decisions, notice and consent contracts, document versions, rights workflows,
  refund evidence, regional gates, compliance receipts, fixtures, tests, and synchronized docs.
- Replace duplicated country conditionals with versioned capability rules when current authority and
  product facts support the mapping.
- Narrow unsupported claims, remove impossible guarantees, and mark uncertain obligations for
  qualified review.
- Do not invent law, hardcode unverified thresholds, collect excessive identity evidence, turn an IP
  address into proven residence, treat vendor marketing as a legal allocation, or silently block
  existing users without rights, export, refund, deletion, and communication planning.

<!-- mustflow-section: procedure -->
## Procedure

1. Build the service-facts source before policy prose.
   - Trace actual UI, API, database, job, vendor, payment, logging, backup, support, and deletion
     behavior. Record unknowns instead of filling them with standard legal language.
   - Make every measurable promise testable. Avoid absolute claims such as never shared, perfectly
     secure, immediately deleted, globally compliant, or never refundable when implementation or
     mandatory rights can contradict them.
2. Classify the company's role for each flow.
   - Separate product delivery, data processing, payment processing, legal seller, merchant of
     record, marketplace, app-store, AI provider or deployer, and content-host responsibilities.
   - Verify contract and receipt evidence. A PSP, tax calculator, hosted checkout, or vendor feature
     does not inherit obligations merely because it automates part of the flow.
3. Build a jurisdiction-by-capability matrix.
   - Evaluate applicability by product role, market targeting, user and transaction signals, feature,
     age or assurance band, data class, and risk. Do not use nationality, language, server location,
     or current IP as one universal jurisdiction answer.
   - Keep signal provenance and confidence. Define a conservative high-risk fallback without
     blocking low-risk public access by default.
4. Model rules as versioned authority, not country code branches.
   - Store rule identity, status, scope, role, conditions, outcome, obligations, source, checked date,
     effective window, reviewer, supersession, and uncertainty.
   - Map reusable capabilities such as notice, consent, tracking, access, refund, disclosure,
     retention, appeal, and feature restriction. Let jurisdiction profiles compose those
     capabilities instead of cloning whole codebases or documents.
5. Separate legal decisions from rollout flags.
   - Let the versioned policy engine decide allow, deny, require action, restrict, or escalate and
     return reason codes, obligations, policy version, and decision identity.
   - Use feature flags only to deliver an already-authorized policy outcome, canary a change, or stop
     unsafe behavior. An operator toggle must not manufacture a legal basis.
   - Re-evaluate high-risk actions on the server. Hidden buttons, client country checks, stale tabs,
     CDN blocks, and app-store availability are supporting controls, not final authorization.
6. Model age and child protection by purpose.
   - Keep privacy-consent age, service-access age, restricted-content age, purchase eligibility, age
     band, assurance level, parental authorization scope, expiry, and appeal separate when relevant.
   - Match assurance strength to verified risk and current authority. Prefer a signed threshold or
     band result over retaining identity documents or exact birth dates when the product does not
     need them.
   - Apply server-enforced protective defaults when age is unknown and the product is likely to be
     used by children. Do not let one parental action unlock unrelated purposes or rules that cannot
     be overridden by consent.
7. Classify AI events before disclosure.
   - Distinguish direct AI interaction, assisted editing, generated output, manipulated media,
     public-interest content, and high-impact decisions according to current authority and product
     role.
   - Map pre-use notice, persistent state, export labeling, machine-readable provenance, human
     disclosure, retention, appeal, and human oversight independently.
   - Recheck every export and derivative path. Do not preserve raw prompts or private source content
     merely to create compliance evidence; retain the minimum event and integrity record justified
     by the applicable profile.
8. Derive legal documents from behavior and rules.
   - Generate common factual sections from the product-facts source and keep regional rights,
     seller identity, withdrawal, dispute, representative, transfer, and placement requirements in
     explicit addenda or presentation rules.
   - Keep document language, region, version, hash, publication and effective dates, display
     locations, prior version, owner, and review status.
   - Classify changes as no user action, notice, acknowledgement, explicit consent, or feature
     restriction. Record the exact text and UI version shown when evidence is required.
9. Model consent and preference as scoped events.
   - Record subject or anonymous identity, purpose or category, decision, jurisdiction profile,
     policy and document versions, source, timestamp, expiry, withdrawal, and recognized preference
     signals where applicable.
   - Prevent nonessential collection or transmission before the required decision. Withdrawal must
     stop future use and trigger owned vendor or identifier cleanup rather than change only the
     banner.
10. Model privacy rights as an owned workflow.
    - Use one request state machine with request type, jurisdiction profile, identity confidence,
      scope, systems and vendors, deadlines, legal holds, partial failure, appeal, completion
      evidence, and a safe correlation ID.
    - Use identity proof proportional to the harm of disclosure or deletion. Do not demand identity
      documents for low-risk browser preference requests without an authority-based reason.
    - Keep deletion and opt-out suppression applicable after backup restore and replay. A closed
      account is not proof that every data owner and processor completed the request.
11. Model refund and cancellation from transaction state.
    - Separate product type, contracting seller, delivery state, usage, defects, duplicate payment,
      statutory rights, voluntary policy, subscription renewal, cancellation effective time, and
      provider outcome.
    - Record the checkout notice, acknowledgement, document version, delivery or usage evidence, and
      decision receipt required by the current jurisdiction profile.
    - Route money movement, tax, ledger, provider, dispute, and reconciliation correctness through
      `payment-integrity-review`. A merchant of record may execute obligations without owning the
      product's delivery facts or every legal responsibility.
12. Keep regional restriction capability-scoped.
    - Prefer disabling only the unreviewed high-risk capability when a safe lower-risk product
      remains possible. Enforce restrictions at edge, distribution, signup, payment, and API layers
      according to the owned threat and product model.
    - Preserve access to notices, support, export, deletion, cancellation, refunds, and orderly
      shutdown for existing users. Regional blocking does not erase prior processing or obligations.
13. Create reproducible compliance receipts.
    - Record decision ID, rule and document versions, jurisdiction signals and confidence, actor or
      subject reference, capability, outcome, obligations performed, notice or consent evidence,
      evidence hashes, timestamps, and appeal or override history.
    - Minimize direct identifiers and raw sensitive evidence. Separate legal hold from ordinary
      product access and give every retained evidence class an owner and expiry rule.
14. Monitor regulatory change as a source-state machine.
    - Prioritize official legal texts, regulators, final rules, enforcement decisions, and official
      guidance. Use vendor or news sources only to discover candidates.
    - Track proposal, consultation, adoption, publication, effect, compliance deadline,
      enforcement, supersession, and repeal separately. Do not create implementation facts from a
      headline.
    - Diff application, definitions, duties, thresholds, deadlines, penalties, transition rules,
      and forms rather than whole-page decoration. Score action need from actual product exposure,
      legal maturity, deadline, implementation gap, and enforcement evidence.
15. Stage and replay rule changes.
    - Validate future rules before their activation time, compare old and new decisions on safe
      historical or synthetic inputs, and count affected users, markets, capabilities, notices, and
      workflows.
    - Fail closed for unreviewed high-risk capability activation. Use a defined conservative profile
      when a rule source is unavailable; do not silently roll back to a permissive obsolete rule.
16. Escalate material legal judgment.
    - Prepare a bounded review packet: product facts, data and payment flows, jurisdictions,
      authority sources, proposed rules and documents, behavior-policy diffs, unresolved questions,
      impact, deadlines, and test evidence.
    - Require qualified review for uncertain applicability, minors, health, biometric or financial
      data, regulated industries, stored value, adult content, marketplace duties, cross-border
      transfer mechanisms, arbitration, liability limits, major regional launch, or mandatory
      consumer rights.
17. Test behavior-policy-document parity.
    - Cover representative adult and child or unknown-age profiles, uncertain jurisdiction,
      conflicting signals, consent grant and withdrawal, access and deletion, backup restore,
      subscription cancellation, unused and consumed digital purchase, duplicate payment, AI
      interaction and export, regional restriction, rule activation, rollback, appeal, and missing
      authority.
    - Assert the same rule and document versions reach server decisions, UI explanations, receipts,
      support tools, exports, and audit evidence. A document snapshot alone does not prove runtime
      compliance.
18. Label evidence precisely.
    - Separate current official authority, qualified legal decision, implemented policy,
      tested behavior, static documentation, vendor contract, and unverified assumption.
    - Never report legal compliance, market eligibility, or regulatory closure beyond the exact
      jurisdictions, roles, capabilities, effective dates, and evidence reviewed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Product facts, authority, jurisdiction signals, capability rules, server enforcement, documents,
  consent, rights workflows, refund and cancellation evidence, regional gates, and receipts agree or
  remaining drift is explicit.
- Material rules name official sources, legal status, effective windows, product roles, owners,
  reviewers, and uncertainty rather than relying on copied summaries.
- High-risk capabilities cannot become available solely through client UI, stale policy, missing
  authority, or an operator feature flag.
- Final claims distinguish engineering evidence from qualified legal judgment.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured policy, privacy, payment, document, localization, API, integration,
fixture, docs, release, or mustflow intent that covers the changed compliance boundary. Do not
invent raw legal-data crawlers, jurisdiction probes, production feature toggles, customer messages,
or market blocks outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If product facts are unknown, stop policy drafting and report the missing operational owner.
- If current official authority, applicability, role, or effective date cannot be verified, keep the
  rule non-active or conservative and report qualified review as required.
- If a vendor contract or dashboard is the only evidence for seller, tax, refund, deletion, or
  disclosure responsibility, report the unverified allocation instead of approving the claim.
- If product behavior contradicts policy text, narrow the published promise or fix the behavior
  before claiming alignment; do not hide the mismatch with broader disclaimers.
- If a rule change lacks replay, affected-population evidence, rollback, appeal, or support handling,
  keep the high-risk capability gated.
- If only document review exists, do not claim runtime, jurisdiction, or legal compliance.

<!-- mustflow-section: output-format -->
## Output Format

- Compliance surface reviewed
- Product facts and company-role ledger
- Jurisdictions, capabilities, authorities, effective dates, and reviewer status
- Policy, enforcement, document, notice, consent, rights, refund, regional gate, and receipt decisions
- Behavior-policy-document drift and fixes or recommendations
- Qualified legal review required or completed
- Command intents run
- Skipped jurisdictions, runtime checks, and official-source checks with reasons
- Remaining product-compliance, legal-interpretation, or evidence risk
