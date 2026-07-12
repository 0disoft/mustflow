---
title: mf flow
description: 현재 mustflow 루트의 설계 흐름 지도인 REPO_FLOW.md를 생성합니다.
---

`mf flow`는 작업 접수부터 읽기, 수정, 검증, 보고까지 저장소에서 일이 흐르는 방식을 `REPO_FLOW.md`로 생성합니다. `REPO_MAP.md`가 중요한 파일의 위치를 설명한다면, `REPO_FLOW.md`는 작업을 어떻게 진행할지 설명합니다.

```sh
npx mf flow --stdout
npx mf flow --write
npx mf flow --check
```

출력에는 안정적인 frontmatter, 작업·명령·생성물·receipt 흐름, 동기화해야 할 공개 계약 표면, 흔한 변경 유형별 첫 편집 위치가 들어갑니다. 타임스탬프, 브랜치, 원격 URL, 절대 경로, 최근 변경 요약은 넣지 않습니다.

생성 지도는 탐색용이며 명령 권한이 아닙니다. 성공은 `0`, 옵션 오류 또는 stale/missing map 검사는 `1`입니다.
