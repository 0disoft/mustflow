---
title: mf onboard commands
description: 검토 전용 명령 온보딩 제안입니다.
---

`mf onboard commands`는 루트의 기존 명령 파일을 확인하고 검토 전용 command-intent 제안을 출력합니다.

mustflow를 막 설치한 저장소에서 아직 `unknown` 명령 의도가 많이 남아 있을 때 사용합니다. 이 명령은 `mf contract-lint --suggest`와 같은 제안 모델로 `package.json`, Makefile, justfile 항목을 읽습니다.

제안은 명령 실행 권한을 부여하지 않습니다. 각 조각은 `status = "unknown"`을 사용하고 `argv`, `lifecycle`, `run_policy`, `stdin`, `timeout_seconds`, `writes`, `network`, `destructive` 같은 실행 가능 필드를 넣지 않습니다. 관리자가 명령 동작을 검토한 뒤에만 `.mustflow/config/commands.toml`에 복사하거나 확장해야 합니다.

이 명령은 파일을 쓰지 않습니다.

## 예시

```sh
npx mf onboard commands
npx mf onboard commands --json
```

## JSON 필드

```sh
npx mf onboard commands --json
```

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `onboard commands`입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `command_contract_path` (`string`): 항상 `.mustflow/config/commands.toml`입니다.
- `policy` (`object`): 제안이 검토 전용이고, 명령 권한을 부여하지 않으며, 파일을 쓰지 않는다는 정책입니다.
- `summary` (`object`): 명령 의도 수, 제안 수, 명령 계약 경고 또는 오류 수입니다.
- `suggestions` (`object[]`): 근거 파일, 근거 항목, 제안 명령 이름, 이유, TOML 조각을 담은 검토 전용 후보입니다.
- `next_steps` (`string[]`): 수락한 조각을 검토하고 검증하기 위한 후속 안내입니다.

## 도움말과 종료 코드

```sh
npx mf onboard --help
```

- 종료 코드 `0`: 제안을 확인하고 출력했습니다.
- 종료 코드 `1`: 명령 입력이 잘못되었습니다.
