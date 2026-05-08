---
title: versioning.toml
description: 用于声明仓库特定版本来源的可选配置文件。
---

`.mustflow/config/versioning.toml` 是可选文件。只有在自动检测无法清楚识别仓库真实版本来源时才需要使用它。

`mf init` 默认不会安装这个文件。

## 基本结构

```toml
schema_version = "1"

[[sources]]
path = "package.json"
kind = "package_manifest"
authority = "source"
description = "Published package version."
```

## 字段

- `schema_version`: 文件格式版本。使用 `"1"`。
- `sources`: 一个或多个声明的版本来源。
- `sources.path`: mustflow 根目录内版本文件的相对路径。
- `sources.kind`: `package_manifest`、`template_manifest` 或 `template_lock`。
- `sources.authority`: 如果该文件直接拥有版本，使用 `source`；如果它跟随另一个来源，使用 `derived`。
- `sources.description`: 可选的人类可读简短说明。

## 行为

`mf version-sources` 会包含声明的条目，并在 JSON 输出中标记 `declared = true`。

`mf check` 会在文件存在时验证其结构。`mf check --strict` 还会报告不存在的声明路径。

这个文件不会授予发布、提交、打标签、推送或修改版本的权限。这些操作仍然取决于用户直接指令、宿主规则和已配置的命令契约。
