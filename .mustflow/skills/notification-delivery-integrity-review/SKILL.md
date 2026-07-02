---
mustflow_doc: skill.notification-delivery-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: notification-delivery-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and notification systems, email, push, in-app notifications, SMS, notification preferences, unsubscribe, suppression, digest, quiet hours, timezone scheduling, rate limits, deduplication, retries, provider webhooks, delivery attempts, templates, notification inboxes, notification audit logs, or notification provider integrations need review for delivery integrity, user consent, duplicate prevention, channel policy, and explainability.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.notification-delivery-integrity-review
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

# Notification Delivery Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review notification systems as event, policy, schedule, delivery, provider, suppression, inbox, and audit flows rather than as a single send call.

The review question is not "did the code send a notification?" It is "can the system explain which source event created which notification intent, why each recipient and channel was allowed or suppressed, when delivery was attempted, what the provider accepted or rejected, and how retries, duplicates, preferences, timezone, digest, and user safety were handled?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports notification generation, recipient selection, email, push, SMS, in-app notification, digest, reminder, campaign, announcement, marketing message, transactional message, security alert, receipt, legal notice, or product activity alert behavior.
- Code touches notification preferences, unsubscribe links, preference centers, one-click unsubscribe headers, suppression lists, bounce handling, spam complaints, invalid push tokens, quiet hours, timezone scheduling, rate limits, duplicate prevention, aggregation windows, retry policy, queue workers, provider adapters, provider webhooks, or delivery audit logs.
- Code adds or changes notification templates, localization, subject lines, push payloads, in-app cards, deep links, sensitive preview text, provider message IDs, message tags, campaign IDs, or operator tools that answer why a notification was sent or suppressed.
- A review or final report claims notification delivery is idempotent, retry-safe, unsubscribe-safe, digest-safe, timezone-safe, zero-downtime, provider-ready, inbox-ready, privacy-safe, or explainable to support and operators.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only a generic external provider boundary with no notification lifecycle, preference, or user-message semantics; use `adapter-boundary`.
- The task is only generic rate-limit mechanics, retry policy, queue settlement, or idempotency outside notifications; use the narrower integrity skill first.
- The task is only visible frontend copy, translation keys, date or number formatting, RTL, SEO, or export localization; use `frontend-localization-review` first and this skill only for notification channel semantics.
- The task is primarily payment, credit, authentication, security, file, or deployment integrity; use the narrower domain skill first and this skill for notification-specific delivery and preference behavior.
- The operation is local-only logging, analytics, or telemetry that no user receives and no operator treats as a notification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Notification event ledger: source event, producer, causation ID, event schema version, outbox record, replay or backfill source, and whether the event is a fact, request, or best-effort signal.
- Notification intent ledger: notification type, recipient, tenant or scope, category, priority, semantic dedupe key, template or semantic version, policy snapshot, and intended user-visible outcome.
- Recipient, channel, and category ledger: security, transactional, receipt, legal, product activity, social, marketing, recommendation, reminder, or digest classification; channel eligibility; fallback policy; and mandatory versus optional delivery rules.
- Preference and legal policy ledger: user, email address, device, tenant, workspace, channel, category, scope, consent source, unsubscribe state, legal override, and final pre-send preference recheck.
- Suppression ledger: hard bounce, soft bounce, complaint, unsubscribe, invalid push token, inactive device, deleted account, privacy deletion, operator block, provider suppression, and whether suppression overrides user preferences.
- Schedule, timezone, quiet hours, and digest ledger: user, device, workspace, or tenant timezone; recurring local intent; next UTC run; daylight-saving behavior; quiet hours; aggregation window; digest window; digest ID; and delayed or canceled delivery rules.
- Delivery job and attempt ledger: queue, priority, channel, provider, provider account or domain, idempotency key, next attempt time, attempt count, retry class, request hash, provider message ID, outcome, latency, and dead-letter state.
- Provider event ledger: provider webhook signature, provider event ID, message ID, bounce, complaint, delivered or accepted event, open or click event, token invalidation, duplicate event, out-of-order event, and reconciliation path.
- In-app inbox ledger: inbox item snapshot, read or unread state, archive, delete, expiry, unread count, pagination, mark-all-read boundary, resource deletion fallback, and permission-lost behavior.
- Audit, security, privacy, and operations ledger: why sent, why suppressed, who or what triggered it, sensitive body retention, redaction, account deletion behavior, operator resend rules, dry run, sample, canary, ramp-up, kill switch, campaign cancel, and cost or volume estimate.
- Relevant command-intent contract entries for tests, builds, docs, release metadata, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local notification, outbox, queue, idempotency, preference, provider adapter, template, localization, audit, and operator patterns have been searched before adding new shapes.
- Missing source event, preference, suppression, provider webhook, or audit evidence can be reported without guessing.
- If repeated attempts move money, permissions, personal data, security alerts, legal notices, or durable business state, also apply the matching payment, security, idempotency, queue, retry, rate-limit, transaction, or localization skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten notification event, notification intent, schedule, delivery job, delivery attempt, provider event, suppression, preference snapshot, in-app inbox, audit, and operator evidence records.
- Split one `sendNotification`-style path into source event, intent, schedule, delivery attempt, provider event, inbox, and audit boundaries when local architecture supports it.
- Add or tighten semantic dedupe keys, unique constraints, aggregation windows, digest state, pre-send preference rechecks, bounce and complaint suppression, provider webhook verification, retry classification, DLQ handling, quiet-hour handling, timezone-safe scheduling, and focused tests.
- Add or tighten template snapshot, sensitive-content redaction, lockscreen-safe push payload, deep-link permission recheck, account deletion cancellation, and support-facing why sent or why suppressed evidence.
- Do not add live provider calls, mass sends, campaigns, local servers, worker daemons, browser sessions, provider dashboard changes, load tests, or raw production replay outside the configured command contract.
- Do not treat provider API success, push acceptance, email open, frontend disabling, in-memory dedupe, or a log line as proof of actual user delivery or delivery integrity.

