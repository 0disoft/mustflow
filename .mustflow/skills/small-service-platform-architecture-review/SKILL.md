---
mustflow_doc: skill.small-service-platform-architecture-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: small-service-platform-architecture-review
description: Apply this skill when a multi-product platform, app factory, solo-developer portfolio platform, many-small-services architecture, shared account portal, Product Registry, shared auth, billing, credits, entitlements, admin console, deployment factory, analytics, logging, i18n, common UI, templates, or operations automation for multiple product apps is created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.small-service-platform-architecture-review
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

# Small Service Platform Architecture Review

<!-- mustflow-section: purpose -->
## Purpose

Review a shared platform for many small products as an app factory, not as many copied services.

The core question is: "Can a new product be added mostly by declaring product facts, while auth,
billing, credits, entitlements, admin, analytics, observability, legal, deployment, and operations
stay shared and explainable?" If not, the portfolio is just copy-paste debt with domains attached.

<!-- mustflow-section: use-when -->
## Use When

- A repository, architecture plan, template, generator, or product platform is intended to support
  many small apps, micro-SaaS products, SEO tools, AI tools, API products, downloads, extensions,
  or similar product shells.
- Code, docs, schemas, templates, or reviews touch a Product Registry, app catalog, shared account
  portal, shared identity, organization, billing, credit ledger, usage meter, entitlement, admin,
  analytics, logging, notification, i18n, legal, feature flag, app template, deployment factory,
  file service, job queue, integration service, outbound webhook, AI Gateway, or license service.
- A review or final report claims that creating another service is easy, the platform is reusable,
  templates are shared, billing or credits are common, apps are tenant-safe, or operations can scale
  beyond a few products.
- A solo developer or small team wants to avoid reimplementing account, payment, admin, deploy,
  telemetry, localization, support, and incident workflows for each product.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task concerns one standalone app with no multi-product platform, app factory, shared package,
  or cross-product operational surface.
- The task only changes a single auth flow, OAuth callback, session, token, or permission rule. Use
  `auth-permission-change`, `auth-flow-triage`, or `api-access-control-review`.
- The task only changes one payment, subscription, refund, webhook, credit, or usage path. Use
  `payment-integrity-review` or `credit-ledger-integrity-review`.
- The task only changes an admin screen, notification path, i18n path, deployment pipeline,
  component library, AI feature, file upload, queue, or service boundary. Use the matching
  specialist skill first.
- The task is an organization-scale microservice split decision rather than a product-app factory.
  Use `service-boundary-architecture` first.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, target product count, product types, expected shared versus app-specific behavior,
  repository layout, current diff or target files, and configured command intents.
- Product Registry ledger: `app_id`, domains, environments, product names, auth modes, plan and
  price mapping, entitlement keys, usage meters, credit costs, analytics namespace, admin panels,
  i18n namespace, email templates, legal and consent versions, data categories, and deploy config.
- Identity ledger: users, identities, sessions, organizations, workspaces, memberships, roles,
  permissions, invitations, API keys, service accounts, account linking, and account portal scope.
- Money and access ledger: customers, provider customers, subscriptions, invoices, tax profiles,
  webhook events, refunds, disputes, wallets, credit grants, credit transactions, usage events,
  reservations, quotas, limits, grace periods, and local entitlement state.
- Operations ledger: support view, admin action log, resource change history, impersonation,
  refunds, manual credits, feature overrides, account merge or delete, job logs, webhook logs,
  email logs, runbooks, alerts, backups, and restore tests.
- App factory ledger: app templates, `create-product` or equivalent generator, shared packages,
  thin app shells, CI/CD, preview, staging, production, migration policy, smoke tests, rollback,
  secrets, environment variables, DNS, TLS, CDN, storage, cache, queue, cron, and workers.
- Observability and analytics ledger: event schema, first-value-created event, revenue metrics,
  usage rollups, structured logs, traces, request IDs, app IDs, tenant IDs, alerts, status pages,
  and cost monitors.
- Shared product surface ledger: i18n, legal, consent, notifications, file service, job service,
  integrations, outbound webhooks, SEO, marketing pages, shared UI, feature flags, remote config,
  AI Gateway, license service, and developer portal where relevant.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Existing local platform, template, package, registry, billing, auth, admin, analytics, deploy,
  and operations patterns have been searched before proposing a new platform layer.
