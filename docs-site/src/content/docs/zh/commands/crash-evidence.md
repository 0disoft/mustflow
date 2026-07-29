---
title: mf crash-evidence
description: 验证、规范化并确定性重放有界的原生崩溃证据。
---

`mf crash-evidence` 将证据记录验证、离线产物规范化和模型化操作顺序重放视为三种不同的证明。

## 验证

```sh
npx mf crash-evidence validate crash/evidence.json --json
```

文件必须是 mustflow 根目录内不超过 4 MiB 的普通文件。退出码 `0` 同时包含有效的 `ready` 和 `incomplete` 记录，因此必须检查 `readiness`。被拒绝或无法读取的输入返回 `1`。

## 收集

```sh
npx mf crash-evidence collect crash/crash.dmp --adapter windows-minidump --binary bin/app.exe --output crash/evidence.json --json
```

适配器为 `windows-minidump`、`linux-core` 和 `sanitizer`。收集器只做离线处理，不会运行调试器、加载符号或编造缺失的寄存器和栈帧。`--binary` 只把候选文件的精确 SHA-256 记录为 `candidate_only`，并不证明它与捕获模块匹配。替换已有输出必须显式使用 `--overwrite`。

## Race 重放

```sh
npx mf crash-evidence race crash/race-scenario.json --json
```

场景固定参与者、操作、精确顺序、可选失败序号和地址复用策略。报告只证明模型中的操作顺序，不证明原生内存顺序或生产环境时序。
