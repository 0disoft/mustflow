---
mustflow_doc: skill.ubuntu-server-operations-review.ubuntu-lts-operations-checklist
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: reference
---

# Ubuntu LTS Operations Checklist

Use this reference for Ubuntu 24.04 LTS, Ubuntu 26.04 LTS, and their server or cloud-image upgrade,
performance, systemd, package, security, container-host, incident, backup, and reboot work.

## Contents

1. Release freshness and upgrade tracks
2. State-owner and package provenance
3. Performance and resource controls
4. systemd, timers, and journald
5. Docker, Podman, AppArmor, and firewall integration
6. Incident reconstruction
7. Updates, backup, restore, and reboot
8. Ubuntu 24.04 and 26.04 boundaries
9. Verification matrix
10. Primary anchors

## 1. Release Freshness and Upgrade Tracks

- Keep image version, installed release, package pocket, booted kernel, and support entitlement
  separate. A 24.04.4 installer image does not imply every installed Noble machine has the same
  packages or kernel.
- The snapshot verified on 2026-08-02 classified Ubuntu 24.04.4 as the current 24.04 point image.
  Ubuntu 26.04 LTS was released on 2026-04-23, while its first point release was scheduled for
  2026-08-27. Refresh all three facts before repeating them.
- Ubuntu only supports sequential release upgrades. A normal LTS-to-next-LTS offer appears after
  the destination's first point release. Before that boundary, do not turn `do-release-upgrade -d`
  or `--devel-release` into standard production advice.
- Read both the destination release notes and every source-specific upgrade warning. Fully update
  the source release, include phased packages where required by official preflight, and reboot the
  source when needed before starting the major upgrade.
- Treat third-party repositories as disabled-but-not-uninstalled during a release upgrade. Inventory
  packages already installed from PPAs or vendor repositories and prove destination support.
- Use the exact support table rather than folklore. Distinguish standard security maintenance,
  Ubuntu Pro or ESM, Legacy coverage, and package component coverage.

## 2. State Owner and Package Provenance

- Build the package-owner ledger with one row per executable or daemon: resolved path, hash or version, package owner, repository
  candidate, priority or pin, active process, unit, update owner, rollback owner, and data path.
- APT owns packages through dpkg metadata; Snap owns revisions and aliases; PPAs and vendor
  repositories modify APT's whole candidate graph; archive installers may leave no update owner;
  language package managers and `/usr/local` can shadow distribution binaries.
- Compare resolution from the interactive shell, root shell, cron, and systemd. `PATH`, aliases,
  environment files, `ExecStart`, and Snap aliases can select different executables.
- Inspect active unit `FragmentPath`, `DropInPaths`, vendor presets, and merged properties. Old
  `/etc` files and drop-ins can override a newly updated vendor unit.
- Files on disk can be newer than a running process. Track deleted-but-open libraries, service
  restart requirements, `needrestart` policy, kernel installation, and pending reboot separately.
- Prefer deb822 repository definitions and per-repository `Signed-By` keyrings. Do not use global
  trust, `Trusted: yes`, insecure repositories, or an unreviewed `curl | sudo` bootstrap.
- Distinguish APT, Snap, and vendor refresh clocks. Automatic security updates do not prove that
  third-party repositories, Snaps, firmware, containers, or running processes are current.

## 3. Performance and Resource Controls

- Start with environment facts: kernel, systemd, virtualization, cgroup filesystem, CPU topology,
  storage device and scheduler, filesystem, NIC queues, and provider instance class.
- Use Pressure Stall Information with service latency. CPU `some`, memory `some/full`, and I/O
  `some/full` answer different questions; system-wide CPU `full` is not a useful alarm.
- On shared VMs, include steal time and provider throttling. Guest CPU governor controls may be
  absent because the hypervisor owns frequency selection.
- Inspect P-state driver, Energy Performance Preference, sustained clocks, power, and thermal limits
  before changing a governor. Compare tail latency and energy under the same load.
