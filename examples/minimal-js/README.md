# Minimal JavaScript Project

This example demonstrates how a small JavaScript package changes when mustflow is added.

It is intentionally brief. The installed `.mustflow/**` files are summarized here rather than shown in full, since the definitive source is the default template under `templates/default/`.

## Before

```text
minimal-js/
├─ package.json
└─ src/
   └─ index.js
```

The project includes standard package scripts but lacks a repository-local agent workflow contract. An agent would need to infer which commands are safe to run.

```json
{
  "name": "minimal-js",
  "type": "module",
  "scripts": {
    "build": "node src/index.js",
    "test": "node --test"
  }
}
```

## After

```text
minimal-js/
├─ AGENTS.md
├─ package.json
├─ src/
│  └─ index.js
└─ .mustflow/
   ├─ config/
   │  ├─ commands.toml
   │  ├─ mustflow.toml
   │  └─ preferences.toml
   ├─ context/
   │  ├─ INDEX.md
   │  └─ PROJECT.md
   ├─ docs/
   │  └─ agent-workflow.md
   └─ skills/
      ├─ INDEX.md
      └─ ...
```

`AGENTS.md` becomes the first file an agent reads. `.mustflow/config/commands.toml` defines the command contract, so agents run declared intents instead of guessing from `package.json`.

For this project, the owner might configure only the checks that are relevant:

```toml
[intents.build]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run the package build."
argv = ["npm", "run", "build"]
cwd = "."
timeout_seconds = 30
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change"]

[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run the package tests."
argv = ["npm", "test"]
cwd = "."
timeout_seconds = 30
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change", "test_change"]
```

If a command is not yet defined, it remains explicit rather than inferred:

```toml
[intents.lint]
status = "unknown"
description = "Run linting."
reason = "This project has not declared a lint command yet."
agent_action = "do_not_guess_report_missing"
```

The resulting workflow is minimal: read `AGENTS.md`, select the relevant mustflow context and skills, run only configured one-shot intents, then report which checks were run or skipped.