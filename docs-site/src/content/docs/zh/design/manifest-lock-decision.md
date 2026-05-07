---
title: manifest.lock.toml 结构决策
description: 为什么 mustflow 暂不拆分 manifest.lock.toml 的 hash 字段。
---

mustflow 目前在 `manifest.lock.toml` 中维护单一 `content_hash` 字段。

该值不是当前实时文件 hash。它是最近一次安装或更新时记录的文件内容 hash。名称很简单，但它承担安装基线的角色。

## 决策

当前不将锁文件拆分为 `installed_hash`、`template_hash` 和 `current_hash`。

而是采用这些规则：

- `content_hash`：存储在锁文件中的安装基线。
- Current file hash：运行时从文件系统计算。
- Bundled template hash：运行时从已安装包内模板计算。

## 理由

锁文件只应记录可复现的安装状态。

只要用户编辑文件，`current_hash` 就会变化。若将它存入锁文件，普通编辑后也必须重写锁文件，这会削弱基线的意义。

`template_hash` 可以从当前安装的 mustflow 包计算。包变化时，打包模板 hash 也会变化。若在锁文件中保留过期 template hash，可能造成冲突的事实来源。

## 更新比较

`mf update --dry-run` 依赖这些比较：

```text
current file hash == lock content_hash
current file hash == bundled template hash
```

- 如果第一次比较为 false，文件存在本地变更。
- 如果第一次比较为 true 且第二次为 false，文件是模板更新候选。
- 如果两次都为 true，则无需更新。

## 未来扩展

如果 mustflow 以后需要这些能力，将提升 schema 版本并添加字段：

- 跨多个模板源比较。
- 使用块级基线安全更新 `AGENTS.md` 或 `.gitignore` 等受管理块。
- 离线验证每个模板来源 hash。
- 在未安装 mustflow 包的情况下生成可复现更新计划。
- 签名模板或供应链验证。

在此之前，以单一 `content_hash` 作为安装基线更简单也更稳健。
