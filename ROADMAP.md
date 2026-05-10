# mustflow Roadmap

Last reviewed: 2026-05-09

This roadmap lists remaining work only. Completed items are removed after
verification so agents can spend context on the next decisions instead of
reading project history.

## Current Priority

Make this repository a strong example of its own workflow contract.

Before adding larger product surfaces, mustflow should reduce duplicated policy
logic and keep future commands sharing the same core decisions.

Open command-contract follow-up: `lint`, coverage, and test-audit intents
remain unset or manual-only until narrower repository gates exist for those
workflows.

## Near-Term Milestones

### M2.14: Source Anchors and Navigation-Only Code Search

Goal: let agents find important source-code locations by meaning without
turning source comments into workflow instructions, command authority, or a
parallel documentation system.

Rationale:

- LLM-generated code changes often require fast semantic navigation: "where is
  authorization resolved", "where is payment state normalized", or "which route
  maps external webhook events". Plain text search works only when the agent
  already knows the right symbol or phrase.
- Free-form "LLM comments" would pollute source files and become stale quickly.
  mustflow should instead treat source anchors as short, structured navigation
  coordinates that help agents find code, not as truth about what the code does.
- Source anchors must have lower authority than `AGENTS.md`,
  `.mustflow/config/commands.toml`, workflow docs, and skills. A source anchor
  can explain where to look, but it cannot tell an agent to run, skip, override,
  or broaden a command.
- Stale detection cannot rely on a single surrounding-line hash. Nearby text is
  useful for relocating an anchor after edits, but stale review should separate
  locator signals, target-symbol signals, body-change signals, semantic cues,
  and risk class.
- Inline anchors and separate anchor files serve different needs. Inline anchors
  are best for precise symbol-level navigation. Separate files are better for
  cross-file flows, directories, or architecture relationships that would be too
  verbose inside source comments.

Anchor state model:

- `valid`: anchor fields and target symbol still line up.
- `moved`: locator text changed, but the same target symbol is found.
- `changed`: target body changed, but signature, risk, and semantic cues still
  appear compatible.
- `review`: high-risk or large changes may affect the anchor's meaning.
- `stale`: target symbol is gone, attached to the wrong target, or contradicts
  the anchor invariant.
- `invalid`: parse failure, duplicate ID, forbidden instruction, secret-like
  content, generated/vendor path, or invalid risk value.

Deferred scope:

- Separate `.mustflow/source-anchors.toml` area or flow anchors.
- Hybrid inline-ID plus external long description anchors.
- `mf anchors list`, `mf anchors stale`, `mf anchors review`, or similar
  lifecycle-management commands.
- Automatic anchor suggestion or source-code modification by mustflow.

Decision rule:

- If the user needs to find a specific function, class, type, route handler, or
  adapter, prefer an inline source anchor.
- If the user needs to understand a flow across multiple files or directories,
  defer to a separate anchor-file design.
- If an anchor begins to read like prose documentation or an instruction to the
  agent, it is the wrong format.

### M3: Core Policy Modules

Goal: move shared decision logic out of command handlers without prematurely
promising a broad public API.

- Keep CLI commands thin by calling shared core functions.
- Export only the minimum surface needed internally until API stability is
  intentionally documented.
- Preserve existing CLI behavior while reducing duplicated policy logic.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or
  package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project
  truth.
- Do not add broader dashboard, registry, or adapter work ahead of matching
  contract, explanation, and verification foundations.

## Decision Notes

- The default installed project surface should remain small:
  `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source
  operations from files installed into user projects.
