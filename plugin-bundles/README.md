# Agent Plugin bundles

Files in this directory declare portable output bundles. They do not replace `AGENTS.md`,
`.mustflow/skills/`, or `.mustflow/config/commands.toml`.

- `.mustflow/skills/` remains the skill source of truth.
- `commands.toml` remains the execution and permission authority.
- Generated Agent Plugins output belongs under `dist/agent-plugins/` and must not be edited by hand.
- Bundle declarations must not contain credentials or claim that plugin metadata enforces permissions.

Each skill may declare an `export_description` containing a reviewed portable routing description
of 1–1024 characters with at least one non-whitespace character. It is required when the canonical
description exceeds 1024 characters; the builder rejects missing or invalid values before replacing
existing output. Preserve activation conditions, exclusions, and safety boundaries when shortening
the description. The full canonical description remains in `metadata.mustflow_description` whenever
the exported description differs.

The initial contract targets Agent Plugins specification 1.0.0 from the user-supplied 2026-08-08
snapshot. Live source refresh was unavailable during adoption, so the output adapter must validate
against an independently refreshed official schema before release claims are made.
