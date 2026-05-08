---
title: mf version-sources
description: 只读命令，用于检查检测到的包和模板版本来源。
---

`mf version-sources` 报告当前 mustflow root 中看起来像包或模板版本来源的文件。它也会读取 `.mustflow/config/versioning.toml` 中的可选声明。

该命令不会修改版本、创建标签、提交或推送。它让代理和未来的 dashboard 面板可以查看与 `mf check --strict` 相同的版本来源检测结果。

## 输出

- `mustflow root`：当前 mustflow root。
- `Versioning preferences`：`[release.versioning]` 偏好是否启用。
- `Sources`：检测到或声明的文件及其来源类型。

## 示例

```sh
npx mf version-sources
```

## JSON 字段

```sh
npx mf version-sources --json
```

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `version-sources`。
- `mustflow_root` (`string`)：当前 mustflow root。
- `versioning_enabled` (`boolean`)：版本影响偏好是否启用。
- `sources` (`object[]`)：版本来源，包含 `path`、`kind` 以及可选的 `declared` 和 `authority` 字段。

## 帮助和退出代码

```sh
npx mf version-sources --help
```

- 退出代码 `0`：已检查并输出版本来源。
- 退出代码 `1`：命令收到未知选项。
