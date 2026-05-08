---
title: Optional root docs and contracts
description: Project-owned root documents and machine-readable contracts that mustflow can use as navigation anchors when they exist.
---

mustflow does not require or create these files, but it can discover them as
root-level navigation anchors when they already exist in a project.

## Common Markdown Files

- `README.md`: human-facing project overview. It is context, not agent policy.
- `PROJECT.md`: project-owned brief. If `.mustflow/context/PROJECT.md` also exists, the mustflow context file has the clearer agent-workflow role.
- `ROADMAP.md`: planned work, priorities, milestones, and explicit non-goals.
- `DESIGN.md`: visual identity, layout, accessibility, and design-token reference for UI work.
- `CONTRIBUTING.md`: contribution workflow, pull request expectations, and local development notes.
- `SECURITY.md`: vulnerability reporting and security-sensitive change guidance.
- `CHANGELOG.md`: release history and user-visible changes.
- `CODE_OF_CONDUCT.md`: community participation expectations.
- `SUPPORT.md`: support channels and maintenance expectations.
- `GOVERNANCE.md`: decision-making, authority, and maintainer process.
- `MAINTAINERS.md`: maintainer list, review ownership, and escalation paths.
- `RELEASING.md` or `RELEASE.md`: release procedure and publishing checklist.
- `TESTING.md`: testing strategy, required checks, and verification guidance.
- `DEPLOYMENT.md`: deployment environments, release targets, and rollout guidance.
- `OPERATIONS.md` or `RUNBOOK.md`: production operations and recurring procedures.
- `CONFIGURATION.md`: environment, feature flag, and runtime configuration guidance.
- `DATA_MODEL.md` or `SCHEMA.md`: domain data model or schema reference.
- `PRIVACY.md`: privacy, data handling, and retention guidance.
- `TROUBLESHOOTING.md`: known-failure and recovery guide.
- `ARCHITECTURE.md`: system structure, module boundaries, and architectural decisions.
- `API.md`: public API surface and integration contracts.

## Machine-Readable Contract Files

Use purpose-specific names instead of a generic `SSOT.json` file.

- `project.contract.json`: repository-level contract that tools can validate.
- `project.constants.json`: shared project constants that code or tools can read.
- `design-tokens.json`: design token contract.
- `openapi.json`, `openapi.yaml`, or `openapi.yml`: OpenAPI contract.
- `asyncapi.json`, `asyncapi.yaml`, or `asyncapi.yml`: AsyncAPI contract.
- `schema.graphql`: GraphQL schema contract.
- `schema.prisma`: Prisma data schema contract.

## Relationship to mf init

`mf init` does not copy these files. User repositories often already own them,
and mustflow should not overwrite project documentation.

## Relationship to REPO_MAP.md

`mf map` includes these files when they exist so agents can find useful context
without treating every Markdown file as mandatory reading. These files do not
override `AGENTS.md`, `.mustflow/config/*.toml`, or the command contract.
