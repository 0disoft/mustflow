---
title: mf api
description: 에이전트 통합용 안정적인 읽기 전용 JSON 보고서를 출력합니다.
---

`mf api`는 워크플로우, 명령 카탈로그, 변경 검증 계획, 최신 증거, diff 위험, 상태, 활성 lock을 기계가 읽을 수 있는 JSON으로 제공합니다.

```sh
npx mf api workspace-summary --json
npx mf api command-catalog --json
npx mf api verification-plan --changed --json
npx mf api latest-evidence --json
npx mf api health --json
```

`serve --stdio`는 같은 보고서를 줄 단위 stdio로 제공합니다. 이 API는 프로젝트 명령을 실행하거나 파일을 수정하거나 승인·권한을 부여하지 않습니다. 변경 파일이 필요한 보고서에는 `--changed`, JSON 전용 보고서에는 `--json`이 필요합니다.

종료 코드는 보고서 출력 또는 stdio 세션 완료면 `0`, 잘못된 입력이나 보고서 생성 실패면 `1`입니다.