- Separate NIC hardware RSS, RPS/RFS/XPS, IRQ affinity, `irqbalance`, application CPU placement,
  and NUMA memory placement. More distribution layers can increase cache movement.
- Use cgroup weights for relative contention and quotas or maxima for hard caps. Prefer
  `MemoryHigh` as the pressure boundary and `MemoryMax` as the final containment boundary; monitor
  `memory.events` rather than treating an OOM kill as the first signal.
- Do not disable swap globally by reflex. Decide whether swap is a short burst buffer or an
  unacceptable latency path, then monitor actual use and pressure.
- Select a block scheduler from supported device options and workload evidence. Compare completion
  latency percentiles, queue depth, await, fsync latency, throughput, CPU, and unrelated workload.
  Never run destructive write benchmarks against production data or its block device.
- On large-memory hosts, evaluate byte-based dirty writeback limits when ratio-based limits permit
  an unsafe absolute backlog. Keep ratio and byte control families mutually exclusive.
- Prefer periodic TRIM when supported and justified; do not schedule `drop_caches` as maintenance.
- Diagnose NIC drops, softnet backlog, listen overflow, retransmission, route, and application
  accept behavior before enlarging socket buffers or choosing BBR. `somaxconn` does not repair a
  small application backlog or slow accept loop.
- Every tuning proposal needs a baseline, one isolated variable, representative concurrency,
  throughput and p95/p99, resource pressure, failure guardrail, rollback threshold, and an owner.

## 4. systemd, Timers, and journald

- Treat `Type=simple` as process creation, not readiness. Prefer `Type=exec` for exec failure
  attribution and `Type=notify` only when the application actually sends readiness and watchdog
  notifications.
- Use bounded `Restart=on-failure`, start-rate limits, stepped backoff where the installed systemd
  supports it, and `RestartPreventExitStatus` for permanent configuration failures. A watchdog
  without application heartbeats manufactures crashes.
- `Wants` and `Requires` pull units into a transaction; `After` and `Before` order them.
  `network-online.target` is a boot synchronization point, not permanent Internet, DNS, or remote
  database health.
- Modify vendor units with drop-ins and validate the merged effective unit. Reset list-valued
  properties such as `ExecStart` before replacing them. `daemon-reload` does not restart a process.
- Keep relative cgroup weights, hard limits, task counts, writable paths, and sandbox controls in one
  service budget. Parent slice limits still constrain children. Apply security controls one at a
  time and verify required reads, writes, network, and runtime directories.
- Timer calendar eligibility is not exact execution. Account for `AccuracySec`, randomized delay,
  persistent missed-run behavior, long-running target units, overlap ownership, idempotency, and
  whether the desired interval is calendar-based or after inactivity.
- journald retention is bounded and rate-limited. `Storage=auto` can remain volatile without the
  persistent journal directory. Record forwarding, disk budget, retention, rate-limit loss, and
  previous-boot access before calling it durable audit evidence.

## 5. Docker, Podman, AppArmor, and Firewall Integration

- Choose one Docker packaging source and one update owner. Do not mix Ubuntu `docker.io`, Docker's
  repository packages, Snap packaging, convenience scripts, or leftover dependencies casually.
- Ubuntu 24.04's unprivileged user-namespace AppArmor restrictions can surface as build, browser,
  sandbox, or rootless-runtime failures. Diagnose the denied executable and requested capability;
  do not disable the protection globally or add `--privileged`, `apparmor=unconfined`, or
  `--no-sandbox` as a generic cure.
- cgroup v2 presence does not prove rootless limits work. Verify delegated controllers, user
  manager lifetime, subordinate UID/GID ranges, storage ownership, and actual limit enforcement.
- Give restart ownership to systemd or the container engine, not both. Prefer supported Podman
  Quadlet over regenerating stale service files for new automation.
