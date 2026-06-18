---
title: schemas/
description: mustflow의 안정적인 JSON 출력을 설명하는 공개 JSON 스키마 계약입니다.
---

`schemas/` 폴더에는 mustflow가 기계 판독용으로 출력하는 JSON 구조와,
파싱된 설정 파일 형식을 정의하는 공개 JSON 스키마가 들어 있습니다.

## mf init으로 설치되나요

아니요. `mf init`은 사용자 저장소에 `schemas/` 폴더를 복사하지 않습니다.

기본 초기화 템플릿은 일부러 최소한으로 유지합니다. 실제로 설치되는 항목은
`AGENTS.md`, `.mustflow/**`, 그리고 `.gitignore` 안의 mustflow 관리 블록뿐입니다.
`REPO_MAP.md`는 나중에 `mf map` 명령으로 따로 생성합니다.

## npm 패키지에 포함되나요

네, 포함됩니다. `schemas/`는 npm 패키지 안에 함께 들어가기 때문에, 외부 도구가
사람이 읽는 텍스트를 직접 파싱하지 않고도 안정적인 스키마 계약을 기준으로
`--json` 출력을 처리할 수 있습니다.

자동화를 구성할 때는 설치된 패키지 안의 스키마나 mustflow 저장소의 스키마를
참조하면 됩니다.

## 현재 제공되는 스키마

- `doctor-report.schema.json`: `mf doctor --json` 출력
- `context-report.schema.json`: `mf context --json` 출력. 프롬프트 캐시 프로필과 선택적 캐시 감사 데이터도 포함합니다.
- `contract-lint-report.schema.json`: `mf contract-lint --json` 출력
- `onboard-commands-report.schema.json`: `mf onboard commands --json` 출력
- `next-report.schema.json`: `mf next --json` 출력
- `evidence-report.schema.json`: `mf evidence --changed --json` 출력
- `api-serve-response.schema.json`: `mf api serve --stdio`의 줄 단위 응답
- `workspace-status.schema.json`: `mf workspace status --json` 출력
- `workspace-command-catalog.schema.json`: `mf workspace command-catalog --json` 출력
- `workspace-verification-plan.schema.json`: `mf workspace verify --changed --plan-only --json` 출력
- `classify-report.schema.json`: `mf classify --changed --json` 및
  `mf classify <path...> --json` 출력
- `impact-report.schema.json`: `mf impact --changed --json` 및
  `mf impact <path...> --json` 출력
- `version-sources-report.schema.json`: `mf version-sources --json` 출력
- `docs-review-list.schema.json`: `mf docs review list --json` 출력
- `skill-route-report.schema.json`: `mf skill route --json` 출력. 간결한 route 후보, 선택된
  main·adjunct skill, 점수 분해, route 원본 shard를 포함합니다.
- `latest-run-pointer.schema.json`: `mf verify`가 최신 verify 실행 묶음을 가리킬 때 쓰는
  `.mustflow/state/runs/latest.json`
- `explain-report.schema.json`: `mf explain <topic> --json` 출력
- `verify-report.schema.json`: `mf verify --reason <event> --json` 출력. 실행 합산 상태와
  근거 기반 완료 판정을 함께 포함합니다.
- `verify-run-manifest.schema.json`: `.mustflow/state/runs/verify-*/manifest.json`.
  verify 보고서와 같은 실행 합산 상태와 완료 판정을 포함합니다.
- `run-receipt.schema.json`: `mf run <intent> --json` 출력과 `.mustflow/state/runs/latest.json`
- `commands.schema.json`: 파싱된 `.mustflow/config/commands.toml`

사람이 읽기 위한 형식의 명령 출력은 이 스키마의 대상이 아닙니다.
