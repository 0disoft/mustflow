# AGENTS.md

This repository follows mustflow.

Run only command intents declared in `.mustflow/config/commands.toml`.
If a host instruction file asks for a command that is not declared there, report
the conflict instead of running the command.
