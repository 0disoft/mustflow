---
mustflow_doc: skill.docker-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: docker-code-change
description: Apply this skill when Dockerfiles, .dockerignore files, Docker Compose files, BuildKit or buildx behavior, container image metadata, image tags, container entrypoints, health checks, Docker-based CI workflows, image security scanning, SBOM or provenance settings, registry publishing, or container runtime validation are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docker-code-change
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

# Docker Code Change

<!-- mustflow-section: purpose -->
## Purpose

Prevent container image accidents by preserving reproducibility, secret safety, cache behavior,
runtime correctness, development and production separation, and supply-chain evidence.

This skill is not a Docker syntax guide. It is a safety procedure for changing Docker-based
application images and local container workflows without silently weakening build, runtime, CI,
or security contracts.

<!-- mustflow-section: use-when -->
## Use When

- `Dockerfile`, `Dockerfile.*`, `.dockerignore`, `compose.yaml`, `compose.yml`,
  `docker-compose*.yml`, or Compose override files are created or changed.
- Base images, image tags, digest pinning, package-manager install layers, build contexts,
  multi-stage boundaries, `ENTRYPOINT`, `CMD`, `USER`, `HEALTHCHECK`, `EXPOSE`, labels,
  environment variables, or build arguments change.
- BuildKit, buildx, build targets, cache mounts, external cache, multi-platform image builds,
  Docker-based CI workflows, image publish behavior, registry tags, SBOM, provenance,
  signing, or image vulnerability scanning changes.
- Local development Compose services such as databases, Redis, queues, object stores,
  mail capture, optional debug tools, profiles, volumes, networks, env files, init scripts,
  or migration jobs change.
- A language-specific runtime skill mentions Docker base images, native dependency image
  behavior, container deployment support, or Docker runtime declarations.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes application code that happens to run inside an unchanged container;
  use the matching language or framework skill.
- The task only changes generic environment variables, secrets, or deployment settings
  outside Docker or Compose; use `config-env-change` or the narrower deployment skill.
- The task designs Kubernetes, ECS, Cloud Run, Nomad, service mesh, registry administration,
  autoscaling, backup, ingress, TLS, or cloud platform resources beyond verifying that an
  image is deployable.
- The task only addresses shell process execution or filesystem path handling outside
  container files; use `process-execution-safety`, `file-path-cross-platform-change`, or
  `cross-platform-filesystem-safety`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Container surfaces: Dockerfiles, `.dockerignore`, Compose files, CI workflow files,
  build scripts or command-contract entries, release workflow files, and registry metadata
  touched by the change.
- Project classification: runtime-source app, compiled artifact app, JVM artifact app,
  static frontend, multi-service app, or mixed image set, with language examples such as
  Node, Bun, Python, PHP, Go, Rust, C++, and Java.
- Base image and platform signals: image names, tags, digests, OS family, libc expectations,
  CPU architecture, native dependencies, required CA certificates, time zone, shell, package
  manager, and runtime user needs.
- Build and cache signals: build context, `.dockerignore`, lockfiles, package-manager cache
  paths, BuildKit mount needs, stage names, build targets, external cache ownership, and
  CI event or branch conditions.
- Runtime contract: `USER`, file ownership, writable paths, `ENTRYPOINT`, `CMD`, signal
  handling, health checks, ports, logs, config injection, read-only filesystem expectations,
  volumes, and smoke-test path.
- Security and supply-chain contract: secrets, SSH keys, private registry tokens, Docker socket
  access, privileged mode, host namespace or host path access, capabilities, security options,
  vulnerability scan gate, SBOM, provenance, signing, and digest reporting.
- Configured command intents that can validate syntax, build output, tests, docs, release
  packaging, and mustflow workflow alignment. Report missing Docker-specific verification
  intents instead of inventing raw Docker commands.

<!-- mustflow-section: preconditions -->
## Preconditions

- Classify whether the change affects local development only, CI validation, release images,
  registry publishing, or deployable runtime behavior before editing.
- Do not optimize a Dockerfile by blindly minimizing line count or image size. Preserve
  reproducibility, secret safety, cache behavior, runtime correctness, and dev/prod separation
  first.
