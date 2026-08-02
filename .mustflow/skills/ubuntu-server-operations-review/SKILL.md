---
mustflow_doc: skill.ubuntu-server-operations-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: ubuntu-server-operations-review
description: Apply this skill when Ubuntu Server or Ubuntu cloud images, especially Ubuntu 24.04 LTS or 26.04 LTS, are installed, upgraded, tuned, secured, diagnosed, backed up, restored, rebooted, or operated, including APT, dpkg, Snap, PPA, deb822 sources, unattended-upgrades, phased updates, needrestart, Livepatch, kernels, systemd services and timers, journald, cgroup v2, PSI, sysctl, CPU, memory, storage, network, SSH socket activation, AppArmor, UFW, Docker or Podman host integration, release upgrades, and remote recovery.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ubuntu-server-operations-review
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

# Ubuntu Server Operations Review

<!-- mustflow-section: purpose -->
## Purpose

Review Ubuntu operations as several independent state owners rather than one machine-wide
configuration. Package databases, repository candidates, Snap revisions, files on disk, running
processes, kernel state, boot state, systemd drop-ins, container networking, backups, and remote
recovery can all disagree while the server still appears healthy.

<!-- mustflow-section: use-when -->
## Use When

- Ubuntu package, kernel, service, timer, log, cgroup, performance, security, container-host,
  backup, restore, reboot, or release-upgrade behavior is changed or reviewed.
- An incident may involve package ownership, stale processes, phased updates, pressure, storage,
  networking, AppArmor, SSH, systemd ordering, or a recent Ubuntu update.
- Advice names a current Ubuntu point release, support window, kernel track, or LTS upgrade path.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes application deployment ordering; use `deployment-rollout-safety-review`
  first and this skill only for Ubuntu host behavior.
- The task only changes application code inside a container and does not touch the Ubuntu host;
  use the matching language or container procedure.
- The task is a live production intervention without a configured command intent. Produce a
  bounded diagnostic or runbook instead of executing raw host commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Exact Ubuntu release, point release or image build, architecture, kernel, booted kernel, image
  type, virtualization or cloud provider, cgroup mode, init system, and support track.
- Package-owner ledger: APT/dpkg repositories and priorities, PPAs, vendor repositories, Snap,
  direct archives, language package managers, local prefixes, and container packages.
- Runtime ledger: resolved executable, owning package or revision, unit fragment and drop-ins,
  environment, working directory, loaded libraries, process start time, restart state, and reboot
  requirement.
- Resource evidence: PSI, cgroup pressure and events, CPU steal and topology, IRQ and NUMA
  placement, memory and swap, block queues, filesystem and inode state, NIC queues and drops,
  application latency, and provider telemetry where available.
- Update and recovery ledger: proposed package and config changes, service restart plan, kernel
  coverage, backup layers, restoration evidence, RPO/RTO, rollback limits, traffic drain, and
  out-of-band access.
- Relevant repository command intents. Host mutation, package installation, release upgrades,
  reboots, firewall changes, destructive cleanup, and benchmarks require explicit authority.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify whether the output is code/config review, an operator runbook, or live diagnosis.
- Read [Ubuntu LTS Operations Checklist](references/ubuntu-lts-operations-checklist.md) for Ubuntu
  24.04 or 26.04 work and refresh every dated release or support claim before using it.
- Preserve provider, organization, and repository policies that are stricter than this procedure.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update version-controlled Ubuntu image definitions, package-source declarations, systemd units
  and drop-ins, sysctl fragments, security policy, monitoring, runbooks, fixtures, tests, and
  directly synchronized templates when they are in task scope.
- Add validation that proves ownership, resolved configuration, readiness, limits, restart
  behavior, upgrade compatibility, backup restoration, and rollback boundaries.
- Do not mutate `/etc`, package databases, kernels, bootloaders, firewall state, container storage,
  production data, or a live host unless a configured command intent explicitly permits it.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the exact release track. Separate ISO or image point release, installed package state,
   booted kernel, HWE or GA kernel track, cloud image build, and support entitlement. Do not infer
   the running state from an image filename.
2. Refresh version claims. As of the dated 2026-08-02 snapshot, Ubuntu 24.04.4 was the current
   Noble point image and Ubuntu 26.04 LTS had been released, but 26.04.1 was still scheduled for
   later in August. Never preserve those facts as an undated permanent latest claim.
3. Build the package-owner ledger before changing anything. Distinguish APT, Snap, PPA or vendor
   repositories, direct archives, language package managers, `/usr/local`, and containers. Name
   which owner installs, updates, starts, removes, and rolls back each executable.
4. Resolve the effective runtime. Compare the shell, sudo, cron, and systemd executable paths;
   package ownership; active unit fragment and drop-ins; loaded libraries; and whether a restarted
   process actually uses the new files. A file update is not a runtime update.
