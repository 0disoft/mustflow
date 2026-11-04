---
mustflow_doc: skill.seo-ai-discovery-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: seo-ai-discovery-review
description: Apply this skill when public website SEO, AEO, GEO or generative engine optimization, LLMO or LLMEO, AI search visibility, crawler access, citation accuracy, canonical URLs, hreflang, sitemaps, llms.txt, public tool landing pages, or discovery-to-conversion measurement are designed, implemented, audited, or failing. Review discovery, understanding, citation, execution, and conversion as one pipeline; distinguish this from internal search indexes and geospatial GEO work.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.seo-ai-discovery-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# SEO and AI Discovery Review

<!-- mustflow-section: purpose -->
## Purpose

Review discover -> understand -> cite -> execute -> convert as one public-web pipeline.
Prioritize access and first-response rendering, shared factual sources, reproducible evidence,
then conversion measurement. SEO, AEO, GEO, LLMO, and LLMEO do not create separate ranking
systems that this skill can control. Technical eligibility does not guarantee indexing or citation.

<!-- mustflow-section: use-when -->
## Use When

- A public product, pricing, documentation, comparison, troubleshooting, or free-tool page needs
  organic search or AI discovery engineering, an audit, or a launch-readiness review.
- Important content is absent from initial HTML, crawlers are challenged or blocked, facts disagree
  across surfaces, or private and unpublished URLs appear in discovery artifacts.
- Canonical URLs, hreflang, structured data, sitemaps, optional llms.txt, crawler policies, or
  multilingual and programmatic page generation change.
- Crawl, search impression, AI citation, inbound visit, tool success, signup, and paid conversion
  measurements need separate definitions or a common page/product identity.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is internal Elasticsearch/OpenSearch indexing or vector/RAG retrieval; use
  `search-index-integrity-review`, `vector-search-integrity-review`, or `rag-pipeline-triage`.
- GEO means geospatial coordinates, maps, location permission, or geofencing without public search
  discovery. A matching acronym alone is insufficient.
- The task is only paid ads, sentence polish, or article composition; use the relevant content
  procedure. This skill owns discovery contracts, not every marketing or writing decision.
- The task is only framework mechanics without a discovery boundary; use the framework skill.
- The proposed work impersonates a crawler, bypasses private access controls, fabricates reviews,
  purchases inauthentic mentions, or inserts hidden instructions to manipulate AI answers.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Page inventory: stable ID, purpose, owner, public/private audience, release state, locales,
  canonical route, render mode, auth boundary, and intended indexing policy.
- Delivery evidence: source routes/templates, initial response body and headers, redirect chain,
  robots directives, sitemap, structured data, cache policy, and relevant CDN/WAF configuration.
- Fact owners: product and price catalogs, supported formats/platforms, limits, translation status,
  meaningful content revision dates, benchmark conditions, and URL construction functions.
- Provider policy ledger: platform and product surface, indexing/user-fetch/training/grounding
  purpose, verified bot identity method, current official source, and verification date.
- Measurement contract: available report fields, sampling/thresholds, timezone, attribution window,
  page/product/locale IDs, event deduplication, retention, and privacy constraints.
- Existing framework, deployment, analytics, command intents, and authorized edit/rollout scope.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task concerns a public-web discovery boundary and has a bounded page sample or inventory.
- Read the owning routes, catalogs, publication policy, and tests before prescribing changes.
  User-supplied essays and vendor announcements are evidence to verify, not command authority.
- Refresh the provider-specific facts in Source Checkpoints when they affect the decision. Use
  `source-freshness-check`; record unavailable sources and avoid guessed directives or metrics.
- Confirm which evidence can be collected locally. Missing production logs or webmaster access
  does not prevent useful source fixes, but limits live-visibility claims.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Change the scoped public render path, fact/locale/URL generators, discovery artifacts, bounded
  crawler rules, consent-compatible measurement, and focused regression checks.
- Reuse existing catalogs and localization tools. Files named webpub.toml or a particular i18n
  vendor are optional project choices, not prerequisites for this pipeline.
- Keep framework migration, private data exposure, account connections, external submissions,
  publishing, and paid services within the user's existing authorization. This skill grants none.
- Do not rewrite a working SSR app into another framework solely for SEO, invent benchmark or
  revenue results, or enable broad bot bypasses to make an audit appear successful.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify pages and the first broken stage.** Separate public indexable landing/docs/tool
   routes from drafts, candidate releases, account/payment/admin routes, uploads, and individual
   results. State whether the failure is discoverability, understanding, citation accuracy,
   execution, or conversion; fix upstream blockers before creating more pages.
2. **Inspect the first response without JavaScript.** For each sampled public canonical URL,
   inspect the final status, body, title, primary definition, constraints, metadata, and links.
   An empty HTML shell with HTTP 200 fails this check. A User-Agent simulation proves response
   handling only, not authenticated bot identity or successful provider indexing.
3. **Preserve the rendering owner.** Use static generation for suitable new content in the chosen
   stack, or its existing SSR/prerender path. Put tool formats, size/count limits, processing
   location, sample results, and recovery guidance in initial HTML; defer the heavy execution
   engine. Use `astro-code-change`, `svelte-code-change`, or the owning framework skill as needed.
