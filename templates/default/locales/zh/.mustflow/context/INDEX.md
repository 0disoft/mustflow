---
mustflow_doc: context.index
kind: mustflow-context
locale: zh
canonical: false
revision: 1
lifecycle: mustflow-owned
name: context-index
authority: router
stability: medium
review_status: needs_human_review
---

# 上下文索引

请根据本文件判断当前任务应读取哪些项目上下文文件。  
默认情况下不建议读取全部上下文文件，以减少干扰信息。

## 可用上下文

| 上下文   | 使用时机                                         | 路径                     |
| -------- | ------------------------------------------------ | ------------------------ |
| project  | 任务可能影响项目方向、范围、对外行为、non-goals 或仓库级约定时。 | `.mustflow/context/PROJECT.md` |

## 可选外部参考

| 锚点           | 使用时机                                               | 路径          |
| -------------- | ------------------------------------------------------ | ------------- |
| human overview | 需要公开项目概览或安装指南时。应将其视为一般上下文，而非强制策略。 | `README.md`   |
| roadmap        | 需要项目计划、优先级、里程碑或 non-goals 上下文时。应将其视为计划上下文，而非 mustflow 已安装的策略。 | `ROADMAP.md`  |
| visual design  | 任务涉及 UI、视觉识别、design token、布局或可访问性变更时。 | `DESIGN.md`   |

## 阅读规则

- 仅阅读与当前任务相关的上下文文件。  
- 除非有更高权威来源明确支持，否则将上下文文件视为参考指导。  
- 若上下文与代码、测试、命令规范或用户明确指令冲突，应报告冲突并遵循更高权威来源。  
- 不得假设或编造缺失的项目目标、non-goals、design token、API 合约或数据规则。  
- 不得将 `DESIGN.md` 中的 design token 复制到 `.mustflow/context/` 目录。