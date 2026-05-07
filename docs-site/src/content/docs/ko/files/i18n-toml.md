---
title: i18n.toml
description: 기준 문서와 번역 문서의 판 번호를 추적하는 템플릿 메타데이터입니다.
---

`i18n.toml`은 mustflow 템플릿 문서의 기준 언어와 번역 상태를 관리합니다.

이 파일은 `mf init`으로 사용자 저장소에 복사되지 않습니다. mustflow 패키지 내부에서 템플릿 문서의 판 번호와 번역 상태를 추적하는 관리 파일입니다.

## 왜 필요한가

문서가 이슈나 풀 리퀘스트에서 자주 바뀌면, 파일 수정 시각만으로 어떤 언어가 최신인지 판단하기 어렵습니다.

mustflow는 기준 문서의 `revision`과 번역 문서의 `source_revision`을 비교해 최신 여부를 판단합니다.

## 기본 형태

```toml
version = 1
source_locale = "en"

[documents."agents.root"]
source = "locales/en/AGENTS.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/AGENTS.md", source_revision = 1, status = "current" }

[documents."docs.agent-workflow"]
source = "locales/en/.mustflow/docs/agent-workflow.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/docs/agent-workflow.md", source_revision = 1, status = "current" }

[documents."skill.code-review"]
source = "locales/en/.mustflow/skills/code-review/SKILL.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/skills/code-review/SKILL.md", source_revision = 1, status = "current" }
```

## 주요 필드

- `version`: 이 메타데이터 파일 형식의 판 번호입니다.
- `source_locale`: 현재 템플릿 문서의 기준 언어입니다.
- `status_values`: 번역 상태에 사용할 수 있는 값 목록입니다.
- `documents.<id>`: 추적할 문서의 고정 식별자입니다.
- `source`: 기준 문서의 템플릿 내부 경로입니다.
- `source_locale`: 해당 문서의 기준 언어입니다.
- `revision`: 기준 문서의 판 번호입니다.
- `translations`: 번역 문서의 경로, 기준 판 번호, 상태를 연결하는 영역입니다.

## 상태값

- `current`: 기준 문서의 현재 판을 반영했습니다.
- `stale`: 기준 문서가 바뀌었지만 번역이 아직 갱신되지 않았습니다.
- `needs_review`: 번역은 되었지만 검토가 필요합니다.
- `missing`: 번역 문서가 없습니다.

문서 최신 여부는 파일 수정 시각이 아니라 `revision`과 번역본의 `source_revision` 비교로 판단합니다.

## 검증

패키지 테스트는 공개 전에 이 메타데이터를 검증합니다.

- `source_locale`은 `manifest.toml`과 같아야 합니다.
- 기준 문서와 번역 문서 경로는 실제 템플릿 파일을 가리켜야 합니다.
- `current` 상태의 번역은 기준 문서의 `revision`과 같은 `source_revision`을 사용해야 합니다.
- Markdown 앞부분 메타데이터는 추적 문서 식별자와 언어가 맞아야 합니다.
- 기준 Markdown 파일은 `canonical: true`, 번역 Markdown 파일은 `canonical: false`여야 합니다.
