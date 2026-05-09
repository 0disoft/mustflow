---
mustflow_doc: repo-map
lifecycle: generated
generated_by: mustflow
relative_root: "."
source_policy: anchors_only
privacy_mode: minimal
anchor_count: 54
source_fingerprint: "sha256:042723e42649fe84ebfe722a6022dde99445d07e949be20fb913d151a04c7494"
---

# REPO_MAP.md

This file is an agent navigation map for the current mustflow root. It is not a full file listing.
Regenerate it with `mf map --write` instead of editing it by hand.

## How To Use

- Start with `AGENTS.md` and the mustflow files listed in Priority Anchors.
- Use Directory Anchors to find local rules, guides, package manifests, and command adapters.
- Use `git ls-files` or your editor when you need the complete file list.

## Priority Anchors

- `AGENTS.md`: Root agent operating rules. Read this before changing files.
- `.mustflow/docs/agent-workflow.md`: Shared workflow policy for agent work.
- `.mustflow/config/mustflow.toml`: Mustflow read order, authority, document roots, and protected paths.
- `.mustflow/config/commands.toml`: Command intent contract. Check this before running project commands.
- `.mustflow/config/preferences.toml`: Repository-level agent preferences. Treat them as defaults below user instructions and local style.
- `.mustflow/skills/INDEX.md`: Index of available procedural skills.
- `.mustflow/context/INDEX.md`: Task-specific project context router. Read only when context is needed.

## Directory Anchors

### /

- `CHANGELOG.md`: Optional release history and user-visible change log.
- `CONTRIBUTING.md`: Optional contribution workflow and pull request guidance.
- `package.json`: Node.js package manifest, binary entry points, and package scripts.
- `README.md`: Human-facing project overview. Use it as context, not as agent policy.
- `ROADMAP.md`: Optional project planning, priority, milestone, and non-goal context.
- `SECURITY.md`: Optional security policy, vulnerability reporting, and sensitive-change guidance.
- `tsconfig.json`: TypeScript compiler configuration.

### .mustflow/context/

- `.mustflow/context/PROJECT.md`: Project goals, non-goals, terms, and repository-wide promises for agents.

### .mustflow/skills/artifact-integrity-check/

- `.mustflow/skills/artifact-integrity-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/code-review/

- `.mustflow/skills/code-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/contract-sync-check/

- `.mustflow/skills/contract-sync-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/date-number-audit/

- `.mustflow/skills/date-number-audit/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/dependency-reality-check/

- `.mustflow/skills/dependency-reality-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/diff-risk-review/

- `.mustflow/skills/diff-risk-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/docs-prose-review/

- `.mustflow/skills/docs-prose-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/docs-update/

- `.mustflow/skills/docs-update/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/external-prompt-injection-defense/

- `.mustflow/skills/external-prompt-injection-defense/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/failure-triage/

- `.mustflow/skills/failure-triage/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/instruction-conflict-scope-check/

- `.mustflow/skills/instruction-conflict-scope-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/migration-safety-check/

- `.mustflow/skills/migration-safety-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/pattern-scout/

- `.mustflow/skills/pattern-scout/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/performance-budget-check/

- `.mustflow/skills/performance-budget-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/project-context-authoring/

- `.mustflow/skills/project-context-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/readme-authoring/

- `.mustflow/skills/readme-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/repro-first-debug/

- `.mustflow/skills/repro-first-debug/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/security-privacy-review/

- `.mustflow/skills/security-privacy-review/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/security-regression-tests/

- `.mustflow/skills/security-regression-tests/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/skill-authoring/

- `.mustflow/skills/skill-authoring/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/source-freshness-check/

- `.mustflow/skills/source-freshness-check/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/test-maintenance/

- `.mustflow/skills/test-maintenance/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/ui-quality-gate/

- `.mustflow/skills/ui-quality-gate/SKILL.md`: Procedural skill document for a repeatable agent task.

### .mustflow/skills/web-asset-optimization/

- `.mustflow/skills/web-asset-optimization/SKILL.md`: Procedural skill document for a repeatable agent task.

### docs-site/

- `docs-site/package.json`: Node.js package manifest for this directory.
- `docs-site/README.md`: Directory guide for this area.
- `docs-site/tsconfig.json`: TypeScript compiler configuration.

### docs-site/docs/i18n/

- `docs-site/docs/i18n/README.md`: Directory guide for this area.

### docs-site/src/config/

- `docs-site/src/config/README.md`: Directory guide for this area.

### docs-site/src/lib/

- `docs-site/src/lib/README.md`: Directory guide for this area.

### docs-site/src/styles/

- `docs-site/src/styles/README.md`: Directory guide for this area.

### docs/i18n/

- `docs/i18n/README.md`: Directory guide for this area.

### docs/i18n/es/

- `docs/i18n/es/README.md`: Directory guide for this area.

### docs/i18n/fr/

- `docs/i18n/fr/README.md`: Directory guide for this area.

### docs/i18n/hi/

- `docs/i18n/hi/README.md`: Directory guide for this area.

### docs/i18n/ko/

- `docs/i18n/ko/README.md`: Directory guide for this area.

### docs/i18n/zh/

- `docs/i18n/zh/README.md`: Directory guide for this area.

### docs/spec/

- `docs/spec/README.md`: Directory guide for this area.

### schemas/

- `schemas/README.md`: Directory guide for this area.

## Generated Files

- `REPO_MAP.md`: This generated navigation map. Do not treat it as a complete repository tree.

## Excluded Areas

- `.git/`
- `node_modules/`
- `dist/`, `build/`, and `coverage/`
- cache directories such as `.cache/`, `cache/`, and `.astro/`
