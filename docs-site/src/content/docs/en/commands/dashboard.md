---
title: mf dashboard
description: Start the local mustflow dashboard.
---

`mf dashboard` starts a local dashboard server for mustflow status, verification recommendations, command intent inspection, command-effect graph explanations, release and version-source status, template update readiness, the latest run receipt, skill routes, safe preferences, and documentation review.

The status tab shows installation, manifest lock, template, changed or missing tracked files, runnable command count, latest run receipt, and active documentation review count. The verification tab reads changed files, recommends configured `mf run ...` intents to copy, and shows the resource-lock order from command effects without executing them. The command tab reads `.mustflow/config/commands.toml` and, when the local index is fresh, shows shared command locks and lock conflicts derived from the SQLite command-effect graph. It still treats `commands.toml` as the only command authority and does not execute intents. The release tab shows the installed mustflow version, template version, detected version sources, release-sensitive changed files, and copyable release-check commands. The update tab shows the `mf update --dry-run` plan, blockers, and template changes without applying them. The run history tab reads `.mustflow/state/runs/latest.json` and shows the latest `mf run` receipt, including status, timing, command line, exit details, and retained output tails. The skills tab reads `.mustflow/skills/INDEX.md` and shows each route's trigger, scope, risk, and command-intent alignment. The settings tab edits `.mustflow/config/preferences.toml`. The document review tab reads `.mustflow/review/docs.toml`, shows review comments when present, and can mark existing review entries approved, ignored, or needing human review. It does not stage, commit, push, bump versions, apply template updates, or run command intents.

Editable groups include Git defaults, commit message suggestions, reporting, verification selection, test authoring, refactoring hotspot thresholds and limits, code style, and version-impact preferences.

## Current Behavior

```sh
npx mf dashboard
```

This command starts a local HTTP server bound to `127.0.0.1` by default and prints the dashboard URL. It does not open a browser unless `--open` is passed.

The dashboard page includes a language selector for English, Korean, Chinese, Spanish, French, and Hindi. The selected language is saved in the browser.

The status tab is read-only. It uses the same local state as `mf status`, `mf context`, and the documentation review queue so a user can see the current workflow shape before changing settings.

The verification tab is read-only. It classifies changed files into mustflow workflow, documentation, code, and release-sensitive surfaces, then shows the matching configured command intents and why they were recommended. When command effects or fallback write locks are available, it also shows the recommended serial order, resource locks, and effect modes. Copying a plan copies text only; the dashboard still does not run the commands.

The command tab is read-only. It shows each configured intent's status, lifecycle, run policy, standard-input setting, timeout, working directory, write paths, and blocking reason when one is declared. `manual_only` intents are labeled as requiring a user request so they are not confused with broken or unavailable commands. When `.mustflow/cache/mustflow.sqlite` exists and is fresh, the tab also shows each intent's derived write locks and any other intent that shares a conflicting lock. If the index is missing or stale, the tab shows a rebuild hint instead of returning stale graph details.

The release tab is read-only. It uses local version-source detection and command-contract metadata to show what should be checked before release-sensitive work is accepted. It shows commands such as `mf version --check`, `mf run test_release`, and `mf run docs_validate` for copying, but it does not contact npm or run those commands automatically.

The update tab is read-only. It uses the same planner as `mf update --dry-run` and shows whether `mf update --apply` is currently safe, which files block the update, and which template files would be created or updated. The tab offers copyable commands only; it does not apply updates.

The run history tab is read-only. It shows only the latest run receipt kept by mustflow, including retained stdout and stderr tails from the receipt. It does not rerun commands or read raw terminal history.

The skills tab is read-only. It shows the installed skill routes from `.mustflow/skills/INDEX.md`, the matching `SKILL.md` path, required input, edit scope, risk, verification intents, and whether the route agrees with the skill frontmatter.

The document review tab shows active review entries by default. Approved and ignored entries are hidden unless the status filter requests them.

Use `--port` to request a specific port. Use `--open` to open the dashboard in the default browser after the server starts. `--no-open` is kept as an explicit compatibility option for scripts that want to state the default. Use `--json` when another tool needs the listening URL; JSON mode does not open a browser.

```sh
npx mf dashboard --port 4173
npx mf dashboard --open
npx mf dashboard --no-open
npx mf dashboard --json
npx mf dashboard --export .mustflow/state/artifacts/dashboard.html
npx mf dashboard --export-json .mustflow/state/artifacts/dashboard.json
```

Use `--export <path>` to write a static HTML dashboard snapshot without starting the local server. Use `--export-json <path>` to write the same bounded snapshot as structured JSON. Export paths must stay inside the current mustflow root. Export files do not contain the dashboard session token, API calls, preference-save controls, document-review mutation controls, raw command-output tails, or live-server assumptions.

## Structured Output

With `--json`, the command prints the dashboard URL, mustflow root, and preferences path before keeping the local server running.

With `--export-json`, the command writes a JSON file instead of printing the server URL. The JSON includes status, verification, command, update, skill, document-review, and preference snapshots with raw run output omitted and truncation metadata under `limits`. It also includes `harness_report`, a bounded read-only summary for pull request and continuous integration artifacts. That summary contains install and manifest status, changed surfaces, verification decision graph counts, runnable and skipped verification intents, manual-only or unavailable verification gaps, latest receipt metadata, document-review queue status, and remaining risks.

The static HTML export is rendered from the same JSON snapshot. It does not contain separate decision logic or controls that run commands.

The dashboard API uses a per-session token. Status reads, preference updates, and document-review transitions all require that token. The API accepts updates only for the limited preference fields and document-review status transitions exposed by the page. Git preference toggles describe what an agent may do after an explicit user request; they do not make command-contract entries such as `git_commit` runnable. `git.auto_push` is displayed as a locked setting.

When a preference save succeeds, the dashboard writes `.mustflow/config/preferences.toml` and refreshes that file's entry in `.mustflow/config/manifest.lock.toml` as `last_action = "customized"` when the lock file exists. This keeps `mf check`, `mf status`, and `mf update --dry-run` aligned with the accepted local preference baseline.

When a document review action succeeds, the dashboard updates `.mustflow/review/docs.toml`. Reviewer kind stays broad (`human`, `llm`, `tool`, or `external`); the reviewer ID and summary stay free-form. Review comments are displayed as guidance for the reviewer and remain outside the target document.

## Help and Exit Codes

```sh
npx mf dashboard --help
```

- Exit code `0`: Dashboard started or help was printed.
- Exit code `1`: The dashboard could not start or input was invalid.
