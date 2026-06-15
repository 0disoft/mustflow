---
mustflow_doc: skill.desktop-auto-update-safety-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: desktop-auto-update-safety-review
description: Apply this skill when desktop app automatic update behavior, Electron autoUpdater or electron-builder feeds, Squirrel.Windows first-run handling, Sparkle appcasts, Tauri updater configuration, macOS signed and notarized updates, Windows installers, Linux desktop packages, update metadata, latest.yml/latest.json/appcast.xml pointers, CDN caching, staged rollout percentages, alpha/beta/stable channels, update kill switches, artifact immutability, signatures, hash verification, signing-key custody, key rotation, certificate expiry, notarization gates, single-flight update checks, quit-and-install timing, old-version upgrade paths, rollback-forward fixes, updater telemetry, crash gates, or installed-app update smoke tests are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.desktop-auto-update-safety-review
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

# Desktop Auto Update Safety Review

<!-- mustflow-section: purpose -->
## Purpose

Review desktop automatic updates as a remote code-execution supply chain, not a convenience button.

The review question is not "does the new version download?" It is "can old installed clients
discover, verify, stage, apply, relaunch, observe, stop, and recover from an update without mixing
metadata, artifacts, signatures, channels, rollout cohorts, permissions, local data, or user work?"

<!-- mustflow-section: use-when -->
## Use When

- Electron `autoUpdater`, electron-builder update feeds, Squirrel.Windows, NSIS, MSIX, Sparkle,
  Tauri updater, macOS appcasts, Windows installers, Linux desktop packages, updater endpoints,
  release channels, or desktop installer metadata are created, changed, reviewed, or reported.
- Code or docs touch update states such as check, download, verify, stage, apply, relaunch, rollback,
  resume, retry, cancel, or post-relaunch health.
- Release work touches immutable installer artifacts, `.sig`, `.blockmap`, `.yml`, `.json`,
  `latest.yml`, `latest.json`, appcast XML, CDN cache policy, hashes, signatures, or channel
  pointers that installed clients consume.
- A desktop updater needs staged rollout, deterministic canary buckets, alpha/beta/stable channel
  separation, kill switch, remote disable policy, crash gate, update telemetry, or emergency
  forward-fix behavior.
- A desktop update path depends on code signing, notarization, certificate expiry, signing-key
  custody, key rotation, clean-machine install tests, old-version upgrade tests, migration
  compatibility, or installed-app smoke tests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only publishing a package, tag, registry version, GitHub Release, or generic release
  asset without installed desktop updater behavior; use `release-publish-change`.
- The task is only server, container, backend, worker, migration, feature-flag, or traffic rollout
  safety; use `deployment-rollout-safety-review`.
- The task is only background process crash recovery, leases, service supervision, sleep/resume, or
  safe mode; use `desktop-background-process-stability-review`.
- The task is only Tauri command permissions, capabilities, sidecars, opener, shell, CSP, or updater
  endpoint trust inside a Tauri app; use `tauri-code-change` first, then return here for update
  rollout and distribution behavior.
- The task is only release notes wording without updater metadata, installed app behavior, or
  release-channel claims; use `release-notes-authoring`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Updater stack ledger: framework, installer type, updater library, OS targets, install scope,
  channel, feed URL, metadata format, signing model, update staging location, relaunch path, and
  old-version support window.
- State-machine ledger: check, download, verify, stage, apply, relaunch, first-run-after-update,
  rollback or forward-fix, cancellation, retry, and failure states with user-visible outcomes.
- Artifact ledger: immutable artifact names, platform assets, signatures, blockmaps or delta files,
  hashes, sizes, metadata pointers, CDN cache policy, upload order, and remote publication status.
- Trust ledger: code signing, notarization, updater signature, signing-key storage, key rotation,
  certificate expiry gate, TLS expectations, metadata signing, and hash verification.
- Rollout ledger: channel policy, staged percentage, deterministic bucket key, kill switch,
  per-version deny or pause policy, OS or architecture gating, crash gate, and manual approval gate.
- Installed-client ledger: oldest supported versions, skipped-version upgrade paths, data migration
  compatibility, first-run locks, single-flight update checks, quit-and-install timing, user work
  preservation, and clean-machine test matrix.
