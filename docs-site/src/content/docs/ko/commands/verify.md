---
title: mf verify
description: required_after 메타데이터로 선택한 설정된 검증 의도를 실행합니다.
---

`mf verify --reason <event>`는 `.mustflow/config/commands.toml`을 읽고, `required_after` 목록에 지정한 이유가 들어 있는 명령 의도를 찾습니다. 그중 설정 완료, 단발 실행, 에이전트 실행 허용, 표준 입력 닫힘 조건을 모두 만족하는 의도만 실행합니다.

## 선택 규칙

- `required_after`의 이유 문자열이 정확히 일치해야 선택됩니다.
- 실행 가능한 의도는 `mf run <intent>`와 같은 안전 경로로 실행됩니다.
- 알 수 없음, 수동 전용, 장기 실행, 차단됨, 설정 불완전 상태의 의도는 추측해서 실행하지 않고 건너뛴 항목으로 보고합니다.
- 이유에 맞는 의도가 하나도 없으면 결과는 `blocked`입니다.

## 예시

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
```

## JSON 필드

```sh
npx mf verify --reason code_change --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 검증 보고서 형식 버전입니다.
- `command` (`string`): 항상 `verify`입니다.
- `mustflow_root` (`string`): 확인된 mustflow 루트입니다.
- `reason` (`string`): 요청한 `required_after` 이유입니다.
- `status` (`string`): `passed`, `partial`, `failed`, `blocked` 중 하나입니다.
- `summary` (`object`): 일치, 실행, 통과, 실패, 건너뜀 개수입니다.
- `results` (`object[]`): 의도별 실행 또는 건너뜀 결과입니다.

## 종료 코드

- `0`: 선택된 실행 가능 의도가 모두 통과했고 건너뛴 의도가 없습니다.
- `1`: 검증 실패, 부분 실행, 차단, 또는 잘못된 입력입니다.