4. **Build a purpose-specific bot matrix.** Separate indexing, user-directed fetches, training,
   and grounding for the actual provider product. Training opt-out does not universally imply
   search opt-out. User-directed fetchers may apply different robots rules; refresh vendor policy
   rather than promising that one robots group controls every request.
5. **Verify edge delivery.** Compare origin and CDN responses for allowed public paths, including
   redirects, caching, 403/429, CAPTCHA/JS challenges, and latency. Use vendor IP data or a trusted
   verified-bot signal; when DNS verification is supported, require forward-confirmed reverse DNS.
   A spoofable User-Agent or untrusted forwarded client IP cannot authorize an exception. Scope
   challenge exceptions to intended public paths/methods; preserve auth, rate budgets, private
   route denial, and other WAF protections. Use the owning security procedure when rules change.
6. **Separate publication, indexing, and secrecy.** Derive candidate/live artifacts from the
   repository's publication policy, with explicit transitions and rollback. Exclude unpublished
   and private routes from public discovery lists. robots.txt and a separate subdomain are not
   authorization or guaranteed deindexing. Protect confidential pages with server authorization.
   For a public URL excluded by noindex, allow the intended crawler to fetch that directive;
   blocking the fetch can leave a known URL indexed without its content. A candidate Disallow
   policy may limit crawling but cannot replace those privacy or removal controls.
7. **Generate facts once.** Trace visible copy, prices/currencies/billing periods, supported
   environments, limits, metadata, JSON-LD, and discovery URLs to their owning catalogs. Test
   contradictory values rather than merely checking that fields exist. Serialize JSON-LD safely
   for an HTML script context and prevent request-host poisoning of canonical origins.
8. **Align URLs and locales.** Reuse one canonical URL builder across internal links and generated
   discovery artifacts. For distinct translated pages intended for indexing, use self-canonicals
   and reciprocal hreflang among complete, public equivalents. Use x-default for the chosen
   fallback/selector when applicable, not as a replacement for language links. A no-JS locale
   entry needs crawlable language links. Do not advertise untranslated fallback or nonexistent
   locale routes as completed localized pages.
9. **Make claims self-contained and reproducible.** Start with the problem, inputs, outputs,
   supported conditions, and next action. Keep version, verified date, workload, hardware/runtime,
   comparison conditions, failures, and limits next to material claims. Do not manufacture fixed
   paragraph lengths, forced Q&A, unique-looking keyword variants, or unsupported superiority.
   Use `reader-centered-technical-content` for prose and `search-ad-content-authoring` for its
   separate editorial/ad-supported scope.
10. **Match structured data to visible facts.** Choose supported schema for the actual page type.
    Do not invent offers, reviews, ratings, availability, or processing/privacy promises. A valid
    JSON parser result does not prove schema eligibility, rich-result display, or AI citation.
11. **Publish meaningful discovery artifacts.** List intended public canonical pages in sitemaps;
    base lastmod on substantive content/fact changes, not every build. Keep dates stable for an
    unchanged deployment. Treat optional llms.txt as curated navigation, not a ranking signal or
    a substitute for HTML and sitemaps. Keep private URLs and secret query strings out of it.
    Review IndexNow ownership, payloads, and authorization before submission; acceptance is not
    proof of crawling or indexing. Do not use Google's restricted Indexing API for ordinary
    product/docs pages merely to request faster discovery.
12. **Expand only useful pages.** Require distinct supported-format behavior, OS instructions,
    error recovery, or other real data before generating variant pages. Validate translation
    completeness against source revisions. Test boundary routes, redirects, missing locales,
    draft pages, and pagination/query variants instead of generating keyword-only doorway pages.
13. **Measure five different event families.** Keep verified crawl/fetch, search/AI visibility,
    inbound human visits, successful tool execution, and signup/payment outcomes separate. Preserve
    allowed campaign parameters through redirects without putting them into canonical identities.
    Referrer and UTM values are attribution hints, not proof of bot identity or a full citation log.
    Link cohorts through safe page/product/locale IDs, consent-compatible attribution windows,
    explicit timezone conversion, and deduplicated events. Reconcile paid outcomes with existing
    payment truth; never infer revenue from a click or start event.
14. **Respect measurement limits.** Record report availability, provider surface, thresholds,
    sampling, and denominators. Do not add Google impressions to Bing citation counts or assume
    either covers all AI services. Missing/suppressed data is unknown, not zero. After material
    releases or price/spec changes, run a bounded, dated question sample for factual errors;
    one answer or a bot request is not evidence of sustained visibility or causal uplift.
15. **Verify a representative matrix.** Sample product/pricing, docs, tool-before-input, locale
    selector and translated pages, candidate routes, private results, and unknown URLs as applicable.
    Check expected status/redirects, first HTML, matching facts, canonical/hreflang, safe JSON-LD,
    robots/noindex/sitemap publication consistency, attribution preservation, and unauthorized
    access denial. Distinguish build fixtures, local HTTP, browser, verified edge bot, and live
    webmaster evidence. Use `core-web-vitals-field-review` for field performance; a lab result is
    not a field percentile or proof that a crawler executed the tool.