- Observability ledger: check count, download start, download success, verification failure,
  install start, install success, relaunch success, post-relaunch heartbeat, crash-free sessions,
  update error codes, channel, version, OS, architecture, and cohort.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Remote publication, live channel pointer changes, signing-key access, installer execution,
  destructive asset deletion, yanking, or production kill-switch flips remain out of scope unless
  explicitly authorized by the repository and host command contract.
- If only static repository evidence is available, report installed-app, clean-machine, remote CDN,
  signing, notarization, and update-smoke checks as manual or missing instead of implying they ran.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten update state machines, single-flight guards, staged rollout policy, deterministic
  cohorting, kill-switch handling, remote updater policy, channel separation, signature and hash
  checks, artifact upload ordering, cache headers, installed-client compatibility guards,
  quit-and-install safety, migration idempotency notes, update telemetry, crash gates, and focused
  tests or docs.
- Update release checklists, updater runbooks, package metadata, template skills, installer docs,
  test assertions, and release-sensitive fixtures that encode the desktop auto-update contract.
- Do not overwrite an existing versioned artifact, reuse a broken version number as the fix, move a
  stable channel to a beta feed, relax signature verification, store signing private keys on the
  release server, or call an update complete from download completion alone.
- Do not run raw installer, updater, signing, notarization, CDN, release, or OS lifecycle commands
  outside configured command intents.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the updater as a state machine.
   - Separate check, download, verify, stage, apply, relaunch, and post-relaunch health.
   - Log or return stage-specific errors instead of a single "update failed" bucket.
   - Preserve cancellation and retry behavior without corrupting staged files.
2. Separate immutable artifacts from mutable pointers.
   - Treat versioned installers, signatures, blockmaps, and platform assets as immutable.
   - Change only the latest pointer, channel metadata, or staged rollout policy after all referenced
     assets are uploaded and independently downloadable.
   - Report any flow that overwrites `app-1.2.3`-style artifacts or edits a published version in
     place.
3. Enforce artifact-before-metadata ordering.
   - Upload installers, `.sig`, `.blockmap`, `.yml`, `.json`, appcast, and platform assets before
     changing `latest.yml`, `latest.json`, `appcast.xml`, or equivalent client-visible pointers.
   - Give metadata short TTL or revalidation and give immutable artifacts long cache when safe.
   - Treat mismatched metadata hash, size, signature, or URL as a live update-channel incident.
4. Require trust verification.
   - Verify code signing, notarization where applicable, updater signatures, file hashes, file sizes,
     channel identity, and expected platform target before applying.
   - Keep signing private keys off the release server and practice key rotation before an incident.
   - Make certificate expiry, notarization failure, missing signature, or entitlement drift fail the
     release gate before users see the update.
5. Keep channels physically and logically separate.
   - Separate alpha, beta, stable, canary, and enterprise channels by feed, metadata, or explicit
     policy; do not rely only on version suffixes.
   - Verify stable clients cannot accidentally consume beta or alpha metadata.
   - Treat channel movement as a public release contract.
6. Roll out by deterministic cohorts.
   - Prefer install id, device id, account id, or another stable privacy-safe bucket key over
     per-request randomness.
   - Use staged rollout percentages with clear progression and stop rules.
   - Add jitter and backoff so app start, network reconnect, or periodic checks do not stampede the
     update server.
7. Add server-side stop controls.
   - Provide a kill switch or "no update" response for bad versions, OS targets, architectures,
     cohorts, or channels without requiring a new app update.
   - Preserve user-intentional pause, enterprise policy, and admin-managed update controls when the
     product supports them.
   - Do not make a broken updater fixable only by shipping another update through the broken path.
8. Prevent duplicate update work.
   - Guard update checks and downloads with a single-flight or mutex path.
   - Handle app startup, menu-click, timer, network-reconnect, and background-triggered checks
     converging on the same update state.
   - Include Squirrel.Windows first-run or installer lock timing when the Windows stack can hold
     files immediately after installation.
9. Apply only when user work is safe.
   - Gate quit-and-install, relaunch, or helper replacement on saved work, drained background tasks,
     paused sync, and platform-specific quit events.
   - Treat `before-quit-for-update`, preshutdown, app exit, and renderer close events as distinct
     from ordinary shutdown when the framework exposes them.
   - Report any forced restart path that can lose unsaved documents, recordings, uploads, database
     sessions, or long local jobs.