<!-- mustflow-section: procedure -->
## Procedure

1. Split the lifecycle before judging correctness.
   - Name the source event, notification intent, schedule or delivery plan, delivery attempt, provider event, suppression decision, in-app inbox item, and audit record.
   - A source event such as comment created, payment failed, password changed, or terms updated should not directly become an email API call unless the system intentionally accepts the missing replay and audit boundary.
   - If source event, notification intent, schedule, delivery attempt, and provider event are collapsed into one row or function, report which duplicate, retry, suppression, or explainability risk that hides.
2. Classify the notification type.
   - Security alerts, transactional messages, receipts, legal notices, product activity, social updates, marketing, recommendations, reminders, and digests have different consent, urgency, content, and retry rules.
   - Do not use one global opt-out to decide every category.
   - Do not use a product notification label to bypass marketing consent.
3. Keep source events durable.
   - Prefer an outbox or equivalent durable record when a business transaction should produce notifications after commit.
   - Backfill and replay should be able to regenerate missing intents while excluding already-sent or intentionally suppressed notifications.
   - Record causation and event schema version so later operators can explain why the intent exists.
4. Review recipient and scope selection.
   - Bind recipients to tenant, workspace, organization, team, project, resource, role, and permission at intent creation time.
   - Recheck permission before send and again on click when the target resource may have been deleted, hidden, or permission-revoked.
   - B2B notifications should not let one tenant's preference or suppression silence another tenant's legally or operationally distinct message.
5. Review preference and legal policy as data.
   - Store preference decisions by user, address or device, channel, category, and scope where the product needs those dimensions.
   - Snapshot the policy used for an intent, then re-evaluate the latest preference, permission, and suppression before delivery.
   - Record "why suppressed" with enough detail for support without logging sensitive content.
6. Review email as provider acceptance, not inbox truth.
   - API success usually means the provider accepted the request, not that the message reached an inbox.
   - Check sender domain separation, SPF, DKIM, DMARC, reverse DNS, TLS, From alignment, Message-ID, tracking-domain reputation, and provider account or IP pool boundaries where the repository owns them.
   - Separate transactional or relationship mail from commercial or marketing mail.
   - Implement one-click unsubscribe where the channel and jurisdiction require it, and keep preference-page GET links from mutating state under link scanners.
   - Treat hard bounce and complaint as suppression events. Soft bounces need counted policy, not infinite retry. Suppression should override a user's "send me mail" preference when the address is not deliverable or has complained.
