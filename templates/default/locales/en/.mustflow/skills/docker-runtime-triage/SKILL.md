---
mustflow_doc: skill.docker-runtime-triage
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: docker-runtime-triage
description: Apply this skill when a Docker Engine, Docker Desktop, Docker Compose, container start, crash loop, health check, image pull, build cache, port mapping, DNS, network, volume, bind mount, storage, proxy, registry, Docker context, daemon, cgroup, OOM, signal handling, PID 1, or container runtime symptom is failing, slow, intermittent, or not yet localized to host, daemon, image, Compose config, app process, network, storage, resource, or registry boundaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docker-runtime-triage
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

# Docker Runtime Triage

<!-- mustflow-section: purpose -->
## Purpose

Localize Docker and container runtime failures before blaming application code, Docker itself, or
the most recent Dockerfile edit.

<!-- mustflow-section: use-when -->
## Use When

- A container fails to start, exits immediately, restarts repeatedly, is unhealthy, cannot pull or
  find an image, cannot bind a port, cannot resolve DNS, cannot reach another service, loses data,
  grows disk usage, OOMs, receives wrong signals, or behaves differently under Compose.
- The task is to diagnose Docker Engine, Docker Desktop, daemon, context, image store, registry,
  proxy, network, mount, volume, resource, health, Compose, build, or runtime behavior.
- Evidence may be lost by pruning, rebuilding, restarting, or forcing recreation before the current
  container, image, event, and daemon state are captured.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only edits Dockerfiles, Compose files, CI image builds, SBOM, provenance, image tags, or
  container security posture; use `docker-code-change`.
- The task is already localized to an application-level API, database, cache, queue, auth, or
  performance bug inside the running container; use the narrower owning skill.
- The user asks for destructive cleanup, prune, image deletion, volume deletion, or daemon reset
  without explicit approval and preserved evidence.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Runtime packet: current time, Docker client/server versions, active Docker context, relevant
  environment variables, daemon warnings, host OS, storage driver, cgroup mode, and Docker Desktop
  or Engine boundary.
- Container ledger: stopped and running containers, full command, image id, state, restart policy,
  exit code, OOMKilled flag, health status, start and finish times, logs around the failure window,
  and recent runtime events.
- Actual config ledger: image, entrypoint, command, environment, user, working directory, mounts,
  networks, published ports, exposed ports, labels, resource limits, health check, and restart
  policy from the running container or rendered Compose config.
- Host resource ledger: CPU, memory, swap, disk bytes, inode use, Docker system usage, image store
  mode, build cache, volume usage, and kernel OOM or storage errors when available.
- Network ledger: container network, aliases, container IP, route, resolver config, DNS result,
  port listener address, host port mapping, proxy settings, MTU or VPN suspicion, and firewall
  boundary.
- Storage ledger: bind mounts, named volumes, writable layer changes, missing files hidden by
  mounts, generated host paths, persistent data location, and cleanup risk.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Evidence capture comes before destructive cleanup, prune, rebuild, restart loops, volume deletion,
  forced recreation, or broad firewall changes.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten Dockerfile, Compose, health check, entrypoint, signal handling, port binding,
  network, volume, resource-limit, `.dockerignore`, docs, fixtures, and tests only after the failing
  boundary is localized.
- Add focused tests or docs that preserve the corrected runtime contract.
- Do not run or document inferred long-running servers, background containers, destructive prune
  actions, broad firewall resets, registry pushes, or credentialed image pulls outside configured
  command intents.

<!-- mustflow-section: procedure -->
## Procedure

1. Capture the runtime packet before cleanup. Separate Docker client, server, context, daemon,
   Desktop, host OS, storage driver, cgroup, image store, and proxy evidence.
2. Prove whether the host and daemon can run any known-small container before blaming the
   application image. If that boundary fails, classify the issue as host, daemon, registry, or
   runtime setup rather than app code.
