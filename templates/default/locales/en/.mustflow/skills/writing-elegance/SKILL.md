---
mustflow_doc: skill.writing-elegance
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: writing-elegance
description: Apply this skill when a user provides Korean or English prose and asks to extract reusable elegant wording candidates, collect selected phrase fragments into a phrase bank, or polish writing with previously selected modular expressions. Also apply it as a style-polish adjunct for report-style answers, final reports, GitHub issue bodies, pull request descriptions, review replies, maintainer-facing comments, release or update notes, documentation prose, summaries, and explanatory writing when facts are already established and the goal is clearer, more graceful wording.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.writing-elegance
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Writing Elegance

<!-- mustflow-section: purpose -->
## Purpose

Build and use a small phrase bank of reusable wording patterns that make prose, documentation,
answers, summaries, issue or pull-request text, reports, and narrative explanations more graceful
without locking the agent into over-specific sentences.

This skill is not a generic rewrite machine. It collects modular fragments that can survive across
contexts, languages, subjects, and genres.

<!-- mustflow-section: use-when -->
## Use When

- The user provides Korean or English prose and asks for elegant words, expressions, phrasing, or
  sentence patterns that could be reused later.
- The user asks for seven numbered candidate expressions from a supplied text and intends to choose
  which candidates should be stored.
- The user selects candidate numbers to keep, reject, or revise for future skill guidance.
- The task is to polish a document, answer, report, comment, or explanation using a curated phrase
  bank rather than inventing style from scratch.
- The task is to improve the wording of a final report, implementation summary, GitHub issue body,
  pull request description, review reply, maintainer-facing comment, release note, update note, or
  Markdown report after the factual evidence and owning workflow skill have already set the content.
- The work needs Korean source fragments translated into English guidance for a reusable skill.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a documentation review queue entry or AI-slop cleanup for a mustflow document. Use
  `docs-prose-review` first.
- The task changes technical facts, commands, API contracts, code snippets, schema text, legal text,
  safety instructions, or release/change history where correctness, evidence, or repository policy
  still needs the owning skill before any style polish.
- The user asks for one-off translation, summarization, grammar correction, or copy editing with no
  reusable phrase-bank goal.
- The candidate expression depends on a proper noun, character name, unique setting, private event,
  or one-time plot situation that would not transfer to other writing.
- The phrase only sounds ornate but does not improve precision, tone control, rhythm, or emotional
  framing.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Source text in Korean or English.
- The intended mode: candidate extraction, selected-candidate storage, phrase-bank application, or
  phrase-bank cleanup.
- The target register when known: literary, technical, explanatory, product, support, review,
  maintainer-facing, casual, formal, or emotionally restrained.
- The target surface when relevant: chat answer, final report, Markdown report, GitHub issue, pull
  request description, review reply, release note, update note, documentation page, or comment.
- Any user feedback about what to keep, reject, generalize, split, shorten, or rewrite.
- The current phrase bank when storing or applying selected expressions.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Candidate extraction can preserve the original meaning without copying long source passages.
- Phrase-bank entries can be generalized without retaining private names, narrow plot facts, or
  one-off circumstances.
- If repository files will be edited, higher-priority instructions and command contracts have been
  checked first.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- For ordinary chat rounds, make no file edits. Return only a numbered candidate table.
- When the user asks to preserve selected candidates, update the phrase bank and only directly
  synchronized skill/template metadata needed for that stored expression.
- Keep `SKILL.md` procedural and short. Store accumulated expressions in `references/phrase-bank.md`
  or a split reference file when the bank grows.
- Do not store raw source excerpts beyond the short fragment needed to identify the pattern.
- Do not store private names, unique character names, narrow plot facts, or whole paragraphs in the
  phrase bank.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the round:
   - `candidate_extraction`: the user supplied prose and needs seven numbered candidates;
   - `selection_storage`: the user selected candidate numbers to keep or discard;
   - `application`: the user wants existing phrase-bank patterns applied to a text;
   - `cleanup`: the phrase bank needs deduplication, splitting, or reorganization.
2. For candidate extraction, read the supplied text and choose exactly seven candidates unless the
   user asks for a different count.
3. Prefer reusable fragments over finished sentences:
   - keep fragments that can attach to many nouns, scenes, arguments, or explanations;
   - split before a proper noun, unique event, one-time setting, or over-specific object;
   - keep the smallest phrase that carries the style value.
4. For Korean source text, include the Korean source fragment and translate the reusable guidance
   into English.
5. For English source text, preserve the short source fragment, include a concise Korean
   translation column in candidate tables, and derive a generalized English pattern.
6. Reject candidates that are:
   - tied to a named person, place, product, fictional setting, or unique incident;
   - too complete to recombine;
   - too vague to guide future writing;
   - decorative without improving meaning;
   - likely to overwrite the writer's actual register.
7. Return a numbered table with these columns:
   - `No.`
   - `Source Fragment`
   - `Korean Translation` when the source text is English
   - `Reusable English Pattern`
   - `Reusable Range`
   - `Skill Note`
8. When the user selects entries, store only those entries. Preserve rejected numbers as absent, not
   as negative examples, unless the user explicitly asks to record a rejection rule.
9. Store entries as compact rows with:
   - source language;
   - source fragment;
   - reusable English pattern;
   - use guidance;
   - avoid guidance when a common misuse is known.
10. When applying the phrase bank, use entries as taste constraints, not mandatory substitutions.
    Preserve technical facts, evidence, legal meaning, safety warnings, user intent, and the original
    level of certainty.
11. When polishing GitHub, release, verification, or final-report content, apply the owning skill
    first for evidence, repository rules, version facts, and verification scope. Use this skill only
    to make the already-correct wording clearer, smoother, or more elegant.
12. When the phrase bank grows too large, split it by usage type such as emotional framing,
    restrained technical polish, transitions, softening, emphasis, scene atmosphere, or answer tone.

<!-- mustflow-section: postconditions -->
## Postconditions

- Candidate tables contain reusable fragments rather than narrow finished sentences.
- Stored entries are in English guidance even when the source text was Korean.
- Proper nouns, private details, unique plot facts, and one-off situations are excluded or
  generalized.
- The phrase bank remains compact enough to load only when needed.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when repository files are changed:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Do not infer raw validation commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source text is too long, extract candidates from the most style-dense sections and report
  that the pass was selective.
- If all appealing phrases are too situation-specific, return fewer strong candidates or ask for a
  different sample instead of padding the table.
- If the user rejects a candidate for being too narrow, split it into a smaller reusable fragment
  and avoid storing the rejected broad form.
- If a phrase-bank entry starts to duplicate another entry, merge the guidance instead of adding a
  near-copy.
- If applying a phrase would make a technical or factual answer less clear, preserve clarity and
  report that the phrase was skipped.

<!-- mustflow-section: output-format -->
## Output Format

- Mode: candidate extraction, selection storage, application, or cleanup
- Candidate table or stored entries
- Entries kept and rejected when relevant
- Phrase-bank file changed when relevant
- Command intents run when repository files changed
- Skipped checks and reasons
- Remaining style, specificity, or privacy risk