- Docker-published ports traverse Docker-managed packet-filter rules and can bypass an intuitive
  UFW policy. Prove IPv4 and IPv6 packet paths, bind addresses, bridge rules, and provider firewall
  state from an external vantage point.
- Treat access to the Docker socket or membership in the `docker` group as root-equivalent.
- Bound logs by driver policy and verify whether changes affect only new containers. Monitor volume
  bytes, inodes, deleted-open files, image and build cache, containerd storage, and named volumes.
  Never schedule destructive prune with volume deletion as generic cleanup.

## 6. Incident Reconstruction

- Fix a narrow time window and boot id first. Align application logs, journal, kernel, OOM, unit
  exit, restart counter, APT/dpkg, Snap, reboot, core dump, provider event, and deployment evidence.
- Expand `systemctl status` into result, exit code, start limits, recent journal, effective unit,
  dependencies, and process lifetime. A restart loop can erase the first failure from the summary.
- Do not classify high load as CPU saturation without run queue, uninterruptible tasks, steal,
  PSI, memory reclaim, and I/O evidence.
- Split disk-full symptoms into byte exhaustion, inode exhaustion, and deleted-but-open files. Then
  identify the filesystem and writer before deleting anything.
- Ignore the first cumulative `iostat` sample for interval diagnosis and do not use `%util` alone,
  especially on parallel storage. Correlate await, queue depth, throughput, latency, PSI, and
  application effects.
- Diagnose network in layers: name resolution, route and address, listener, local firewall,
  container rules, provider firewall, packet capture, and remote peer. Ping success or failure does
  not settle an application connection problem.
- Treat the crash frame as the failure location, not automatically the corruption origin. Preserve
  core-dump identity, exact package symbols, kernel, process executable, config, and preceding
  resource or update events.

## 7. Updates, Backup, Restore, and Reboot

- Separate security updates, normal updates, phased rollout, PPA or vendor updates, Snap refresh,
  kernel updates, Livepatch coverage, service restarts, and release upgrades into independently
  observable jobs.
- The same calendar-time APT invocation can select different packages because mirrors, pockets,
  phasing, pinning, architecture, image state, and snapshots differ. Preserve candidate and source
  evidence when fleet consistency matters.
- Treat service restart as the deployment unit. Name needrestart behavior, drain, readiness,
  restart order, connection and worker behavior, smoke tests, and rollback boundary.
- Livepatch covers eligible kernel fixes, not every kernel change, userspace library, firmware,
  bootloader, initramfs, DKMS module, or accumulated reboot requirement.
- Back up four layers: application data; configuration and metadata; package, repository, image,
  kernel, and unit inventory; secrets, certificates, and recovery keys. Isolate backups from the
  host and its normal credentials.
- Measure restoration on a clean isolated machine. Verify data freshness, counts, schema,
  permissions, service start, external dependencies, scheduler and queue behavior, DNS or traffic
  cutover, RPO, RTO, and key availability.
- A package downgrade only changes selected binaries and scripts; it does not reverse database,
  config, data-format, cache, maintainer-script, or kernel effects. A Snap revert is not a complete
  host rollback either.
- Before reboot, prove out-of-band access, valid fstab, network and SSH effective config, free boot
  and EFI space, initramfs and DKMS state, previous-kernel availability, failed-unit state, drain,
  and workload quiescence. After boot, verify kernel, failed units, warning logs, dependency chain,
  storage, network, containers, scheduled work, and a real user path.

## 8. Ubuntu 24.04 and 26.04 Boundaries

- Ubuntu 24.04 uses deb822 repository files by default and introduced operational changes around
  unprivileged user-namespace restrictions, needrestart service restarts, OpenSSH socket activation,
  updated runtimes, and the armhf `time_t` transition. Verify the current Noble release notes rather
  than generalizing one point image.
- On 22.04-to-24.04 upgrades, inventory PPAs, packages left after source disablement, Python virtual
  environments and system-pip automation, SSH socket and configuration ownership, runtime ABI
  changes, TLS compatibility, and architecture-specific data formats such as affected armhf rrdtool
  databases.
