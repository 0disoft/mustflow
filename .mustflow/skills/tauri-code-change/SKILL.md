---
mustflow_doc: skill.tauri-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: tauri-code-change
description: Apply this skill when Tauri frontend invokes, Rust commands, capabilities, permissions, scopes, plugins, filesystem, dialog, shell, opener, updater, sidecar, mobile native permissions, Tauri bundling targets, release package formats, or native desktop CI build matrices are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.tauri-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# Tauri Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve the Tauri WebView-to-native boundary across frontend calls, Rust commands, plugin permissions, capabilities, scopes, filesystem, dialog, shell, opener, updater, sidecar, and mobile permissions.

Treat the WebView as low trust and the Rust/native side as high authority. Frontend validation is only UX. Rust command validation is the final security boundary.

<!-- mustflow-section: use-when -->
## Use When

- `src-tauri`, `tauri.conf.*`, `Cargo.toml`, `#[tauri::command]`, `invoke`, Tauri JavaScript APIs, plugin config, capabilities, permissions, scopes, CSP, WebView bootstrap HTML, fs, dialog, shell, opener, updater, sidecar, mobile manifests, or native permissions change.
- A frontend button, menu, or workflow calls native resources through Tauri.
- A packaged Tauri app shows a blank or black WebView after release and browser console or built HTML may point to Content Security Policy blocking the frontend bootstrap.
- Tauri release packaging, `bundle.targets`, platform target triples, updater artifacts, signing,
  or CI matrix behavior changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a pure web frontend view with no Tauri API, command, permission, plugin, or native resource boundary.
- The Rust code is not part of a Tauri application; use `rust-code-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Frontend package metadata, static build output or generated entry HTML, Tauri config, Rust manifests, main/lib command modules, command registration, capability and permission files, plugin config, updater config, sidecar config, mobile permissions, and tests.
- Build and release evidence when packaging is in scope: CI workflow or task definitions, runner
  OS matrix, package formats, `bundle.targets`, Rust and frontend cache strategy, signing or
  notarization gates, updater artifacts, artifact retention, and release asset upload path.
- Map of frontend calls to Rust commands or plugin APIs, permission scopes, exact window labels, exact webview labels, CSP directives, remote origins, WebView custom protocols or IPC origins, and actual OS resources.
- Permission diff: previous permissions, new permissions, newly reachable windows/webviews, new scopes, and native operations enabled.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify Tauri major version and permission model before editing.
- Treat every frontend-provided path, URL, command argument, channel, token, or feature flag as untrusted.
- Determine which window or webview receives each capability.
- Before widening any capability, write the exact native action being enabled: window label, webview label, command name, plugin command, input fields, allowed path or URL, and why a narrower existing permission cannot satisfy the feature.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep capabilities and permissions feature-specific and window/webview-specific.
- Validate paths, URLs, command arguments, and update channels in Rust or the native boundary.
- Prefer app-owned directories and stable app IDs over broad filesystem paths.
- Keep shell, opener, sidecar, and updater behavior narrowly scoped.
- Prefer Rust commands that map small enums or ids to fixed native operations over exposing broad plugin APIs directly to the frontend.
- Keep package target lists explicit. Do not rely on broad "all targets" behavior when the product
  only ships a small set of installers or archives.

<!-- mustflow-section: procedure -->
## Procedure

1. Read frontend call sites, built frontend entry HTML when relevant, Tauri config, Rust command registration, Rust command handlers, plugin config, capabilities, permissions, scopes, updater, sidecar, mobile native permissions, and tests.
2. Build an IPC map: frontend function, command or plugin API, Rust handler, permission, scope, OS resource, and response data.
3. Classify every native operation by trust boundary: frontend input, Rust validation, plugin permission, capability target, scope, OS resource, and returned data sensitivity.
4. Do not trust frontend validation for filesystem paths, URLs, shell arguments, updater channels, identifiers, selected dialog paths, or server-provided links.
5. Apply the capability and permission policy below before adding permissions, scopes, remote origins, default permission sets, or wildcard targets.
6. Apply the CSP and WebView bootstrap policy below before tightening `script-src`, `connect-src`, `style-src`, `worker-src`, `img-src`, `font-src`, or remote-origin policy.
7. Apply the command input policy below before adding or changing `#[tauri::command]` handlers or `invoke` wrappers.
8. Apply the filesystem, dialog, shell, opener, updater, and sidecar policies below when those plugins or native operations are touched.
9. Apply the build and release matrix policy below when `tauri.conf.*`, release scripts, CI
   workflows, updater artifacts, signing, or bundle targets change.
10. Choose configured verification intents that cover Rust, frontend, Tauri build, permission/capability drift, CSP behavior, and security-sensitive behavior when available.

## Capability And Permission Policy

