---
mustflow_doc: skill.coolify-operations-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: coolify-operations-review
description: Apply this skill when self-hosted Coolify or Coolify Cloud servers, applications, services, databases, build servers, destinations, Docker Compose stacks, domains, TLS certificates, Traefik or Caddy proxies, health checks, rolling updates, preview deployments, environment variables, build secrets, API tokens, teams, backups, restores, updates, monitoring, cleanup, resource limits, networking, firewalls, or deployment and rollback behavior are created, changed, reviewed, diagnosed, migrated, secured, or operated.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.coolify-operations-review
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

# Coolify Operations Review

<!-- mustflow-section: purpose -->
## Purpose

Review Coolify as a control plane over Docker, SSH, build, proxy, DNS, storage, credentials, and
host resources. A green dashboard proves only the state Coolify observed. It does not prove the
host is isolated, the application is ready, traffic reaches the intended container, secrets stayed
out of an image, backups restore, or a rollback survives current data.

<!-- mustflow-section: use-when -->
## Use When

- A task installs, configures, upgrades, secures, diagnoses, backs up, restores, or migrates Coolify.
- A Coolify deployment fails during source, build, container start, health check, proxy, DNS, TLS,
  database, storage, environment, or resource stages.
- A change claims rolling updates, zero downtime, rollback, preview isolation, least privilege,
  backup readiness, or production readiness on Coolify.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes a Dockerfile or Compose file without Coolify behavior; use
  `docker-code-change` first.
- The task only changes generic deployment sequencing; use `deployment-rollout-safety-review`
  first and this skill for Coolify-specific eligibility and control-plane behavior.
- The task only changes Hetzner infrastructure; use `hetzner-cloud-change` first and return here for
  the Coolify layer.
- Live host, production deployment, SSH, Docker, firewall, backup, restore, update, cleanup, or
  database commands lack a configured command intent. Produce a bounded runbook instead.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Deployment topology: self-hosted or Cloud, Coolify version, management server, execution servers,
  build servers, registry, CPU architectures, failure domains, SSH paths, and proxy ownership.
- Resource ledger: application, service stack, database, domain, internal and published ports,
  networks, volumes and bind mounts, environment keys, secrets, health checks, jobs, workers,
  schedulers, backups, notifications, and API tokens.
- Artifact and rollout ledger: source revision, build pack, Dockerfile or Compose, image digest,
  build and runtime variables, pre/post-deploy commands, migration sequence, health state, traffic
  switch, stop timeout, previous image retention, and rollback compatibility.
- Network ledger: A/AAAA records, Cloudflare mode, external ports, host published ports, container
  listen addresses, proxy-shared networks, TLS challenge, provider firewall, Docker rules, and UFW.
- Recovery ledger: Coolify database backup, `APP_KEY` and previous keys, Coolify SSH keys,
  application databases, Redis role and persistence, volumes, off-host copy, exact restore version,
  restore rehearsal, RPO/RTO, and replacement-server path.
- Security ledger: team roles, server SSH and Docker access, API token permissions and team scope,
  preview trust boundary, production secret access, build secret transport, rotation and revocation.
- Relevant repository command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read [Coolify Production Operations Checklist](references/coolify-production-checklist.md) for
  Coolify work and refresh dated product behavior against current official documentation.
- Classify the requested output as repository change, review, incident runbook, or live operation.
- Preserve provider, organization, application, database, and host policies that are stricter.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update version-controlled Docker, Compose, Coolify integration, proxy, environment schema,
  health-check, deployment, backup, monitoring, runbook, tests, fixtures, routes, and templates in
  task scope.
- Add evidence checks for artifact identity, readiness, network reachability, secret transport,
  resource limits, backup restoration, and rollback compatibility.
- Do not mutate a live Coolify instance, server, Docker daemon, firewall, DNS, certificate,
  database, volume, token, APP_KEY, SSH key, cleanup policy, or deployment state without a
  configured intent.

<!-- mustflow-section: procedure -->
## Procedure

1. Refresh Coolify-specific facts. Record the actual instance version and deployment mode. Treat
   self-update defaults, port requirements, feature eligibility, permissions, and restore steps as
   current-product facts rather than permanent platform truths.
2. Draw the control-plane topology. Separate management, execution, build, registry, proxy, DNS,
   storage, monitoring, and backup failure domains. A build spike must not evict the application,
   database, proxy, and dashboard together in production.
3. Build the authority ledger. Name who can use Coolify UI, API, SSH, Docker, provider console,
   DNS, registry, object storage, and database credentials. A non-root label, Coolify role, or team
   membership does not reduce root-equivalent SSH, sudo, Docker socket, or root-token power.
4. Split deployment failure into source/auth, build, container start, health/readiness, proxy,
   DNS/TLS, and dependency stages. Preserve exit, OOM, restart, health log, Docker event, proxy log,
   and host resource evidence before restarting or redeploying.
5. Reconcile port layers. Distinguish external client port, provider and host firewall, Docker
   published port, proxy target port, Coolify exposed port, Dockerfile `EXPOSE`, and actual
   `0.0.0.0` container listener. A domain-routed application normally does not need a host port.
