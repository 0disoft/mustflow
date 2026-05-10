---
title: Skill Resources
description: Explains how to add references, assets, scripts, and resources.toml when a skill's scope exceeds SKILL.md.
---

A mustflow skill starts with a single `.mustflow/skills/<name>/SKILL.md` file.

Do not create empty `references/`, `assets/`, or `scripts/` folders in advance. Add supporting resources only when the skill document becomes too large or when a repeatable helper is actually needed.

## Base Principles

- `SKILL.md` is the skill entry point.
- `resources.toml` exists only when supporting resources exist.
- `references/` stores read-only long-form material such as rubrics, examples, and background notes.
- `assets/` stores reusable files such as templates, sample inputs, and schemas.
- `scripts/` exists only when the skill requires a dedicated helper.
- Scripts are not invoked directly from `SKILL.md`; they are resolved through `.mustflow/config/commands.toml`.

## Optional Structure

```text
.mustflow/skills/<name>/
├─ SKILL.md
├─ resources.toml        # optional: only when supporting resources exist
├─ references/           # optional: read-only reference material
├─ assets/               # optional: templates, schemas, sample inputs
└─ scripts/              # optional: helpers connected to command intents
```

This is not mandatory scaffolding for every skill. The default template provides `SKILL.md`; other
files and folders should be added only when the skill actually needs them.

## resources.toml

`resources.toml` is an optional index for supporting resources. It does not replace the skill body. It helps agents decide which material can be read or executed, and under which conditions.

Expected structure:

```toml
schema_version = "1"

[resources."references/severity-rubric.md"]
type = "reference"
purpose = "Rubric for classifying review finding severity."
read_when = ["finding_severity_is_unclear"]
required = false

[resources."assets/templates/review-report.md"]
type = "asset"
asset_kind = "template"
purpose = "Template for review report output."
required = false

[resources."scripts/validate-review-report.py"]
type = "script"
language = "python"
purpose = "Validates the review report format."
run_policy = "requires_command_contract"
command_intent = "review_report_validate"
network = false
destructive = false
writes = []
dependencies = ["python>=3.10"]
```

## references/

Use `references/` for long-form material that agents read only when needed.

Examples include:

- Decision rubrics
- Failure cases and fixes
- Output examples
- Background notes

Do not store secrets, raw execution logs, generated caches, or large files here.

## assets/

Use `assets/` for static files that support the skill.

Examples include:

- Report templates
- Sample input files
- Validation schemas
- Small sample data

Do not store large binaries, build output, caches, or secrets here.

## scripts/

Use `scripts/` for dedicated skill helpers.

Each script should:

- Provide help output.
- Return a non-zero exit code on failure.
- Declare clear input and output rules.
- Declare file writes or network access through `resources.toml` and `commands.toml`.
- Avoid destructive behavior by default.

Agents should not guess script paths and run them directly. When execution is needed, first resolve the related command intent in `.mustflow/config/commands.toml`.

## Relation to skills/INDEX.md

`.mustflow/skills/INDEX.md` lists skills, not every supporting file under each skill.

Supporting resources are indexed by the skill-local `resources.toml` file.

## Community Skill Registry Direction

The mustflow core should not indefinitely expand its default skill set. The default template should
stay small, while additional skills can later come from a separate community skill repository.

Repository names should follow the mustflow naming convention, such as `mustflow-skills` or
`mustflow-community-skills`. Avoid names that are too broad or easy to confuse with other skill
ecosystems.

If a community skill repository is introduced, each skill should provide both `SKILL.md` and a mustflow-specific `skill.toml`. The `skill.toml` file should declare the skill identifier, version, compatible mustflow range, license, included scripts, network usage, write scope, and risk level.

Groups of skills should be referred to as a `pack` or `bundle`, not automation skills. A pack
installs skills; it must not run commands or edit `.mustflow/config/commands.toml` automatically.
Required or recommended command intents should be reported, then declared by the user for the
current project.

Future `mf skill add` or `mf pack add` commands must implement these safety rules:

- Preview changed files, included scripts, permissions, and risk level before installation.
- Never run scripts during installation.
- Record source, version, and hashes in a lock file such as `.mustflow/skills.lock.toml`.
- Let `mf skill audit` verify the lock file, current file hashes, script-to-command-intent links, and deprecated skills.
- Keep export to tool-native skill locations as an optional adapter, not the default installation target.

## Check Rules

`mf check --strict` verifies:

- Registered files exist.
- Registered files are located under `references/`, `assets/`, or `scripts/`.
- `scripts/` does not contain unregistered helpers.
- Scripts use `run_policy = "requires_command_contract"` and link to a configured command intent in `commands.toml`.
- Scripts do not enable network access or destructive behavior by default.
- Script `writes` declarations are restricted to the skill folder through relative paths.
- Every skill folder contains a `SKILL.md`.

The default template includes `visual-review-artifact/resources.toml` as the first resource-backed skill. Add more resource indexes only when a skill becomes complex enough to require supporting references, assets, or scripts.
Large-file, secret, and cache checks can be expanded as separate repository safety checks, similar to retention and context-file validation.
