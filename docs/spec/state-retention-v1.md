# State Retention v1

This specification defines how mustflow manages generated local state, caches, and retained command output.

## Scope

State retention applies to repository-local files created by mustflow during operation. It does not permit storing chat transcripts, hidden reasoning, secrets, customer data, or raw terminal logs.

## State Classes

mustflow uses the following broad state classes:

- Source files: versioned project files such as `AGENTS.md`, `.mustflow/config/*.toml`, `.mustflow/docs/**`, and `.mustflow/skills/**`.
- Generated navigation: files such as `REPO_MAP.md`, refreshed by `mf map`.
- Generated cache: files under `.mustflow/cache/**`, refreshed by `mf index`.
- Generated run state: files under `.mustflow/state/**`, written by commands such as `mf run`.

## Version Control Rules

Generated cache and generated run state must remain unversioned by default.

`REPO_MAP.md` may be versioned if a repository chooses to retain a generated navigation map, but it remains a generated file. It must be refreshed via `mf map` rather than edited manually.

## Retention Limits

Retention settings are configured in  
[.mustflow/config/mustflow.toml](../../.mustflow/config/mustflow.toml). The implementation must enforce the configured limits for:

- maximum receipt size;
- maximum retained run and verify receipt directories;
- maximum total retained run and verify receipt directory size;
- maximum retained output tail size;
- generated map size;
- cache and handoff limits when those features are enabled; and
- raw event storage, which is disabled by default.

## Forbidden State

mustflow-managed state must not store:

- hidden reasoning;
- full conversation transcripts;
- secrets or secret-like values;
- raw unbounded command logs;
- raw terminal history;
- customer data; or
- generated summaries that claim greater authority than current files.

## Authority

Generated state serves only as evidence or cache. It must never override:

- current direct user instructions;
- host safety and approval policies;
- the nearest `AGENTS.md`;
- `.mustflow/config/*.toml`; or
- current source files.

## Testable Outcomes

- `.mustflow/state/runs/latest.json` can summarize the latest run but cannot alter which commands are runnable.
- `.mustflow/state/runs/latest.index.json` can help find recently retained runs by intent or cwd, but it cannot make pruned receipts available or act as session-scoped proof.
- `.mustflow/cache/mustflow.sqlite` can accelerate search but cannot replace reading current files.
- A missing cache does not indicate a broken installation when the feature is optional.
- Oversized generated files should trigger strict checks when they exceed configured limits.
