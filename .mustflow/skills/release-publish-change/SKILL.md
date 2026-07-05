---
mustflow_doc: skill.release-publish-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: release-publish-change
description: Apply this skill when release publishing, package registry publication, remote release channels, Git tags, GitHub Releases, release assets, npm, PyPI, crates.io, Go modules, Docker images, Homebrew formulae or casks, app updater metadata, version bump decisions, artifact inspection, post-publish smoke tests, rollback or yanking plans, or user installation paths are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.release-publish-change
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

# Release Publish Change

<!-- mustflow-section: purpose -->
## Purpose

Keep release work honest by treating a release as a remote state transition, not as a local code edit.

The release is not done when tests pass locally, a version string changes, or a workflow succeeds. It is done only when the intended remote channel contains the expected artifact and a user-facing installation or update path has been smoke-tested through configured command intents or explicitly reported as unverified. Release publication success and branch or tag check-suite health are separate evidence surfaces.

<!-- mustflow-section: use-when -->
## Use When

- A task prepares, changes, reviews, or reports package publication, registry publication, Git tag release, GitHub Release creation, release assets, checksums, signatures, Docker image tags, Homebrew formulae, app updater feeds, appcast files, channel metadata, or installer distribution.
- A change touches version bump logic, package metadata, release workflows, publish workflows, release assets, package contents, changelog-to-release wiring, post-publish smoke tests, or rollback and yanking guidance.
- A final report claims that a version was published, released, installable, downloadable, updateable, yanked, deprecated, rolled back, or verified by the user installation path.
- A release target includes npm, PyPI, crates.io, Go modules, Docker registries, GitHub Releases, Homebrew, Electron auto-update, Sparkle, Tauri updater, mobile stores, desktop installers, or another remote distribution channel.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only drafts release notes or changelog wording without publishing, package metadata, release artifact, or install-path claims. Use `release-notes-authoring` instead.
- The task only changes dependency versions inside a project and does not publish the project. Use `dependency-upgrade-review`.
- The task only checks local artifact integrity without changing or reporting release publication. Use `artifact-integrity-check` if available.
- The task asks for a private experiment that must not affect remote tags, registries, release assets, or update channels.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Release target, version, channel, package name, module path, image name, tag, artifact names, expected assets, and intended audience.
- Public contract source for versioning: package metadata, manifest, lock or generated metadata, changelog, release workflow, tag policy, and SemVer or project-specific compatibility rules.
- Artifact source and inspection method: package file list, archive contents, generated distributions, checksums, signatures, SBOM, provenance, installer contents, image digest, updater metadata, or release asset manifest.
- Remote publication surface: registry, Git tag, GitHub Release, Docker registry, tap, updater feed, appcast, CDN, package index, or store.
- Remote check surface: pushed branch, tag, commit SHA, workflow run, required checks, matrix jobs,
  and whether each belongs to publication, branch CI, tag CI, release asset generation, or another
  independent verification path.
- Recovery model: unpublish, yank, deprecate, republish with new version, move channel pointer, revoke asset, restore from backup, or forward fix.
- Configured command intents for build, package inspection, release verification, docs validation, and user installation or updater smoke test. If no such intent exists, report the missing intent instead of inventing a raw command.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions, release preferences, and the command contract have been checked for the current scope.
- The release target and version are known, or the work is explicitly limited to authoring a release procedure skill or checklist.
- Remote publication, tag creation, push, registry upload, production updater change, and destructive yanking or unpublish actions are not executed unless the repository and host rules explicitly authorize them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update version metadata, release workflow files, package manifests, artifact manifests, changelog or release-preparation docs, release validation tests, package fixture expectations, and installed-template metadata directly required by the release contract.
- Update smoke-test expectations and package tests that encode the release or installation contract.
- Add conservative release procedure text that describes configured command intents and required evidence.
- Do not publish, tag, push, yank, delete, unpublish, overwrite assets, or alter remote channels unless explicitly requested and authorized by the active command contract and host rules.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the release surface.
   - Package registry: npm, PyPI, crates.io, RubyGems, Maven, NuGet, SwiftPM, or similar.
   - Source tag release: Go module, GitHub Release, generated assets, source archive, or checksum manifest.
   - Container release: image tag, digest, multi-platform manifest, base image, provenance, or registry metadata.
   - Installer or updater release: desktop installer, appcast, update feed, channel metadata, signature, release notes, or updater endpoint.
   - Formula or distribution wrapper: Homebrew formula, cask, tap metadata, checksum, bottle, or livecheck.
2. Declare the public API before choosing the version bump.
   - Public API includes CLI output, flags, config schema, package exports, templates, generated artifacts, installer behavior, migration contract, deprecation behavior, update channel behavior, and documented examples.
   - Use SemVer only after naming what this project treats as public API.
   - Treat compatibility-affecting behavior, removed assets, changed binary names, moved module paths, changed updater channels, or stricter parsers as release-contract changes even when source APIs look unchanged.
3. Inspect the artifact, not only the repository tree.
   - Check package file lists, archive contents, generated distributions, binary entrypoints, README, LICENSE, metadata, generated schemas, template files, checksums, signatures, SBOM, provenance, image digest, and platform matrix as applicable.
   - Do not claim artifact inspection from the source tree alone.
   - Stale `dist`, build output, generated clients, package caches, or old release assets must be cleaned or reported before publication evidence is trusted.