3. Compare image pull, image existence, container creation, process start, health, and app readiness
   as separate phases. A successful pull does not prove runtime start, and a started process does
   not prove readiness.
4. Inspect stopped containers and full state, not only currently running containers. Preserve exit
   code, OOMKilled, restart count, error, health, started and finished times, and recent events.
5. Treat restart policy as evidence mutator. If a loop hides the first error, report the need to
   pause or disable restart behavior before drawing conclusions.
6. Separate container logs from daemon logs. Empty app logs can mean the process never started,
   logged elsewhere, used a nonstandard logging driver, or failed before stdout and stderr existed.
7. Do not treat exit code 137 as automatic OOM. Compare OOMKilled, kernel evidence, manual kill,
   stop timeout, and signal handling before deciding.
8. Check PID 1 and signal behavior when stops are slow or children survive. Prefer exec-form
   entrypoints, init handling, and graceful shutdown evidence when the localized fix owns the image.
9. Compare resource usage against limits. CPU, memory, I/O, and network numbers are meaningless
   without container and host limits, pool pressure, and restart history.
10. Split disk bytes from inode exhaustion and writable-layer growth. Do not prune before naming
    whether images, containers, volumes, build cache, logs, or bind mounts own the growth.
11. Check actual mounts before trusting image contents. Bind mounts can hide files built into the
    image, and mistaken host paths can create directories where files were expected.
12. Split network failures into DNS, route, TCP connect, TLS, HTTP, listener address, port mapping,
    Docker network membership, proxy, firewall, MTU, and VPN boundaries.
13. Remember that container `localhost` is the same container. For Compose-style service calls,
    verify service names, aliases, networks, and whether the target process listens on an external
    interface instead of loopback only.
14. Render Compose config before interpreting it. Variable substitution, `.env`, shell environment,
    overrides, profiles, relative paths, and service health conditions can change the actual
    container contract.
15. Separate start order from readiness. `depends_on`-style sequencing needs health or application
    retry evidence before it is treated as a working dependency contract.
16. Separate tag names from image identity. Compare image id, digest, architecture, pull timing, and
    forced recreation behavior when "new image deployed" is part of the claim.
17. For build failures, separate context content, ignored files, base-image pull, cache reuse,
    stage-specific cache invalidation, native dependencies, and final runtime contents.
18. Once the boundary is localized, switch to `docker-code-change`, language-specific skills,
    network, storage, process, API, database, cache, or observability skills for the owning fix.

<!-- mustflow-section: postconditions -->
## Postconditions

- Host, daemon, context, image, container, Compose, app process, network, storage, resource, proxy,
  registry, and build boundaries are localized or named as evidence gaps.
- Destructive cleanup, broad firewall reset, rebuild, restart, force recreate, or prune was not used
  as a substitute for evidence.
- Any source edit is tied to the localized runtime boundary.

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

Report missing Docker daemon, Compose rendering, image build, runtime smoke, health, network,
volume, inspect, event, vulnerability, SBOM, provenance, registry, or Desktop diagnostic evidence
instead of inventing raw Docker commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the container or daemon evidence was already destroyed, report the missing evidence and use the
  next reproducible packet rather than reconstructing from memory.
- If a destructive cleanup appears necessary, stop and ask for explicit approval after naming the
  evidence that will be lost.
- If credentials, registry tokens, private environment variables, host paths, or user data appear in
  evidence, redact before storing or reporting.
- If configured verification fails, preserve the failing intent and output tail, then fix only the
  localized boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Docker runtime triaged
- Host, daemon, context, image, container, Compose, process, resource, storage, network, proxy,
  registry, and build findings
- Evidence preserved and evidence missing
- Fix applied or recommended
- Evidence level: configured-test evidence, static review risk, manual-only, missing, or not
  applicable
- Command intents run
- Skipped Docker diagnostics and reasons
- Remaining Docker runtime risk
