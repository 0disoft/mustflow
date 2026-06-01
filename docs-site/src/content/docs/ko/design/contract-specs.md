---
title: 계약 명세
description: mustflow의 테스트 가능한 작업 흐름 규칙을 정의하는 버전 있는 루트 문서입니다.
---

mustflow의 버전 있는 계약 명세는 저장소의
[`docs/spec/`](https://github.com/0disoft/mustflow/tree/main/docs/spec)에 있습니다.

이 문서들은 앞으로의 명령과 스키마가 공유해야 할 규칙을 정의합니다. 튜토리얼이 아니라
간결한 기준 문서입니다.

## JSON 스키마

공개 JSON 스키마는
[`schemas/`](https://github.com/0disoft/mustflow/tree/main/schemas)에 있으며 npm 패키지에도
포함됩니다. 배포되는 스키마 표면은 `src/core/public-json-contracts.ts`에서 추적하며,
릴리스 테스트는 이 매니페스트를 스키마 디렉터리, 이 문서 표면, 패키지 내용, 설치된
패키지의 JSON 명령 출력과 비교합니다.

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `run-receipt.schema.json`: `mf run <intent> --json`과 `.mustflow/state/runs/latest.json`
- `commands.schema.json`: 파싱된 `.mustflow/config/commands.toml`
- `contract-lint-report.schema.json`: `mf contract-lint --json`
- `onboard-commands-report.schema.json`: `mf onboard commands --json`
- `next-report.schema.json`: `mf next --json`
- `evidence-report.schema.json`: `mf evidence --changed --json`
- `api-serve-response.schema.json`: `mf api serve --stdio`의 줄 단위 응답
- `workspace-status.schema.json`: `mf workspace status --json`
- `workspace-command-catalog.schema.json`: `mf workspace command-catalog --json`
- `workspace-verification-plan.schema.json`: `mf workspace verify --changed --plan-only --json`
- `classify-report.schema.json`: `mf classify <path...> --json`
- `impact-report.schema.json`: `mf impact <path...> --json`
- `line-endings-report.schema.json`: `mf line-endings check --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `docs-review-list.schema.json`: `mf docs review list --json`
- `explain-report.schema.json`: `mf explain <topic> --json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`
- `change-verification-report.schema.json`: `mf verify --reason <event> --plan-only --json`

`commands.schema.json`은 명령 인텐트의 `inputs` 테이블에 검증 전용 타입 입력 메타데이터를
받아들입니다. 이 선언은 향후 매개변수 있는 실행을 설계하기 위한 것이며, 그 자체로 명령을
실행 가능하게 만들지 않습니다. 타입 입력을 선언한 configured 인텐트는 타입 입력 실행,
드라이런, 실행 영수증, 민감값 가림 규칙이 함께 구현되기 전까지 거부됩니다.

`commands.schema.json`은 `preconditions` 계획 메타데이터도 받아들입니다. 선행 조건은
드라이런, 검증 계획, 설명 출력에서 누락된 경로나 오래된 산출물을 보고할 수 있지만,
`satisfy_intent`는 의존 명령처럼 자동 실행되지 않습니다.

## 현재 명세

- `instruction-authority-v1.md`: 사용자 지시, 호스트 정책, 저장소 파일, 명령 계약, 생성 상태 사이의 유효 규칙 해석.
- `command-contract-v1.md`: `mf run`으로 실행할 수 있는 명령 의도의 조건.
- `verification-receipt-v1.md`: `mf run`이 쓰는 최신 실행 영수증.
- `state-retention-v1.md`: 생성 상태, 캐시, 실행 영수증, 원시 출력 보존 경계.

## 설치 파일과의 관계

명세는 `AGENTS.md`, `.mustflow/docs/agent-workflow.md`,
`.mustflow/config/mustflow.toml`, `.mustflow/config/commands.toml` 같은 설치 파일의
동작을 설명합니다.

명세와 현재 동작이 어긋나면 구현 또는 문서의 문제로 보고 고쳐야 합니다. 명세를 현재
사용자 지시, 호스트 안전 장치, 가장 가까운 mustflow 루트보다 높은 권한으로 사용하지 마세요.
