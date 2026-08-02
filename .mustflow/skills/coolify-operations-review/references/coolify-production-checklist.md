---
mustflow_doc: skill.coolify-operations-review.coolify-production-checklist
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: reference
---

# Coolify Production Operations Checklist

Use this reference for Coolify installation, deployment, proxy, networking, rolling updates,
resource control, secrets, backups, restores, updates, monitoring, and incident work.

## Contents

1. Freshness and topology
2. Deployment failure and health
3. Network, domains, TLS, and proxy
4. Rolling updates and rollback
5. Resources, schedules, cleanup, and monitoring
6. Backup and restoration planes
7. Environment variables, previews, API, and authority
8. Verification matrix
9. Primary anchors

## 1. Freshness and Topology

- Record Coolify self-hosted or Cloud mode, exact version, update channel, management server,
  execution servers, build servers, proxy, registry, architecture, storage, DNS, and provider.
- Refresh current official documentation before relying on default auto-update state, required
  ports, supported OS, non-root behavior, rolling eligibility, API permissions, or restore syntax.
  The product documentation snapshot reviewed on 2026-08-02 is evidence for that date only.
- Separate management, execution, and build failure domains for production. Builds create temporary
  CPU, memory, I/O, image, and cache load; a build server must match the output architecture or
  publish explicit multi-platform images.
- Treat documented minimum host resources as an installation floor, not workload capacity proof.
  Reserve capacity for Docker, proxy, Coolify, databases, logging, backups, and recovery.
- Use a clean supported host and one Docker package owner. Snap Docker or mixed installation paths
  can violate Coolify installation expectations. Verify clock synchronization because source
  integrations and certificates depend on time.
- Map SSH from the Coolify control plane to managed servers. A user called non-root can still be
  root-equivalent through unrestricted passwordless sudo; Docker access is also root-equivalent.

## 2. Deployment Failure and Health

- Split deployment into source authorization, clone, build detection and context, dependency
  install, image creation, container creation, process start, health, proxy registration, DNS/TLS,
  and dependency connection. Do not call them all build failure.
- Before restart or redeploy, preserve container status, exit code, OOM flag, error, restart count,
  health logs, timestamped application logs, Docker events, proxy logs, host pressure, disk bytes,
  inodes, and build-cache state.
- Exit 137 means SIGKILL, not automatically OOM. Require OOM state and host/cgroup evidence.
  Exit 0 with restart growth can mean the foreground server process ended normally under a restart
  policy.
- Coolify UI application health checks run inside the container and require a usable probe binary
  such as curl or wget. Dockerfile `HEALTHCHECK` takes precedence when both are configured. Compose
  service stacks define health in Dockerfile or Compose.
- Reconcile the exact command, internal path and port, HTTP or HTTPS, expected code, interval,
  timeout, retries, and start period. Test from the same network and namespace as the real probe.
- Make health a readiness contract: configuration loaded, port bound, required internal startup and
  essential database path ready. Keep it fast, deterministic, side-effect free, and resilient to
  optional third-party outages.
- Separate Coolify Build and Runtime variable scopes. A restart may not recreate a container with
  changed creation-time configuration; use the product's current redeploy semantics. Do not log
  secret values while diagnosing missing variables.
- Inside a container, localhost is that container. Prove service names, shared networks, dependency
  health, connection retry, mount paths, and numeric UID/GID ownership.

## 3. Network, Domains, TLS, and Proxy

- Keep these port layers separate: user-facing 80/443, provider firewall, host firewall, Docker
  published address and port, reverse-proxy listener, proxy target port, Coolify exposed port,
  Dockerfile `EXPOSE`, and application listen socket.
- A domain definition with an internal application port normally routes external 443 to that target;
  it does not require publishing the application port on the host. Host publishing can bypass the
  proxy, collide during rolling updates, and expose the service directly.
- Bind the application to `0.0.0.0` inside the container. A loopback-only listener is invisible to
  the proxy even when it works from inside the same container.
- Coolify and Compose can attach multiple networks. Prove a stable shared network between proxy and
  application and avoid ambiguous multiple addresses. Manual network attachment disappears when
  containers are recreated.
- Separate 502, 503, 504, 404, and no-available-server evidence. Check external response, proxy log,
  container and health state, and a direct request from the proxy network before changing timeouts.
- A longer proxy timeout does not make a synchronous long job reliable. Move lengthy work to a
  durable job with status and idempotency where possible.
- Maintain an external domain-resource ledger: domain, Coolify resource, internal target, DNS owner,
  proxy, certificate method, IPv4, IPv6, and customer ownership.
- Do not publish AAAA without working IPv6 routing, firewall, proxy, and application reachability.
  ACME validation may choose IPv6 and fail even when IPv4 works.
- Separate DNS resolution, ACME challenge, origin certificate, proxy certificate, Cloudflare proxy,
  and WAF. Prefer Full (strict) for Cloudflare-to-origin TLS; Flexible creates a plaintext origin
  hop and can cause redirect loops.