- If the change touches money, auth, privacy, admin, deployment, AI, localization, files, queues, or
  notifications, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or refine platform architecture docs, skill procedures, route metadata, templates, tests,
  registry schemas, app factory contracts, shared package boundaries, operational runbooks, and
  directly synchronized template copies tied to the multi-product platform surface.
- Tighten platform boundaries by moving copied product logic into shared packages, registries,
  policy services, ledgers, generators, runbooks, or explicit app-specific extension points.
- Add focused tests for registry validation, entitlement resolution, credit ledger behavior,
  webhook idempotency, template generation, app profile installation, admin permissions,
  analytics event shape, i18n key coverage, smoke checks, and operation runbooks when existing
  project patterns support them.
- Do not migrate to a new cloud, framework, auth provider, billing provider, queue, database,
  analytics tool, or orchestration platform unless the current task explicitly requires that
  migration.
- Do not turn every possible future product feature into mandatory platform scope. Separate the
  phase-one spine from phase-two and phase-three extensions.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide whether this is a platform factory or a single product.
   - A platform factory has several product shells, shared packages, shared ledgers, common
     operations, and a path for adding a product through declaration plus thin app code.
   - If the surface is one app, route to the narrower product or framework skill and report that
     this skill does not apply.
2. Build the Product Registry ledger first.
   - Require one source of truth for app identity, domains, environments, auth policy, billing
     catalog mapping, entitlement keys, usage meters, credit costs, analytics namespace, admin
     panels, i18n namespace, email templates, legal versions, data categories, and deploy config.
   - Flag product facts scattered across routes, Stripe dashboards, environment variables,
     seed scripts, marketing pages, and app-specific constants.
3. Review identity as a shared account operating system.
   - Separate `User` from `Identity` so email, OAuth, passkeys, and account linking can evolve.
   - Require common organization, workspace, membership, invitation, role, permission, API key,
     service account, session management, device session, forced logout, and account portal paths.
   - Keep billing, security, data export, data deletion, and login methods anchored in the account
     portal even when product apps have their own settings.
4. Review billing, entitlements, credits, and usage as local ledgers.
   - Treat the payment provider as an event source, not as the application's only authority.
   - Require provider webhooks to be stored, signature-checked, idempotent, replayable, and mapped
     into local customer, subscription, invoice, refund, dispute, tax, and entitlement state.
   - Reject feature gates such as `plan === "pro"`; require entitlement and limit checks.
   - Reject balance-only credits; require append-only credit transactions, grants, usage events,
     reservations, capture, release, partial capture, expiry, reconciliation, and audit evidence.
5. Review admin and support as production control planes.
   - Require a support view that connects user, organization, apps used, plan, payment state,
     credit ledger, usage, recent errors, jobs, webhooks, notifications, experiments, and blocks.
   - Separate audit logs from resource change history.
   - Require scoped operator permissions, impersonation controls, dangerous-action confirmation,
     reason capture, step-up authentication where needed, production guardrails, and PII masking.
6. Review the app factory.
   - Prefer a generator that registers a product and creates thin app shell files over a large
     template copy that drifts.
   - Keep shared auth, billing, credits, entitlements, analytics, logging, i18n, UI, email, jobs,
     files, deployment, and support behavior in packages or services that remain upgradeable.
   - Require templates for common product shapes only when they still depend on shared packages.
7. Review deployment and database rollout.
   - Require preview, staging, and production separation, environment-scoped secrets, provider
     sandbox separation, migration checks, expand-migrate-contract sequencing, smoke tests,
     rollback or rollback-forward runbooks, and post-deploy observation.
   - Treat manual DNS, TLS, storage, queue, cron, backup, or monitoring setup as product launch
     debt unless it is captured in a reproducible checklist or generator.
8. Review analytics, logging, and operations before product count grows.
   - Standardize event names, `app_id`, anonymous and authenticated user identity, tenant identity,
     locale, country, campaign, plan, experiment, and request or trace identifiers.
   - Require each product to declare its first-value-created event.
   - Require structured logs, traces, alerts, dashboards, runbooks, backup checks, restore tests,
     cost spike alerts, domain and certificate expiry alerts, job dead-letter handling, and webhook
     replay.
