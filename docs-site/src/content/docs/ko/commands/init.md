---
title: mf init
description: 사용자 저장소에 mustflow 워크플로우를 설치하고 초기화하는 명령입니다.
---

`mf init`은 mustflow 템플릿을 사용자 저장소 루트에 설치합니다.

저장소 루트에는 `AGENTS.md`를 만들고, 자세한 가이드와 설정 파일은 `.mustflow/` 아래에 설치합니다.

## 설치 디렉터리 구조

```text
AGENTS.md
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
└─ skills/
   ├─ INDEX.md
   ├─ code-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   └─ test-maintenance/SKILL.md
```

`REPO_MAP.md`는 고정 템플릿에서 복사하지 않고, 필요할 때 저장소 구조를 분석해 동적으로 생성합니다.
`manifest.lock.toml`은 설치 완료 후 실제 설치 상태를 기록하기 위해 자동으로 생성됩니다.
`DESIGN.md`는 mustflow가 생성하지 않습니다. 파일이 이미 있다면 `mf map`이 이를 시각 설계 관련 앵커로 활용합니다.

## 템플릿 소스 구조

저장소에 설치되는 최종 경로는 고정되지만, 패키지 내부 템플릿 원본은 용도별로 나뉘어 관리됩니다.

```text
templates/default/
├─ common/
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ ko/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ zh/
   ├─ es/
   ├─ fr/
   └─ hi/
```

`common/`에는 언어와 무관한 설정이 들어 있고, `locales/<locale>/`에는 선택한 언어의 문서와 스킬 파일이 들어 있습니다. `zh`, `es`, `fr`, `hi` 폴더는 번역이 준비되기 전까지 영어 문구를 기본으로 사용합니다.

## 작동 원칙 및 규칙

- 설치 대상은 LLM 에이전트 전용 워크플로우 문서로 한정됩니다.
- 패키지를 설치하는 행위 자체로는 사용자 파일을 바꾸지 않습니다.
- 파일 충돌 발생 시 데이터 보호를 위해 작업을 중단하는 것이 기본 동작입니다.
- 기존 `AGENTS.md`가 있으면 `--merge` 옵션으로 mustflow 관리 블록만 안전하게 넣을 수 있습니다.
- `--force` 옵션은 기존 파일을 `.mustflow/backups/` 경로에 백업한 후 덮어씁니다.
- `REPO_MAP.md`는 고정 템플릿이 아니라 현재 저장소 구조를 분석해 생성합니다.
- `manifest.lock.toml`은 설치된 파일의 해시값, 템플릿 식별자 및 처리 결과를 기록합니다.
- `.mustflow/context/`는 에이전트용 프로젝트 맥락 정보용이며, 일반 문서 보관소가 아닙니다.
- `README.md`, `.github/` 폴더 및 기존 프로젝트의 `config/`, `docs/`, `skills/` 디렉터리는 수정하지 않습니다.
- 애플리케이션 소스 코드나 패키지 관리자, CI/CD 설정 등은 생성하지 않습니다.
- `--dry-run` 옵션은 파일을 쓰지 않고 설치 계획만 미리 보여줍니다.
- 충돌로 중단됐거나 `--dry-run`으로 실행한 경우 `manifest.lock.toml`은 생성하지 않습니다.

## 예시

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

`--yes`는 안전한 기본값 사용을 명시적으로 승인하는 옵션입니다. 단, 충돌 파일을 자동으로 덮어쓰지는 않습니다.

## 프로필 및 로케일 설정

`profile` 옵션은 국가나 언어가 아니라 프로젝트 성격을 정합니다.

지원하는 기본 프로필 목록은 다음과 같습니다.

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale`은 저장소에 설치할 mustflow 문서 언어를 정합니다. 현재 기본 템플릿은 `en`, `ko`, `zh`, `es`, `fr`, `hi`를 지원하며 기본값은 `en`입니다. 번역이 완료되지 않은 언어는 영어 문구를 사용합니다.

`--agent-lang`은 에이전트 최종 보고 언어를 정합니다. 설치한 mustflow 문서 언어와 다르게 설정할 수 있습니다.

제품 다국어 설정은 `--product-source-locale`, `--product-locale` 옵션으로 관리합니다. 이 값은 `preferences.toml`의 `[product_i18n]`에 기록되며, mustflow 문서 언어나 CLI 메시지 언어와는 별개입니다.

예를 들어 한국어로 보고받고, mustflow 문서는 한국어로 설치하지만, 제품 원문은 영어이고 한국어 사용자를 지원하는 프로젝트라면 다음처럼 씁니다.

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## JSON 출력 지원

현재 `mf init`은 JSON 출력을 지원하지 않습니다.

자동화 도구는 텍스트 메시지를 파싱하기보다 설치 후 `mf status --json`, `mf check --json`으로 결과를 검증하세요.

## 도움말 및 종료 코드

```sh
npx mf init --help
```

도움말은 `Usage`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.

- 종료 코드 `0`: 설치가 성공적으로 완료되었거나, 변경 사항이 없거나, 설치 계획이 정상적으로 출력되었습니다.
- 종료 코드 `1`: 잘못된 옵션, 파일 충돌 또는 상호 호환되지 않는 옵션 사용으로 인해 작업이 중단되었습니다.

알 수 없는 옵션을 입력하면 오류 이유와 함께 `mf init --help` 안내를 출력합니다.
