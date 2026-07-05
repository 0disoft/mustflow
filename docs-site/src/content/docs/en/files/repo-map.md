---
title: REPO_MAP.md
description: An anchor-based map for agents navigating the current mustflow root.
---

`REPO_MAP.md` is a generated file that provides a high-level overview of the current mustflow root.

It is not intended as an exhaustive file listing. Instead, it identifies critical anchor files such as `AGENTS.md`, `REPO_FLOW.md`, root Markdown docs, machine-readable contracts, `package.json`, `SKILL.md`, scaffold routers, validation guides, diagrams, and configuration files to orient agents within the repository.

A mustflow root may encompass multiple repositories. If the current root is a workspace containing nested independent repositories, `REPO_MAP.md` provides entry points for those repositories without detailing their internal structures.

## Usage

Agents consult this document when high-level navigation of the mustflow root is required. It is not necessary for every minor modification.

Delegating repository navigation to this generated file ensures that `AGENTS.md` and `.mustflow/docs/agent-workflow.md` remain concise.

## Role and Responsibilities

- **Repository Orientation**: Briefly explains the purpose of significant files and directories within the root.
- **Flow Handoff**: Points to `REPO_FLOW.md` when agents need to understand how work moves through the root after locating files.
- **Initial Search Space Reduction**: Limits the number of initial locations an agent needs to inspect.
- **Scope Definition**: Assists agents in determining an appropriate and safe scope for changes.
- **Conciseness**: Maintains the brevity of mandatory entry-point documents.
- **Separation of Concerns**: Distinguishes high-level navigation from exhaustive file lists (for which tools like `git ls-files` should be used).
- **Workspace Support**: Lists only the entry points for nested repositories in workspace environments, including scaffold routers, contract anchors, and minimal ssealed manifest metadata when a nested repository uses ssealed-style generated structure.

## Document Structure

- **Generated Metadata**: Stores stable frontmatter for document identity, lifecycle, anchor count, and source fingerprint.
- **Opening Statement**: Clarifies that the file is an anchor-based navigation map rather than a complete directory tree.
- **Usage Guidelines**: Directs agents to use `git ls-files` when an exhaustive list is needed.
- **Primary Anchors**: Lists essential first-read files, including `AGENTS.md` and mustflow configuration/index files.
- **Directory-Level Anchors**: Groups significant files (e.g., `package.json`, `SKILL.md`, `.agents/context-map.md`, validation guides, and diagrams) by their respective directories.
- **Nested Repositories**: Provides entry points for independent repositories discovered within a workspace.
- **Maintenance Notice**: States that the file is automatically generated and should not be modified manually.
- **Exclusion Criteria**: Specifies that dependencies, build artifacts, caches, and large files are excluded.

## Generation Policy

- **Command Authority**: Generate the map via the `repo_map` intent or the `mf map` command.
- **Discovery Logic**: Utilize both `git ls-files` and filesystem-based anchor discovery where possible.
- **Discovery Depth**: The default discovery depth is set to 3. This limit applies to the identification of non-priority anchor files, not the absolute tree depth.
- **Exclusion List**: Automatically exclude `node_modules`, `dist`, `build`, `.git`, `.mustflow/backups`, caches, and large binary outputs.
- **Content Policy**: Do not include summaries of individual file contents.
- **Input Stability**: Include only stable generated metadata at the beginning of the file. Avoid generation timestamps, branch names, remote URLs, change summaries, and logs.
- **Staleness Detection**: Let `mf check --strict` compare `source_fingerprint` with the current anchor set and report when regeneration is needed.
- **Selective Listing**: Include only anchor files that facilitate navigation rather than listing every source file.
- **Behavioral Context**: Prioritize configuration files required for agent behavior interpretation (e.g., `preferences.toml`).
- **Context Awareness**: Include `.mustflow/context/INDEX.md` and `PROJECT.md` by default, but avoid automatically expanding domain-specific context files.
- **Optional Root Anchors**: Include project-owned root Markdown files such as `README.md`, `PROJECT.md`, `ROADMAP.md`, `DESIGN.md`, `GOVERNANCE.md`, `TESTING.md`, `DEPLOYMENT.md`, `ARCHITECTURE.md`, and `API.md` when present; however, the generation tool must not create them.
- **Machine-Readable Contracts**: Include purpose-specific contract files such as `project.contract.json`, `project.constants.json`, `design-tokens.json`, `openapi.yaml`, `asyncapi.yaml`, `schema.graphql`, and `schema.prisma` when present. Generic catch-all names such as `SSOT.json` are not default anchors.
- **Scaffold and Validation Anchors**: Include project scaffold entrypoints such as `CHECKLIST.md`, `VALIDATION.md`, `.agents/context-map.md`, `.agents/checklists/*.md`, `.agents/validations/*.md`, `.agents/skills/*/SKILL.md`, `.ssealed/manifest.json`, `diagrams/*.mmd`, GitHub templates, API examples, and `db/schema.dbml` when present. For ssealed manifests, summarize stable fields such as scope, profile, density, runner, version, and file-kind counts, but do not print checksums or generation timestamps.
- **Metadata Protection**: Even for nested repositories, do not include remote URLs, branch names, or automatic summaries.

## Authoring Guidelines

The first line must explicitly state that the document is a navigation map, not a complete file tree.

```md
---
mustflow_doc: repo-map
lifecycle: generated
generated_by: mustflow
relative_root: "."
source_policy: anchors_only
privacy_mode: minimal
anchor_count: 12
source_fingerprint: "sha256:..."
---

# REPO_MAP.md

This file is an anchor-file-based navigation map for the current mustflow root, not a full file listing.
```

If the repository structure changes, regenerate the file rather than attempting to maintain it manually.
