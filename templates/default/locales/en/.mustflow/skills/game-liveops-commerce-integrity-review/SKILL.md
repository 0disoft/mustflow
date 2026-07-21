---
mustflow_doc: skill.game-liveops-commerce-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: game-liveops-commerce-integrity-review
description: Apply this skill when a game changes seasonal battle passes, monthly memberships, live-operations cadence, missions and reward tracks, cosmetic or power goods, convenience and sidegrades, deterministic bundles, paid or free randomized rewards, loot boxes, odds and pity disclosure, duplicate protection, purchase concentration, content-production cost, fairness, player retention, platform review, or regulatory risk and must sustain revenue without creating an unaffordable content treadmill, paid hierarchy, or opaque random-spend system.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.game-liveops-commerce-integrity-review
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

# Game Liveops Commerce Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Choose season, membership, catalog, power, and random-reward policy from sustainable production,
fairness, retained play, and long-horizon contribution. Prevent a small team from financing short-
term revenue with permanent content debt, recurring-value debt, pay-to-win escalation, concentrated
random spend, platform rejection, or regulatory and support burden.

<!-- mustflow-section: use-when -->
## Use When

- A game chooses or changes a seasonal battle pass, free and premium reward track, monthly
  membership, VIP subscription, recurring liveops cadence, mission schedule, or retroactive progress.
- The catalog sells cosmetics, characters, weapons, stats, progression, convenience, sidegrades,
  presets, slots, storage, automation, ad removal, or other gameplay-affecting benefits.
- A product compares deterministic bundles with paid or free randomized rewards, loot boxes, gacha,
  choice packs, duplicate protection, pity, exchange tokens, odds, or spend limits.
- A report compares conversion, payer count, ARPPU, whale concentration, content-production cost,
  balance cost, support, refunds, regulation, retention, fairness, or long-horizon contribution.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is death, revive, lives, energy, natural recovery, refill, rewarded-ad recovery,
  unlimited play, or failure monetization; use `game-economy-monetization-review`.
- The task only changes generic subscription price, annual billing, regional pricing, trial, or
  cancellation; use pricing, payment, and subscription-retention skills.
- The task only changes credit balance rights, virtual-currency expiry, quote, reserve, capture,
  release, reversal, or spend order; use the credit monetization and ledger skills.
- The main risk is cryptographic random generation, draw atomicity, inventory concurrency,
  entitlement delivery, payment callbacks, refunds, fraud, or audit-log tamper resistance. Use the
  matching randomness, transaction, entitlement, payment, and security owners.
- The task requests jurisdiction-specific gambling, consumer, child-safety, tax, accounting, or
  marketing advice. Use current qualified authority; this skill prepares the product evidence.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Team-capacity ledger: available disciplines, person-time, asset pipeline, reuse limits,
  localization, QA, economy balancing, community, support, compliance, release cadence, and buffer.
- Season ledger: duration, tiers, free and paid tracks, price, missions, catch-up, late purchase,
  retroactive grant, asset and currency rewards, production cost, completion, next-season rebate,
  refunds, and content debt.
- Membership ledger: period, ongoing feature and content value, renewal, benefits, device access,
  production and support cost, cancellation, refund, IAP cannibalization, and retained subscribers.
- Catalog ledger: item, deterministic contents, cosmetic visibility, asset lineage, power or
  convenience effect, acquisition path, price, version, obsolescence, balance cost, and content burn.
- Random-reward ledger: free or paid access, direct or virtual-currency consideration, pool, odds,
  rarity, duplicate behavior, pity or guarantee, exchange, history, version, cap, age, geography,
  refund, withdrawal, platform, and jurisdiction evidence.
- Economics ledger: eligible-player conversion, payer count, revenue distribution, net revenue,
  production, platform, support, balance, compliance, refund, dispute, fraud, and variable cost;
  retention, content completion, fairness, and contribution.
- Experiment ledger: pre-offer assignment, season and catalog versions, player and payer strata,
  holdout, traffic, horizon, delayed outcomes, guardrails, and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate cadence product, item type, gameplay power, and reward randomness. A season pass can sell
  deterministic cosmetics; a membership can exist without new monthly assets; randomness is another
  axis.
- Define the team's sustainable production and review capacity before promising a season or recurring
  content cadence.