4. Classify channel permanence and recovery.
   - npm name and version pairs, PyPI distribution filenames, crates.io versions, and Go module tags are effectively one-way release identifiers for practical purposes.
   - Docker tags can move in many registries, but digests identify content and should be captured when reporting release evidence.
   - GitHub Releases depend on Git tags, but release assets, checksums, signatures, and release body are separate evidence surfaces.
   - App updater channels depend on metadata and signature state, not only uploaded installers.
5. For npm-style package publication, verify package metadata, packed file list, entrypoints, bin links, README, LICENSE, access, provenance or trusted publisher setup, registry target, and exact published version behavior through configured intents.
6. For PyPI-style publication, verify source distribution, wheel contents, metadata, Python version constraints, entrypoints, README rendering, filename uniqueness, and install smoke path through configured intents.
7. For crates.io-style publication, verify manifest metadata, include and exclude rules, packaged file list, feature combinations, docs expectations, and yank-forward-fix policy.
8. For Go modules, treat the Git tag as the release. Verify module path, semantic tag, major-version path rules, tag target commit, proxy/cache implications, and module consumer smoke path. Do not move or delete tags as a casual recovery shortcut.
9. For Docker images, verify image digest, tag, platform manifest, labels, exposed ports, entrypoint, user, vulnerability or base-image expectations, and pull-run smoke behavior through configured intents.
10. For GitHub Releases, verify tag, release body, generated notes policy, asset list, checksum files, signatures, archives, attached binaries, and download smoke behavior.
11. For Homebrew, verify formula or cask URL, version, checksum, livecheck, bottle expectations, test block, audit result, and install smoke path through configured intents.
12. For app updaters, verify installer artifact, update metadata, channel, minimum version, signature, release notes, feed URL, staged rollout rules, and updater smoke path from an older installed version when configured.
13. Keep release notes and release publication separate.
   - Release notes may say what changed only when evidence supports it.
   - Publication evidence must say what remote artifact exists and how a user reaches it.
14. Verify remote state after publication when authorized.
   - Check the registry, tag, release page, asset download, digest, updater feed, tap, or package index that users actually consume.
   - Then run the configured user installation, pull, download, or updater smoke intent.
   - If remote publication was not authorized or not performed, report the release as prepared but not published.
15. Verify check-suite state separately from publication state.
   - Identify which workflow runs belong to the pushed branch, release tag, and publication event.
   - Do not treat npm registry visibility, package installability, or GitHub Release creation as
     proof that push checks, branch protection, or platform matrix jobs are green.
   - If a publication workflow succeeds while a branch, tag, or same-commit check fails or remains
     in progress, report `published` and `checks failing` or `checks pending` as separate states.
   - Route any failing check through `failure-triage` before reporting an all-clear.
16. Report immutable or hard-to-recover mistakes honestly.
   - Bad package version: usually deprecate, yank, or release a new version.
   - Bad Go module tag: do not assume moving the tag fixes proxy/cache consumers.
   - Bad Docker tag: distinguish moved tag from old digest still being referenced.
   - Bad updater metadata: treat as a live channel incident if clients may already have seen it.
17. Never call a release complete from local tests alone. The completion evidence must name the remote channel, the user installation or update path, and the current relevant check-suite state, or explicitly say which post-publish verification was skipped.

<!-- mustflow-section: postconditions -->
## Postconditions

- Version bump, release notes, package metadata, manifests, artifacts, workflows, tests, and docs agree.
- The artifact contents have been inspected through configured evidence, not inferred from the source tree.
- Remote publication status is classified as not started, prepared, published, verified, failed, yanked, deprecated, superseded, or unknown.
- Branch, tag, and publication workflow checks are classified separately as green, failing, pending,
  skipped, not applicable, or unknown.
- User installation, pull, download, or updater smoke test status is known or explicitly reported as skipped.
- Recovery plan matches the channel's actual permanence and rules.

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

Prefer configured release, package-inspection, artifact-inspection, install-smoke, updater-smoke, checksum, signature, provenance, or registry-verification intents when the command contract exposes them.

Do not infer package manager, registry, Docker, Git, Homebrew, or updater commands from project files. If the needed intent is missing, report the missing command contract instead of writing a raw command into the skill or final release procedure.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the artifact contents differ from the intended release, stop release claims and fix the source, generated output, or packaging configuration before publication.
- If the remote registry already contains the version, do not assume overwrite is possible. Report the channel-specific recovery path.
- If publication succeeds but install smoke fails, treat the release as published but not verified and recommend channel-appropriate mitigation.
- If publication succeeds but branch, tag, or same-commit checks fail, treat the release as
  published but not all-clear. Do not hide the red check behind successful registry or GitHub
  Release evidence.
- If a tag, asset, digest, checksum, signature, updater feed, or release body is missing, do not collapse the issue into "workflow failed"; name the missing remote surface.
- If release evidence comes only from CI logs, report that no independent user-path smoke test was completed unless the configured CI explicitly performs that path.
- If unpublish, yank, tag movement, channel rollback, or asset deletion is proposed, check host and repository authorization first and report the permanence risk.

<!-- mustflow-section: output-format -->
## Output Format

- Release target, version, and channel
- Public API and version bump classification
- Artifact contents inspected
- Remote publication state
- Branch, tag, and publication check-suite state
- User installation, download, pull, or updater smoke path result
- Synchronized version, docs, manifest, workflow, and test surfaces
- Recovery or rollback classification
- Command intents run
- Skipped remote, publish, or install checks and reasons
- Remaining release-publish risk
