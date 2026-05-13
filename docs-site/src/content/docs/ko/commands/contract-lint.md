---
title: mf contract-lint
description: commands.toml 명령 계약을 읽기 전용으로 점검하는 명령입니다.
---

`mf contract-lint`는 설정된 명령을 실행하지 않고 `.mustflow/config/commands.toml`만 검사합니다.

명령 계약 오류와 경고만 집중해서 보고 싶을 때 사용합니다. `mf check`보다 범위가 좁습니다. 잘못된 `configured` 명령 의도는 오류로 보고하고, `unknown`이나 `manual_only` 명령 의도는 경고로 보여주므로 아직 준비되지 않은 명령도 현재 계약 상태에 남아 있습니다.

`--coverage`를 추가하면 변경 분류에서 나오는 검증 이유가 `required_after` 메타데이터와 연결되어 있는지도 볼 수 있습니다. 연결 상태 발견 항목은 기본적으로 경고이며, 어떤 명령을 실행 가능하게 만들지는 않습니다.

## 예시

```sh
npx mf contract-lint
npx mf contract-lint --coverage
npx mf contract-lint --json
npx mf contract-lint --coverage --json
```

## JSON 필드

```sh
npx mf contract-lint --json
```

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `contract-lint`입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `report.status` (`string`): `passed`, `warning`, `failed` 중 하나입니다.
- `report.summary` (`object`): 명령 의도 수, 실행 가능 수, 오류 수, 경고 수입니다.
- `report.issues` (`object[]`): `severity`, `code`, `intent`, `message`를 포함한 명령 계약 문제입니다.
- `report.sourceFiles` (`string[]`): 명령 계약 규칙의 근거 파일입니다.
- `report.coverage` (`object`, 선택): `--coverage`를 사용할 때만 있습니다. 알려진 변경 분류 이유, 문서화된 검증 전용 이유, 선언된 `required_after` 이유, 실행 가능한 이유, 연결 상태 발견 항목을 담습니다.
- `report.coverage.findings` (`object[]`): 안정적인 `code`, `reason`, `intent`, `intents`, `message` 필드가 있는 경고 중심의 연결 상태 발견 항목입니다.

## 도움말과 종료 코드

```sh
npx mf contract-lint --help
```

- 종료 코드 `0`: 차단되는 명령 계약 오류가 없습니다.
- 종료 코드 `1`: 명령 계약 오류가 있거나 입력이 잘못되었습니다.