- Define the highest fair competitive and progression boundary before selling power or convenience.
- Refresh current store, platform, age-rating, odds-disclosure, virtual-currency, refund, child,
  gambling, consumer, and jurisdiction rules before implementing paid random rewards.
- Treat copied season lengths, tier counts, prices, asset counts, renewal rates, production months,
  odds, pity counts, spend caps, and benchmark concentration as hypotheses, not defaults.
- This skill does not authorize live catalog, price, currency, draw, reward, experiment, payment,
  message, release, or production changes.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine season and membership policy, missions and catch-up, catalog classification,
  cosmetic visibility, power and sidegrade limits, deterministic contents, random-reward disclosures,
  pity and duplicates, caps, contribution metrics, experiments, fixtures, tests, docs, route metadata,
  and synchronized templates.
- Replace unsustainable cadence, daily-attendance punishment, permanent paid power, undisclosed
  random contents, opaque virtual-currency cost, or concentrated random-spend optimization with
  bounded, transparent alternatives.
- Do not present a paid random mechanism as safe merely because odds are disclosed, or a cosmetic as
  harmless when it changes visibility, targeting, hitboxes, accessibility, or competitive clarity.

<!-- mustflow-section: procedure -->
## Procedure

1. Split four decisions: recurring cadence, catalog contents, gameplay advantage, and randomness.
   Do not make battle pass, membership, cosmetic, power, bundle, and loot box one binary comparison.
2. Start with production capacity. Price design, art, animation, audio, mission writing, economy,
   localization, QA, release, community, support, and compliance work, including interruption and
   rework. Revenue does not make an impossible calendar sustainable.
3. Treat a season pass as a dated content and progression obligation. Define duration, tiers,
   missions, asset reuse, free track, premium track, completion expectation, late entry, catch-up,
   retroactive rewards, post-season handling, and next-season transition.
4. Derive season length and tier count from player cadence and team throughput. A familiar week count
   or hundred-tier template is not a default. Preserve schedule buffer for defects and unplanned
   liveops work.
5. Avoid attendance punishment. Prefer accumulable or catch-up missions where they fit the loop,
   distinguish engagement from daily coercion, and let late buyers understand and receive already
   earned premium-track value according to the declared contract.
6. Price currency returned by the pass as future liability and cannibalization. Model how many
   players can fund later passes without new cash, what else the currency buys, and whether the
   design creates an indefinite one-purchase entitlement unintentionally.
7. Treat membership as an ongoing-value obligation. Define durable feature value, convenience,
   service, multiplayer, storage, creation, support, ad treatment, or recurring content that exists
   every billing period. Predictable billing is not predictable retention.
8. Compare season and membership economics over the same horizon. Include initial development,
   recurring production, platform fees, refunds, support, cancellation, renewal, IAP displacement,
   content reuse, missed cadence, and retained contribution per eligible player.
9. Prefer membership when ongoing low-marginal-cost value remains useful without a new asset factory;
   prefer seasons when repeat play can support a bounded reward-and-mission cadence. Treat both as
   candidates and allow coexistence only when benefits and obligations do not double-charge value.
10. Classify every catalog item as cosmetic, convenience, sidegrade, progression acceleration,
    direct power, content access, currency, or mixed. Review mixed items by their strongest gameplay
    and legal consequence rather than their marketing label.
11. Make cosmetics visible and valuable without harming play. Identify lobby, profile, social,
    cooperative, replay, photo, emote, entrance, victory, audio, or collection surfaces, while
    preserving readability, accessibility, hitbox, silhouette, team, and competitive clarity.
12. Track asset economics. Record original production cost, skeleton and material reuse, variants,
    exclusivity, resale promises, approval, and expected sales. Reuse should lower cost without
    misrepresenting a trivial recolor as a wholly new premium asset.
13. Preserve the fair ceiling. Avoid paid exclusive maximum power or direct competitive superiority.
    Evaluate sidegrades, presets, storage, queues, respec, convenience, and bounded acceleration by
    whether nonpayers can reach the same fair endpoint and whether seasonal competition resets or
    matchmaking neutralizes the advantage.
14. Price PvE power by content burn and future balance debt. Track skipped mastery, faster completion,
    obsolete encounters, support, inflation, and pressure to sell a stronger successor. Low art cost
    does not make permanent power cheap to operate.
