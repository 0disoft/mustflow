---
title: mf dashboard
description: 로컬 mustflow 대시보드를 시작합니다.
---

`mf dashboard`는 안전한 mustflow 선호 설정을 로컬 브라우저 화면에서 확인하고 수정하는 대시보드를 시작합니다.

첫 대시보드 화면은 `.mustflow/config/preferences.toml`만 다룹니다. 스테이징, 커밋, 푸시, 버전 올림, 명령 의도 실행은 하지 않습니다.

수정 가능한 그룹은 Git 기본값, 커밋 메시지 제안, 보고, 검증 선택, 테스트 작성, 코드 스타일, 버전 영향 선호값입니다.

## 현재 동작

```sh
npx mf dashboard
```

이 명령은 기본적으로 `127.0.0.1`에 로컬 HTTP 서버를 띄우고 대시보드 주소를 출력한 뒤 기본 브라우저에서 엽니다.

대시보드 화면에서는 영어, 한국어, 중국어, 스페인어, 프랑스어, 힌디어 중 표시 언어를 바꿀 수 있습니다. 선택한 언어는 브라우저에 저장됩니다.

특정 포트를 쓰려면 `--port`를 지정합니다. 브라우저를 열지 않으려면 `--no-open`을 사용합니다. 다른 도구가 주소를 읽어야 하면 `--json`을 사용하며, JSON 모드에서는 브라우저를 열지 않습니다.

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
```

## 구조화된 출력

`--json`을 사용하면 로컬 서버가 계속 실행되는 동안 대시보드 주소, mustflow 루트, 선호 설정 파일 경로를 먼저 출력합니다.

대시보드 API는 세션별 토큰을 사용하며, 화면에 노출된 제한된 선호 설정만 수정합니다. `git.auto_push`는 잠긴 설정으로 표시됩니다.

설정 저장에 성공하면 대시보드는 `.mustflow/config/preferences.toml`을 쓰고, `.mustflow/config/manifest.lock.toml`이 있으면 해당 파일 항목을 `last_action = "customized"`로 갱신합니다. 그래서 `mf check`, `mf status`, `mf update --dry-run`이 사용자가 승인한 로컬 선호 설정 기준선과 맞게 동작합니다.

## 도움말 및 종료 코드

```sh
npx mf dashboard --help
```

- 종료 코드 `0`: 대시보드를 시작했거나 도움말을 출력했습니다.
- 종료 코드 `1`: 대시보드를 시작하지 못했거나 잘못된 입력이 제공되었습니다.