- Use DNS-01 wildcard certificates when the operational model justifies many controlled
  subdomains. Customer-owned domains still need ownership verification, conflict handling,
  renewal, removal, and abuse controls.
- Docker NAT rules can bypass intuitive UFW policy. Verify provider firewall and Docker packet path
  from external IPv4 and IPv6 vantage points. Close direct dashboard/realtime/terminal ports after
  a current supported domain/proxy access path replaces them.

## 4. Rolling Updates and Rollback

- Current official Coolify rolling updates require a valid passing health check, default container
  naming, a non-Docker-Compose application, and no conflicting host port mapping. Refresh these
  conditions before every durable claim.
- The new container becomes the traffic candidate only after health succeeds; the old container
  then stops. This does not transfer in-flight work, sessions, local files, cron ownership, or queue
  leases automatically.
- Use exec-form entrypoints, a real PID 1 signal path, SIGTERM handling, connection drain, bounded
  graceful shutdown, and stop timeout greater than the longest allowed in-flight operation.
- Externalize sessions and durable files, separate web, scheduler, and worker ownership, prevent
  duplicate scheduled work, and make interrupted queue work retryable and idempotent.
- Use expand-and-contract database migration so old and new versions coexist. Separate migrator
  ownership, pre/post-deployment execution context, locks, partial progress, and rollback limits.
- Bind rollback to a tested image digest plus compatible environment, secret version, database,
  cache, queue, and volume state. Preserve old images through the rollback window.
- Docker Compose stacks do not gain native rolling updates from a toggle. Use explicit blue-green,
  multiple resources, proxy or load-balancer switching, or a declared maintenance window.
- Single-host rolling reduces process replacement interruption but does not survive host, Docker,
  storage, network, or control-plane failure. Do not market it as host-level high availability.

## 5. Resources, Schedules, Cleanup, and Monitoring

- Cap application memory and CPU where appropriate and leave host headroom. Limit build concurrency
  or use a build server so image builds cannot evict databases, proxy, Docker, or Coolify.
- Monitor cgroup and host memory pressure, OOM, CPU steal, I/O pressure, disk bytes, inodes, Docker
  logs, image/cache growth, container restarts, proxy errors, certificate expiry, and backup age.
  Dashboard averages alone miss tail and host pressure.
- Stagger Coolify updates, OS and Docker updates, application deploys, database backups, volume
  copies, Docker cleanup, and application cron. Midnight is not an isolation boundary.
- Bound Docker logs. Changing daemon defaults can affect only newly created containers, so inventory
  existing logging drivers and recreate deliberately when required.
- Coolify automated cleanup removes managed stopped containers, unused images, build cache, helper
  images, and optionally unused volumes or networks. The official docs warn that volume cleanup can cause data loss. Keep it disabled unless ownership is proven.
- Prefer scheduled bounded cleanup over emergency threshold-only reaction, but keep rollback image
  retention, active deployment protection, cache warm-up cost, and recovery artifacts explicit.
  Never automate broad volume prune.
- On the dated 2026-08-02 documentation snapshot, self-hosted automatic update was enabled by default and disabling it was recommended for production. Reverify this behavior. Keep update
  checks active, schedule reviewed updates separately, and snapshot recovery state first.
- Separate Coolify, service-template, OS, Docker, proxy, database, and application update clocks.
  Canary and observe each survival-path update with a deterministic rollback or replacement path.
- Pair Coolify monitoring and notifications with external uptime, DNS, TLS, provider, host pressure,
  storage, backup-age, and control-plane monitoring. The failed instance cannot be its only alarm.

## 6. Backup and Restoration Planes

- Coolify's instance backup covers the Coolify control plane and settings, not application data or
  volume mounts. Back up each plane separately.
- Preserve Coolify database backup, exact Coolify version, `APP_KEY` or previous-key history,
  `/data/coolify/ssh/keys`, public authorization, relevant `/data/coolify` configuration, proxy and
  DNS mapping, registry and image identity, and independent backup credentials.
- Without the correct APP_KEY history, restored encrypted credentials may not be usable. Without the
  original Coolify SSH keys and matching authorization, managed servers become unreachable.
- For PostgreSQL, use a database-consistent logical backup for ordinary recovery and define WAL/PITR
  when RPO requires it. Do not archive a live PGDATA directory as a generic backup.
- Decide whether Redis is disposable cache or authoritative state. Configure persistence, copy
  consistent artifacts, and test application behavior with loss according to that decision.
- Quiesce writers or use application-aware snapshot methods for Docker volumes. Preserve ownership,
  permissions, labels, paths, and the software version that wrote the data.
- Store backups outside the VPS, account, and credentials that can destroy production. A same-host
  copy shares host, disk, operator, malware, and deletion failure domains.
- Restore on a clean server using a data-compatible Coolify and database version. Verify control
  plane, decryption, SSH reachability, applications, DB/Redis/volumes, proxy networks, DNS, TLS,
  schedules, workers, backups, notifications, and a real user path. Measure RPO and RTO.
- A green backup job, downloadable file, or successful `pg_dump` does not prove complete system
  recovery. Test restoration regularly and after survival-path changes.

