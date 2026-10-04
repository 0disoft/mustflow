---
mustflow_doc: agents.root
locale: zh
canonical: false
revision: 1
lifecycle: user-editable
authority: binding
---

# AGENTS.md

本仓库使用 mustflow simple 工作流。

## 优先级

优先遵循用户任务和最近的项目规则。它们高于本文件。

## 阅读

只读最近的 `AGENTS.md`，以及任务涉及的源码和包配置。扩展技能索引和工作流文档不是必读，只有任务需要时才看。

## 命令

直接使用仓库自带的 package 脚本、Makefile、Taskfile、Go、Rust 命令。`mf run check`、`test`、`typecheck`、`lint`、`build` 是可选项，会从 package 脚本和 Go/Rust 清单中发现常用命令。仓库中写明的命令限制仍然生效，`mf run` 也会遵守。

## 范围

日常开发无需注册 intent 或同步清单。只挑窄而相关的检查，输入没变就复用有效结果。失败、缺失或从未运行的检查不算通过。只有涉及正式发布、公开 API、安全或数据变更且落在当前范围内时，才跑完整发布检查。

## 修改与 Git

保留无关改动。密钥不写进日志和仓库。按精确范围暂存，提交小的逻辑单元。推送、发布、部署仅在用户授权后进行。

## 规范

避免自动升级版本号，以及反复的授权和读取循环。启动后台进程的脚本要自己清理。现有的全局 strict 文档不约束普通的 simple 工作流。