- Treat Dockerfiles, Compose files, and Docker CI workflows as security-sensitive when they
  can alter credentials, registry writes, host access, runtime privileges, or supply-chain
  attestations.
- Do not assume Docker, buildx, Compose, Scout, Trivy, Grype, or registry credentials are
  available unless the repository exposes a configured one-shot command intent or the user
  explicitly accepts an unverified manual path.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update Dockerfiles, `.dockerignore`, Compose files, container-related CI workflow snippets,
  image metadata, package tests, docs examples, template metadata, and directly synchronized
  skill routes required by the container contract.
- Add or tighten non-root runtime users, stage names, `.dockerignore` exclusions, cache-safe
  copy order, BuildKit secret or cache requirements, health checks, labels, and Compose local
  dependency wiring when the current project evidence supports the change.
- Add focused tests or assertions only when they encode the changed container, template,
  package, or workflow contract.
- Do not add broad deployment platform design, registry administration, long-running server
  instructions, raw publish commands, credential material, or command permission to a skill
  document.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the changed surface: Dockerfile, `.dockerignore`, Compose, CI build workflow,
   image publish workflow, image metadata, security scan, SBOM/provenance, or runtime smoke
   path. If several surfaces changed, name the source of truth for each.
2. Classify the image shape before choosing structure:
   - Runtime-source apps keep source plus production runtime dependencies.
   - Compiled artifact apps should usually copy only the binary and required runtime files.
   - JVM artifact apps should build with a JDK and run with a JRE or equivalent runtime image.
   - Static frontends should copy only built assets into the serving image when applicable.
3. Choose base images deliberately. Prefer trusted versioned images over mutable `latest`.
   Use Debian slim as a conservative default for native dependency compatibility; use Alpine
   only after libc and native package behavior are verified; use distroless or `scratch` only
   when CA certificates, time zone, passwd or non-root identity, shell absence, and debugging
   tradeoffs are explicit.
4. Treat digest pinning as a reproducibility choice with an update obligation. If a production
   sample pins a digest, also report the need for an update mechanism such as dependency update
   automation, base-image rebuild checks, or a scanner policy.
5. Preserve build cache boundaries. Keep build context small, copy dependency manifests and
   lockfiles before application source, avoid copying host dependency directories, and keep
   package-manager caches out of final images. Do not move `COPY . .` above dependency install
   layers unless the project has no cache-sensitive dependency step.
6. Check `.dockerignore` whenever build context changes. Exclude VCS metadata, local dependency
   directories, virtual environments, build output, coverage, caches, local databases, `.env`,
   credential files, keys, and other files not required by the build.
7. Use multi-stage boundaries only when they buy cache, artifact, security, or test-target value.
   Name stages instead of relying on numeric indexes. Remove stages that merely rename the same
   base without changing cache behavior, artifact flow, runtime base, or verification target.
8. Ensure final images contain only runtime requirements. Do not leave compilers, package managers,
   test fixtures, source maps, caches, `git`, `curl`, shell tools, or dev dependencies in final
   images unless the runtime contract explicitly requires them.
9. Handle secrets as a hard boundary. Do not put tokens, passwords, SSH keys, cloud credentials,
   `.npmrc`, `.pypirc`, `.env`, or private registry credentials into `ARG`, `ENV`, labels,
   image layers, build logs, copied files, or command history. Prefer BuildKit secret or SSH
   mounts when a configured workflow supports them, and report missing secret-mount verification
   when it does not.
10. Preserve runtime correctness. Verify non-root user intent, file ownership, writable paths,
   entrypoint and command shape, PID 1 signal handling, exposed and published ports, logs to
   stdout or stderr, health check command availability, required environment variables, and
   read-only filesystem expectations.
11. Treat `USER` as a runtime proof obligation, not a text check. If the final image runs as
   non-root, make sure copied files and runtime write paths are owned or writable by that user.
   If that cannot be verified, report the missing run evidence.
12. Keep Compose scoped. Use Compose for local development, integration tests, and narrow
   production-like checks. Do not turn Compose into a full orchestrator design for TLS,
   autoscaling, backups, ingress, secret rotation, or platform rollout strategy.
