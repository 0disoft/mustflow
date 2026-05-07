---
title: mf init
description: 사용자 저장소에 mustflow 문서 흐름을 복사하는 초기화 명령입니다.
---

`mf init`은 mustflow 패키지 안의 템플릿을 사용자 저장소 루트로 복사합니다.

루트에는 `AGENTS.md`를 만들고, mustflow가 관리하는 세부 문서와 설정은 `.mustflow/` 아래에 만듭니다.

## 생성되는 구조

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

`REPO_MAP.md`는 정적 템플릿에서 복사하지 않고, 사용자가 원할 때 저장소 구조를 읽어 생성합니다.
`manifest.lock.toml`은 정적 템플릿에서 복사하지 않고, `mf init`이 성공한 뒤 실제 설치 결과를 기록하기 위해 생성합니다.
`DESIGN.md`는 mustflow가 만들지 않습니다. 프로젝트에 이미 있으면 `mf map`이 UI 작업용 선택 시각 디자인 앵커로 인식할 수 있습니다.

## 템플릿 원본 구조

사용자 저장소에 설치되는 대상 경로는 안정적으로 유지하지만, 패키지 안의 템플릿 원본은 역할별로 나눕니다.

```text
templates/default/
├─ common/
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   └─ ko/
      ├─ AGENTS.md
      └─ .mustflow/
```

`common/`에는 언어와 무관한 TOML 설정을 둡니다. `locales/<locale>/`에는 `--locale` 선택에 따라
설치할 Markdown 문서와 스킬 파일을 둡니다.

## 원칙

- 복사 대상은 LLM 에이전트가 직접 읽는 작업 흐름 파일로 제한합니다.
- 패키지를 설치하는 것만으로 사용자 파일을 수정하지 않습니다.
- 기존 파일과 충돌하면 기본적으로 쓰기 전에 중단합니다.
- 기존 `AGENTS.md`가 있으면 `--merge`로 mustflow 관리 블록만 삽입할 수 있습니다.
- `--force`는 충돌 파일을 `.mustflow/backups/`에 백업한 뒤 덮어씁니다.
- `REPO_MAP.md`는 정적 템플릿으로 복사하지 않고 저장소 구조를 읽어 생성합니다.
- `manifest.lock.toml`은 설치된 파일의 해시, 템플릿 식별자, 처리 결과를 기록합니다.
- `.mustflow/context/`는 에이전트용 프로젝트 문맥이며, 일반 문서 보관함이 아닙니다.
- `README.md`, `.github/`, 기존 `config/`, `docs/`, `skills/` 폴더는 건드리지 않습니다.
- 소스 코드, 패키지 관리자 설정, CI 설정은 만들지 않습니다.
- `--dry-run`은 설치 계획만 보여주고 파일을 쓰지 않습니다.
- 충돌로 중단되거나 `--dry-run`으로 실행한 경우에는 `manifest.lock.toml`도 쓰지 않습니다.

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

`--yes`는 안전한 기본값을 명시하는 옵션입니다. 충돌 파일을 자동으로 덮어쓰지는 않습니다.

## 프로필과 언어

`profile`은 국가나 언어가 아니라 프로젝트 성격입니다.

지원하는 기본 프로필은 다음입니다.

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale`은 설치되는 mustflow 문서 언어입니다. 현재 기본 템플릿은 `en`, `ko`를 제공하고 기본값은 `en`입니다.

`--agent-lang`은 에이전트 최종 보고 언어입니다. mustflow 문서 언어와 다를 수 있습니다.

제품 사용자 문구의 다국어 정책은 `--product-source-locale`, `--product-locale`로 따로 기록합니다. 이 값들은 `.mustflow/config/preferences.toml`의 `[product_i18n]`에 들어가며, mustflow 문서 언어나 CLI 출력 언어를 뜻하지 않습니다.

예를 들어 한국어로 보고받고, mustflow 문서는 한국어로 설치하지만, 제품 원문은 영어이고 한국어 사용자를 지원하는 프로젝트라면 다음처럼 씁니다.

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## 구조화된 출력

`mf init`은 현재 JSON 출력 형식을 제공하지 않습니다.

자동화는 사람용 출력 문장을 파싱하지 말고, 설치 뒤 `mf status --json` 또는 `mf check --json`으로 결과를 확인해야 합니다.

## 도움말과 종료 코드

```sh
npx mf init --help
```

도움말은 `Usage`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.

- 종료 코드 `0`: 설치 완료, 변경 없음, 또는 `--dry-run` 계획 출력입니다.
- 종료 코드 `1`: 알 수 없는 선택지, 충돌 파일, 함께 쓸 수 없는 선택지 때문에 쓰기를 중단한 상태입니다.

알 수 없는 선택지를 입력하면 오류 이유와 `mf init --help` 안내를 함께 출력합니다.
