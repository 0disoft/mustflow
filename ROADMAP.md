# mustflow Roadmap

Last reviewed: 2026-05-10

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

### M2.14: Source Anchor Status Signals

Goal: detect whether existing source anchors still point at the intended code
after edits without turning anchors into workflow instructions, command
authority, or a parallel documentation system.

Remaining work:

- Extend the current source-anchor fingerprint model with symbol extraction for
  function, class, method, const, export, signature, and body boundaries.
- Add status comparison against a previous fingerprint snapshot for `moved`,
  `changed`, `review`, `stale`, and `invalid` anchors.
- Keep status output explanatory: include confidence and signals for identity,
  location, symbol, body, metadata, semantic cues, and risk.
- Treat high-risk anchors conservatively. A high-risk body, signature, search,
  or invariant change should require review instead of being marked valid.
- Keep source anchors out of verification planning. Verification requirements
  must continue to come from change classification and `commands.toml`, not
  from anchor metadata.

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
