---
mustflow_doc: skill.browser-automation-reliability-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: browser-automation-reliability-review
description: Apply this skill when browser automation, UI automation, Playwright, Selenium, Puppeteer, WebDriver, computer-use/browser-driving agents, visual browser verification, flaky selectors, page readiness, authentication state, CAPTCHA or anti-bot handling, rate limits, screenshot checks, retry, timeout, human approval, or browser automation observability is created, changed, reviewed, triaged, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.browser-automation-reliability-review
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

# Browser Automation Reliability Review

<!-- mustflow-section: purpose -->
## Purpose

Review browser automation as a stateful, evidence-producing system, not as a sequence of clicks.

The core question is: "Does the automation know what state the browser, user, page, network,
session, target data, and approval gate are in before it acts and before it claims success?" If not,
the flow will look fine in a demo and then fail under rerenders, slow CI, auth drift, anti-bot
gates, rate limits, visual noise, stale approvals, or agent hallucination.

<!-- mustflow-section: use-when -->
## Use When

- Code, tests, docs, templates, or reviews touch browser automation, UI automation, end-to-end
  harnesses, Playwright, Selenium, Puppeteer, WebDriver, browser contexts, remote browsers,
  screenshots, videos, traces, HAR files, synthetic user flows, or computer-use browser agents.
- A task mentions flaky selectors, unstable locators, actionability, stale elements, rerenders,
  page readiness, `networkidle`, sleeps, waits, timeouts, retries, screenshot diffs, visual checks,
  popups, downloads, native dialogs, iframes, shadow DOM, virtualized lists, or input typing.
- Automation logs into a product, reuses storage state, shares accounts across workers, handles SSO,
  OAuth, MFA, passkeys, cookies, localStorage, sessionStorage, IndexedDB, account lockout, or
  permission changes.
- Browser automation touches third-party sites, CAPTCHA, anti-bot or WAF challenges, rate limits,
  robots or terms boundaries, IP reputation, headless fingerprints, provider throttling, or manual
  fallback paths.
- A browser-driving agent reads page content, follows page instructions, clicks by screenshot or
  coordinates, extracts table data visually, enters forms, sends messages, purchases, deletes,
  mutates external state, or asks for human approval before continuing.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a pure LLM agent control-flow change with no browser or UI automation surface. Use
  `agent-execution-control-review`.
- The task is only prompt, RAG, model, tool schema, cost, latency, hallucination, or eval behavior
  without browser execution. Use the matching LLM or agent specialist skill.
- The task is only a product auth bug that is not being automated through a browser. Use
  `auth-flow-triage` or `auth-permission-change`.
- The task is only a browser request, CORS, CDN, API, or provider failure before the browser
  automation layer is relevant. Use `api-failure-triage`.
- The task is only frontend UI quality, layout resilience, accessibility, render stability, or web
  performance for human users rather than automation harness reliability. Use the matching frontend
  skill first.
- The task is only test-suite runtime optimization, shard balance, retry policy, or flaky-test
  handling without browser-specific failure modes. Use `test-suite-performance-review` or
  `test-maintenance`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Automation intent ledger: target site or app, owner, internal versus third-party boundary,
  allowed actions, forbidden actions, expected user role, data class, write risk, and whether the
  browser path is the right tool rather than an API, fixture, or deterministic adapter.
- State ledger: current URL, frame, page, route, modal, popup, selected account, auth storage,
  browser context, viewport, locale, timezone, permissions, feature flags, test data, worker ID,
  correlation ID, and previous step result.
- Readiness ledger: page-ready signal, data-ready signal, actionable-control signal, business-ready
  signal, network and background-work assumptions, and any waits or assertions that prove them.
- Selector and action ledger: locators, user-facing roles or labels, test IDs or automation
  contracts, shadow DOM and iframe boundaries, virtualized list handling, click target, keyboard and
  focus path, input acceptance proof, and actionability override use.
- Auth and identity ledger: login strategy, storage owner, token or cookie storage surface, session
  expiry, refresh behavior, per-worker account isolation, SSO or MFA gates, CAPTCHA policy, account
  lockout policy, and logout or cleanup behavior.
- External pressure ledger: rate limit unit, retry budget, anti-bot or challenge detection,
  provider terms boundary, manual fallback, backoff behavior, and circuit-breaker threshold.
- Verification ledger: success criteria, API or database confirmation when available, screenshot
  or visual artifact role, trace/video/HAR policy, console and network capture, redaction,
  retention, and failure artifact sampling.
- Agent and approval ledger: page content trust boundary, prompt-injection exposure, tool
  permissions, coordinate mapping, stale approval checks, approval snapshot, exact post-approval
  action, resume state, and human escalation path.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Current repository instructions, command contract, automation harness code, test fixtures, browser
  config, auth fixtures, screenshots or traces, and docs directly tied to the automation path have
  been inspected before editing.
