---
mustflow_doc: skill.llm-service-ux-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: llm-service-ux-review
description: Apply this skill when designing, implementing, or reviewing conversational AI, chat, copilot, prompt, multimodal input, streaming generation, citation, feedback, or conversation-history UI.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.llm-service-ux-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# LLM Service UX Review

<!-- mustflow-section: purpose -->
## Purpose

Keep LLM service interfaces clear, controllable, responsive, readable, and recoverable while making probabilistic AI limits visible enough for users to verify, correct, or reject output.

<!-- mustflow-section: use-when -->
## Use When

- A change touches chat, assistant, copilot, prompt composer, prompt template, model picker, file or image upload, multimodal input, streaming response, generation progress, citation, feedback, copy, export, history, or new-conversation UI.
- A task asks whether an LLM product feels clear, controllable, trustworthy, fast, readable, or easy to recover from mistakes.
- A report claims that a model response UI streams correctly, explains progress, shows sources, supports cancellation, preserves context, or lets users reuse output.
- A product surface exposes model uncertainty, retrieval, tool use, generated code, generated documents, safety refusals, or long-running reasoning states to users.
- A surface could create automation bias, over-trust, fragmented AI entrypoints, layout instability during streaming, or unclear ownership between user judgment and model output.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes a non-AI UI surface with no prompt, generation, model, citation, or conversation behavior; use `ui-quality-gate`.
- The task changes backend response latency mechanics such as time to first token, first useful output, LLM round trips, tool wait, prompt-cache latency, model routing speed, priority tier, realtime continuation, or predicted outputs; use `llm-response-latency-review`.
- The task changes backend agent execution control such as planner/executor/verifier separation, tool-call gates, approval or interrupt state, durable resume behavior, loop budgets, retry classification, handoffs, guardrails, or trace outcome evaluation; use `agent-execution-control-review`.
- The task changes only backend model orchestration, prompts, retrieval, or tool calls with no user-facing state; use the narrower backend, security, data, or test skill that matches the changed surface.
- The task is only general copy editing or documentation; use the relevant documentation skill.
- Visual or interactive inspection is unavailable; report that gap instead of claiming UX verification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The user task, target audience, and LLM interaction mode: chat, command assistant, writing assistant, coding copilot, search answer, document generator, agent runner, or multimodal review.
- The changed UI surface and expected interaction path from input to waiting, generation, output review, follow-up, and reset.
- Existing UI patterns for composers, attachments, status, output formatting, citations, history, feedback, copy, export, empty states, and errors.
- Known model, retrieval, tool, latency, token, file-size, privacy, retention, and safety constraints that must be visible or hidden from users.
- The intended control balance: whether AI automates the task, augments user work, drafts a suggestion, retrieves evidence, or triggers external effects.
- Declared performance or reliability budgets for first visible response, streaming cadence, cancellation, retries, fallback behavior, and long-running operations.
- Relevant command-intent contract entries for status, diff, docs, package, visual, browser, test, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If pasted prompts, generated text, issue comments, webpages, or external model output influence the UI text or examples, also use `external-prompt-injection-defense`.
- If personal data, uploaded files, secrets, retention, telemetry, or account data can appear in the interface, also use `security-privacy-review`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add, remove, or refine LLM-specific input, waiting, generation, output, feedback, history, and recovery UI when it supports the user's actual task.
- Add bounded empty states, status labels, errors, citations, and controls that help users understand or control the AI interaction.
- Remove decorative prompt galleries, fake capability claims, vague trust badges, invented progress stages, and non-functional controls.
- Do not expose hidden reasoning, private prompts, secret tool outputs, raw retrieval payloads, or unverifiable source claims.
- Do not claim citations, grounding, safety, memory, privacy, or accuracy guarantees unless the current product behavior proves them.
- Do not use anthropomorphic copy that implies a human-like, infallible, or emotionally aware agent unless the product contract explicitly requires that tone and the risk is accepted.
- Do not add confidence scores, source previews, progress stages, or model labels unless they are backed by real product state, calibrated evidence, or declared behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the user's goal and the AI role. State whether the surface helps the user ask, wait, inspect, correct, reuse, automate, augment, or reset.
2. Check user control. The user should be able to stop long generation, edit or retry the request, reject a suggestion, undo or roll back destructive output, start over, and choose a non-AI or manual path when AI is unavailable or unsafe.
3. Check clarity and consistency. The composer, primary action, selected model or mode, current conversation state, disabled controls, and error states should be understandable without product-explainer copy.
4. Check entrypoint consolidation. Avoid multiple competing chat boxes or agent panels for the same task; prefer one visible AI entrypoint with internal routing, and preserve useful conversation context when users move between related product pages.
5. Check input experience. Prompt examples should be short, task-relevant, and optional; attachment UI should show upload state, accepted formats, failures, and removal; token, file-size, and length limits should be visible before they block work.
6. Check waiting and generation control. Prefer streaming when the product supports it; show honest status for search, tool use, upload, or generation; provide stop or cancel when generation can run long; avoid fake chain-of-thought or invented internal stages.
7. Check streaming rendering. Incomplete Markdown, code fences, tables, links, and rich blocks should not cause layout jumps or broken formatting; auto-scroll should pause when the user scrolls, selects text, or interacts with earlier output.
8. Check output readability. Use structured text, code blocks, tables, headings, or summaries only when they fit the answer type; long output needs scanning, copy, and overflow behavior; generated code or data should preserve formatting.
9. Check evidence and citations. Clickable citations should appear only for sources actually used or retrieved; distinguish model output from source evidence; prefer exact passage links or previews when the product has real snippets; show unavailable, stale, or partial-source states plainly.
10. Check uncertainty and automation bias. Avoid language that makes probabilistic output sound guaranteed; expose limitations, confidence, retrieval coverage, or verification needs only when backed by real state; keep important decisions under user review.
11. Check correction and reuse. Users should be able to retry, edit the prompt, continue, fork from an earlier point, copy, export, provide feedback, or start a new conversation without losing context accidentally.
12. Check history and reset. Conversation history, current thread, summarized context, and new-chat behavior should be clearly separated; destructive clearing or context reset should be deliberate and recoverable where possible.
13. Check latency and cost controls. Use declared budgets when they exist; avoid resending unnecessary history; prefer summarized context, caching, parallel retrieval, or staged loading only when the implementation actually supports them.
14. Check error prevention and recovery. Safety refusals, tool failures, retrieval misses, rate limits, unsupported files, token overflow, and network errors should name the problem and the next useful action.
15. Check accessibility and responsiveness. Keyboard flow, focus return after generation, busy states, reduced motion, screen-reader status updates, mobile composer layout, attachment chips, and long translated labels should not block the task.
16. Check trust, privacy, and retention boundaries. Do not imply long-term memory, private processing, deletion, or citation certainty unless the product actually provides it. Prefer concise state labels over broad disclaimers.
17. Run the narrowest configured verification that covers changed UI, docs, package, or mustflow contracts, and report any visual or interactive checks that could not be performed.