15. Prefer deterministic purchase contents when broad payer trust, understandable value, stable
    conversion, refund simplicity, and low compliance load matter. Show every item, quantity,
    duplicate rule, currency value, time limit, and entitlement before purchase.
16. Treat paid random rewards as a separate high-risk product. Map every way money or purchased
    currency reaches the draw. Record pool, odds, rarity, duplicates, pity, guarantees, exchange,
    history, versions, spend distribution, age, geography, and applicable current authority.
17. Do not infer safety from disclosure. Odds can satisfy one platform requirement while fairness,
    children, consumer vulnerability, price transparency, withdrawal, gambling, and jurisdiction
    issues remain unresolved.
18. Keep competitive power out of paid randomness unless current authority and a separately approved
    fairness contract explicitly support it. Prefer deterministic access, earnable sidegrades, or
    noncompetitive cosmetics when uncertainty would compound pay-to-win harm.
19. Separate free randomness from paid randomness, but inspect indirect consideration. Ads,
    purchased energy, paid keys, premium-only attempts, or currency conversion can make a nominally
    free draw economically connected to payment.
20. If randomness is retained, make draw execution and history auditable. Version odds and pools,
    snapshot eligibility, use authoritative server results, define duplicate and pity transitions,
    preserve user-visible progress, cap retries and spend where required, and route technical
    integrity to transaction and randomness owners.
21. Measure payer distribution, not only averages. Track payer conversion, median and tail spend,
    revenue concentration, repeated purchase, refunds, disputes, support, regret, age and geography,
    item ownership, retained play, and contribution. A few extreme spenders can hide a shrinking
    payer base and material harm.
22. Preserve non-purchase acquisition paths and catalog history. State whether items return, rotate,
    become earnable, remain exclusive, or change strength; do not use fake scarcity or silently
    devalue previously purchased items.
23. Sequence experiments when traffic is limited. Resolve cadence sustainability before tuning
    prices, cosmetic visibility before multiplying assets, and deterministic value before testing
    randomness. Keep mechanics isolated enough to identify the source of lift or harm.
24. Promote only a reversible, versioned commerce policy that improves eligible-player contribution
    without exceeding production capacity, damaging fair play, hiding price or contents, depending
    on harmful spend concentration, or violating current platform and legal authority.

<!-- mustflow-section: postconditions -->
## Postconditions

- Season and membership obligations have explicit production, value, cadence, renewal, and
  cannibalization economics.
- Catalog items have a truthful cosmetic, convenience, sidegrade, acceleration, power, content, or
  currency classification and a fair-ceiling decision.
- Deterministic bundles disclose complete value; paid random rewards have separate authority,
  probability, pity, duplicate, spend, audit, age, geography, and harm evidence.
- Free randomness is checked for indirect paid access rather than assumed outside commerce rules.
- Headline economics include team capacity, content and balance debt, payer distribution, refunds,
  compliance, retained play, fairness, and long-horizon contribution.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer live store, catalog, price, currency, draw, payment, analytics, experiment, release,
deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If sustainable production capacity is unknown, do not promise a fixed recurring content cadence.
- If membership has no ongoing value beyond monthly asset production, compare it as a content
  obligation rather than claiming low-cost recurring revenue.
- If an item changes competitive power but lacks a fair-ceiling contract, keep it out of sale.
- If paid-random authority, odds, pool versions, pity, duplicates, age, or geography cannot be
  reconstructed, stop new paid draws and prefer deterministic sale or non-purchasable rewards.
- If revenue rises only through extreme payer concentration while payer breadth, refunds, support,
  fairness, or retained contribution worsens, reject or narrow the mechanism.

<!-- mustflow-section: output-format -->
## Output Format

- Team capacity, liveops cadence, production buffer, and content obligation
- Season duration, tiers, missions, catch-up, late purchase, rewards, rebate, and economics
- Membership ongoing value, renewal, production, IAP displacement, and contribution
- Catalog classification, cosmetic visibility, asset reuse, fair ceiling, power, and content burn
- Deterministic contents or paid/free randomness, odds, pity, duplicates, cap, age, and geography
- Payer breadth, spend concentration, refunds, support, fairness, retention, and authority evidence
- Files changed
- Command intents run and skipped checks
- Remaining game-liveops commerce risk