- Ubuntu 26.04 is a separate LTS with its own release notes, Linux kernel track, systemd and cgroup
  requirements, toolchains, service migrations, and known issues. Do not reuse Noble-specific
  commands or defaults merely because both are LTS.
- As of 2026-08-02, production migration from 24.04 to 26.04 should respect the normal first-point
  release gate and current known issues. Recheck whether 26.04.1 has actually shipped and whether
  the upgrade offer is enabled before writing or running a migration plan.

## 9. Verification Matrix

| Change | Minimum evidence |
| --- | --- |
| Package or repository | owner ledger, candidate and priority, per-repo key, dependency simulation, resolved runtime, restart plan |
| systemd unit or timer | merged unit, verify result, readiness semantics, restart/overlap behavior, writable paths, logs |
| CPU, memory, disk, or network tuning | measured bottleneck, PSI and service latency, one variable, representative load, p95/p99, rollback threshold |
| Container host | package owner, cgroup delegation, AppArmor evidence, IPv4/IPv6 exposure, restart owner, log/inode/storage bounds |
| Incident report | time window, boot id, first invariant failure, package/deploy/reboot timeline, preserved logs or core identity |
| Package update | selected versions and sources, phased/snapshot policy, service drain/restart, smoke, pending reboot |
| LTS release upgrade | supported path, current release notes, fully updated source, third-party inventory, backup restore, console, reboot, app smoke |
| Backup or rollback | four-layer coverage, isolated copy, restoration result, measured RPO/RTO, keys, data and config compatibility |
| Reboot | OOB access, boot config and space, previous kernel, drain, post-boot units/logs/network/storage/user-path smoke |

Reject production-ready claims when the relevant row has no configured or operator-owned proof.

## 10. Primary Anchors

- [Ubuntu release list](https://documentation.ubuntu.com/project/release-team/list-of-releases/) and
  [Ubuntu release notes](https://documentation.ubuntu.com/release-notes/) for current tracks.
- [Ubuntu 24.04.4 changes](https://documentation.ubuntu.com/release-notes/24.04/4/) and
  [Ubuntu 24.04 LTS release notes](https://documentation.ubuntu.com/release-notes/24.04/).
- [Ubuntu 26.04 LTS release notes](https://documentation.ubuntu.com/release-notes/26.04/) and its
  [release schedule](https://documentation.ubuntu.com/release-notes/26.04/schedule/).
- [Ubuntu Server release upgrade guidance](https://documentation.ubuntu.com/server/how-to/software/upgrade-your-release/),
  [package management](https://documentation.ubuntu.com/server/how-to/software/package-management/),
  [phased updates](https://documentation.ubuntu.com/server/explanation/software/about-apt-upgrade-and-phased-updates/),
  and [automatic updates](https://documentation.ubuntu.com/server/how-to/software/automatic-updates/).
- [Linux PSI](https://docs.kernel.org/accounting/psi.html),
  [network scaling](https://docs.kernel.org/networking/scaling.html),
  [block scheduler switching](https://docs.kernel.org/block/switching-sched.html), and
  [VM sysctl](https://docs.kernel.org/admin-guide/sysctl/vm.html).
- Ubuntu Noble manpages for
  [systemd services](https://manpages.ubuntu.com/manpages/noble/man5/systemd.service.5.html),
  [resource control](https://manpages.ubuntu.com/manpages/noble/man5/systemd.resource-control.5.html),
  [timers](https://manpages.ubuntu.com/manpages/noble/man5/systemd.timer.5.html), and
  [journald](https://manpages.ubuntu.com/manpages/noble/man5/journald.conf.5.html).
- Docker documentation for [Ubuntu installation](https://docs.docker.com/engine/install/ubuntu/),
  [packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/),
  and [logging drivers](https://docs.docker.com/engine/logging/configure/).
