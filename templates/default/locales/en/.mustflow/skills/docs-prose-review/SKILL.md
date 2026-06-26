---
mustflow_doc: skill.docs-prose-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: docs-prose-review
description: Apply this skill when a documentation review queue entry or selected document needs prose cleanup for LLM-like wording, AI-slop signals, low-specificity boilerplate, awkward phrasing, literal translation, unnatural tone, Korean technical translationese, or review comments attached to the queue entry.
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

This skill treats "AI smell" as a prose-quality signal, not as authorship proof. The goal is to remove low-information writing, translation artifacts, and domain-term drift without accusing a writer, changing facts, or making the text artificially messy.

<!-- mustflow-section: use-when -->
## Use When

- The task asks to review documentation created or modified by an LLM.
- A document is listed in the mustflow documentation review queue.
- The queue entry includes a review comment that explains how the document should be checked or revised.
- Prose sounds like LLM output, literal translation, filler, duplicated explanation, or unnatural Korean, English, or localized writing.
- A Korean technical document, README, tutorial, report, abstract, release note, or guide contains AI-slop signals such as vague value claims, translationese, formulaic tutorial framing, repeated passive voice, low-specificity modifiers, or domain-term mistranslations.
- The requested cleanup is to make writing more human, concrete, idiomatic, domain-accurate, or less template-like while preserving facts, code, commands, identifiers, and public contracts.
- The reviewer is a human, LLM, tool, or external process and needs to record the review result.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task asks for new product documentation, API documentation, or workflow policy changes instead of prose review.
- The document is not in the review queue and the task does not ask to add it.
- The requested change would alter commands, paths, code blocks, schemas, field names, public contracts, or technical meaning.
- The reviewer cannot understand the target language well enough to improve prose safely.
- The task asks to identify, accuse, or certify a human author, AI author, plagiarism status, detector score, or policy violation from prose style alone.
- The only requested change is to add intentional typos, random sentence variation, slang, emotional color, or "human imperfections" without improving clarity, evidence, or domain accuracy.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The documentation review queue entry or a user-selected document path.
- Any review comment attached to the queue entry.
- The current file contents.
- The intended document language and existing document structure.
- The intended audience, genre, and register when known: README, tutorial, product docs, API docs, release notes, report, academic abstract, blog post, or maintainer-facing note.
- Domain terminology that must stay exact, including code identifiers, API names, commands, package names, standard terms, and accepted translations.
- The reviewer kind and free-form reviewer identifier for the review record.
- `.mustflow/config/commands.toml` to resolve any verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The queue entry or selected path exists in the current mustflow root.
- Higher-priority instructions, repository style, and command policy have been checked for the current scope.
- The reviewer can preserve technical meaning while improving prose.
- Style concerns can be tied to concrete text spans, not only a general feeling that the document sounds like AI output.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Edit only the selected documentation file and review ledger entry unless the user explicitly broadens scope.
- Preserve headings, frontmatter identity, tables, command examples, code blocks, paths, field names, and schema names unless they are the direct source of the prose issue.
- Do not rewrite the whole document only to change tone.
- Do not fabricate evidence, numbers, production experience, failure stories, user quotes, benchmarks, or implementation history to make the document feel more human.
- Do not replace precise technical terms with casual synonyms only to avoid repetition.
- Do not remove a document from the queue without either improving it, marking it as still needing review, or explicitly recording why it should be ignored.

<!-- mustflow-section: procedure -->
## Procedure

1. Inspect the documentation review queue and choose one queued file unless the user selected a specific path.
2. If the entry has a review comment, treat it as the primary review guidance. Preserve the same technical safety boundaries as the rest of this skill.
3. If the entry has no review comment, inspect the document normally for awkward, LLM-like, over-explained, duplicated, literal, or unnatural prose.
4. Read the entire selected file before editing so terminology, heading structure, examples, and references stay consistent.
5. Diagnose prose issues as quality problems, not authorship evidence. Prefer labels such as vague claim, translationese, passive-agent gap, filler, repeated frame, tone mismatch, or domain-term drift.
6. Preserve meaning before style. Keep technical facts, literals, commands, code identifiers, paths, URLs, option names, schema names, API names, and measured values unchanged unless the source text is demonstrably wrong.
7. Replace vague praise with concrete reader value, actor, action, condition, or evidence. For example, do not leave "important role", "efficiently handles", "seamless integration", "user-friendly", "stable and scalable", "can contribute to", or "has potential" unless the sentence also states how, where, or under what evidence.
8. For Korean prose, reduce English-shaped translationese when it hurts clarity:
   - prefer direct actors over repeated `-됩니다`, `-수행됩니다`, `-생성됩니다`, `-확인됩니다`;
   - replace `~를 통해`, `~에 있어서`, `~에 의해`, `가능하게 합니다`, and `다음과 같습니다` when they only mirror English structure;
   - avoid formulaic openings such as `이 글에서는 ... 알아보겠습니다` when the document can start with the task or claim;
   - treat words such as `flaky`, `spoof`, `thin wrapper`, `heatmap`, `tainted`, `sandboxed`, and `code rot` as domain terms that may need accepted technical translations rather than dictionary-level literal phrasing.
9. Check specificity. A strong technical sentence usually answers at least one of these: who acts, what changes, where it applies, how much changes, which condition matters, or what evidence supports it.
10. Vary rhythm only in service of readability. Do not introduce artificial typos, random slang, forced metaphors, or sentence-length noise to evade an AI detector.
11. Avoid over-editing. Leave good local phrasing alone, even if it is polished. Edit the smallest span that removes the concrete prose problem.
12. Apply the review comment or prose cleanup with minimal, meaning-preserving edits.
13. Preserve executable snippets, paths, field names, option names, identifiers, frontmatter identity, and tables.
14. If the comment is ambiguous or the meaning is unclear, do not guess. Mark the entry as still needing human review and summarize what needs a human decision.
15. If the file does not need prose changes, mark the entry approved or ignored with a concise summary that explains why.
16. After a successful prose review, mark the queue entry approved with reviewer metadata and a short summary.
17. Run relevant configured verification intents when the edit changes public docs or installed workflow docs.

<!-- mustflow-section: postconditions -->
## Postconditions

- The selected document reads more naturally without changing technical meaning.
- Low-specificity, boilerplate, translationese, passive-agent, and domain-term issues are fixed only where the text showed concrete evidence.
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
- If a phrase sounds AI-like but is also normal for the document genre, do not treat the phrase alone as a defect; look for low specificity, repetition, or meaning loss.
- If removing AI-slop signals would require inventing facts, examples, numbers, or lived experience, preserve the claim boundary and report the missing evidence instead.
- If a literal translation might be an accepted domain term, verify local usage in the document or repository before changing it.
- If validation fails after prose edits, fix the first relevant documentation or workflow issue before marking the review complete.

<!-- mustflow-section: output-format -->
## Output Format

- Queue entry selected
- Review comment followed or reason no comment was present
- Prose issues fixed: vague claims, low-specificity boilerplate, translationese, passive-agent gaps, filler, repeated frame, tone mismatch, or domain-term drift
- Review status recorded
- Reviewer kind and reviewer identifier used
- Command intents run
- Skipped command intents and reasons
- Remaining language, meaning, evidence, authorship-attribution, or validation risks