7. Review push as a wake-up signal, not guaranteed display.
   - FCM, APNs, or another push provider accepting a message does not prove the user saw it.
   - Store push token records per device, app installation, account, tenant, platform, permission status, locale, timezone, app version, last seen, last success, and invalidated time where those dimensions matter.
   - Logout and account switching must detach or fence old push tokens so one account's private notification cannot appear on another account's device.
   - Use a collapse key only for replaceable messages. Do not collapse chat, security, payment, or audit-significant events that users must receive individually.
   - Keep lockscreen push text safe for the most sensitive supported tenant and account setting.
8. Review the in-app inbox as a product record.
   - In-app inbox entries need stable snapshots, read or unread state, archive, delete, expiry, pagination, unread count, and multi-device sync semantics.
   - Use a mark_all_read_before boundary or equivalent when mark-all-read races with newly created notifications.
   - Decide whether opening a push, visiting the target resource, explicit read, or mark-all-read changes inbox state.
   - Handle deleted resources and permission-lost targets with safe fallback text instead of leaking or dead-ending.
9. Separate dedupe from aggregation.
   - Exactly-once delivery is not a realistic assumption. Make duplicate handling durable and observable.
   - Use a semantic dedupe key such as source event, notification type, recipient, scope, channel, and template or semantic version.
   - Keep notification intent dedupe separate from delivery-attempt dedupe. One intent may create email, push, and in-app channel attempts.
   - Aggregation windows intentionally merge related events; dedupe prevents the same event from being applied twice. Do not hide aggregation as "already sent."
10. Review digest as a separate product.
   - Define the digest window, timezone, quiet hours, priority, maximum items, ordering, inclusion rule, retry policy, failure policy, and whether entries are event bundles or current-state snapshots.
   - Persist digest_id, digested_at, included item identities, and excluded item reasons.
   - Decide whether failed digest delivery returns items to a later digest, retries the same digest, or marks them intentionally missed.
11. Review scheduling and civil time.
   - Identify whether profile timezone, device timezone, browser timezone, workspace timezone, billing timezone, or tenant timezone owns the schedule.
   - Store recurring local intent plus next UTC run when a user asks for local-time delivery.
   - Handle daylight-saving transitions, nonexistent local times, duplicated local times, missing timezone, user travel, and workspace changes.
   - Scheduled workers need claim, lease, visibility, and reaper behavior so multiple workers do not send the same due notification.
12. Review rate limits by purpose.
   - Separate user-experience limits, system overload limits, provider limits, tenant fairness limits, channel limits, category limits, and sender-domain or provider-account limits.
   - A marketing campaign should not starve password resets, receipts, or security alerts.
   - Burn enqueue quota before creating expensive fanout work when the producer can overload queues or providers.
13. Review retries and queues by outcome uncertainty.
   - Use exponential backoff with jitter and bounded attempts.
   - Classify retryable failures, permanent failures, and unknown provider outcome separately.
   - Do not retry malformed templates, unsubscribed recipients, hard-bounced addresses, invalid push tokens, permission-denied targets, or deleted accounts as transient failures.
   - Separate critical, transactional, normal, bulk, and digest queues or concurrency budgets where one class can starve another.
   - Poison messages need DLQ reason, safe payload summary, replay eligibility, and ownership.
14. Review provider webhooks as untrusted and replayable.
   - Verify provider webhook signatures before accepting bounce, complaint, delivery, open, click, token invalidation, or provider status events.
   - Store provider event IDs or normalized message ID plus event type to make handlers idempotent.
   - Tolerate duplicate and out-of-order webhook events. Provider delivered, bounced, complaint, open, and click events may not arrive in useful order.
   - Keep provider receipt separate from follow-up actions such as suppression, token invalidation, inbox update, or campaign metrics.
15. Review templates and rendering time.
   - Decide whether subject, body, push text, in-app card, deep link, and fallback text are snapshotted at intent creation or rendered at delivery.
   - Snapshot legal, receipt, payment, and security content that must reflect the facts at send time.
   - Re-render product activity content only when deleted resources, missing permissions, localization, and fallback states are safe.
   - Escape variables for each channel separately: HTML email, plaintext email, push payload, in-app UI, URL, log, and provider metadata are different output domains.
