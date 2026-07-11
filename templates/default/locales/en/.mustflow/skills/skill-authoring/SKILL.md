---
mustflow_doc: skill.skill-authoring
locale: en
canonical: true
revision: 11
lifecycle: mustflow-owned
authority: procedure
name: skill-authoring
description: Apply this skill when creating or maintaining logically rigorous `.mustflow/skills/*/SKILL.md` procedures and `.mustflow/skills/INDEX.md` routes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.skill-authoring
  command_intents:
    - mustflow_check
    - docs_validate
---

# Skill Authoring

<!-- mustflow-section: purpose -->
## Purpose

Create narrow, repeatable mustflow skill procedures without turning skills into broad advice, project context, or command-permission sources.

<!-- mustflow-section: use-when -->
## Use When

- A `.mustflow/skills/<name>/SKILL.md` file is created, renamed, split, removed, or substantially changed.
- `.mustflow/skills/INDEX.md` needs a new or updated route for a skill.
- A skill needs clearer use conditions, exclusion conditions, required inputs, command intent references, verification, or failure handling.
- A skill contains broad, conditional, exception-bearing, authority-sensitive, or completion claims whose logical scope needs review.
- A broad prompt, checklist, or outside recommendation needs to be adapted into mustflow's skill format.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only applies an existing skill to code, docs, tests, context, or assets.
- The content belongs in `AGENTS.md`, `.mustflow/docs/agent-workflow.md`, `.mustflow/context/PROJECT.md`, or `.mustflow/config/commands.toml`.
- The proposed skill is broad advice such as "write better code" or "be careful" without a repeatable trigger and procedure.
- The skill would duplicate project-domain context, authorize commands, install dependencies, or define raw shell commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The user request and the repeated task the skill should cover.
- Existing `.mustflow/skills/INDEX.md` and nearby skill documents.
- `.mustflow/config/commands.toml` command intent names relevant to verification.
- Any repository evidence showing that the task is repeatable and not better handled by an existing skill.
- Nearby rules that can require, forbid, narrow, override, or create exceptions to the proposed procedure.
- The selected repository boundary for every command intent or verification claim, including any
  explicit parent-owned dependency.
- At least one representative positive case and one boundary or counterexample for material rules.
- Canonical source locale, localization policy, and template metadata when the skill is part of an installed template.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the smallest repeatable task the skill should cover. If the task is too broad, split it or leave it as repository guidance instead of creating a skill.
2. Search existing skills before adding a new one. Prefer updating a matching skill over creating overlapping procedures.
3. Use a stable folder name and matching frontmatter `name`. Set `mustflow_doc` to `skill.<name>`, `metadata.mustflow_schema` to `"1"`, `metadata.mustflow_kind` to `procedure`, `metadata.pack_id` to the package namespace, and `metadata.skill_id` to `<pack_id>.<name>`.
4. Write the standard sections: Purpose, Use When, Do Not Use When, Required Inputs, Preconditions, Allowed Edits, Procedure, Postconditions, Verification, Failure Handling, and Output Format.
5. Normalize material rules before accepting the draft.
   - Rewrite each material rule mentally as `conditions -> required, allowed, or forbidden action -> observable result`. Keep the prose natural, but make the condition, modality, actor, scope, and result unambiguous.
   - Distinguish a necessary condition from a sufficient condition. Do not infer the converse: a rule saying `A requires B` does not say that every `B` permits or proves `A`.
   - Name quantifier and scope when they matter: one item, every item, at least one item, only configured items, the selected repository, the current platform, or another bounded set. Avoid `always`, `never`, `all`, `only`, and equivalent absolutes unless every permitted exception is excluded or explicitly subordinate to a higher-authority rule.
   - Attach exceptions to the rule they narrow. State whether an exception waives a requirement, permits an action, or changes only reporting; do not let an exception silently authorize commands or erase safety constraints.
