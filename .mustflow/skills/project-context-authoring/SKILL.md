---
mustflow_doc: skill.project-context-authoring
locale: en
canonical: true
revision: 3
name: project-context-authoring
description: Apply this skill when filling or maintaining `.mustflow/context/PROJECT.md` from repository-supported evidence.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.project-context-authoring
  command_intents:
    - mustflow_check
---

# Project Context Authoring

## Purpose

Keep `.mustflow/context/PROJECT.md` useful as a compact agent briefing while preventing invented product direction, architecture, roadmap, or implementation promises.

## Use When

- `.mustflow/context/PROJECT.md` is created, filled, corrected, or reorganized.
- Project goals, non-goals, domain terms, invariants, validation notes, operational constraints, source-of-truth notes, or open questions need to be recorded for agents.
- Public docs, manifests, tests, source files, or command contracts disagree and the context file needs to record the conflict.

## Do Not Use When

- The task only updates root `README.md`, `PROJECT.md`, `ROADMAP.md`, API docs, or user-facing documentation.
- The user asks for speculative planning, product vision, or architecture design that is not supported by repository evidence.
- A nearer project-specific context authoring procedure exists.
- The change belongs in `AGENTS.md`, `.mustflow/config/commands.toml`, or `.mustflow/docs/agent-workflow.md` rather than low-authority project context.

## Required Inputs

- Existing `.mustflow/context/PROJECT.md`.
- `AGENTS.md` and `.mustflow/config/*.toml`.
- Optional root `PROJECT.md`, `README.md`, `ROADMAP.md`, and `DESIGN.md` when present and relevant.
- `REPO_MAP.md`, package manifests, existing docs, tests, CI files, and source files only as evidence, not as permission sources.
- The current user request and any explicit source constraints.

## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

## Procedure

1. Preserve existing human-written context unless current repository evidence clearly contradicts it.
2. Start from the existing context file, then gather only the evidence needed for the requested context fields.
3. Separate confirmed facts, assumptions, unknowns, and conflicts. Do not smooth over disagreements between docs, manifests, tests, source files, and command contracts.
4. Keep the context concise. Prefer short bullets or short paragraphs over broad essays.
5. Cover only supported fields: project summary, goals, non-goals, domain terms, risk areas, invariants, validation, operational constraints, source-of-truth and conflict notes, and open questions.
6. Add optional architecture, persona, release, or coding-convention notes only when the repository provides direct evidence.
7. Reference command intent names from `.mustflow/config/commands.toml` when describing validation. Do not convert package scripts, CI jobs, or manifest hints into runnable agent permission.
8. Leave unknown fields unset or explicitly marked as unknown instead of inventing product goals, roadmap promises, domain rules, or implementation details.

## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

## Verification

Use configured oneshot command intents when available:

- `mustflow_check`

If the context update also changes public docs or command contracts, activate the matching skill and use its configured verification intents.

## Failure Handling

- If evidence conflicts, record the conflict or open question instead of choosing one source silently.
- If a needed source is missing, mark the claim unknown rather than filling the gap from model memory.
- If validation fails because context text looks like command policy or file-edit prohibition, move that rule to the proper authority file or remove the unsupported claim.
- If the context becomes too large, reduce detail to durable facts and source-of-truth notes.

## Output Format

- Context fields updated
- Evidence sources used
- Confirmed facts added
- Assumptions, unknowns, or conflicts recorded
- Command intents run
- Skipped command intents and reasons
- Remaining context risks
