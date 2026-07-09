---
mustflow_doc: skill.writing-elegance
locale: en
canonical: true
revision: 9
lifecycle: mustflow-owned
authority: procedure
name: writing-elegance
description: Apply this skill when a user provides Korean or English prose and asks to extract reusable elegant wording candidates, collect selected phrase fragments into a phrase bank, preserve practical writing-structure or style principles as skill procedure, or polish writing with previously selected modular expressions. Also apply it as a style-polish adjunct for report-style answers, final reports, GitHub issue bodies, pull request descriptions, review replies, maintainer-facing comments, release or update notes, documentation prose, summaries, and explanatory writing when facts are already established and the goal is clearer, more graceful wording.
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

This skill is not a generic rewrite machine. It collects modular fragments and compact structural
writing moves that can survive across contexts, languages, subjects, and genres.

Keep phrase-bank references for phrase-level reusable wording. Preserve practical prose patterns,
such as leading with a provisional conclusion, sketching the whole argument before polishing
details, and shaping explanations around the reader's likely questions, in this skill procedure
instead of turning them into phrase-bank rows unless the user explicitly asks for dictionary-style
entries.

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
- The source prose teaches a reusable writing move, such as conclusion-first briefing,
  reader-first explanation, provisional-summary drafting, or argument sketching, and the user wants
  that move reflected in future style guidance rather than added to the phrase bank.

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
- The target genre relies on suspense, discovery, poetic ambiguity, legal precision, or step-by-step
  teaching where leading with the conclusion would harm the reader's experience or correctness.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Source text in Korean or English.
- The intended mode: candidate extraction, selected-candidate storage, structural pattern storage,
  phrase-bank application, or phrase-bank cleanup.
- The target register when known: literary, technical, explanatory, product, support, review,
  maintainer-facing, casual, formal, or emotionally restrained.
- The target surface when relevant: chat answer, final report, Markdown report, GitHub issue, pull
  request description, review reply, release note, update note, documentation page, or comment.
- Whether the intended use is structural guidance for argument or report shape, phrase-level polish,
  or both; do not treat structural guidance as phrase-bank material unless the user explicitly says
  to store it as a phrase-bank entry.
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
- When the user asks to preserve structural or style guidance, update `SKILL.md` procedure text and
  synchronized template metadata, not `references/phrase-bank.md`, unless the request is explicitly
  for reusable expression entries.
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
   - `structural_pattern_storage`: the user supplied prose that should be distilled into reusable
     writing-process guidance in `SKILL.md` instead of phrase-level style or phrase-bank rows;
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
8. For structural pattern storage, extract principles rather than sentences, and keep them in this
   procedure rather than the phrase bank:
   - lead with a provisional conclusion and one to three reasons when the target is practical,
     explanatory, argumentative, or report-style prose;
   - sketch the whole argument before perfecting details;
   - identify the reader's likely first question and the one idea the reader must remember;
   - order reasons by importance before refining rhythm or ornament;
   - keep paragraphs conclusion-first when scanning speed matters;
   - separate the writer's own conclusion from borrowed evidence, then use research to test and
     sharpen that conclusion;
   - treat a first full draft as a thinking surface that will be revised, not as a transcript of
     already-perfect thought;
   - for report-scale work, create a one-page provisional map before expansion so conclusion,
     reasons, reader questions, and next action can be inspected together;
   - resist detail-first perfectionism: mark uncertain facts for later checking when stopping would
     prevent the whole argument from becoming visible;
   - use outside feedback as reader evidence when the writer is too close to the material;
   - turn the provisional conclusion into a complete sentence or paragraph before full research,
     because keywords and outlines are too vague to test for logic;
   - use that sentence or paragraph as a research, interview, and discussion filter, returning to
     it whenever source trails start to drift from the argument;
   - revise the provisional opening whenever evidence changes the claim, then propagate the change
     through body reasons and the final conclusion;
   - shape practical prose as a rough logic prototype: make it visible early, keep it right-sized
     for the problem, and improve it through repeated review;
   - simplify by the conclusion: keep material that helps the reader accept or evaluate the claim,
     and cut material that only proves the writer worked hard;
   - reduce logic to claim plus reasons, while remembering that clear logic exposes an argument for
     judgment but does not prove the argument true by itself;
   - use conclusion-first structure as a productive constraint when the writer needs to focus their
     energy on revising the logic rather than managing blank-page fear or scattered details;
   - treat repeated drafting as thinking practice: writing can create sharper thought, not merely
     record thought that already exists;
   - carry the same claim-and-reasons structure into speaking, presentations, reading, and listening
     when the communication task benefits from visible logic;
   - for presentations, make the first slide or opening screen state the conclusion and no more
     than about three reasons, keep one concept per slide or section, and close by returning to the
     same core message;
   - rehearse an elevator version of long-form work: the writer should be able to state the claim
     and reasons in a short spoken window before expanding the full document;
   - when reading practical prose, inspect the conclusion, introduction, and table of contents
     first, then read details as tests of the inferred logic rather than as isolated facts;
   - for reference-like material without a single thesis, use repeated fast passes to build the
     overall map before slowing down on the sections that remain unclear or decision-relevant;
   - when listening or interviewing, bring a provisional logic frame and ask for the speaker's
     conclusion, reasons, assumptions, and alternatives instead of letting detail order control the
     conversation;
   - for team writing and decision meetings, share a provisional conclusion memo, plan, or
     hypothesis early so collaborators can critique the structure while it is still cheap to change;
   - organize group debate around a concrete proposal and its reasons, then invite better logic or
     alternatives, rather than starting from a blank brainstorming prompt;
   - use inverted-pyramid ordering for news, status, incident, and time-sensitive business updates:
     most important result first, then supporting facts in decreasing importance;
   - keep parent claims covering their child reasons, make sibling reasons parallel enough to
     compare, and remove obvious overlaps or gaps before polishing sentences;
   - adapt direct thesis-first structure to the audience and genre: it is often expected in
     Anglophone academic, journalistic, and business writing, but not every cultural or literary
     form wants the same order;
   - enforce one central idea at every level of practical prose: document, section, paragraph,
     slide, and spoken segment;
   - treat every chapter, section, paragraph, sentence, example, and aside as either serving the
     central idea or competing with it; cut, subordinate, or split competing material;
   - when several ideas must appear, either find the umbrella claim that honestly contains them,
     split them into separate pieces, or rank them by importance so the reader is not asked to
     remember several unrelated centers at once;
   - draft and revise by paragraph as the basic unit of logic: put the topic claim first, then add
     supporting sentences that prove or clarify that claim;
   - after every chapter or section heading in long-form practical prose, give a short conclusion or
     map for that unit instead of making the reader infer the unit's purpose from the whole section;
   - differentiate a provisional conclusion during drafting by narrowing the scope, asking what the
     reader can do next, preserving the writer's honest view, and looking for even a small useful
     departure from the obvious answer;
   - treat reader attention as scarce: familiar generalities, impressive but irrelevant material,
     and research that does not sharpen the central idea should be removed or demoted;
   - use shared principles or ideal conditions as a bridge from a surprising conclusion to the
     reader's existing judgment, especially when the claim challenges common sense;
   - derive the structure of reasons from that principle: identify the criteria inside the
     principle, then show how the evidence satisfies, fails, or complicates each criterion;
   - remember that principle-based argument is a double-edged tool: the same principle that makes
     the claim persuasive also demands enough evidence to satisfy its own criteria;
   - keep the order promised in the introduction, and arrange reasons, paragraphs, sentences, and
     even word-level lists by decision importance rather than chronology or convenience;
   - treat importance order as the gravity of practical logic: put the heaviest idea first, and
     let lighter or background material follow so the reader does not feel the argument tilt;
   - when a conclusion is abstract or surprising, support it with concrete evidence the reader can
     see, hear, count, inspect, or imagine as a real case rather than a generic assertion;
   - tune concreteness to the reader's need: keep decisive examples, field observations, named
     quantities, and representative cases in the body, but move dense source tables or exhaustive
     data to references or appendices;
   - use conclusion-first drafting to force specificity: once the general claim is visible, ask
     what concrete facts, stories, measurements, or observations would make a cautious reader
     believe it;
   - make practical sentences modular: one sentence should carry one concept, just as a paragraph
     carries one local claim and supporting details;
   - split long sentences before they hide multiple claims, cause subject-verb drift, or force the
     reader to reread from the beginning;
   - cut weak connective words when sentence meaning already supplies the relationship; overused
     connectors often reveal the writer's anxiety rather than the argument's logic;
   - revise toward spoken cadence: write as if explaining the point to a real person, then read the
     passage aloud and shorten anything that sounds ceremonial, tangled, or breathless;
   - make paragraph-opening topic sentences especially short and sharp, because the first sentence
     is the handle the reader uses to grasp the whole paragraph;
   - treat the five-paragraph or diamond shape as a training scaffold, not a mechanical cage: keep
     the reader-first logic, but add or remove body sections, objections, and conclusion returns
     when the real problem demands it;
   - when cultural, organizational, or psychological pressure pushes the conclusion to the end,
     first draft whatever comes naturally, then move the real conclusion upward and revise around
     it instead of waiting for courage before writing;
   - for team or institutional reports, start with a provisional one-page summary so the claim,
     reasons, evidence gaps, and debate points are visible before the full report hardens.