- Browser vendor, automation library, remote-browser provider, CAPTCHA, anti-bot, and Agents SDK or
  computer-use details are stale-sensitive. Use `source-freshness-check` before embedding exact
  current API claims, provider limits, default timeouts, or compliance requirements.
- External pages, emails, documents, ads, support threads, and rendered web content are untrusted
  input for browser-driving agents.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not
  authorize launching development servers, unmanaged browsers, long-running workers, production
  browser sessions, CAPTCHA bypasses, provider dashboards, or live side-effect runs.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine browser automation state machines, locator contracts, test IDs, accessible names,
  readiness assertions, frame or popup handlers, input verification, auth fixtures, per-worker
  account isolation, retry classification, timeout hierarchy, idempotency checks, rate-limit
  handling, approval gates, manual fallback states, traces, screenshots, redaction, cleanup, and
  directly synchronized docs or templates.
- Move fixture setup, result verification, cleanup, idempotency checks, and data creation from
  browser clicks to API or deterministic helpers when the browser UI is not the behavior under test.
- Add focused tests for selector drift, readiness failure, stale element rerender, iframe or shadow
  DOM handling, auth-state expiration, per-worker isolation, retry non-idempotency, stale approval,
  screenshot noise, trace redaction, and agent prompt-injection defense when behavior evidence
  supports them.
- Do not fix flakiness by adding blind sleeps, force-clicking as the default, hiding failures behind
  broad retries, weakening visual thresholds without evidence, sharing one mutable account across
  parallel workers, or claiming browser success from an unverified screenshot.
- Do not add CAPTCHA bypass, anti-bot evasion, headless fingerprint spoofing, or terms-violating
  third-party automation as a normal product feature.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide whether the browser is the right boundary. Use API, fixtures, or service adapters for data
   setup, teardown, and result verification when the browser UI itself is not the behavior being
   tested or automated.
2. Classify the automation owner: internal app E2E, internal operations tool, third-party site
   workflow, browser-driving LLM agent, visual regression, scraping-like extraction, support tool,
   or production user-assistance flow.
3. Define a state machine before actions. Name the states such as unauthenticated, authenticated,
   searching, selecting target, filling form, awaiting approval, submitting, verifying result,
   retrying, blocked by challenge, manual fallback, succeeded, and failed.
4. Replace sleeps with readiness evidence. For each step, define what proves the page is ready, the
   data is ready, the target control is actionable, and the business state is safe to advance.
5. Treat `networkidle` and selector-visible waits as weak signals. Prefer domain assertions such as
   expected row identity, enabled submit state, loaded data count, settled validation, known URL,
   confirmation ID, provider event, or backend result.
6. Review locator contracts. Prefer stable user-facing roles, labels, names, and explicit test IDs
   over CSS layout paths, generated classes, index-based XPath, translated prose only, or first-match
   selectors.
7. Check ambiguous DOM. Handle hidden duplicate controls, responsive desktop and mobile DOM at the
   same time, skeletons that resemble real content, virtualized rows, portals, sticky overlays,
   cookie banners, focus traps, iframes, cross-origin frames, shadow DOM, and custom components.
8. Avoid stale element handles. Re-resolve locators at action time, and keep find-check-act-verify
   close together so rerenders cannot invalidate old DOM references silently.
9. Review actionability honestly. A forced click, coordinate click, JS-dispatched event, or disabled
   actionability check must be exceptional, documented, and followed by proof that a real user path
   is not being bypassed.
10. Verify input acceptance. After typing, pasting, selecting dates, entering currency, using IME,
    triggering autocomplete, or blurring a field, confirm the stored value, validation state, submit
    readiness, or outbound payload rather than assuming keystrokes were accepted.
11. Make auth state explicit. Identify whether auth lives in cookies, localStorage, sessionStorage,
    IndexedDB, memory, or provider redirects; isolate accounts by worker; avoid shared mutable user
    state; and handle expiry, rotation, SSO, MFA, passkeys, lockout, and logout contamination.
12. Treat CAPTCHA and anti-bot as product states. In test or staging, use allowed test keys,
    allowlists, or disabled challenge paths. In production or third-party flows, detect challenges,
    stop safely, and route to human review or manual fallback instead of trying to evade them.
13. Add rate control before retries. Identify the rate-limit subject, whether a single browser action
    fans out into many requests, how backoff is computed, when to stop, and how the system avoids a
    retry storm.