10. Test installed upgrade paths, not development mode.
    - Prefer packaged, signed, installed-app update tests from older versions, clean users, clean
      machines or VMs, and the install scopes users actually have.
    - Include skipped-version paths from active old versions, not only previous-version to latest.
    - Cover Windows user-wide versus machine-wide installs, macOS Intel versus Apple Silicon,
      Gatekeeper, quarantine, app translocation, read-only mounts, and Linux package formats when
      those targets exist.
11. Make migrations update-safe.
    - Support old data with new code, new data with old code when rollback or forward-fix overlap can
      happen, and users who skip several app versions.
    - Make local migrations idempotent with completion markers and partial-failure recovery.
    - Prefer forward-fix with a higher version over attempting to repair a broken release by
      republishing the same version.
12. Keep old artifacts long enough.
    - Retain full installers, deltas, signatures, metadata, and migration bridges needed by active
      old clients.
    - Do not delete old artifacts solely to reduce storage without checking active-version telemetry
      and upgrade path coverage.
13. Observe real update success.
    - Count check, download, verify, install, relaunch, and post-relaunch heartbeat separately.
    - Treat download completion as incomplete; success is the new version running and healthy after
      relaunch.
    - Split telemetry by version, channel, OS, architecture, cohort, installer type, and error code
      while preserving privacy and redaction rules.
14. Stop rollout automatically when harm appears.
    - Define crash-free, verification-failure, install-failure, relaunch-failure, and support-ticket
      thresholds that pause rollout or return "no update".
    - Require operator-visible release id, channel, version, cohort, and artifact identity in update
      logs or metrics.
15. Report what cannot be proven locally.
    - Name missing updater-smoke, clean-machine, signing, notarization, CDN-cache, staged-rollout,
      crash-gate, or remote-feed verification instead of replacing it with unrelated unit tests.

<!-- mustflow-section: postconditions -->
## Postconditions

- Update state machine, immutable artifact policy, metadata pointer order, signatures, hashes,
  key custody, certificate gates, channel separation, staged rollout, deterministic bucket, kill
  switch, single-flight checks, first-run locks, quit-and-install safety, installed upgrade matrix,
  migration compatibility, old artifact retention, update telemetry, crash gates, and manual remote
  verification boundaries are explicit.
- Mutable artifact overwrite, metadata-before-artifact publication, long-lived latest-pointer cache,
  missing signatures, release-server private keys, unpracticed key rotation, expired certificate
  surprise, random per-request canary, no kill switch, duplicate downloads, forced restart data loss,
  development-mode-only update testing, same-version republish recovery, old artifact deletion, and
  download-complete-as-success claims are fixed or reported.
- Desktop updater safety claims are backed by configured tests, package or template checks, static
  release evidence, installed-app smoke evidence, or clearly labeled as manual-only or missing.

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

Prefer configured updater-smoke, package-inspection, signature, notarization, CDN, staged-rollout,
install-smoke, or release-verification intents when the command contract exposes them. Do not infer
raw signing, installer, CDN, release, updater, or OS commands from project files.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If metadata references missing artifacts, stale hashes, bad signatures, wrong channels, or broken
  cache headers, treat the update channel as potentially live-broken and stop publication claims.
- If an update was already visible to clients, prefer a new higher-version forward fix, kill switch,
  or paused rollout over overwriting the same version.
- If verification cannot run because signing keys, notarization, CDN, clean VMs, old installers, or
  remote feeds are unavailable, report the exact missing evidence.
- If automatic update safety conflicts with user data safety, signature security, enterprise policy,
  least privilege, or rollback compatibility, keep the safer behavior and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Desktop auto-update boundary reviewed
- Updater stack, state machine, artifact, trust, rollout, installed-client, migration, telemetry, and
  kill-switch findings
- Auto-update safety fixes made or recommended
- Evidence level: configured-test evidence, package/release evidence, installed-app smoke evidence,
  static updater risk, manual-only, missing, or not applicable
- Command intents run
- Skipped updater diagnostics and reasons
- Remaining desktop auto-update risk