- Do not add or widen `windows: ["*"]`, `webviews: ["*"]`, broad label globs, `remote.urls`, or platform removal unless the user explicitly asked for that security boundary change.
- Privileged permissions must target exact window labels or exact webview labels.
- Treat multiple capability files as additive. A small temporary capability can still widen the final build.
- Do not add plugin `default` permission sets merely to fix a permission error. Prefer the smallest `allow-*` permission and the narrowest scope.
- For updater permissions, do not expose download or install operations to the frontend unless the feature explicitly requires renderer-triggered install behavior.
- Do not add broad filesystem scopes such as home, document, download, desktop, temp, app local data, resource root, drive root, or recursive write/delete scopes.
- Prefer app-owned paths with feature-specific names and narrow file patterns.
- Do not rely on capability scope alone. Confirm the Rust command or plugin path actually enforces the intended path, URL, argument, or channel constraint.
- Remote capabilities are denied by default. If unavoidable, keep them read-only or low-risk and isolated from filesystem, shell, updater, and opener privileges.

## CSP And WebView Bootstrap Policy

- Treat a packaged-app blank or black screen after a CSP change as a possible frontend bootstrap failure before assuming CSS, routing, or rendering logic is broken.
- Inspect the generated entry HTML, not only source templates. Static frontend builders such as SvelteKit may inject inline bootstrap scripts or module imports after `app.html` or the equivalent source template is processed.
- If the built entry HTML contains an inline bootstrap script, `script-src 'self'` can block the app before JavaScript starts. Prefer a supported nonce, hash, or externalized bootstrap design when practical.
- For urgent hotfixes, `script-src 'self' 'unsafe-inline'` may be an explicit compatibility tradeoff only when the app cannot boot otherwise, the risk is recorded, and the policy does not also allow remote script origins, `unsafe-eval`, or wildcard script sources.
- Keep development-server CSP and packaged-production CSP separate. Do not weaken production policy only to satisfy a local dev server, HMR, or debugging tool.
- When Tauri IPC or custom protocols are used, make `connect-src` explicit for the required IPC scheme or local origin. Do not replace a specific IPC allowance with `connect-src *`, broad `http:`, broad `https:`, or arbitrary localhost ranges.
- Do not use `default-src *`, `script-src *`, wildcard remote origins, or catch-all protocol allowances as a shortcut for boot failures.
- Recheck other generated asset needs after CSP changes: styles, fonts, images, workers, wasm, media, and preload/module scripts may fail independently of the main bootstrap.
- If a CSP relaxation is shipped as a hotfix, add a follow-up note for a stricter nonce, hash, or externalized-bootstrap design unless the framework or target platform makes that infeasible.

## Command Input Policy

- Every new or changed `#[tauri::command]` must have a typed request shape unless the command has no input.
- Use closed enums for actions, formats, updater channels, job kinds, and sidecar tasks.
- Reject `serde_json::Value`, unbounded maps, raw shell argument arrays, raw updater channel strings, raw URLs, raw paths, and dynamic command names unless the command immediately validates and normalizes them.
- Use unknown-field rejection for command request structs when compatible with the existing Rust style.
- Do not let frontend code call a dynamic command name. Frontend wrappers must call known command names and known argument shapes.
- Validate all paths, URLs, shell arguments, updater channels, file types, ids, and user-selected dialog paths in Rust before use.
- Do not return secrets, tokens, private file paths, command stderr containing credentials, update headers, or raw system details unless the feature explicitly requires it and the caller is scoped.

## Filesystem And Dialog Policy

- Prefer a Rust command that maps an id or relative filename to an app-owned path. Do not let the frontend choose arbitrary absolute paths for routine app storage.
- For app-owned paths, reject absolute paths, parent traversal, root components, Windows prefixes, and non-normal path components before joining to the base.
- Canonicalize the trusted base and the target parent before creating or writing files; ensure the target remains inside the base.
- Define overwrite, create, rename, remove, and recursive behavior explicitly.
- Dialog selection is only user intent evidence. Revalidate selected paths in Rust for file type, size, extension, content signature when relevant, symlink behavior, and allowed operation.
- Do not connect dialog-selected paths to broad future filesystem access without a second Rust-side validation and storage policy.

## Shell Sidecar Opener Updater Policy

- Do not expose shell execution through command strings, shell interpreters, dynamic executable names, dynamic working directories, dynamic environment variables, `args: true`, or catch-all validators.
- Prefer Rust commands that execute fixed binaries with fixed argument order and narrow enum/id inputs.
- If shell plugin access is unavoidable, pin the command name, sidecar flag, and ordered args. Dynamic args must be anchored validators for one primitive value only.
- Do not expose sidecars directly to arbitrary frontend args. Prefer a Rust command that maps a small enum or job id to fixed sidecar args.
- Do not open arbitrary URLs or files through opener. Parse and allowlist scheme, host, port, path prefix, and userinfo behavior before opening URLs. Restrict paths to app-owned exports or freshly selected and revalidated files.
- Treat server-provided URLs, markdown links, release notes, AI output, and remote content as untrusted before opener calls.
- Do not let frontend input control updater endpoint, public key, proxy, authorization headers, TLS downgrade, downgrade comparator, or arbitrary channel strings.
- Frontend update input may select only a closed channel enum when needed. Rust or static config must map that enum to hard-coded HTTPS endpoints and configured public keys.
- Do not enable insecure updater transport in production unless the user explicitly accepts the supply-chain boundary change and the repository records why.

