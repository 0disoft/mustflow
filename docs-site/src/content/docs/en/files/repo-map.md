---
title: REPO_MAP.md
description: An anchor-file-based map for agents navigating the current mustflow root.
---

`REPO_MAP.md` is an optional generated file at the current mustflow root.

It is not a full file listing. It finds important anchor files such as `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, `.mustflow/context/INDEX.md`, and language-specific configuration files so agents know where to look first inside the current root.

The root does not have to mean exactly one Git repository. If the current mustflow root is a workspace that contains independent nested repositories, the same `REPO_MAP.md` can include limited entrypoints for those repositories.

## Where It Is Used

Agents read it only when they need broad navigation for the current mustflow root. It is not required for every small change.

Root navigation belongs in this generated file so `AGENTS.md` and `.mustflow/docs/agent-workflow.md` can stay short.

## Role

- Summarizes why major files and directories in the current root exist.
- Reduces the first places an agent needs to inspect.
- Helps agents choose a safe change scope.
- Keeps `AGENTS.md` short.
- Separates repository navigation from complete file listing. Use `git ls-files` or an editor when you need every file.
- If the current root is a workspace, lists only entrypoints for nested independent repositories instead of describing their internals.

## Components

- Opening sentence: States that this is an anchor-file-based navigation map, not a full file listing.
- How to use: Points agents to `git ls-files` when they need the complete list.
- Priority anchors: Shows first-read files such as `AGENTS.md`, `.mustflow/config/*.toml`, `.mustflow/context/INDEX.md`, and `.mustflow/skills/INDEX.md`.
- Directory anchors: Groups important files such as `README.md`, `AGENTS.md`, `package.json`, `SKILL.md`, and tool configuration files by directory.
- Nested repositories: Shows only entrypoints such as `AGENTS.md`, `REPO_MAP.md`, context index files, and command-contract files for independent repositories discovered under workspace roots.
- Generated files: States that `REPO_MAP.md` is generated and should not be hand-edited.
- Exclusion rules: Leaves out dependencies, build outputs, caches, and large files.

## Generation Rules

- Generate it with the `repo_map` command intent or a command such as `mf map`.
- Use both `git ls-files` and file-system anchor discovery when possible.
- The default depth is 3. This does not mean a full tree depth; it limits how deep non-priority anchor files are discovered.
- Exclude `node_modules`, `dist`, `build`, `.git`, caches, and large outputs.
- Do not summarize file contents.
- Do not put volatile values such as generated time, hashes, or file counts at the top.
- Do not list every source file. Include only anchor files that help repository navigation.
- Include configuration files needed for agent behavior interpretation, such as `.mustflow/config/preferences.toml`, as priority anchors.
- Include `.mustflow/context/INDEX.md` and `.mustflow/context/PROJECT.md` when present, but do not expand every future domain context file by default.
- Include `DESIGN.md` when present as an optional external visual-design anchor. Do not create it as part of `mf map`.
- Even when nested repositories are listed, do not include remote URLs, branch names, recent change state, command lists, or automatic summaries by default.

## Authoring Rules

The first line should state that this is a navigation map for the current mustflow root, not a complete tree.

```md
# REPO_MAP.md

This file is an anchor-file-based navigation map for the current mustflow root, not a full file listing.
```

When structure changes, regenerate it instead of maintaining it as a long hand-written document.
