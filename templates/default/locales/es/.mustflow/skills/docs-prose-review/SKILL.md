---
mustflow_doc: skill.docs-prose-review
locale: es
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: docs-prose-review
description: Apply this skill when a documentation review queue entry needs prose cleanup for LLM-like wording, awkward phrasing, literal translation, unnatural tone, or review comments attached to the queue entry.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-prose-review
  command_intents:
    - docs_validate
    - mustflow_check
---

# Docs Prose Review

<!-- mustflow-section: purpose -->
## Purpose

Review one queued documentation file at a time and make its prose read naturally while preserving the document's technical contract.

<!-- mustflow-section: use-when -->
## Use When

- The task asks to review documentation created or modified by an LLM.
- A document is listed in the mustflow documentation review queue.
- The queue entry includes a review comment that explains how the document should be checked or revised.
- Prose sounds like LLM output, literal translation, filler, duplicated explanation, or unnatural Korean, English, or localized writing.
- The reviewer is a human, LLM, tool, or external process and needs to record the review result.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task asks for new product documentation, API documentation, or workflow policy changes instead of prose review.
- The document is not in the review queue and the task does not ask to add it.
- The requested change would alter commands, paths, code blocks, schemas, field names, public contracts, or technical meaning.
- The reviewer cannot understand the target language well enough to improve prose safely.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The documentation review queue entry or a user-selected document path.
- Any review comment attached to the queue entry.
- The current file contents.
- The intended document language and existing document structure.
- The reviewer kind and free-form reviewer identifier for the review record.
- `.mustflow/config/commands.toml` to resolve any verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The queue entry or selected path exists in the current mustflow root.
- Higher-priority instructions, repository style, and command policy have been checked for the current scope.
- The reviewer can preserve technical meaning while improving prose.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Edit only the selected documentation file and review ledger entry unless the user explicitly broadens scope.
- Preserve headings, frontmatter identity, tables, command examples, code blocks, paths, field names, and schema names unless they are the direct source of the prose issue.
- Do not rewrite the whole document only to change tone.
- Do not remove a document from the queue without either improving it, marking it as still needing review, or explicitly recording why it should be ignored.

<!-- mustflow-section: procedure -->
## Procedure

1. Inspect the documentation review queue and choose one queued file unless the user selected a specific path.
2. If the entry has a review comment, treat it as the primary review guidance. Preserve the same technical safety boundaries as the rest of this skill.
3. If the entry has no review comment, inspect the document normally for awkward, LLM-like, over-explained, duplicated, literal, or unnatural prose.
4. Read the entire selected file before editing so terminology, heading structure, examples, and references stay consistent.
5. Apply the review comment or prose cleanup with minimal, meaning-preserving edits.
6. Preserve executable snippets, paths, field names, option names, identifiers, frontmatter identity, and tables.
7. If the comment is ambiguous or the meaning is unclear, do not guess. Mark the entry as still needing human review and summarize what needs a human decision.
8. If the file does not need prose changes, mark the entry approved or ignored with a concise summary that explains why.
9. After a successful prose review, mark the queue entry approved with reviewer metadata and a short summary.
10. Run relevant configured verification intents when the edit changes public docs or installed workflow docs.

<!-- mustflow-section: postconditions -->
## Postconditions

- The selected document reads more naturally without changing technical meaning.
- The review queue entry is approved, marked for human review, or ignored with reviewer metadata.
- Any skipped edit, unresolved meaning question, or missing command intent is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available and relevant:

- `docs_validate`
- `mustflow_check`

Do not infer missing validation commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the queue cannot be inspected, report the blocked queue step and do not edit blindly.
- If the selected file is missing, mark or report the stale queue entry instead of creating a replacement document.
- If the language or technical meaning is uncertain, mark the entry as still needing human review.
- If validation fails after prose edits, fix the first relevant documentation or workflow issue before marking the review complete.

<!-- mustflow-section: output-format -->
## Output Format

- Queue entry selected
- Review comment followed or reason no comment was present
- Prose issues fixed
- Review status recorded
- Reviewer kind and reviewer identifier used
- Command intents run
- Skipped command intents and reasons
- Remaining language, meaning, or validation risks