9. Review shared product surfaces.
   - Keep notification categories, transactional versus marketing consent, i18n namespaces,
     fallback behavior, legal and consent versions, shared UI layouts, file ownership, job
     idempotency, integration tokens, outbound webhook signing, SEO templates, feature flags,
     remote config, AI Gateway calls, and license keys common unless product-specific behavior is
     deliberately declared.
10. Review privacy and security as cross-product invariants.
    - Require `app_id`, `tenant_id`, `user_id`, `request_id`, and `trace_id` on records where they
      explain ownership, access, audit, or support.
    - Require PII redaction, retention policy, consent records, cookie and marketing preferences,
      data export, delete, anonymize, backup encryption, dependency scanning, abuse detection,
      card-testing detection, and admin read audit for sensitive data.
11. Phase the platform spine.
    - Phase one should cover Product Registry, identity and organization, billing basics, credit
      ledger, entitlement, basic admin, analytics events, structured logging, app template or
      generator, CI/CD, and basic transactional email.
    - Phase two should cover account portal depth, webhook replay, usage rollups, feature flags,
      file service, job queue, support view, i18n, legal and consent, SEO templates, monitoring,
      backups, and restore checks.
    - Phase three should cover AI Gateway, affiliate or referral, license service, outbound
      webhooks, developer portal, advanced experiments, advanced RBAC, warehouse, churn automation,
      abuse detection, and cost optimization.
12. Route specialist risks deliberately.
    - Apply `payment-integrity-review`, `credit-ledger-integrity-review`,
      `admin-control-plane-safety-review`, `notification-delivery-integrity-review`,
      `frontend-localization-review`, `frontend-component-library-review`,
      `deployment-rollout-safety-review`, `ai-product-readiness-review`,
      `file-upload-security-review`, `queue-processing-integrity-review`, or
      `service-boundary-architecture` when the platform review exposes a narrower implementation
      risk.
13. Report evidence level honestly.
    - Separate architecture inspection, schema or registry evidence, package boundary evidence,
      generated template evidence, test evidence, operational runbook evidence, provider webhook
      fixture evidence, and real production-readiness evidence.
    - Name missing configured intents or manual review for provider dashboards, cloud consoles,
      browser smoke tests, visual review, or deployment checks instead of claiming readiness.

<!-- mustflow-section: postconditions -->
## Postconditions

- Product Registry, identity, billing, credit, entitlement, admin, app factory, deployment,
  analytics, logging, shared product surface, security, privacy, operations, and phased rollout
  ledgers are fixed, ruled out, or reported.
- New product creation depends more on declared product facts and thin app code than on duplicated
  auth, payment, admin, analytics, i18n, deployment, and operations code.
- Product-specific behavior is declared as product-specific, and shared behavior has a clear owner.
- Missing provider, deployment, telemetry, security, privacy, localization, or operational evidence
  is named instead of hidden.

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

Use the narrowest configured unit, template, registry, docs, release, package, build, or mustflow
intent that covers the changed platform contract. Do not infer provider dashboard, cloud console,
deployment, browser, visual-regression, package-manager, or dev-server commands outside the command
contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no Product Registry or equivalent source of truth exists, stop treating the platform as
  reusable and report the missing product authority.
- If payment, credit, entitlement, or usage facts are split between provider dashboards and app
  constants, apply the money and ledger specialist skills before claiming platform readiness.
- If templates are copied but shared packages cannot be upgraded across product shells, report
  template drift risk instead of calling the generator complete.
- If admin or support paths require direct database edits, apply `admin-control-plane-safety-review`
  and report the operational safety gap.
- If verification fails, preserve the configured intent name and failure evidence, then fix the
  platform contract surface rather than weakening tests or removing installed files.
- If release impact is unclear, apply `date-number-audit` before editing versions or release notes.

<!-- mustflow-section: output-format -->
## Output Format

- Platform surface reviewed
- Product Registry, identity, billing, credit, entitlement, admin, app factory, deployment,
  analytics, observability, shared surface, security, privacy, operations, and phase ledgers
- Findings, fixes, or recommendations
- Shared versus product-specific ownership decisions
- Specialist skills used or deferred
- Evidence level by registry, schema, package, template, tests, provider, deployment, telemetry,
  and runbook surface
- Command intents run
- Skipped platform-readiness checks and reasons
- Remaining small-service platform architecture risk