5. Separate update classes. Security pockets, normal updates, phased updates, third-party
   repositories, Snap refreshes, Livepatch, kernel installation, service restarts, and a release
   upgrade have different clocks and rollback limits. Do not bundle them into one "patch server"
   action.
6. Reconstruct incidents on one time axis. Fix the incident window and boot boundary, then align
   journal, kernel, package, Snap, reboot, unit restart, core dump, storage, provider, and
   application evidence. Start from the first changed invariant rather than the final error line.
7. Diagnose pressure before tuning. Join PSI and cgroup events with service latency, CPU steal,
   run queue, memory reclaim, swap, device queue, IRQ, softirq, NIC drop, and application evidence.
   Reject internet sysctl bundles and one-number diagnoses such as load average, `%util`, or CPU
   utilization alone.
8. Change one resource control at a time. Keep CPU driver/EPP, IRQ and NUMA placement, cgroup
   weight versus hard cap, `MemoryHigh` versus `MemoryMax`, swap policy, block scheduler, dirty
   writeback, socket queues, and congestion control as separate decisions with baselines and
   numeric rollback thresholds.
9. Review systemd as the process owner. Distinguish dependency from ordering, process start from
   readiness, restart from recovery, and timer eligibility from execution. Prefer vendor-preserving
   drop-ins, one restart owner, bounded backoff, explicit writable paths, and evidence from the
   merged effective unit.
10. Review container-host integration. Prove one package source, cgroup delegation, subordinate ID
    ranges, user-manager lifetime, AppArmor scope, firewall packet path, port exposure, restart
    ownership, log rotation, inode and deleted-file behavior, and data-volume recovery. Do not use
    privileged mode or destructive prune as a generic fix.
11. Treat release upgrades as migrations. Require a fully updated source release, release notes,
    supported sequential path, third-party package inventory, runtime and ABI compatibility,
    configuration merge decisions, SSH and console survival, enough boot space, backup restoration,
    reboot, and post-boot application checks. Do not use a development-release flag as a production
    shortcut before the normal LTS upgrade offer exists.
12. Separate backup creation from restoration proof. Cover data, configuration and metadata,
    package and image inventory, and secrets or recovery keys. Measure RPO and RTO on an isolated
    restore. A package downgrade or Snap revert is not whole-system rollback.
13. Make reboot a deployment. Require drain, job and database quiescence, valid fstab, network and
    SSH configuration, boot and EFI space, initramfs and DKMS compatibility, a known previous
    kernel, out-of-band access, boot-time failure checks, and user-path smoke tests.
14. Route adjacent risks explicitly. Use `incident-triage-review` for incident coordination,
    `deployment-rollout-safety-review` for application rollout, `security-privacy-review` for broad
    threat review, and `performance-measurement-integrity-review` for benchmark design.
15. Report host-local proof separately from proposed operator actions. A version-controlled runbook
    can be verified locally; production package state, reboot survival, firewall behavior, restore
    timing, and workload performance remain manual until a configured environment proves them.

<!-- mustflow-section: postconditions -->
## Postconditions

- Release, package owner, runtime, resource, update, restart, backup, and recovery ledgers are
  explicit enough to explain who owns each state transition.
- Dated Ubuntu claims have official evidence and do not masquerade as permanent defaults.
- Proposed tuning has a measured bottleneck, isolated change, guardrail, and rollback threshold.
- Release upgrade and reboot plans preserve remote recovery and restoration proof.

<!-- mustflow-section: verification -->
## Verification

Use the narrowest configured intents that cover the changed repository surfaces:

- `test_related`, `lint`, or `build` for Ubuntu image, unit, policy, monitoring, or validation code.
- `docs_validate_fast` for runbooks, skills, and operational documentation.
- `test_release` for bundled skill, template, package, or installation changes.
- `mustflow_check` for broad mustflow-owned contract changes.

Do not substitute a local parser test for live reboot, restore, kernel, storage, network, or
provider evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the exact package owner or effective unit cannot be identified, stop the proposed mutation and
  report an ownership conflict.
- If the normal LTS upgrade path is not offered, report the dated rollout boundary; do not recommend
  forcing a development path for production.
- If tuning improves throughput but violates tail latency, pressure, or unrelated-workload
  guardrails, reject or narrow it.
- If remote recovery, restoration, or rollback evidence is missing, classify release upgrade and
  reboot readiness as unverified.

<!-- mustflow-section: output-format -->
## Output Format

- Ubuntu release and freshness evidence
- Package, runtime, kernel, systemd, container, and update owners
- Observed incident timeline or measured bottleneck
- Accepted, rejected, and deferred changes
- Upgrade, restart, backup, restore, reboot, and remote-recovery boundary
- Verification run and manual host evidence still required
- Remaining Ubuntu operations risk
