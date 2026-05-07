---
title: preferences.toml
description: 저장소별 에이전트 언어, 스타일, Git 보고, 문서화 기본 선호값을 선언하는 파일입니다.
---

`.mustflow/config/preferences.toml`은 에이전트가 작업할 때 참고할 저장소별 기본 선호값을 선언합니다.

이 파일은 규칙의 최상위 권위가 아닙니다. 사용자 직접 지시, 상위 지침, 하위 `AGENTS.md`, 기존 파일 스타일, 명령 계약이 먼저입니다.

## 어디에 쓰이나

- 응답 언어, 문서 언어, 코드 주석, 로그, 사용자 노출 문자열의 기본값을 알려줍니다.
- 압축 요약, 인계 요약처럼 원문에서 파생되는 기억 자료의 언어 기본값을 알려줍니다.
- 프로젝트 성격인 `profile`과 mustflow 문서 언어, 에이전트 보고 언어를 분리합니다.
- 제품 사용자 문구의 다국어 정책이 필요하면 `[product_i18n]`에 따로 기록합니다.
- 기존 관습이 보이지 않는 신규 저장소에서 사용할 fallback 값을 선언합니다.
- 자동 스테이징, 자동 커밋, 자동 푸시를 기본 금지로 둡니다.
- 커밋 메시지 추천을 실제 커밋 실행 권한과 분리합니다.
- `mf check`가 선호값 파일의 기본 형식을 검사할 수 있게 합니다.
- `mf help preferences`가 현재 저장소의 선호값을 요약할 때 기준 자료로 사용합니다.

## 기본 형태

```toml
schema_version = "1"

[project]
convention_mode = "bootstrap"
profile = "minimal"

[language]
agent_response = "ko"
docs = "ko"

[language.code_comments]
mode = "preserve_existing"
fallback = "en"

[language.logs]
mode = "preserve_existing"
fallback = "en"

[language.memory]
summary = "agent_response"
fallback = "en"
preserve_code = true
preserve_paths = true
preserve_error_output = true

[git]
auto_stage = false
auto_commit = false
auto_push = false

[git.commit_message]
suggest = "when_changes_made"
style = "conventional"
language = "preserve_existing"
language_when_missing = "en"
max_suggestions = 2

[reporting.commit_suggestion]
enabled = true
when = "files_changed"
source = "git.commit_message"
```

## profile과 locale

`project.profile`은 국가나 언어가 아니라 프로젝트 성격입니다. 기본값은 `minimal`이고, 기본 프로필은 `minimal`, `oss`, `team`, `product`, `library`입니다.

`language.agent_response`는 에이전트 최종 보고 언어입니다.

`language.docs`는 mustflow 문서 언어입니다.

제품 사용자 문구의 기준 언어나 대상 로케일은 이 둘과 별개로 `[product_i18n]`에 둡니다.

```toml
[product_i18n]
enabled = true
source_locale = "en"
target_locales = ["en-US", "ko-KR"]
fallback_locale = "en"
locale_tag_format = "bcp47"
user_facing_text_policy = "externalize"
hardcoded_user_facing_strings = "avoid"
translation_policy = "update_source_mark_targets_stale"
do_not_translate = ["identifiers", "log_keys", "error_codes", "metric_names", "api_field_names"]
```

에이전트는 사용자 대화 언어를 근거로 제품 사용자 문구를 임의 번역하면 안 됩니다. 기준 원문을 수정했다면 대상 번역은 정책에 따라 갱신하거나 검토 필요로 보고합니다.

## 압축 요약 언어

`language.memory.summary`는 압축 요약, 인계 요약, 장기 기억 후보처럼 원문에서 파생되는 자료를 어느 언어로 쓸지 정합니다.

기본값은 `agent_response`입니다. 즉, 에이전트 최종 보고 언어를 따릅니다. 필요하면 `docs`, `preserve_existing`, `ko`, `en-US`, `zh-Hans` 같은 명시적 언어 태그를 사용할 수 있습니다.

`fallback`은 `summary`가 기존 관습이나 다른 설정을 참조하지만 실제 언어를 결정하지 못했을 때 쓰는 예비 언어입니다.

`preserve_code`, `preserve_paths`, `preserve_error_output`은 요약 언어와 별개로 코드, 경로, 오류 출력을 원문 형태로 유지하라는 표시입니다. 요약 본문은 한국어여도 함수 이름, 파일 경로, 오류 코드는 임의 번역하지 않는 편이 더 안전합니다.

사용자의 직접 지시와 현재 작업 범위의 `AGENTS.md`가 이 설정보다 우선합니다.

## mode와 fallback

`preserve_existing`은 에이전트가 저장소의 기존 파일을 먼저 관찰하고 그 관습을 유지해야 한다는 뜻입니다.

신규 저장소처럼 기존 관습이 없으면 각 항목의 `fallback` 값을 사용합니다. 사용자와 한국어로 대화한다고 해서 코드 주석, 로그, 오류 메시지, 커밋 메시지를 자동으로 한국어로 쓰면 안 됩니다.

기본 템플릿은 코드 주석, 로그, 커밋 메시지 fallback을 영어로 둡니다. 이는 공개 협업, 검색, 운영 도구, 외부 기여자와의 호환성을 우선하기 위한 값입니다.

## Git과 커밋 메시지

`git.auto_stage`, `git.auto_commit`, `git.auto_push`는 기본적으로 모두 `false`입니다.

커밋 메시지 추천은 Git 실행 권한이 아니라 최종 보고의 일부입니다. 파일이 바뀌었고 `reporting.commit_suggestion.enabled = true`라면 에이전트는 권장 커밋 메시지를 제안할 수 있습니다. 실제 커밋을 만들었다고 표현하거나 사용자 요청 없이 커밋하면 안 됩니다.

여러 논리 변경이 섞였으면 하나의 커밋 메시지로 뭉개지 않고 `max_suggestions` 안에서 분할 제안을 할 수 있습니다.

## 검사 기준

`mf check`는 이 파일이 있을 때 다음을 검사합니다.

- 주요 선호값은 문자열이어야 합니다.
- `mode`, `fallback`, `rule`은 문자열이어야 합니다.
- `[language.memory]`의 `summary`, `fallback`은 문자열이어야 하고, `preserve_code`, `preserve_paths`, `preserve_error_output`은 참/거짓 값이어야 합니다.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, `include_sensitive_data`는 참/거짓 값이어야 합니다.
- `git.commit_message.max_suggestions`는 양의 정수여야 합니다.
- `reporting.commit_suggestion.enabled`는 참/거짓 값이어야 합니다.
- `docs.update_when`은 문자열 배열이어야 합니다.
- `project.profile`은 기본 프로필 목록 중 하나여야 합니다.
- `[product_i18n]`이 있으면 로케일, 번역 정책, 번역 제외 목록의 기본 형식을 검사합니다.