9. When the user selects entries, store only those entries. Preserve rejected numbers as absent, not
   as negative examples, unless the user explicitly asks to record a rejection rule.
10. Store entries as compact rows with:
   - source language;
   - source fragment;
   - reusable English pattern;
   - use guidance;
   - avoid guidance when a common misuse is known.
11. When applying the phrase bank, use entries as taste constraints, not mandatory substitutions.
    Preserve technical facts, evidence, legal meaning, safety warnings, user intent, and the original
    level of certainty.
12. Apply conclusion-first and reader-first patterns only when they serve the target genre. Do not
    force them into narrative, suspense, lyric, discovery-style, legal, or pedagogical writing that
    depends on another order.
13. When polishing GitHub, release, verification, or final-report content, apply the owning skill
    first for evidence, repository rules, version facts, and verification scope. Use this skill only
    to make the already-correct wording clearer, smoother, or more elegant.
14. When the phrase bank grows too large, split it by usage type such as emotional framing,
    restrained technical polish, transitions, softening, emphasis, scene atmosphere, or answer tone.

<!-- mustflow-section: postconditions -->
## Postconditions

- Candidate tables contain reusable fragments rather than narrow finished sentences.
- Stored entries are in English guidance even when the source text was Korean.
- Proper nouns, private details, unique plot facts, and one-off situations are excluded or
  generalized.
- The phrase bank remains compact enough to load only when needed.
- Structural patterns remain bounded to suitable practical prose instead of becoming a universal
  writing rule.

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
- If a long or OCR-heavy source text teaches a writing process more than reusable wording, store
  compact principle labels and usage boundaries rather than long excerpts.
- If conclusion-first structure would ruin suspense, discovery, or the intended learning sequence,
  treat that pattern as skipped and name the reason.

<!-- mustflow-section: output-format -->
## Output Format

- Mode: candidate extraction, selection storage, structural pattern storage, application, or cleanup
- Candidate table or stored entries
- Entries kept and rejected when relevant
- Phrase-bank file changed when relevant
- Command intents run when repository files changed
- Skipped checks and reasons
- Remaining style, specificity, or privacy risk
