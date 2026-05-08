---
title: mf dashboard
description: Start the local mustflow dashboard.
---

`mf dashboard` starts a local browser dashboard for safe mustflow preferences.

The first dashboard surface edits `.mustflow/config/preferences.toml`. It does not stage, commit, push, bump versions, or run command intents.

## Current Behavior

```sh
npx mf dashboard
```

This command starts a local HTTP server bound to `127.0.0.1` by default, prints the dashboard URL, and opens it in the default browser.

The dashboard page includes a language selector for English, Korean, Chinese, Spanish, French, and Hindi. The selected language is saved in the browser.

Use `--port` to request a specific port. Use `--no-open` to keep the browser closed. Use `--json` when another tool needs the listening URL; JSON mode does not open a browser.

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
```

## Structured Output

With `--json`, the command prints the dashboard URL, mustflow root, and preferences path before keeping the local server running.

The dashboard API uses a per-session token and accepts updates only for the limited preference fields exposed by the page. `git.auto_push` is displayed as a locked setting.

## Help and Exit Codes

```sh
npx mf dashboard --help
```

- Exit code `0`: Dashboard started or help was printed.
- Exit code `1`: The dashboard could not start or input was invalid.
