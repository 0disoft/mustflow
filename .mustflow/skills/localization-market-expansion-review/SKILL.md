---
mustflow_doc: skill.localization-market-expansion-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: localization-market-expansion-review
description: Apply this skill when a product changes single-language versus simultaneous multilingual launch, first-market language selection, staged locale rollout, AI or machine translation followed by human review, exploration versus revenue versus fully supported locales, localized SEO demand, language-specific checkout and trust copy, translation maintenance cost, locale promotion gates, per-locale conversion refunds support or contribution, or claims that multilingual traffic creates profitable market expansion.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.localization-market-expansion-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Localization Market Expansion Review

<!-- mustflow-section: purpose -->
## Purpose

Choose which languages to operate, how deeply to support them, and when to promote them from demand
and retained contribution. Keep the product internationalization-ready without opening more
translation, support, legal, billing, SEO, and release obligations than the team can maintain.

<!-- mustflow-section: use-when -->
## Use When

- A product compares launching in one language with launching in many languages simultaneously.
- A team chooses the first market language, locale rollout order, language count, or promotion gate.
- AI or machine translation is used for landing pages, SEO pages, product UI, onboarding, checkout,
  help, email, support, policy, or store listings with selective human review.
- Languages are classified as exploratory, marketing-only, revenue-ready, fully supported,
  deprecated, frozen, or removed.
- International SEO, localized queries, language URLs, `hreflang`, translated metadata, search
  traffic, signup, payment, refund, support, retention, or per-locale contribution changes.
- A report claims translation volume, localized traffic, country reach, or supported-language count
  creates revenue or efficient global expansion.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is implementation correctness for message catalogs, pluralization, formatting, RTL,
  locale routing, SSR hydration, `hreflang`, exports, or translation keys without a market rollout
  decision; use `frontend-localization-review`.
- The task only edits copy in one known language or translates user-provided prose with no product
  support, SEO, checkout, or market-expansion decision.
- The task only changes regional prices, currencies, tax presentation, or purchasing-power policy;
  use `pricing-model-integrity-review`.
- The task requests jurisdiction-specific legal, privacy, tax, medical, financial, consumer, or
  advertising translation approval. Use qualified native-language reviewers and current authority.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Market ledger: target job, buyer, purchase owner, current customer language, country and script,
  local alternatives, search demand, paid demand, willingness evidence, product fit, support demand,
  regulatory or trust risk, and acquisition channel.
- Locale-state ledger: locale, script, region, stage, supported surfaces, excluded surfaces, launch
  date, owner, glossary, review level, fallback, deprecation, and user-facing disclosure.
- Surface ledger: landing, SEO, product UI, signup, onboarding, pricing, checkout, receipt, refund,
  security, privacy, legal, error, email, notification, help, support, store listing, screenshots,
  exports, and in-product content.
- Translation ledger: source version, locale version, model or vendor, prompt or glossary, machine
  output, reviewer, review sample, risk class, placeholder parity, stale state, and correction path.
- SEO ledger: local query language, intent and terminology research, stable locale URL, translated
  main content, canonical, reciprocal alternate mapping, `x-default`, sitemap or HTML method,
  crawl and index state, and scaled-content risk.
- Economics ledger: incremental nonbrand traffic, qualified visit, download or signup, checkout,
  payment, refund, chargeback, support time, translation and review cost, engineering maintenance,
  content update cost, retained revenue, and contribution by eligible locale cohort.
- Experiment ledger: locale eligibility, assignment or rollout, source-language baseline, country
  and language distinction, exposure, product-language disclosure, horizon, guardrails, and
  promotion or retirement rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate internationalization readiness from languages actively marketed, sold, supported, and
  serviced. Code readiness does not create an operating-language commitment.
- Choose the first language from the fastest credible paying-customer path, not from an assumption
  that English or the founder's language is universally correct.
- Define support depth and human-review requirements before publishing or accepting payment in a
  locale.
- Treat copied language counts, rollout batches, review percentages, contribution multiples,
  traffic lifts, and maintenance budgets as hypotheses, not defaults.
- Refresh current search-engine, store, payment, tax, privacy, accessibility, and jurisdiction
  requirements before launching localized public or transactional surfaces.
- This skill does not authorize bulk translation, index submission, pricing, live campaigns,
  checkout activation, messages, store publication, or production rollout.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine locale stages, market qualification, surface support matrices, translation risk and
  review policy, SEO demand tests, source and locale versioning, promotion and retirement gates,
  economics, events, fixtures, tests, docs, route metadata, and synchronized templates.
- Add explicit handoffs to frontend localization, SEO, product copy, payment, pricing, support,
  privacy, security, accessibility, legal, or native-language review owners.
- Replace language-count goals, traffic-only success, unreviewed transactional copy, silent English
  fallback, or mass translated SEO pages with staged and observable support commitments.
- Do not label a locale fully supported when core UI, support, checkout, policies, or failure
  recovery remain undisclosed in another language.

<!-- mustflow-section: procedure -->
## Procedure

1. Split three decisions: internationalization readiness, marketed or indexed locale, and operational
   support depth. Do not launch every technically possible locale.
2. Choose the first market language from buyer concentration, product fit, payment ability, search or
   direct demand, support feasibility, trust, and speed to paid learning. English is a candidate, not
   a universal first language.
