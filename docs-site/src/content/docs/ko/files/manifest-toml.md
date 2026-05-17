---
title: templates/default/manifest.toml
description: mf init이 어떤 파일을 복사하고 충돌을 어떻게 처리할지 선언하는 템플릿 메타데이터입니다.
---

`templates/default/manifest.toml`은 `mf init`이 템플릿을 설치할 때 참고하는 메타데이터입니다.

이 파일은 사용자 저장소에 복사되지 않습니다. mustflow 패키지가 템플릿을 어떻게 설치해야 하는지 판단하는 기준 자료입니다.

## 역할

- 템플릿 식별자와 설명을 선언합니다.
- 설치 범위가 LLM 전용 파일인지 선언합니다.
- 복사할 파일 목록을 명시합니다.
- 기존 파일과 충돌할 때 중단할지, 관리 블록만 병합할지, 백업 후 덮어쓸지 정합니다.
- 설치 뒤 사람이 확인해야 할 다음 작업을 안내합니다.

## 주요 필드

- `id`: 템플릿의 고정 식별자입니다.
- `name`: 사람이 보는 템플릿 이름입니다.
- `version`: 템플릿 형식의 판 번호입니다.
- `description`: 템플릿의 목적입니다.
- `common_root`: 언어와 무관하게 복사할 파일이 들어 있는 기준 폴더입니다.
- `locales_root`: `--locale` 선택에 따라 고를 언어별 파일이 들어 있는 기준 폴더입니다.
- `profiles.default`: `mf init`이 별도 선택 없이 사용할 프로젝트 성격입니다.
- `profiles.available`: 기본 템플릿이 허용하는 프로젝트 성격 목록입니다.
- `locales.default`: `mf init`이 별도 선택 없이 사용할 mustflow 문서 언어입니다.
- `locales.available`: 현재 템플릿이 실제로 제공하는 문서 언어 목록입니다.
- `locales.source`: 언어별 템플릿 문서의 기준 원문 언어입니다.
- `install_policy.scope`: 설치 범위입니다. 기본 템플릿은 `llm_only`입니다.
- `install_policy.copied_targets`: 그대로 복사할 수 있는 대상입니다.
- `install_policy.generated_targets`: 설치 뒤 생성할 수 있는 대상입니다.
- `install_policy.forbidden_targets`: 기본 템플릿에 넣지 않는 대상입니다.
- `creates`: 템플릿이 만들 수 있는 파일 목록입니다.
- `after_install`: 설치 뒤 사용자가 확인할 작업입니다.
- `i18n.metadata`: 번역 상태를 추적하는 메타데이터 파일입니다.
- `i18n.source_locale`: `i18n.toml`과 같아야 하는 기준 언어입니다.
- `conflict_policy`: 기존 파일과 충돌할 때의 기본 처리 방식입니다. 기본값은 쓰기 전 중단입니다.
- `conflict_policy.files`: 파일별 충돌 처리 방식입니다.
- `conflict_policy.generated`: 생성 파일의 충돌 처리 방식입니다.

## 설치 범위

```toml
[install_policy]
scope = "llm_only"
copied_targets = [
  "AGENTS.md",
  ".mustflow/**",
]
generated_targets = [
  "REPO_MAP.md",
  ".mustflow/config/manifest.lock.toml",
  ".mustflow/state/**",
]
```

- `scope`: 이 템플릿이 LLM 에이전트용 작업 흐름만 설치한다는 뜻입니다.
- `copied_targets`: 템플릿에서 그대로 복사할 수 있는 경로입니다.
- `generated_targets`: 저장소 구조를 읽은 뒤 생성할 수 있는 경로입니다.
- `forbidden_targets`: 기본 템플릿에 넣으면 안 되는 경로입니다.

기본 템플릿은 `README.md`, `PROJECT.md`, `ROADMAP.md`, `DESIGN.md`, `GOVERNANCE.md`, `TESTING.md`, `API.md`, `project.contract.json`, `openapi.yaml` 같은 프로젝트 소유 루트 문서나 계약 파일을 만들지 않습니다. `.github/`, 일반 `docs/`, 일반 `skills/`, 소스 코드, 패키지 관리자 설정도 만들지 않습니다.
`.mustflow/context/**`는 일반 프로젝트 문서가 아니라 LLM 에이전트 작업 맥락이므로 기본 템플릿에 포함될 수 있습니다.
`REPO_MAP.md`, `.mustflow/config/manifest.lock.toml`, `.mustflow/state/**`는 복사물이 아니라 생성물입니다.
`.mustflow/state/**`에는 `mf run` 실행 기록처럼 사용 중 만들어지는 로컬 상태가 들어갑니다.

## 프로필과 언어

프로필은 국가나 언어가 아니라 프로젝트 성격입니다.

```toml
[profiles]
default = "minimal"
available = ["minimal", "patterns", "oss", "team", "product", "library"]

[locales]
default = "en"
available = ["en", "ko", "zh", "es", "fr", "hi"]
source = "en"
```

`common_root`는 모든 언어가 공유하는 TOML 설정을 제공합니다. `locales_root`는 언어별
Markdown 문서와 스킬 파일을 제공합니다. `locales.available`은 실제로 설치할 수 있는
문서 언어만 포함합니다. `zh`, `es`, `fr`, `hi`는 번역 전까지 영어 문구를 사용합니다.
`locales.source`는 번역 추적에 사용하는 기준 원문 언어입니다.

## 작성 기준

`manifest.toml`은 사용자가 받는 문서가 아니라 mustflow 템플릿을 관리하기 위한 파일입니다.

새 파일을 템플릿에 추가하면 이 파일의 `creates`, `install_policy`, 충돌 정책도 함께 갱신해야 합니다.
또한 새 파일의 주 독자가 LLM 에이전트인지 먼저 확인해야 합니다.
생성 파일을 추가하면 `generated_targets`와 `conflict_policy.generated`를 함께 갱신합니다.

`AGENTS.md`는 `--merge`에서 mustflow 관리 블록만 삽입할 수 있지만, 설정 파일 충돌은 자동 병합하지 않습니다.
`manifest.lock.toml`은 설치 성공 뒤 다시 만들 수 있는 파일이므로 생성 파일 정책에서는 `regenerate`로 둡니다.
`.mustflow/state/**`는 사용 중 생기는 로컬 실행 기록이므로 템플릿 갱신이나 제거 작업에서 기본적으로 보존해야 합니다.