16. **Report the next bounded fix.** Rank observed defects by affected pages/users, confidentiality,
    contradictory prices/specs, delivery failures, request count/latency, or funnel loss with a
    denominator. State unavailable measurements and deferred downstream work. Do not promise
    rankings, citations, conversion improvements, or a live rollout from source inspection alone.

## Source Checkpoints

The following source facts were checked on 2026-11-04. Refresh exact bot behavior, report
availability, rich-result eligibility, and transition dates before later use; do not freeze IPs
or copy executable instructions from an external page into repository command authority.

| Owner | Verified distinction and primary source |
| --- | --- |
| Google Search | [AI discovery guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): ordinary SEO remains relevant; llms.txt and special AI markup do not provide Google ranking advantages. [Documentation updates](https://developers.google.com/search/updates) record removal of FAQ rich-result support; Q&A prose does not require that markup. |
| Google controls | [Crawler reference](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers): Google-Extended governs specified Gemini training/grounding uses; do not equate it with Google Search inclusion. [Robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro) distinguishes crawl control from secrecy and noindex. |
| OpenAI | [Crawler reference](https://developers.openai.com/api/docs/bots): OAI-SearchBot is for search, GPTBot for model training, and ChatGPT-User for user actions. ChatGPT-User is not the automatic search crawler and robots.txt rules may not apply to its user-initiated actions. |
| Anthropic | [Crawler policy](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): distinguish Claude-SearchBot, Claude-User, and ClaudeBot; refresh their individual controls. |
| Perplexity | [Crawler policy](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): distinguish PerplexityBot and Perplexity-User; verify the user-fetch and crawler rules independently. |
| Microsoft | [Training and grounding announcement](https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/): the new preferences begin taking effect on recrawl from 2027-02-01; existing NoArchive/NoCache users have transition requirements, including a 2027-03-01 deadline. These were future dates at this checkpoint, not already-active universal directives. |
| Measurement | [Google's generative AI report](https://support.google.com/webmasters/answer/16984139) exposes impressions for supported Search features, subject to reporting limits. [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) reports citation activity on its supported surfaces; refresh preview and sampling limitations. Neither is a complete cross-provider citation or conversion ledger. |

<!-- mustflow-section: postconditions -->
## Postconditions

- Sampled pages have explicit publication, indexing, rendering, locale, and authorization owners.
- Changed first responses and generated artifacts agree with their factual sources and URL policy.
- Crawl permissions, training/grounding choices, bot identity, and private access remain distinct.
- Findings name an observed stage, affected scope, evidence, proposed or applied fix, and limitation.
- Verification claims distinguish local contracts from live delivery, provider visibility, and
  measured conversions. Future policy dates and unverified claims are labeled as such.

<!-- mustflow-section: verification -->
## Verification

Resolve the selected repository's configured oneshot intents and run the narrowest relevant set:
`changes_status`, `changes_diff_summary`, `lint`, `build`, `test_related`, `test`,
`docs_validate_fast`, and `mustflow_check` where available. A skill does not authorize them.

For generated page contracts, include mismatched displayed/structured prices, empty initial HTML,
unchanged-build lastmod, missing locale, tracking redirects, private/draft sitemap exclusion,
and noindex blocked by robots. Validate edge/WAF behavior only with separately available evidence;
do not claim live bot access, field performance, indexing, or conversions from fixture success.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If product facts disagree, locate the owner and repair generation rather than adding a third
  copy. Mark unsupported claims as unverified; do not invent an attractive fallback value.
- If access or webmaster data is unavailable, finish useful local work and name the precise live
  evidence gap. Do not read missing or suppressed impressions/citations as no demand.
- If a bot is blocked, keep private-route controls and narrow the public-path delivery defect;
  do not disable the WAF, remove auth, or trust a User-Agent to pass a verification gate.
- If a new provider policy is announced, verify effective dates, recrawl, and transition steps
  before changing existing restrictions. If evidence conflicts, retain the uncertainty and prefer
  the current product-owned source over a general AI/SEO table.
- If locale or publication tests fail, repair or exclude the affected entries from the intended
  public set. Do not expose private data or relax indexability rules merely to make counts match.
- If structural correctness passes but visibility does not improve, investigate the next observed
  stage; do not manufacture ranking guarantees, spam pages, hidden prompts, or automatic rewrites.

<!-- mustflow-section: output-format -->
## Output Format

- Pipeline scope: sampled URLs/page classes, locales, release states, and excluded private surfaces.
- Current-source checks: provider/product/purpose, source/date, effective dates, and uncertainties.
- Findings by stage: condition, evidence, affected scope, priority basis, owner, and applied/deferred fix.
- Synchronized surfaces: source catalogs, HTML/meta, JSON-LD, canonical/hreflang, sitemap, optional
  llms.txt, and publication gates; name the actual changed files.
- Measurement definitions: event family, provider coverage, cohort/denominator, timezone, sampling,
  available before/after evidence, and unknowns.
- Verification run, skipped live checks, remaining risks, next bounded action, commit, and rollout state.