## Build And Release Matrix Policy

- Treat Tauri release builds as Rust release builds plus frontend build plus bundling. Cold Cargo
  builds can dominate CI time, so check Rust cache, Node or package-manager cache, lockfile keys,
  and target-specific cache dimensions before blaming frontend code.
- Do not run full native bundles for every pull request by default. Prefer PR checks that prove the
  frontend build, Rust compile or checks, command contracts, and permission files on the cheapest
  adequate runner. Reserve full Windows, Linux, macOS, signing, notarization, updater, and installer
  matrices for release tags, release branches, or protected manual gates unless the repository
  explicitly requires more.
- Keep `bundle.targets` or equivalent packaging configuration to the formats actually shipped. Do
  not leave broad all-format packaging enabled when the release only needs, for example, one Windows
  installer, one macOS disk image or app bundle, and one Linux package format.
- For macOS distribution, prefer one deliberate universal or architecture-specific strategy rather
  than accidental duplicate jobs. Name signing and notarization boundaries separately from compile
  time.
- Keep test artifacts short-lived and promote durable distributables through the release or package
  channel. Do not use long-retention CI artifacts as the canonical release surface.
- If a cost comparison between Tauri and another desktop stack is requested, route the CI billing,
  runner-minute, artifact-storage, and matrix-shape analysis through `ci-pipeline-triage`; use this
  skill for Tauri-specific bundle targets, Cargo cache, updater, signing, and packaging behavior.

## Review Rejection Criteria

Reject or revise a change when:

- A permission error is fixed by adding a default permission set without explaining the exact native operation.
- Privileged permissions target all windows, all webviews, broad label globs, or remote origins.
- Filesystem scopes include broad user directories, recursive write/delete, app local WebView data, resource root, drive root, or arbitrary temp paths.
- Shell or sidecar access accepts command strings, shell interpreters, arbitrary args, unanchored validators, dynamic cwd, or dynamic env.
- Opener accepts arbitrary URLs, custom schemes, wildcard URL scopes, arbitrary file paths, or app names from frontend input.
- Updater endpoint, public key, proxy, headers, authorization, TLS mode, downgrade behavior, or arbitrary channel is renderer-controlled.
- A Rust command accepts untyped JSON, broad maps, raw paths, raw URLs, raw shell args, or action strings without immediate Rust-side normalization.
- Frontend validation is presented as the authoritative security check.
- A command is registered without checking which windows or webviews can reach it.
- The response returns sensitive paths, tokens, command output, update metadata, or system details without a scoped need.
- A packaged blank-screen fix widens CSP with wildcard script or connect sources, remote script origins, `unsafe-eval`, or broad protocol allowances instead of proving the generated bootstrap and IPC requirements.

<!-- mustflow-section: postconditions -->
## Postconditions

- Frontend-to-native resource access is mapped and minimized.
- Broad capabilities, permissions, scopes, shell access, updater exceptions, and sensitive returns are avoided or reported.
- Rust/native validation does not rely only on frontend checks.
- Permission and capability changes have a clear diff and native-operation justification.
- CSP changes have been checked against the generated frontend entry HTML and required Tauri IPC or custom protocol origins.
- Missing Tauri-specific verification is reported.
- Tauri package targets, release matrix, cache strategy, and artifact retention are explicit when
  packaging is touched.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing native build, packaged WebView smoke, CSP violation, permission diff, updater, shell, sidecar, opener, dialog, filesystem, or mobile permission verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a feature appears to require broad capabilities, stop and propose a narrower command or permission model.
- If frontend and Rust command contracts drift, synchronize them before adding more UI.
- If native permission behavior cannot be verified, report the platform-specific gap.
- If a capability, scope, or plugin permission widens unexpectedly, stop and reduce it before changing unrelated UI.
- If a CSP change breaks packaged app startup, inspect generated HTML and console CSP violations before widening policy; prefer nonce, hash, or externalized bootstrap before accepting `unsafe-inline`.
- If a command accepts broad input, replace it with a typed request and Rust-side validation before exposing it to the frontend.
- If updater, shell, opener, sidecar, or filesystem access cannot be narrowed, report the security boundary change instead of hiding it as a normal feature fix.
- If packaging cost or duration grows unexpectedly, check `bundle.targets`, release-only matrix
  gating, Rust cache, frontend cache, macOS job count, signing and notarization split, and artifact
  retention before changing unrelated app code.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- IPC, command input, CSP, permission, capability, window/webview, and scope notes
- Permission diff: old permissions, new permissions, newly reachable windows/webviews, new scopes, and native operation justification
- Filesystem, dialog, shell, opener, updater, sidecar, or mobile risk
- Build matrix, bundle target, signing or notarization, cache, artifact retention, and release asset
  notes when packaging is touched
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Tauri risk
