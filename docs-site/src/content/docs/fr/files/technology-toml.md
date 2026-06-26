---
title: technology.toml
description: Optional low-authority technology preferences for agents.
---

`.mustflow/config/technology.toml` records repository-local technology preferences for agents.

The file is optional and low authority. It can help an agent notice preferred, allowed, or avoided
languages, frameworks, libraries, runtimes, and tools, but it does not authorize package
installation, dependency upgrades, migrations, command execution, or ignoring the current codebase.

## Usage

- Record preferred technologies for a project area such as frontend, backend, UI, data, or CLI.
- Record libraries or runtimes that are allowed or should be avoided for new work.
- Give short rationale and guardrails that help agents make proposals consistent with the project.
- Keep technology choices discoverable without putting tool preferences into `AGENTS.md`.

Agents must still inspect the existing stack and command contract before making changes. Direct user
instructions, scoped `AGENTS.md` files, current source code, tests, and `.mustflow/config/commands.toml`
take precedence over this file.

## CLI

Use `mf tech list` and `mf tech suggest` to inspect technology preferences.
Use `mf tech add` and `mf tech remove` to update this file intentionally.

`mf tech add --verify` can verify npm package names before writing a preference, but that verification
does not install packages or grant dependency-update permission.
