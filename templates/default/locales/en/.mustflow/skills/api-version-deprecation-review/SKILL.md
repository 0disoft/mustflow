---
mustflow_doc: skill.api-version-deprecation-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: api-version-deprecation-review
description: Apply this skill when code is created, changed, reviewed, or reported and API versioning or deprecation needs review for API version registries, endpoint inventory, version negotiation, missing or unknown version fallback, per-version security differences, deprecated endpoints, Deprecation or Sunset headers, deprecation state machines, legacy client support, client version tracking, authenticated caller capability tracking, or sunset shutdown of routes, DNS, keys, scopes, or SDKs.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.api-version-deprecation-review
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

# API Version and Deprecation Review

<!-- mustflow-section: purpose -->
## Purpose

Review API versions and deprecations as an attack-surface lifecycle, not as a documentation task.

The review question is not "is there a version header?" It is "which versions are live, what security
contract does each one enforce, how does a request choose a version, and what actually gets deleted
when a version sunsets?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports API version registries, endpoint inventories, version
  negotiation, version headers or path segments, missing or unknown version fallback, per-version
  authentication or authorization differences, deprecated endpoints, `Deprecation` or `Sunset`
  headers, deprecation notices, legacy client support, client or SDK version tracking, authenticated
  caller capability tracking, or sunset removal of routes, DNS, keys, scopes, or SDKs.
- A change can leave an old, unpatched, or misconfigured version reachable with weaker security than
  the current contract.
- A review needs proof that every reachable version enforces the current security baseline and that
  sunset actually removes the attack surface.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only request or response schema compatibility for the current version; use
  `api-contract-change` first.
- The task is only a third-party SDK or provider version upgrade; use `third-party-api-integration-review`.
- The task is only dependency package versions; use `version-freshness-check` or
  `dependency-upgrade-review`.
- The task is only release or publish behavior of this package; use `release-publish-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- API registry ledger: hosts, base paths, versions, endpoints, environments, public exposure,
  owners, data classes, authentication policy, last-call evidence, and deprecation dates.
- Version security-diff ledger: authentication, scopes, object ownership checks, tenant filters,
  allowed input fields, defaults, rate limits, error responses, audit logs, and side effects per
  active version.
- Deprecation state ledger: notice date, warning state, new-connection freeze, feature restriction,
  block, and physical deletion per version or endpoint.
- Client capability ledger: authenticated caller identity (OAuth client id, API key id, install id),
  owner, contact, used endpoints, last-call time, and required security capabilities.
- Existing version tests, contract tests, docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing registry, version-diff, deprecation, or client evidence
  can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten API registry upkeep, explicit version negotiation without unsafe fallback, uniform
  current security standards across active versions, dated deprecation state machines, authenticated
  caller capability tracking, sunset removal of routes and credentials, and directly synchronized
  documentation or templates owned by the selected boundary.
- Update API docs, changelogs, deprecation notices, and client migration guidance that describe the
  same version contract.
- Do not add raw gateway or DNS configuration commands, or new command authority under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Treat the API list as a deployable asset, not a document.
   - Register every host, base path, version, endpoint, environment, exposure, owner, data class,
     auth policy, last-call time, and deprecation date in one registry, and reconcile it against
     gateway settings, service discovery, and deployment manifests.
   - Block unregistered routes and versions in CI or deployment. Undocumented or unversioned routes
     and missing deprecation plans are direct attack surfaces.
2. Diff versions on security meaning, not only schema.
   - Field additions and removals are half the story. Compare each version's authentication, scopes,
     object ownership checks, tenant filters, allowed input fields, defaults, rate limits, error
     responses, audit logs, and side effects.
   - CI should catch a new version that drops an authorization check or an old version where mass
     assignment reopens. A compatible response shape does not mean identical security.
3. Enforce the current security baseline on every active version.
   - Old clients do not justify weak authentication, loose authorization, old crypto, broad CORS, or
     low validation on legacy versions.
   - Versions may differ in request and response shape; authentication, authorization, tenant
     boundaries, request-size limits, rate limits, malicious-input blocking, and audit policy must
     come from the gateway or common middleware for all active versions.
4. Do not fall back to legacy on missing or unknown versions.
   - Treating "no version header" as v1 or "unparseable version" as the oldest version lets an
     attacker deliberately select a weaker implementation.
   - Negotiate the supported version explicitly and reject missing or unsupported versions with a
     safe error. Internal routing must not silently degrade to a legacy implementation when the new
     one fails.
5. Run deprecation as a dated state machine.
   - Announce with the `Deprecation` header, link the replacement via the `Link` `deprecation`
     relation, and set the actual end date with the `Sunset` header.
   - Move through notice, warning, new-connection freeze, feature restriction, block, and physical
     deletion. A `Deprecation` header alone changes no behavior; indefinite operation with the header
     has no security effect.
6. Track authenticated clients and capabilities, not version strings.
   - `User-Agent` and `X-Client-Version` are attacker-controlled. Link OAuth client id, API key id,
     or install id to owner, contact, used endpoints, and last-call time.
   - Gate on real security capabilities such as required TLS, token format, signature scheme, auth
     scope, and request schema, and reject clients that claim a new version but fail the required
     controls.
7. Delete the attack surface at sunset; do not just stop code.
   - Blocking the gateway route while leaving backend ports, old domains, service discovery, batch
     jobs, admin APIs, and legacy SDK credentials re-exposes the surface through other paths.
   - After the end date, remove routes, DNS, load-balancer config, service accounts, scopes, keys,
     docs, SDKs, test data, and monitoring exceptions, and detect attempts against retired paths.
   - When a version cannot be deleted immediately, isolate it on a separate backend with a restricted
     read-only data view, strict call limits, and a fixed end date.

<!-- mustflow-section: postconditions -->
## Postconditions

- API registry, version negotiation, per-version security parity, deprecation state, client
  capability tracking, and sunset deletion are explicit.
- Unregistered routes, unsafe legacy fallback, weaker security on old versions, header-only
  deprecation, spoofable client gates, and post-sunset surviving routes or credentials are fixed or
  reported.
- Versioning and deprecation claims are backed by configured tests, registry evidence, or labeled as
  manual-only or missing.

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

Prefer the narrowest configured tests that prove version negotiation without unsafe fallback,
per-version security parity, deprecation header contracts, and post-sunset unreachability.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If registry, per-version security, deprecation, or client evidence is missing, report the gap
  instead of claiming the version surface is safe.
- If a legacy version cannot be removed immediately, report the isolation, restriction, and fixed
  end-date plan rather than accepting indefinite operation.
- If the fix requires gateway, DNS, or service-discovery changes outside the command contract,
  complete local verification and report the missing operational evidence.

<!-- mustflow-section: output-format -->
## Output Format

- API version and deprecation surface reviewed
- Registry and inventory findings
- Version negotiation and fallback findings
- Per-version security parity findings
- Deprecation state and client capability findings
- Sunset deletion and remaining-surface findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining versioning and deprecation risk
