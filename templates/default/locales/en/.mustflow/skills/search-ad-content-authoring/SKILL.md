---
mustflow_doc: skill.search-ad-content-authoring
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: search-ad-content-authoring
description: Apply this skill when planning, writing, editing, or reviewing search-friendly, ad-supported articles, blog posts, guides, reviews, comparisons, FAQs, or evergreen content.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.search-ad-content-authoring
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Search Ad Content Authoring

<!-- mustflow-section: purpose -->
## Purpose

Create useful, readable, search-oriented content that can support advertising layouts without keyword stuffing, thin-content filler, misleading ad placement, or unverifiable ranking and revenue claims.

<!-- mustflow-section: use-when -->
## Use When

- A task asks for a blog post, article, guide, comparison, review, cost breakdown, how-to page, FAQ, glossary entry, or evergreen content intended for search traffic.
- A task mentions search visibility, SEO, featured snippets, Google traffic, AdSense, Ezoic, Raptive, Mediavine, RPM, ad viewability, affiliate content, or monetized content layout.
- A content draft needs paragraph structure, heading hierarchy, table or list placement, FAQ coverage, source use, image placement, internal links, or ad slot layout review.
- A report claims that an article is search-friendly, mobile-readable, ad-friendly, snippet-ready, or aligned with a publisher monetization strategy.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only product UI copy, release notes, README writing, legal policy text, or technical docs with no search or monetization goal; use the narrower writing or documentation skill.
- The task asks to manipulate rankings, hide ads, mislead readers, copy competitor content, generate doorway pages, or maximize ads at the expense of user value.
- Current Google, ad-network, legal, or policy claims are required but cannot be checked; use `source-freshness-check` and keep claims conservative.
- The task only changes ad scripts, consent management, performance code, or analytics implementation without article content; use the relevant frontend, privacy, performance, or dependency skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target reader, search intent, article topic, jurisdiction or market if relevant, and the action the reader should be able to complete after reading.
- Content type: definition, how-to, troubleshooting, comparison, cost guide, review, alternatives, checklist, buying guide, FAQ, or news-style update.
- Known source requirements, freshness needs, original experience, product data, pricing, images, tables, calculators, affiliate disclosures, and monetization constraints.
- Existing content style, heading conventions, article-type defaults, link policy, image policy, accessibility rules, ad layout rules, and performance constraints.
- Title, introduction, conclusion, call-to-action, semantic markup, ad slot, and link constraints when the content will be rendered as a webpage.
- Publishing metadata requirements such as title, summary, search tags, author, published date, updated date, canonical URL, and structured data when the site supports them.
- Relevant command-intent contract entries for status, diff, docs, package, visual, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If the article depends on current facts, prices, policy behavior, product availability, laws, medical, legal, financial, or safety-sensitive claims, also use `source-freshness-check`.
- If the content includes personal data, user submissions, health, finance, legal, minors, consent, tracking, affiliate disclosure, or ad personalization concerns, also use `security-privacy-review`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or revise outlines, headings, paragraphs, lists, tables, FAQs, summaries, source notes, image captions, internal links, and disclosure wording that improve reader value.
- Adjust paragraph breaks, section order, table placement, media placement, and ad-slot separation to support mobile readability and stable ad layout.
- Add semantic content-structure guardrails for titles, introductions, conclusions, calls to action, paragraphs, headings, image blocks, and ad-slot separation.
- Add conservative content-quality guardrails that prevent thin filler, keyword stuffing, misleading ad adjacency, invented sources, or unsupported ranking claims.
- Do not promise search rankings, featured snippets, approval by a specific ad network, RPM improvement, or ad-policy compliance unless verified against current authoritative sources.
- Do not treat exact word counts, heading counts, paragraph counts, keyword positions, or FAQ counts as universal ranking formulas; use them only as project-specific editorial defaults.
- Do not pad content solely to create more ad slots, add unrelated FAQs, or place ads where they can be mistaken for navigation, images, controls, or editorial recommendations.
- Do not recommend delaying the reader's primary answer, using uncloseable or deceptive sticky ads, or adding visual spacers, widgets, or media solely to inflate scroll depth.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the search intent. Decide whether the reader needs a quick definition, step-by-step fix, comparison, price range, recommendation, troubleshooting path, or deeper research.
2. Check volatile monetization claims. RPM formulas, network thresholds, revenue estimates, ad-refresh behavior, traffic eligibility, and current policy rules must be sourced and dated or omitted.
3. Shape the title, summary, and introduction around the query. Use the target phrase naturally in the title or opening when it helps clarity, then open with the direct answer, reader problem, promised outcome, and any real evidence or experience without generic throat-clearing.
4. Build the outline around reader decisions. Use H2 and H3 sections that match real subquestions, not keyword variants created only for search coverage.
5. Apply site-specific editorial defaults when they exist. Article-type defaults for section count, paragraph count, or paragraph length can guide editing, but they are not ranking promises and should not override completeness.
6. Keep paragraphs mobile-readable. Prefer one to three focused sentences per paragraph, but do not split a technical idea so aggressively that meaning becomes fragmented.
7. Use semantic content structure. Real paragraphs, headings, figures, images, captions, lists, and tables should carry the structure; avoid stacked line breaks or meaningless wrapper markup when authoring rendered article templates.
8. Use structured elements only when they help. Tables should compare real attributes; lists should sequence actions or options; pull summaries should reduce scanning cost.
9. Add evidence and experience. Include first-hand observations, examples, screenshots, data, source links, or methodology when available. For data-heavy claims, use the pattern: number or claim, interpretation, then limitation.
10. Handle freshness. Dates, prices, policy behavior, product availability, screenshots, benchmarks, and network rules need a source date or conservative wording.
11. Design ad-friendly layout without harming trust. Keep content readable around ad slots, reserve layout space where applicable, separate ads from images and controls, avoid deceptive placement, and never make ads look like menus, downloads, recommendations, or content actions.
12. Protect performance and accessibility. Use meaningful alt text, captions when useful, explicit image dimensions, lazy loading after critical content where appropriate, and avoid layout shifts.
13. Add internal and external navigation thoughtfully. Use a table of contents, jump links, related articles, internal links, or authoritative external source links only when they help readers verify, choose, or continue.
14. Add FAQs only for genuine follow-up questions. Three to five concise FAQs are often enough; avoid duplicated headings, fabricated long-tail questions, or answers that repeat the body.
15. Check publishing metadata and machine-readable article signals when the platform supports them. Keep title, summary, tags, author, dates, canonical URL, images, and structured data aligned with the article body.
16. Check monetization-sensitive ethics. Include affiliate or sponsorship disclosure when relevant, avoid exaggerated claims, keep editorial recommendations distinct from ads, and do not hide the core answer or resource at the bottom solely to force more scrolling.
17. Close with a clean conclusion. Summarize the decision or next step, include a useful call to action when appropriate, and do not introduce new claims in the conclusion.
18. Check final shape. The article should have a direct answer, useful body sections, structured support, source or experience signals, clear next steps, and no filler written only for algorithms or ad inventory.
19. Run the narrowest configured verification that covers changed content, docs, template, package, or mustflow contracts.