6. Run the logical consistency gate across Purpose, Use When, Do Not Use When, Required Inputs, Preconditions, Allowed Edits, Procedure, Postconditions, Verification, and Failure Handling.
   - Check whether the same reachable condition both requires and forbids an action. Resolve the contradiction or state the higher-authority discriminator.
   - Separate different authority dimensions instead of forcing them into one total order. Goal ownership, safety constraints, repository scope, command authority, evidence quality, and preferences can constrain the same action without being interchangeable.
   - Check reachability and termination. Every required input may be present or missing; every verification may pass, fail, be unavailable, or be skipped; each material branch must lead to an action, handoff, bounded retry, or stop state.
   - Attack universal and completion claims with a counterexample. Narrow or qualify any claim that one realistic permitted case can falsify.
   - Require postconditions to be observable from named evidence. A procedure step, local test, workflow success, or report is not proof of a broader state unless the evidence actually covers that state.
   - Resolve verification intent names against the repository being changed. A shared parent skill
     does not impose parent-root verification on child-only work; require a parent check only when
     parent-owned files, orchestration, artifacts, or contracts are direct inputs to the result.
7. Run the skill quality gate before accepting the draft: trigger is concrete, non-use boundaries are explicit, required inputs are observable, allowed edits are narrow, procedure steps are actionable, verification names configured intents, failure handling says what to do when evidence is missing, output format matches the evidence expected, overlap with nearby skills is controlled, logical branches terminate, and template impact is decided.
8. Reject broad advice disguised as a skill. A skill should not say only "be careful", "write better tests", "sync docs", or "think about security" unless it names a repeatable trigger, source files to inspect, allowed edits, verification, and reporting evidence.
9. Keep the procedure concrete and bounded. Include what to read, what to change, what to avoid, and what evidence to report.
10. Reference command intent names only. Do not include raw shell command blocks or claim that the skill authorizes command execution.
11. Update `.mustflow/skills/INDEX.md` with a compact route that includes trigger, required input, edit scope, risk, verification intents, and expected output.
12. If the skill is installed by a template, update the canonical skill copy plus installation metadata, package tests, and public docs that list installed files. Do not fan out routine skill edits into every localized skill copy by default; localized skill copies may be absent, and non-source template locales should fall back to the canonical source-locale skill text unless locale-specific skill text is intentionally maintained and translation review is available.
13. If a portable Agent Skills artifact is part of the task, create or validate it as a derived export, not as the mustflow-native canonical source. Use portable-only top-level fields and string-to-string metadata. A `gh skill publish --dry-run` check may validate the export artifact when available, but `gh skill publish --fix` must be limited to the export directory because it can remove installed provenance metadata and mustflow-native fields.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.
- Material rules have bounded scope, explicit exception behavior, reachable failure branches, and observable postconditions.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `mustflow_check`
- `docs_validate`

If the skill changes tests or behavior-sensitive template output, also use the relevant configured test or build intents.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If `mustflow_check` reports missing sections, metadata drift, unknown command intents, raw shell commands, or command-permission claims, fix the skill contract before changing unrelated files.
- If two skills overlap, tighten their use and non-use conditions or merge the duplicate procedure.
- If a needed command intent is missing, record the missing intent instead of inventing a command inside the skill.
- If the draft can be applied to almost any task, narrow the trigger or turn the material into workflow guidance instead of a skill.
- If a reachable condition both requires and forbids the same action, do not hide it behind priority language. Split authority dimensions, add the missing discriminator, or stop with an explicit conflict.
- If a universal or completion claim fails one realistic permitted counterexample, narrow the claim to the evidence actually established.
- If a branch can retry, wait, or defer without a bound or stop state, add a termination condition before accepting the skill.
- If a skill makes a child task depend on parent-root verification without naming a direct parent
  dependency, remove the cross-root obligation.
- If translation confidence is low, keep the source skill authoritative and mark translations for review through template metadata.

<!-- mustflow-section: output-format -->
## Output Format

- Skill files added, updated, renamed, or removed
- Skill index routes changed
- Quality gate result and overlap decision
- Logical consistency result, counterexamples checked, and material claims narrowed
- Command intents referenced
- Template or localization metadata updated
- Portable export validation result when relevant
- Command intents run
- Skipped command intents and reasons
- Remaining overlap, translation, or validation risks