## 7. Environment Variables, Previews, API, and Authority

- Build and Runtime are independent scopes. Do not accept defaults blindly; classify each key by
  phase, sensitivity, consumer, rotation, and whether a rebuild or redeploy is required.
- Do not pass credentials through ordinary Docker `ARG` or `ENV`. Use Coolify Build Secrets and
  BuildKit secret mounts only after verifying the actual BuildKit path. Inspect image history and
  final filesystem; secret mounts do not make malicious build code safe.
- Treat public PR previews as attacker-controlled code execution. Give them no production secrets,
  production network, unsanitized production data, privileged Docker access, or reusable cloud
  credentials. Use disposable isolated services and trusted-branch gates for secret-bearing preview.
- Preserve literal and multiline secret structure without logging values. Verify length, parsing,
  certificate/key structure, and real connection behavior; manage the expected secret-name schema
  in version control.
- Coolify API tokens are team-scoped. Current documented permissions include `read`,
  `read:sensitive`, `write`, `deploy`, and `root`; root bypasses permission checks. Give CI only the
  required deploy/read scope, expiry, revocation path, environment isolation, and IP restriction
  where feasible.
- Coolify team roles do not override SSH, sudo, Docker, provider, DB, registry, or DNS authority.
  Model server root and Docker access as secret-reading and host-control permission.
- Rotate credentials with overlap: issue next, deploy consumers, prove use, drain old connections
  and workers, revoke old, then remove old configuration. Do not casually overwrite APP_KEY.
- Before deleting a user or team owner, transfer resource ownership, tokens, webhooks, SSH keys,
  backup credentials, and at least one surviving owner. Refresh current deletion semantics before
  any irreversible action.

## 8. Verification Matrix

| Change | Minimum evidence |
| --- | --- |
| New server | topology, supported host, one Docker owner, clock, firewall, SSH authority, resource headroom, off-host recovery |
| Failed deployment | stage classification, exit/OOM/restart/health/events, proxy logs, network path, host pressure, immutable artifact |
| Domain or TLS | A/AAAA, external IPv4/IPv6, proxy target, ACME method, Cloudflare mode, origin TLS, renewal and ownership |
| Rolling update | current eligibility, readiness, PID 1/SIGTERM, drain, no host-port conflict, old/new DB compatibility, digest rollback |
| Compose stack | explicit networks and ports, proxy intersection, service health, data ownership, blue-green or maintenance decision |
| Resource or cleanup | host reserve, per-workload limits, schedule collision, logs/inodes, rollback image retention, volume deletion refusal |
| Coolify update | exact source/target version, current notes, control-plane backup, APP_KEY/SSH keys, canary, external monitoring, rollback |
| Backup or migration | all data planes, independent storage, compatible versions, clean restore, DNS/TLS/proxy/app smoke, measured RPO/RTO |
| Preview or secret | code trust, isolated data/network, BuildKit proof, image inspection, schema, rotation, no production authority |
| API automation | team scope, least permission, expiry, IP policy, protected CI environment, revocation and audit |

Reject a production-ready statement when its row lacks configured or operator-owned evidence.

## 9. Primary Anchors

- [Coolify applications](https://coolify.io/docs/applications),
  [build servers](https://coolify.io/docs/knowledge-base/server/build-server), and
  [installation](https://coolify.io/docs/get-started/installation).
- [Health checks](https://coolify.io/docs/knowledge-base/health-checks),
  [rolling updates](https://coolify.io/docs/knowledge-base/rolling-updates), and
  [Docker Compose](https://coolify.io/docs/knowledge-base/docker/compose).
- [Firewall guidance](https://coolify.io/docs/knowledge-base/server/firewall),
  [domains](https://coolify.io/docs/knowledge-base/domains), and
  [gateway timeout troubleshooting](https://coolify.io/docs/troubleshoot/applications/gateway-timeout).
- [Environment variables](https://coolify.io/docs/knowledge-base/environment-variables),
  [preview deployments](https://coolify.io/docs/applications/ci-cd/github/preview-deploy), and
  [API authorization](https://coolify.io/docs/api-reference/authorization).
- [Coolify backup and restore](https://coolify.io/docs/knowledge-base/how-to/backup-restore-coolify),
  [database backups](https://coolify.io/docs/databases/backups), and
  [application migration](https://coolify.io/docs/knowledge-base/how-to/migrate-apps-different-host).
- [Self-hosted updates](https://coolify.io/docs/knowledge-base/self-update),
  [automated cleanup](https://coolify.io/docs/knowledge-base/server/automated-cleanup),
  [monitoring](https://coolify.io/docs/knowledge-base/monitoring), and
  [notifications](https://coolify.io/docs/knowledge-base/notifications/).
- Docker documentation for [resource constraints](https://docs.docker.com/engine/containers/resource_constraints/),
  [logging](https://docs.docker.com/engine/logging/configure/),
  [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/), and
  [Docker privilege](https://docs.docker.com/engine/install/linux-postinstall/).
