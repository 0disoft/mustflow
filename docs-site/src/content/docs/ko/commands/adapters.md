---
title: mf adapters
description: 어댑터 파일을 만들지 않고 호스트 지침 파일 호환성을 검사합니다.
---

`mf adapters status`는 현재 mustflow 루트의 호스트별 지침 파일 호환성을 읽기 전용으로 검사합니다.

기존 에이전트 지침 파일, 선택적 adapter 표면, 호환성 메모, 필요한 변경, 명령 권한 경계를 보고합니다. adapter 파일을 생성하거나 호스트 설정을 바꾸지 않습니다.

```sh
npx mf adapters status
npx mf adapters status --json
```

`required_changes`는 호환성을 위해 조치가 필요한 항목이고, `compatibility_notes`는 정보성 메모입니다. 어떤 결과도 `.mustflow/config/commands.toml` 밖의 명령 실행 권한을 만들지 않습니다.

종료 코드는 성공적인 검사면 `0`, 잘못된 입력이면 `1`입니다.
