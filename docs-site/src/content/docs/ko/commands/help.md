---
title: mf help
description: 설치된 mustflow 문서 및 구성을 참조하여 작업 도움말을 제공하는 명령입니다.
---

`mf help`는 별도의 고정 매뉴얼 대신, 현재 루트에 실제로 설치된 mustflow 파일을 읽어 관련 정보를 보여주는 도움말 명령입니다.

## 주제

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

- `workflow`: `.mustflow/docs/agent-workflow.md` 파일의 내용을 출력합니다.
- `skills`: `.mustflow/skills/INDEX.md` 파일의 내용을 출력합니다.
- `commands`: `.mustflow/config/commands.toml`에 정의된 명령 의도 및 상태 요약을 보여줍니다.
- `preferences`: `.mustflow/config/preferences.toml`에 정의된 에이전트 선호값 요약을 보여줍니다.

## 작동 원칙

도움말 전용 데이터 원본을 따로 두지 않고, 각 주제 정보는 저장소에 설치된 mustflow 파일에서 직접 가져옵니다.

이 방식은 실제 문서·설정과 도움말 사이의 어긋남(Drift)을 줄여, 항상 현재 상태에 가까운 정보를 보여주기 위한 것입니다.

## CLI 출력 언어 설정

`--lang` 옵션은 도움말 머리말, 오류 메시지처럼 CLI 내부 고정 문구의 언어를 정합니다.
현재 지원 값은 `en`, `ko`, `zh`, `es`, `fr`, `hi`입니다. `zh`, `es`, `fr`, `hi`는 번역이 준비되기 전까지 영어 문구를 기본으로 사용합니다.

```sh
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

이 설정은 `mf init --locale`과 용도가 다릅니다. `--lang`은 터미널 메시지 언어를, `--locale`은 저장소에 설치할 mustflow 문서 언어를 정합니다.

`mf help commands`, `mf help preferences`에서 프로젝트 파일을 직접 읽어오는 설명 데이터는 자동 번역되지 않습니다. 선택한 CLI 언어는 도움말 레이블에만 적용됩니다.

## 구조화된 출력

현재 `mf help`는 JSON 출력을 지원하지 않습니다.

에이전트나 자동화 도구가 구조화된 명령 정보가 필요하면, 먼저 `mf context --json`으로 실행 가능한 의도 목록을 확인한 뒤 `.mustflow/config/commands.toml`을 직접 참조하세요.

## 도움말 및 종료 코드

```sh
npx mf help --help
```

영어 도움말은 `Usage`, `Topics`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.
한국어 도움말은 같은 순서로 `사용법`, `주제`, `선택지`, `예시`, `종료 코드`를 출력합니다.

- 종료 코드 `0`: 요청한 도움말 주제를 출력했거나, 관련 주제 파일이 없음을 확인했습니다.
- 종료 코드 `1`: 알 수 없는 주제 또는 유효하지 않은 옵션이 제공되었습니다.

`mf help` 자체의 주제 목록은 CLI에 들어 있지만, 각 주제의 본문은 현재 루트의 `.mustflow/` 파일을 기준으로 읽습니다.
