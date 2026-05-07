---
title: mf help
description: 설치된 mustflow 문서와 설정을 읽어 작업 도움말을 보여주는 명령입니다.
---

`mf help`는 하드코딩된 긴 설명서가 아니라 현재 루트에 설치된 mustflow 파일을 읽어 보여주는 도움말 명령입니다.

## 주제

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang ko help
npx mf --lang en help
```

- `workflow`: `.mustflow/docs/agent-workflow.md`를 보여줍니다.
- `skills`: `.mustflow/skills/INDEX.md`를 보여줍니다.
- `commands`: `.mustflow/config/commands.toml`의 명령 의도와 상태를 요약합니다.
- `preferences`: `.mustflow/config/preferences.toml`의 선호값을 요약합니다.

## 원칙

도움말은 별도 원본을 만들지 않습니다. 각 주제의 기준 원본은 이미 설치된 mustflow 파일입니다.

이렇게 해야 문서, 설정, 도움말이 서로 다르게 낡는 일을 줄일 수 있습니다.

## CLI 출력 언어

`--lang`은 CLI 도움말과 오류 안내 같은 고정 문구의 언어를 고릅니다.

```sh
npx mf --lang ko help
npx mf --lang en help
```

이 값은 `mf init --locale`과 다릅니다. `--lang`은 터미널 출력 언어이고, `--locale`은 설치되는 mustflow 문서 언어입니다.

`mf help commands`나 `mf help preferences`가 설치된 파일에서 읽어오는 실제 설명 값은 자동 번역하지 않습니다. 주변 라벨만 선택한 CLI 언어로 보여줍니다.

## 구조화된 출력

`mf help`는 현재 JSON 출력 형식을 제공하지 않습니다.

에이전트나 자동화가 구조화된 명령 정보를 읽어야 한다면 `mf context --json`으로 실행 가능한 의도 목록을 확인하고, 필요할 때 `.mustflow/config/commands.toml`을 직접 읽습니다.

## 도움말과 종료 코드

```sh
npx mf help --help
```

영어 도움말은 `Usage`, `Topics`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.
한국어 도움말은 같은 순서로 `사용법`, `주제`, `선택지`, `예시`, `종료 코드`를 출력합니다.

- 종료 코드 `0`: 요청한 도움말 주제를 출력했거나, 설치된 주제 파일이 없다는 안내를 출력했습니다.
- 종료 코드 `1`: 알 수 없는 주제나 선택지를 받은 상태입니다.

`mf help` 자체의 주제 목록은 CLI에 들어 있지만, 각 주제의 본문은 현재 루트의 `.mustflow/` 파일을 기준으로 읽습니다.