3. Make architecture ready for future locales early where proportionate. Externalize strings and
   account for plural, format, time, currency, expansion, script, font, RTL, route, metadata, and
   export boundaries without translating every surface immediately.
4. Define explicit locale stages. A useful model can distinguish candidate, exploratory,
   revenue-ready, fully supported, frozen, and retired locales, but names and counts are product
   policy rather than universal law.
5. For an exploratory locale, state what is translated and what remains in the source language.
   Use it to measure real demand only when the page gives local users useful, accurate content and a
   truthful path to the actual product.
6. Before accepting payment, require native-capable review for price, CTA, checkout, renewal,
   cancellation, refund, security, privacy, legal claims, onboarding, critical errors, and other
   trust-bearing text according to product risk. Machine output alone is not proof of correct rights.
7. Promote to full support only when product UI, high-frequency help, support ownership, incident
   communication, billing recovery, policy updates, and release maintenance have declared owners.
8. Classify translation by consequence, not only language. High-trust and rights-bearing surfaces
   need stricter review in every public locale; lower-risk long-tail help or marketing drafts may use
   sampled review when current evidence and policy permit it.
9. Treat AI translation as a versioned draft producer. Preserve source version, model or vendor,
   glossary, placeholder rules, reviewer evidence, correction feedback, stale detection, and
   rollback or unpublish behavior.
10. Do not translate keywords literally and call it localization. Research local category names,
    jobs, search intent, alternatives, trust signals, and purchase language before choosing titles,
    metadata, examples, and calls to action.
11. Create stable crawler-visible locale URLs only when the localized main content and user path are
    real. Keep canonical and alternate relationships accurate and route implementation through
    `frontend-localization-review`.
12. Maintain reciprocal locale relationships and one coherent alternate-marking method where the
    current search owner requires it. A tag existing in source does not prove crawl, index, or
    conversion success.
13. Do not mass-publish translated or generated pages whose main purpose is ranking coverage.
    Evaluate unique local usefulness, accuracy, relevance, product availability, and maintenance;
    generation method alone neither guarantees safety nor proves spam.
14. Disclose product-language gaps. Localized acquisition pages must show when the app, support,
    checkout, documentation, or store binary remains available only in another language.
15. Measure the full language funnel. Start with eligible nonbrand demand, then useful visit,
    product start, first owned value, checkout, payment, retained use, refund, support, and
    contribution. Traffic and indexed-page counts are diagnostic, not the headline result.
16. Include recurring maintenance cost. Price source-copy changes, catalog and screenshot updates,
    UI regressions, reviewer availability, customer support, policy changes, store assets, incident
    messages, and stale translation cleanup across the planned horizon.
17. Promote a locale only when expected retained contribution and learning value justify initial and
    recurring obligations under declared uncertainty. Do not embed a universal payback multiple or
    day horizon.
18. Retire or freeze honestly. Preserve customer rights, access, receipts, support and incident
    communication, and state what will stop changing; do not silently fall back after selling a
    supported-language promise.
19. Sequence locale launches so causes remain identifiable. When several locales launch together,
    report aggregate evidence and do not claim which language, channel, or review depth caused the
    result.
20. Promote only a reversible rollout that improves per-eligible-locale contribution while
    preserving accurate high-trust text, product-language disclosure, search value, support,
    accessibility, current authority, and maintainable translation workflow.

<!-- mustflow-section: postconditions -->
## Postconditions

- Internationalization readiness, public locale, revenue readiness, and full support are separate
  observable states.
- The first language and later locale order follow customer and economics evidence rather than a
  fixed English-first or many-language rule.
- AI translation has source, glossary, risk, review, correction, and stale-state controls.
- Localized SEO represents useful maintained content and an honest product path.
- High-trust surfaces receive the required native-capable review before payment or rights change.
- Headline expansion uses retained contribution rather than language count, page count, traffic, or
  translation volume.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and
`mustflow_check`. Do not infer live translation, TMS, browser, crawler, index, payment, support,
campaign, store, analytics, deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If local demand and purchase intent are unknown, keep the locale exploratory and do not claim
  revenue readiness from translated traffic.
- If high-trust review is unavailable, do not accept payment or publish rights-bearing claims in that
  locale; keep the surface clearly limited or unpublished.
- If the localized page promises a product experience that remains undisclosed in another language,
  correct the promise before acquiring more traffic.
- If crawl or traffic evidence exists without checkout, refund, support, and retention evidence,
  report acquisition reach rather than profitable market expansion.
- If translation maintenance ownership is missing, limit the supported surface instead of opening
  another full locale.

<!-- mustflow-section: output-format -->
## Output Format

- First-market language, buyer, job, demand, fit, support, trust, and current authority
- Locale stage, supported and excluded surfaces, product-language disclosure, owner, fallback, and
  retirement
- Translation source, AI or vendor, glossary, consequence class, human review, stale handling, and
  correction
- Local query intent, URL, canonical and alternate mapping, crawl, index, usefulness, and
  scaled-content risk
- Eligible demand, activation, payment, refund, support, maintenance cost, retained contribution,
  rollout decision, files changed, commands run and skipped checks
- Remaining localization-market-expansion risk

