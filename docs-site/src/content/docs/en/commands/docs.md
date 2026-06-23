---
title: mf docs
description: Tracks documents that need prose review after LLM edits.
---

`mf docs review` manages a repository-local review queue for documents created or modified by agents.

The queue is stored at `.mustflow/review/docs.toml`. It is not created by `mf init`; the file appears only when a document is added for review.

## Review Model

The queue tracks document status, not a fixed list of reviewer products.

- `pending`: Review is needed.
- `in_review`: Review has started.
- `changes_made`: A reviewer changed the document.
- `approved`: Review is complete and the document is hidden from the default list.
- `needs_human`: The reviewer could not confidently approve the document.
- `ignored`: The document is intentionally excluded from review.

Reviewers use broad kinds: `human`, `llm`, `tool`, or `external`. Specific names, providers, models, and command intents are free-form metadata.
Entries may also carry a review comment. Review comments are stored in the queue record, not inserted into the target document, and may span multiple lines. If a comment is imported from a file, mustflow deletes that source file after the queue update succeeds.

## List Documents

```sh
npx mf docs review list
npx mf docs review list --json
npx mf docs review list --all
```

The default list shows only active items. Use `--all` to include approved and ignored entries.

JSON output includes release triage fields for each document:

- `review_priority`: `P0`, `P1`, or `P2`.
- `release_blocking`: `true` when an unapproved P0 document should block release.
- `triage_reason`: the machine-readable reason for the priority, such as
  `release_contract`, `english_command_doc`, `translation_review_debt`, or
  `test_fixture`.

P0 covers release-sensitive workflow and command documentation such as `README.md`,
`CHANGELOG.md`, `AGENTS.md`, `.mustflow/docs/agent-workflow.md`, `.mustflow/skills/INDEX.md`,
default template English source files, English command docs, and skills that affect
authority, security, command execution, or validation boundaries. P1 covers normal
user-visible documentation. P2 covers non-blocking review debt such as non-default
translations and test fixtures.

## Add A Document

```sh
npx mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex
npx mf docs review add docs/guide.md --comment "Rewrite the literal translation in the intro."
npx mf docs review add --changed --actor-kind llm --actor-id codex
```

Adding a document creates or updates its queue entry and marks it `pending`.

Use `--changed` to inspect `git status` and add every changed documentation review candidate in one step.
This is the stable command behind the default `docs_review_add_changed` command intent. It does not accept
a document path, `--comment`, or `--comment-file`; add shared review guidance afterward with
`mf docs review comment <path>` when needed.

## Add Review Guidance

```sh
npx mf docs review comment docs/guide.md --comment "Check terminology in the install section."
npx mf docs review comment docs/guide.md --comment-file review-note.md --actor-kind human --actor-id cherr
```

Use `--comment` for short guidance and `--comment-file` for multiline notes. `--comment-file` imports the file contents into `.mustflow/review/docs.toml` and then deletes the source file after a successful update, so temporary review notes do not accumulate. The comment file must not be the target document.

A review comment marks the existing queue entry `pending` and gives the next human, LLM, tool, or external reviewer a concrete starting point. If no comment exists, reviewers inspect the document normally.

## Approve A Document

```sh
npx mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --reviewer-provider deepseek --reviewer-model deepseek-reasoner --summary "Rewritten for natural tone."
```

Approval hides the document from the default list but keeps the review record. Use `needs-human` when a reviewer cannot safely approve it, or `ignore` when the repository intentionally skips review for that file.

## Help And Exit Codes

```sh
npx mf docs --help
```

- Exit code `0`: The queue was inspected or updated.
- Exit code `1`: Input was invalid or the queue could not be updated.
