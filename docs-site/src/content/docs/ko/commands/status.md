---
title: mf status
description: 현재 루트의 mustflow 설치 상태를 읽기 전용으로 보여주는 명령입니다.
---

`mf status`는 현재 루트에 mustflow 문서 흐름이 설치되어 있는지 확인하고, 잠금 파일 기준으로 변경되거나 누락된 파일 수를 보여줍니다.

이 명령은 파일을 수정하지 않습니다. 자동 검증은 `mf check`, 사람이 빠른 상태 확인을 할 때는 `mf status`를 쓰면 됩니다.
자동화 도구나 에이전트가 읽어야 한다면 `--json`을 사용하세요.

## 보여주는 것

- `Installed`: `AGENTS.md`와 `.mustflow/` 존재 여부입니다.
- `Manifest lock`: `manifest.lock.toml`의 상태입니다. `present`, `missing`, `invalid` 중 하나입니다.
- `Tracked files`: 잠금 파일에 기록된 파일 수입니다.
- `Changed files`: 잠금 파일의 해시와 현재 내용이 다른 파일 수입니다.
- `Missing files`: 잠금 파일에 기록되어 있지만 현재 없는 파일 수입니다.

## 예시

```sh
npx mf status
```

출력 예시는 다음과 같습니다.

```text
mustflow status
Installed: yes
Manifest lock: present
Tracked files: 10
Changed files: 0
Missing files: 0
```

파일이 바뀌었거나 사라졌다면 아래에 해당 경로도 함께 표시합니다.

## JSON 필드

```sh
npx mf status --json
```

자동화 도구가 읽는 출력은 다음 필드를 사용합니다.

- `installed` (`boolean`): `AGENTS.md`와 `.mustflow/` 존재 여부입니다.
- `manifestLock` (`string`): 잠금 파일 상태입니다.
- `trackedFiles` (`number`): 잠금 파일에 기록된 파일 수입니다.
- `changedFiles` (`string[]`): 해시가 달라진 경로 목록입니다.
- `missingFiles` (`string[]`): 사라진 경로 목록입니다.
- `issues` (`string[]`): 사람이 읽을 수 있는 문제 설명 목록입니다.
- `template` (`object | null`): 잠금 파일에 기록된 템플릿 식별자와 판 번호입니다.

## 도움말과 종료 코드

```sh
npx mf status --help
```

도움말은 `Usage`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.

- 종료 코드 `0`: 상태를 읽고 출력했습니다. 변경 파일이 있어도 상태 확인 자체는 실패가 아닙니다.
- 종료 코드 `1`: 알 수 없는 옵션을 받았습니다.

변경 파일 때문에 자동화 실패 처리가 필요하면 `mf status --json`을 읽어 별도로 판단하거나 `mf check`를 사용하세요.
