---
title: .mustflow/context/PROJECT.md
description: Records project goals, non-goals, terms, and repository-wide promises for agents.
---

`.mustflow/context/PROJECT.md` is the default project context file installed by `mf init`.

It should stay short. It is not a full architecture document, roadmap, API reference, meeting log, or generated summary archive.

## Where It Is Used

- Gives agents project direction when a task could affect scope, behavior, or repository-wide promises.
- Records non-goals so agents do not expand unrelated work.
- Lists domain terms and extra-care areas that change implementation decisions.

## Authority

The default authority is `contextual`.

That means the file helps orient the agent, but it is lower authority than direct user instructions, current code, tests, command contracts, and configured policies.

If it conflicts with current files, agents should report the conflict and treat this context as stale.

## Sections

- `Current Goal`: The current project goal. Leave unset rather than inventing one.
- `Non-Goals`: Things agents should not expand into during unrelated tasks.
- `Core Promises`: Repository-wide promises agents should preserve.
- `Domain Terms`: Terms that affect implementation decisions.
- `Extra Care Areas`: Paths, APIs, generated files, migrations, secrets, or compatibility surfaces that require caution.
- `Read Next`: Files to read after this context.
- `Staleness Check`: How to detect when the file is outdated.

