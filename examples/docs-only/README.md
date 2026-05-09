# Documentation-Only Project

This example shows how mustflow can fit a repository that primarily contains
Markdown documentation and has no application build.

## Before

```text
docs-handbook/
├─ README.md
└─ docs/
   ├─ guide.md
   └─ release-notes.md
```

The project has useful documents, but no explicit agent contract for which checks
exist. An agent might look for package scripts or invent a documentation build
command that does not exist.

## After

```text
docs-handbook/
├─ AGENTS.md
├─ README.md
├─ docs/
│  ├─ guide.md
│  └─ release-notes.md
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

The owner can declare that documentation validation is available while making
missing code checks explicit:

```toml
[intents.docs_validate_fast]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Check documentation links and frontmatter."
argv = ["node", "scripts/check-docs.mjs"]
cwd = "."
timeout_seconds = 60
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["docs_change"]

[intents.build]
status = "unknown"
description = "Build the project."
reason = "This documentation-only repository has no application build."
agent_action = "do_not_guess_report_missing"

[intents.test]
status = "unknown"
description = "Run tests."
reason = "This documentation-only repository has no test suite."
agent_action = "do_not_guess_report_missing"
```

With that contract, an agent can update prose, run the declared documentation
check, and report that code build or test checks are intentionally unavailable
instead of treating missing scripts as hidden failures.

