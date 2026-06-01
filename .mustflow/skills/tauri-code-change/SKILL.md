---
mustflow_doc: skill.tauri-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: tauri-code-change
description: Apply this skill when Tauri frontend invokes, Rust commands, capabilities, permissions, scopes, plugins, filesystem, dialog, shell, opener, updater, sidecar, or mobile native permissions are created or changed.
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

- `src-tauri`, `tauri.conf.*`, `Cargo.toml`, `#[tauri::command]`, `invoke`, Tauri JavaScript APIs, plugin config, capabilities, permissions, scopes, fs, dialog, shell, opener, updater, sidecar, mobile manifests, or native permissions change.
- A frontend button, menu, or workflow calls native resources through Tauri.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a pure web frontend view with no Tauri API, command, permission, plugin, or native resource boundary.
- The Rust code is not part of a Tauri application; use `rust-code-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Frontend package metadata, Tauri config, Rust manifests, main/lib command modules, command registration, capability and permission files, plugin config, updater config, sidecar config, mobile permissions, and tests.
- Map of frontend calls to Rust commands or plugin APIs, permission scopes, exact window labels, exact webview labels, remote origins, and actual OS resources.
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

<!-- mustflow-section: procedure -->
## Procedure

1. Read frontend call sites, Tauri config, Rust command registration, Rust command handlers, plugin config, capabilities, permissions, scopes, updater, sidecar, mobile native permissions, and tests.
2. Build an IPC map: frontend function, command or plugin API, Rust handler, permission, scope, OS resource, and response data.
3. Classify every native operation by trust boundary: frontend input, Rust validation, plugin permission, capability target, scope, OS resource, and returned data sensitivity.
4. Do not trust frontend validation for filesystem paths, URLs, shell arguments, updater channels, identifiers, selected dialog paths, or server-provided links.
5. Apply the capability and permission policy below before adding permissions, scopes, remote origins, default permission sets, or wildcard targets.
6. Apply the command input policy below before adding or changing `#[tauri::command]` handlers or `invoke` wrappers.
7. Apply the filesystem, dialog, shell, opener, updater, and sidecar policies below when those plugins or native operations are touched.
8. Choose configured verification intents that cover Rust, frontend, Tauri build, permission/capability drift, and security-sensitive behavior when available.

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

<!-- mustflow-section: postconditions -->
## Postconditions

- Frontend-to-native resource access is mapped and minimized.
- Broad capabilities, permissions, scopes, shell access, updater exceptions, and sensitive returns are avoided or reported.
- Rust/native validation does not rely only on frontend checks.
- Permission and capability changes have a clear diff and native-operation justification.
- Missing Tauri-specific verification is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing native build, permission diff, updater, shell, sidecar, opener, dialog, filesystem, or mobile permission verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a feature appears to require broad capabilities, stop and propose a narrower command or permission model.
- If frontend and Rust command contracts drift, synchronize them before adding more UI.
- If native permission behavior cannot be verified, report the platform-specific gap.
- If a capability, scope, or plugin permission widens unexpectedly, stop and reduce it before changing unrelated UI.
- If a command accepts broad input, replace it with a typed request and Rust-side validation before exposing it to the frontend.
- If updater, shell, opener, sidecar, or filesystem access cannot be narrowed, report the security boundary change instead of hiding it as a normal feature fix.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- IPC, command input, permission, capability, window/webview, and scope notes
- Permission diff: old permissions, new permissions, newly reachable windows/webviews, new scopes, and native operation justification
- Filesystem, dialog, shell, opener, updater, sidecar, or mobile risk
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Tauri risk