<!-- mustflow-section: postconditions -->
## Postconditions

- The content serves the reader's search intent before optimizing for ad viewability or page length.
- Paragraphs, headings, tables, lists, FAQs, images, links, and disclosures are purposeful and not filler.
- The rendered article structure uses semantic blocks and avoids deceptive scroll-depth tactics.
- Article length, section counts, paragraph counts, and keyword placement follow local editorial defaults when available, not universal SEO myths.
- Publishing metadata and structured article signals match the visible content when the platform supports them.
- Advertising layout considerations are separated from editorial claims and do not create deceptive or unstable UI.
- Ranking, network approval, revenue, or policy-compliance claims are either verified, dated, or omitted.
- Final reports separate content improvements from unverified search, ad-network, or revenue expectations.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured prose, docs, link, accessibility, performance, visual, or package check when it better proves the changed content surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If source freshness cannot be checked, remove or soften claims about current rankings, ad-network rules, prices, dates, or policy behavior.
- If the draft becomes keyword-stuffed, repetitive, or ad-slot filler, shorten it and restore reader-first structure.
- If exact length, section, paragraph, or keyword-count advice conflicts with reader intent or local style, treat the number as an editorial suggestion and report the tradeoff.
- If a source recommends intrusive, uncloseable, deceptive, or artificially delayed monetization patterns, keep only the user-respecting layout principle and reject the tactic.
- If ad placement conflicts with readability, accessibility, privacy, consent, or performance constraints, prioritize user trust and report the monetization tradeoff.
- If the topic is regulated or high stakes, avoid generic advice and require authoritative sources, qualified review, or a narrower scope.
- If verification requires external policy pages, analytics, ad-console access, or live browser inspection not available in the current environment, report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- Search and reader intent
- Article type and outline shape
- Title, summary, introduction, paragraph, heading, semantic markup, table, list, FAQ, image, link, metadata, structured data, conclusion, call-to-action, and disclosure checks
- Source freshness and evidence notes
- Ad layout, readability, performance, accessibility, and trust checks
- Ranking, policy, revenue, or network claims omitted or verified
- Command intents run
- Skipped checks and reasons
- Remaining content or monetization risk
