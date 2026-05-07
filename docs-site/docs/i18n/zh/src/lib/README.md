# docs-site lib

语言：[英文](../../../../../src/lib/README.md) · [韩文](../../../ko/src/lib/README.md) · [中文](README.md) · [西班牙文](../../../es/src/lib/README.md) · [法文](../../../fr/src/lib/README.md) · [印地文](../../../hi/src/lib/README.md)

该目录包含由多个 docs-site 路由共享的小型生成辅助函数。

- `machine-readable.mjs`：生成 `ai.txt`、`llms.txt`、`llms-full.txt` 和
  `robots.txt` 响应。

保持路由文件轻量。公开元数据文本的源值在
`../config/machine-readable.mjs` 中管理。
