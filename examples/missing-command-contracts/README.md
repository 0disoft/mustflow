# Missing Command Contracts

This example demonstrates how mustflow handles package scripts that have not been declared as command intents.

## Before

```text
scripted-project/
├─ package.json
└─ src/
   └─ index.js
```

The package includes the following scripts:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint .",
    "test": "node --test"
  }
}
```

Without mustflow, an agent might assume any script is safe to run. mustflow does not follow this assumption.

## After

```text
scripted-project/
├─ AGENTS.md
├─ package.json
└─ .mustflow/
   └─ config/
      └─ commands.toml
```

Only command intents that are declared as configured, one-shot, agent-allowed, and closed-stdin are available to agents.

```toml
[intents.build]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Build the package."
argv = ["npm", "run", "build"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
network = false
destructive = false
required_after = ["code_change"]

[intents.lint]
status = "unknown"
description = "Run linting."
reason = "The repository has not declared whether lint is safe for agents."
agent_action = "do_not_guess_report_missing"

[intents.test]
status = "manual_only"
description = "Run tests."
reason = "The test suite may be slow or require a local service."
agent_action = "do_not_run_report_manual"
```

In this configuration, an agent may run `mf run build` for a covered code change, but it must not run `npm run lint` or `npm test` directly. The final report will indicate that lint is missing and tests are manual-only.