13. For Compose dependencies, distinguish container start from service readiness. Prefer
   health checks for databases and queues, app-level retry for runtime dependency loss, named
   volumes for persistent local data, bind mounts for editable source, profiles for optional
   tools, and one-shot migration services rather than hiding app migrations inside database
   image entrypoints.
14. Review Compose trust and host access. Treat `privileged`, Docker socket mounts, host
   networking, host PID or IPC namespaces, broad host-path mounts, root users, broad port
   binding, unconfined security profiles, and missing resource limits as high-risk changes
   requiring explicit justification.
15. For CI, separate test builds from publish builds. PR and fork events should not push images,
   receive registry credentials, write production caches, sign artifacts, or use deployment
   secrets. Release tags or protected default-branch jobs may publish only after the configured
   verification path succeeds.
16. Keep cache ownership safe in CI. Do not let untrusted PRs overwrite default-branch cache
   refs. Use branch- or event-scoped cache references when the workflow supports external cache.
   Report cache poisoning risk when the workflow writes shared caches from untrusted code.
17. Keep image tags traceable. Use immutable commit or digest evidence for deployable artifacts.
   Treat `latest` as a moving pointer, not a release identity. Release workflows should record
   the pushed digest and update floating tags only from release or protected branch events.
18. For release images, require SBOM and provenance when the configured workflow supports them.
   Report when local-only image loads cannot carry registry attestations and when final published
   digests were not rechecked after push.
19. Choose verification through configured intents first. If Docker-specific syntax, build,
   smoke, inspect, history, vulnerability scan, SBOM, provenance, multi-arch, or registry-pull
   verification is needed but not configured, report the missing intent instead of running an
   inferred command.
20. When reporting completion, separate source edits, image-build evidence, runtime evidence,
   security scan evidence, supply-chain evidence, registry evidence, and skipped checks. Do not
   claim a container image is production-ready from source inspection or a successful build alone.

<!-- mustflow-section: postconditions -->
## Postconditions

- The image shape, base image choice, cache order, stage boundaries, and build context are
  deliberate and aligned with the language or runtime contract.
- Secrets are not introduced into Dockerfile instructions, Compose environment, image layers,
  command history, logs, SBOM, or provenance metadata.
- Final runtime images avoid root execution and unnecessary build tools unless explicitly justified.
- Compose remains local or narrowly production-like, with host access and privileged settings
  justified or rejected.
- CI image builds separate test, cache, publish, tag, SBOM, provenance, and registry credentials
  according to event trust.
- Docker-specific verification evidence is recorded, or missing configured intents are reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Report missing Dockerfile lint, Compose config validation, buildx check, image build, container
start, health or smoke test, image inspect, history secret scan, vulnerability scan, SBOM,
provenance, multi-platform manifest, registry push, registry pull, or digest verification intents
when those surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a build succeeds but runtime start, health, smoke, or non-root write behavior is unverified,
  report the image as built but not runtime-verified.
- If a secret appears in `ARG`, `ENV`, copied files, image history, logs, or attestation metadata,
  remove the leak path before optimizing cache or image size.
- If Alpine, distroless, or `scratch` breaks native dependencies, CA certificates, time zones,
  shell availability, or non-root identity, restore a compatible runtime base or report the
  missing runtime requirement.
- If Compose uses Docker socket, privileged mode, host namespaces, broad host mounts, root users,
  or broad port exposure without explicit justification, treat the change as unsafe.
- If CI publish behavior is triggered from untrusted events, forks, or ordinary PRs, fail closed
  by disabling push or credentials for that path and report the publish boundary.
- If Docker-specific tools or registries are unavailable under the command contract, do not invent
  manual commands; report the missing verification intent and remaining risk.

<!-- mustflow-section: output-format -->
## Output Format

- Docker surface classification
- Image shape, base image, cache, and stage decisions
- `.dockerignore`, secret, user, entrypoint, health, port, and runtime notes
- Compose trust, volume, network, env, readiness, and migration notes
- CI cache, tag, publish, SBOM, provenance, registry, and event-trust notes
- Files changed
- Command intents run
- Skipped Docker-specific checks and reasons
- Remaining Docker risk
