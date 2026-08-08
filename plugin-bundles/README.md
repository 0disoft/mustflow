# Agent Plugin bundles

Files in this directory declare portable output bundles. They do not replace `AGENTS.md`,
`.mustflow/skills/`, or `.mustflow/config/commands.toml`.

- `.mustflow/skills/` remains the skill source of truth.
- `commands.toml` remains the execution and permission authority.
- Generated Agent Plugins output belongs under `dist/agent-plugins/` and must not be edited by hand.
- Bundle declarations must not contain credentials or claim that plugin metadata enforces permissions.

The initial contract targets Agent Plugins specification 1.0.0 from the user-supplied 2026-08-08
snapshot. Live source refresh was unavailable during adoption, so the output adapter must validate
against an independently refreshed official schema before release claims are made.