16. Review security, privacy, and deletion.
   - Do not put sensitive customer, payment, document, health, legal, or security details in lockscreen push text, email subject lines, logs, provider tags, analytics, or provider metadata unless the product policy explicitly allows it.
   - Account deletion, tenant deletion, and privacy erasure should cancel pending deliveries and mask retained notification bodies while preserving legally required records separately.
   - Unsubscribe tokens should be scoped, opaque or HMAC-protected, non-enumerable, and unable to expose account settings beyond the intended preference action.
17. Review channel fallback deliberately.
   - In-app can be the durable product record, push can be immediacy, email can be long-form asynchronous delivery, digest can be low-frequency summary, and SMS can be high-cost exceptional delivery.
   - Do not automatically email because push timed out unless the notification category explicitly allows that user experience and duplicate risk.
   - Record fallback decisions so support can distinguish "not sent by policy" from "sent on another channel."
18. Review fanout, campaigns, and operations.
   - Large announcements need target-count preview, dry run, sample, canary, ramp-up, rate control, campaign cancel, kill switch, expected cost, suppression count, and actual send count.
   - Queue jobs should check campaign cancel or kill-switch state immediately before send.
   - Tenant quotas should prevent one customer's automation or campaign from delaying other tenants' critical messages.
19. Review observability and operator tools.
   - Operators need to answer why sent, why suppressed, when scheduled, which attempt ran, which provider response arrived, what webhook updated state, and what preference or suppression state applied.
   - Logs and metrics should use bounded labels and safe IDs, not full message bodies, email bodies, private resource names, raw prompts, or direct personal data.
   - Re-send tools must define whether they reuse the old intent, create a new intent, respect current preferences, or preserve the original policy snapshot.
20. Test the hostile paths.
   - Cover duplicate source events, concurrent intents, provider timeout after request send, retry after unknown provider outcome, hard bounce, complaint, invalid push token, unsubscribe, link scanner, quiet hours, DST, missing timezone, digest failure, mark_all_read_before race, deleted resource, permission loss, account deletion, provider webhook duplicate, provider webhook out of order, DLQ replay, campaign cancel, and backfill exclusion of already-sent notifications.
   - If deterministic provider, timezone, push, email, webhook, queue, or browser evidence is not configured, report static risk and missing manual or integration proof instead of claiming production delivery safety.

<!-- mustflow-section: postconditions -->
## Postconditions

- Source event, notification intent, schedule, delivery attempt, provider event, suppression, preference, in-app inbox, and audit boundaries are explicit or the missing boundary is reported.
- Channel classification, consent, unsubscribe, suppression, legal override, final pre-send recheck, and fallback behavior are explicit.
- Email, push, in-app, digest, timezone, quiet hours, rate-limit, retry, queue, provider webhook, template, security, privacy, deletion, campaign, and operator-tool risks are fixed or reported.
- Notification-delivery claims distinguish provider acceptance, delivery attempt, user-visible inbox record, provider webhook event, open or click telemetry, and actual user action.
- Tests or evidence cover duplicate, retry, suppression, digest, timezone, webhook, permission, deletion, and operations paths according to scope.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers changed notification behavior and synchronized template surfaces. Do not infer raw email sends, push sends, live provider calls, provider dashboard actions, local servers, queue workers, webhook tunnels, load tests, browser sessions, or campaign dry runs outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source event or notification intent cannot be named, report that the notification path is not reviewable for delivery integrity yet.
- If duplicate prevention depends only on frontend disabling, memory, provider acceptance, or a log line, report the missing durable gate.
- If preference, suppression, legal override, or permission evidence is missing, fail closed for optional notifications and report mandatory-notification policy gaps.
- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the notification invariant it exercised before editing again.
- If safe repair requires schema migration, provider configuration, DNS or sender-domain setup, live deliverability testing, push entitlement setup, legal review, production traffic replay, or operator dashboard work outside the current scope, complete local verification and report the missing boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Notification delivery boundary reviewed
- Source event, notification intent, recipient/channel/category, preference/legal policy, suppression, schedule/timezone/quiet-hours/digest, delivery job and attempt, provider event, in-app inbox, audit, security, privacy, fanout, and operations ledgers checked
- Email, push, in-app, digest, dedupe, rate-limit, retry, queue, provider webhook, template, deletion, and fallback findings
- Notification-delivery fixes made or recommended
- Evidence level: configured-test evidence, schema evidence, provider or framework evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped notification diagnostics and reasons
- Remaining notification-delivery risk
