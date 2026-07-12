---
title: mf tech
description: 에이전트를 위한 낮은 권한의 기술 선호를 관리합니다.
---

`mf tech`는 `.mustflow/config/technology.toml`의 기술 선호를 읽고 갱신합니다. 선호는 힌트일 뿐 의존성을 설치하거나 migration을 승인하거나 현재 코드와 명령 계약을 덮어쓰지 않습니다.

```sh
npx mf tech list --json
npx mf tech suggest --scope frontend
npx mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --verify --why "Preferred React app framework"
npx mf tech remove framework.frontend.nextjs
```

`list`, `suggest`, `add`, `remove`를 지원합니다. `--verify`는 작성 전에 npm 패키지 이름만 확인하며 패키지를 설치하거나 `package.json`을 수정하지 않습니다.

성공은 `0`, 입력 또는 검증 실패는 `1`입니다.