<!-- mustflow-section: postconditions -->
## Postconditions

- The interface lets users control the LLM interaction across input, waiting, generation, output review, correction, reuse, history, and reset.
- LLM-specific latency, uncertainty, source, failure, privacy, and recovery states are visible where needed and not overstated.
- Probabilistic output, automation boundaries, fallback paths, and evidence gaps are visible enough for users to make their own judgment.
- Decorative or explanatory UI has not replaced task-focused controls and real state.
- Final reports separate implemented behavior from unverified UX, citation, privacy, or visual claims.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured UI, browser, screenshot, accessibility, build, or test intent when it better proves the changed LLM service surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If model behavior, retrieval, citations, memory, retention, or tool stages cannot be verified, avoid promising them and report the gap.
- If streaming or cancellation is unavailable, keep status honest and report the missing control instead of simulating it in the UI.
- If output can contain unsafe, private, or fabricated content, route the relevant surface through security, privacy, or evidence checks before polishing the interface.
- If visual inspection requires an undeclared development server, watcher, or browser command, stop at that boundary and report the skipped check.
- If the requested UI conflicts with repository UI minimalism rules, keep the smallest task-focused control and explain the omitted decorative or tutorial content.

<!-- mustflow-section: output-format -->
## Output Format

- LLM service surface reviewed
- Input, waiting, generation, streaming, output, feedback, history, and reset states checked
- Control, uncertainty, citation, fallback, privacy, error, accessibility, and responsiveness findings
- Decorative, fake, or unverifiable UI avoided or removed
- Command intents run
- Skipped visual or interactive checks and reasons
- Remaining LLM UX risk