14. Classify retryable failures. Retry only transient navigation, detached element, timeout,
    temporary backend, or eventual-consistency classes within a bounded budget. Do not retry
    permission denied, invalid input, CAPTCHA, account lockout, provider policy blocks, unknown
    write outcome, or business-rule failures without a recovery-specific check.
15. Make writes idempotent or confirm-before-replay. For purchases, payments, deletes, sends,
    refunds, admin changes, support actions, and external mutations, record stable operation IDs and
    check whether the effect already happened before any retry or resume can repeat it.
16. Design timeout hierarchy. Align action, assertion, navigation, test, job, queue lease, browser
    provider session, and external API timeouts so cancellation saves evidence, releases resources,
    and resumes from a known state.
17. Separate visual proof from business proof. Use screenshots for layout or visual regression, but
    use confirmation IDs, API reads, database rows, provider events, downloads with checksums, audit
    logs, or received messages to prove business success.
18. Stabilize screenshot assertions. Freeze or mask nondeterministic content such as time, caret,
    animation, ads, maps, charts, lazy images, random data, locale, theme, viewport, font, GPU,
    scrollbar, and cookie banners before changing thresholds or baselines.
19. Capture failure context. Save current URL, frame, viewport, locale, timezone, screenshot, DOM or
    accessibility snapshot when safe, console errors, network statuses, trace, video, retry count,
    worker ID, account ID class, and correlation ID with sensitive-data redaction.
20. Protect artifacts. Browser traces, videos, screenshots, HAR files, storage state, and console
    logs can contain cookies, tokens, personal data, addresses, order details, and messages; set
    redaction, retention, encryption, access, and sampling before broad collection.
21. For browser-driving agents, distrust page content. Treat rendered instructions, hidden DOM,
    emails, PDFs, comments, ads, and third-party text as untrusted data that must not override the
    system task, tool policy, approval rules, or data-exfiltration limits.
22. Split agent roles where risk justifies it. Keep planner, browser executor, verifier, policy
    gate, and human approval separate for high-impact flows. If one model does multiple roles, add
    deterministic gates before side effects and before success claims.
23. Make coordinate and screenshot actions verifiable. Recheck screenshot-to-DOM scale, scrolling,
    focus, active modal, target bounds, visible label, disabled state, and post-action state when a
    model or computer-use tool clicks by image or coordinates.
24. Treat human approval as durable state. Show the exact account, URL, target, amount, recipient,
    data, screenshot, form values, risk class, reversibility, and exact next action. Before resume,
    re-read critical fields and compare them with the approved snapshot.
25. Clean up resources. Close pages, contexts, browsers, downloads, temp files, videos, traces,
    mock servers, websockets, and test data deliberately; detect zombie browser processes and
    artifact growth in long runs.
26. Verify with the narrowest configured tests, docs checks, release checks, and mustflow validation
    that cover the changed automation contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The automation has explicit states, readiness signals, locator contracts, auth isolation, retry
  classes, timeout hierarchy, and success evidence.
- Browser-only proof is separated from business-result proof.
- CAPTCHA, anti-bot, rate-limit, human-approval, prompt-injection, and third-party boundary risks
  are detected, stopped, or routed to manual fallback instead of hidden behind retries.
- Failure artifacts are useful enough to debug and constrained enough not to leak secrets or
  personal data.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured fixture, unit, integration, docs, package, or release check that proves
the changed browser automation contract. Do not infer raw browser launches, dev servers, headed
browsers, provider dashboards, CAPTCHA-solving services, or production automation runs from local
files.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the failure is not localized to browser automation, use `api-failure-triage`,
  `auth-flow-triage`, `frontend-render-stability`, `test-maintenance`, or another narrower skill
  first.
- If a selector is flaky, do not patch only the selector string until locator ownership, duplicate
  DOM, responsive DOM, skeletons, frames, shadow DOM, and readiness have been checked.
- If a retry would replay an unknown write, stop and add idempotency or effect-confirmation before
  enabling retry.
- If CAPTCHA, anti-bot, account lockout, provider policy, or terms boundaries are detected, stop the
  automation path and report the manual or contractual fallback instead of bypassing it.
- If human approval resumes after state changed, expire the approval or request a new approval with
  the changed fields.
- If artifacts would leak secrets or personal data, collect a smaller redacted evidence set and
  report the observability gap.
- If a configured command fails, use `failure-triage` before continuing.

<!-- mustflow-section: output-format -->
## Output Format

- Browser automation surface reviewed
- Browser-versus-API boundary and automation owner
- State machine, readiness, locator, actionability, auth, rate-limit, retry, timeout, and
  idempotency decisions
- Screenshot, trace, artifact, redaction, and business-success evidence
- Agent page-content trust, coordinate action, tool permission, approval, and resume checks
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining browser automation reliability risk