6. Reconcile network selection. Prove the proxy and application share the intended network and
   that multiple Compose networks do not let the proxy select an unreachable address. Do not use a
   manual `docker network connect` as a persistent deployment fix.
7. Treat health as traffic admission. Verify the exact in-container command, required binary,
   Dockerfile precedence, path, port, protocol, status, timeout, retries, and cold-start period.
   Make readiness cover required internal initialization without turning every external dependency
   into a fleet-wide eviction trigger.
8. Prove rolling-update eligibility before promising zero downtime. Check valid health, default
   container naming, non-Compose deployment, no conflicting host port, PID 1 signal handling,
   graceful drain, stop timeout, session and file externalization, scheduler/worker separation, and
   old/new database compatibility. Otherwise design blue-green or explicit maintenance.
9. Bind rollback to a verified image digest and compatible data/config state. Retain enough old
   images for the rollback window and keep cleanup from deleting them. A Git commit or dashboard
   deployment record alone is not a runnable rollback artifact.
10. Separate build and runtime secrets. Classify each Coolify variable, avoid general build args for
    credentials, verify the actual BuildKit secret path and image history, protect multiline and
    literal values, and log only presence or structural validation. An attacker-controlled preview
    build can exfiltrate any secret or network access it receives.
11. Minimize automation authority. Give deployment automation only required team-scoped `deploy`
    or read permissions; avoid `root` and `read:sensitive`, set expiration and revocation, restrict
    API source addresses when practical, and separate production from unrelated team resources.
12. Separate resource budgets. Reserve host capacity for Docker, proxy, Coolify, databases, and
    recovery; cap application and build concurrency; stagger backup, update, cleanup, and cron I/O;
    bound logs and inodes; and use host PSI and provider telemetry rather than dashboard averages.
13. Make cleanup subordinate to recovery. Schedule bounded image and build-cache cleanup, preserve
    rollback images, inspect stopped resources, and keep unused-volume deletion off unless every
    candidate is proven disposable. Never use broad prune as an incident reflex.
14. Separate backup planes. Coolify control-plane backup does not contain application volumes or
    database state. Back up Coolify DB, APP_KEY history, SSH keys, application databases, Redis when
    authoritative, volumes, configuration, artifact identity, and DNS separately to independent
    storage.
15. Prove restoration. Restore with the data-compatible Coolify and database versions on a clean
    server; reattach SSH authority, decrypt credentials, restore each data plane, recreate proxy and
    networks, validate domains and TLS, and measure RPO/RTO through a real user path.
16. Control updates as deployments. Disable unattended production Coolify mutation when current
    official guidance recommends it, separate Coolify, template, OS, Docker, proxy, and application
    update clocks, snapshot the recovery ledger, canary, observe, and retain a deterministic rollback.
17. Use two monitoring paths. Coolify monitoring is useful for container, disk, and backup state,
    but keep external reachability, certificate, DNS, host pressure, disk/inode, backup freshness,
    and control-plane availability monitoring outside the instance it observes.
18. Route adjacent risks. Use `ubuntu-server-operations-review` for Ubuntu host state,
    `postgresql-code-change` for PostgreSQL recovery or migration detail, `security-privacy-review`
    for threat review, and `deployment-rollout-safety-review` for application-wide rollout logic.

<!-- mustflow-section: postconditions -->
## Postconditions

- Control-plane, artifact, network, health, secret, authority, resource, backup, and recovery
  boundaries are explicit.
- Rolling, zero-downtime, backup-ready, least-privilege, and rollback-ready claims have Coolify-
  specific evidence rather than dashboard status.
- Current Coolify defaults and feature constraints are dated or reverified.

<!-- mustflow-section: verification -->
## Verification

Use the narrowest configured intents:

- `test_related`, `lint`, or `build` for Docker, Compose, health, proxy, environment, or deployment code.
- `docs_validate_fast` for Coolify runbooks and skills.
- `test_release` for bundled skill, template, or package changes.
- `mustflow_check` for broad mustflow-owned changes.

Do not present local file tests as live Coolify, DNS, TLS, proxy, restore, or production evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If topology, authority, or data ownership is unknown, stop destructive cleanup, migration, update,
  or restore advice and report the missing ledger.
- If health and rolling eligibility are incomplete, remove the zero-downtime claim and choose an
  explicit maintenance or blue-green plan.
- If APP_KEY, SSH keys, application data, or independent restore evidence is absent, classify
  recovery as unverified even when the Coolify backup job is green.
- If current official docs differ from this reference, use the current docs and update the dated
  contract rather than forcing stale behavior.

<!-- mustflow-section: output-format -->
## Output Format

- Coolify version and official-fact freshness
- Control-plane topology and authority ledger
- Deployment stage and preserved failure evidence
- Port, network, health, rolling, artifact, and rollback findings
- Resource, update, cleanup, monitoring, secret, preview, and API decisions
- Backup planes, restoration result, RPO/RTO, and remaining manual proof
- Remaining Coolify operations risk
