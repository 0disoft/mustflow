---
title: 发布前检查
description: 发布 mustflow npm 包前应运行的验证流程。
---

mustflow 通过 npm 同时发布 CLI 与模板。

发布前，不要只依赖本地源代码树中的检查。应打包 npm artifact，将其安装到临时项目，并用 `npx mf` 验证公开命令。

## 命令

```sh
bun run release:check
```

在本仓库中进行常规 agent 验证时，应优先使用已配置的 mustflow 命令 intent。

```sh
mf run build
mf run test
mf run docs_validate
mf run mustflow_check
```

`bun run release:check` 仍然是发布前关卡。`test_related`、`lint`、coverage
和 test-audit intent 会保持未配置或 manual-only，直到本仓库拥有更细粒度的检查入口。

## 目的

- `bun run release:check`：运行 CLI 检查、文档检查，并验证实际 npm 包安装。
- `bun run check:pack`：使用 `npm pack --dry-run --json` 检查包内容。这也会先运行 `prepack`。
- `bun run check:install`：构建真实 `.tgz`，安装到临时项目，并运行公开 `npx mf` 工作流。
- `bun run docs:check`：构建文档站点并验证导航。

## 文档站点部署

文档站点源代码位于 `main` 分支的 `docs-site/`。

在 GitHub Pages 设置中，请使用 `GitHub Actions` 作为发布源，而不是 `Deploy from a branch`。

当 `docs-site/**` 或 workflow 文件变化时，`.github/workflows/docs-site.yml` 会运行。在 `docs-site/` 内，它执行：

```sh
bun install --frozen-lockfile
bun run check
```

执行后，它会将 `docs-site/dist` 上传为 GitHub Pages artifact，并部署到 Pages environment。

注意，`docs-site/dist` 是生成输出，不应提交到仓库。

## check:install 流程

`check:install` 验证以下公开包工作流：

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf --version
npx mf init --dry-run
npx mf init --yes
npx mf check --strict --json
npx mf doctor --strict --json
npx mf context --json
npx mf run mustflow_check --json
npx mf status --json
npx mf index --json
npx mf search mustflow_check --json
npx mf update --dry-run --json
npx mf map --write
```

这可以确保打包后的 `dist/` 输出、`templates/`、命令合同和本地索引工作流在安装后能正确协同。

## 故障排查

- `npm pack` 失败：检查包元数据和包含文件。
- `npm install` 失败：检查依赖、包结构和 npm 兼容性。
- `npx mf init` 失败：发布后的 CLI 可能无法定位打包模板。
- `check/doctor/status/update/map` 失败：安装后生成文件、命令合同、本地索引或 manifest-lock 工作流可能已损坏。
