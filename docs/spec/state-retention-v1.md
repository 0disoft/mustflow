# State Retention v1

This specification defines how mustflow treats generated local state, caches,
and retained command output.

## Scope

State retention applies to repository-local files created by mustflow during
use. It does not authorize storing chat transcripts, hidden reasoning, secrets,
customer data, or raw terminal logs.

## State Classes

mustflow uses these broad state classes:

- Source files: versioned project files such as `AGENTS.md`,
  `.mustflow/config/*.toml`, `.mustflow/docs/**`, and `.mustflow/skills/**`.
- Generated navigation: files such as `REPO_MAP.md`, refreshed by `mf map`.
- Generated cache: files under `.mustflow/cache/**`, refreshed by `mf index`.
- Generated run state: files under `.mustflow/state/**`, written by commands
  such as `mf run`.

## Version Control Rules

Generated cache and generated run state must stay unversioned by default.

`REPO_MAP.md` may be versioned when a repository chooses to keep a generated
navigation map, but it remains generated. It must be refreshed through `mf map`
rather than edited by hand.

## Retention Limits

Retention settings are configured in
[.mustflow/config/mustflow.toml](../../.mustflow/config/mustflow.toml). The
implementation must respect the configured limits for:

- maximum receipt size;
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
- generated summaries that claim higher authority than current files.

## Authority

Generated state is evidence or cache only. It never overrides:

- current direct user instructions;
- host safety and approval policy;
- the nearest `AGENTS.md`;
- `.mustflow/config/*.toml`; or
- current source files.

## Testable Outcomes

- `.mustflow/state/runs/latest.json` can summarize a run, but it cannot change
  which command is runnable.
- `.mustflow/cache/mustflow.sqlite` can speed up search, but it cannot replace
  reading current files.
- A missing cache is not a broken installation when the feature is optional.
- Oversized generated files should be reported by strict checks when they exceed
  configured limits.

