---
mustflow_doc: agents.root
locale: en
canonical: true
revision: 1
lifecycle: user-editable
authority: binding
---

# AGENTS.md

This repo uses the mustflow simple workflow.

## Priority

Follow the user's task and the nearest project rules first. They outrank this file.

## Reading

Read only the nearest `AGENTS.md` plus the source and package config the task touches. Expanded skill indexes and workflow docs are optional; skip them unless the task needs them.

## Commands

Use the repository's own package scripts, Makefile, Taskfile, Go, or Rust commands directly. `mf run check`, `test`, `typecheck`, `lint`, and `build` are optional and discover common commands from package scripts and Go/Rust manifests. Explicit command restrictions written in the repo still apply and are respected by `mf run`.

## Scope

No intent registration or manifest sync is needed for ordinary development. Pick narrow, relevant checks, and reuse valid results for unchanged inputs. A failure, a missing command, or a check that never ran is not a pass. Run full release checks only for real release, public API, security, or data changes that fall inside the current scope.

## Edits and Git

Keep unrelated edits intact. Keep secrets out of logs and the repo. Stage an exact scope and make small logical commits. Push, publish, and deploy only when the user authorizes them.

## Hygiene

Avoid automatic version bumps and repeated permission or read cycles. Scripts that start background processes must clean up their own processes. Existing global strict docs do not govern ordinary simple workflows.
