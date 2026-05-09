# Minimal JavaScript Project

This example shows how a small JavaScript package changes when mustflow is added.

It is intentionally short. The installed `.mustflow/**` files are summarized here
instead of copied in full, because the real source of truth is the default
template under `templates/default/`.

## Before

```text
minimal-js/
├─ package.json
└─ src/
   └─ index.js
```

The project has ordinary package scripts, but no repository-local agent workflow
contract. An agent would need to infer which commands are safe to run.

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

`AGENTS.md` becomes the first file an agent reads. `.mustflow/config/commands.toml`
becomes the command contract, so agents run declared intents instead of guessing
from `package.json`.

For this project, the owner might configure only the checks that are real:

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

If a command is not real yet, it stays explicit instead of being inferred:

```toml
[intents.lint]
status = "unknown"
description = "Run linting."
reason = "This project has not declared a lint command yet."
agent_action = "do_not_guess_report_missing"
```

The resulting workflow is small: read `AGENTS.md`, select relevant mustflow
context and skills, run only configured one-shot intents, then report the checks
that were run or skipped.

