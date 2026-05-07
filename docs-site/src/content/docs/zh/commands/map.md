---
title: mf map
description: 生成当前 mustflow 根目录的基于锚点的 REPO_MAP.md。
---

`mf map` 会读取当前 mustflow 根目录，并为代理生成基于锚点的导航地图。

它不是完整文件清单。若需要完整文件列表，`git ls-files` 或编辑器更合适。`mf map` 只包含帮助导航的锚点，例如 `AGENTS.md`、`README.md`、`DESIGN.md`、`package.json`、`SKILL.md`、上下文文件以及重要配置文件。

## 选项

- `--stdout`：将生成的地图打印到终端。
- `--write`：将生成的地图写入 `REPO_MAP.md`。
- `--depth <number>`：设置非优先锚点文件的搜索深度。默认值为 `3`。
- `--include-nested`：将已配置 workspace roots 下的嵌套仓库加入 `Nested Repositories` 章节。
- `--root-only`：即使配置启用了嵌套仓库发现，也只为当前 root 生成地图。

## 包含的锚点

发现这些文件时可包含在地图中。

```text
AGENTS.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml
.mustflow/context/INDEX.md
.mustflow/context/PROJECT.md
.mustflow/skills/INDEX.md
README.md
DESIGN.md
package.json
pyproject.toml
go.mod
Cargo.toml
deno.json
SKILL.md
justfile
Taskfile.yml
Makefile
Dockerfile
compose.yaml
tsconfig.json
ruff.toml
.golangci.yml
```

## 排除路径

这些路径默认排除。

```text
.git
node_modules
dist
build
coverage
cache
.cache
.astro
```

## 示例

```sh
npx mf map --stdout
npx mf map --write
npx mf map --stdout --depth 3
npx mf map --write --include-nested
npx mf map --write --root-only
```

使用 `--write` 时，命令会在仓库根目录创建或更新 `REPO_MAP.md`。

生成的地图不会在顶部包含生成时间、hash 或文件数量等易变值。

## 嵌套仓库

当 `.mustflow/config/mustflow.toml` 同时设置 `map.include_nested = true` 和 `workspace.enabled = true` 时，`mf map` 会在配置的 `workspace.roots` 下发现独立仓库，并将它们列入 `Nested Repositories` 章节。

`--include-nested` 会在当前运行中启用该章节，即使 `map.include_nested` 为 `false`。它仍然只扫描 `workspace.roots` 中声明的路径。

`--root-only` 会强制当前运行忽略嵌套仓库，即使配置启用了它们。这两个选项互斥。

该章节不会列出嵌套仓库的内部文件。它只显示入口点，例如 `AGENTS.md`、`REPO_MAP.md`、`.mustflow/config/commands.toml`、`.mustflow/context/INDEX.md`、`DESIGN.md` 和主要 manifest 文件。

## 结构化输出

`mf map` 目前不提供 JSON 输出格式。

代理不应将生成的 Markdown 视为完整文件索引。应把它当作导航地图，先读取 `Root Anchors` 与 `Nested Repositories` 章节中的入口路径。

## 帮助与退出码

```sh
npx mf map --help
```

帮助输出组织为 `Usage`、`Options`、`Examples` 和 `Exit codes`。

- 退出码 `0`：地图已生成，并可选地写入。
- 退出码 `1`：命令收到未知选项、无效 `--depth` 值，或不兼容的嵌套仓库选项。

当同时省略 `--stdout` 和 `--write` 时，命令默认将地图打印到终端。
