---
title: mf script-pack
description: 내장 mustflow 유틸리티 스크립트를 나열하고 추천하며, 계약된 경로로 실행합니다.
---

`mf script-pack`은 작은 검사기를 모두 최상위 명령으로 늘리지 않고 하나의 namespace에서 제공합니다. 목록과 추천은 읽기 전용이며, 추천은 실행 권한이 아니라 현재 경로에 맞는 helper 후보일 뿐입니다.

```sh
npx mf script-pack list --json
npx mf script-pack suggest --path src/cli/index.ts --phase before_change
npx mf script-pack run core/text-budget check README.md --max 5000
```

내장 helper에는 source outline, 상대 import graph, change impact, symbol read, route outline, export diff, 문서 reference drift, text budget, config chain, generated boundary, related files가 포함됩니다. `run_hint`가 보여도 저장소 명령 계약과 helper의 side-effect 메타데이터가 별도로 허용해야 실행할 수 있습니다.

`script-pack run`은 helper의 child process도 제한합니다. 패키지 관리자, shell wrapper, Git 쓰기, 배포 등 구성되지 않은 프로세스 실행은 허용하지 않습니다.
