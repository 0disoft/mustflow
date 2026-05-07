# mustflow 文档站点

语言：[英文](../../../README.md) · [韩文](../ko/README.md) · [中文](README.md) · [西班牙文](../es/README.md) · [法文](../fr/README.md) · [印地文](../hi/README.md)

这是部署到 `mustflow.github.io` 的文档站点。

该文档站点不会通过 `mf init` 安装到用户仓库中。它提供 mustflow 创建的
文件和配置的详细指南。

站点内容按语言管理在 `src/content/docs/<locale>/` 中。

## 命令

```sh
bun run dev
bun run check
bun run build
bun run preview
```

从仓库根目录使用以下包装命令：

```sh
bun run docs:dev
bun run docs:check
bun run docs:build
bun run docs:preview
```
