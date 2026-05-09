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
- 버전 영향 확인을 기록하되, 실제 배포나 버전 판올림 권한으로 취급하지 않습니다.
- 낮은 위험 변경에서 전체 검증 묶음을 피할지 정합니다.
- 필요한 검증을 약화하지 않으면서 새 테스트를 얼마나 적극적으로 작성할지 안내합니다.
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

[release.versioning]
impact_check = true
suggest_bump = true
auto_bump = false
require_user_confirmation = true
sync_template_version = true
sync_docs_examples = true
sync_tests = true

[verification.selection]
strategy = "risk_based"
prefer_related_tests = true
skip_docs_only_full_test = true
skip_low_risk_code_full_test = true
skip_translation_only_full_test = true
skip_copy_only_full_test = true
report_skipped = true

[testing.authoring]
new_test_policy = "evidence_required"
prefer_existing_tests = true
require_new_test_rationale = true
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

이 값들은 저장소 선호값이지 권한이 아닙니다. 사용자 직접 지시, `commands.toml`의 명령 계약, `mustflow.toml`의 승인 정책보다 우선하지 않습니다. `git.auto_commit = true`는 푸시 권한을 뜻하지 않으며, `mf init --set`은 `git.auto_push=false`만 설정할 수 있고 `git.auto_push=true`는 켤 수 없습니다.

커밋 메시지 추천은 Git 실행 권한이 아니라 최종 보고의 일부입니다. 파일이 바뀌었고 `reporting.commit_suggestion.enabled = true`라면 에이전트는 권장 커밋 메시지를 제안할 수 있습니다. 실제 커밋을 만들었다고 표현하거나 사용자 요청 없이 커밋하면 안 됩니다.

`git.commit_message.style`에는 `conventional`, `descriptive`, `gitmoji`를 지정할 수 있습니다. `gitmoji`는 `✨ feat: add dashboard setting`처럼 이모지를 앞에 붙이되 conventional 형식으로도 읽히는 메시지를 제안합니다.

`git.commit_message.language`에는 `preserve_existing`, `agent_response`, `docs`를 쓰거나 `ja`, `de`, `pt-BR` 같은 로케일 태그를 직접 지정할 수 있습니다.

여러 논리 변경이 섞였으면 하나의 커밋 메시지로 뭉개지 않고 `max_suggestions` 안에서 분할 제안을 할 수 있습니다.

## 릴리스 버전 관리

`[release.versioning]`은 코드, 템플릿, 스키마, 명령 동작, 패키지 메타데이터, 문서 예시, 설치 출력이 바뀌었을 때 에이전트가 버전 영향을 확인하고 보고할지 정합니다.

이 값들은 버전 영향 보고와 버전 파일 수정을 안내하는 선호값입니다. `impact_check = true`는 현재 변경이 패키지나 템플릿 버전 변경을 요구하는지 보고하라는 뜻입니다. `suggest_bump = true`는 근거가 분명할 때 패치, 마이너, 메이저 중 어느 판올림이 맞는지 제안할 수 있게 합니다.

`auto_bump = true`이면 에이전트가 버전 기준 원본을 찾은 뒤 알맞은 패키지나 템플릿 버전 판올림을 적용할 수 있습니다. 단, 사용자 직접 지시, 호스트 안전 규칙, 승인 정책이 막으면 적용하지 않습니다. `auto_bump = false`이면 사용자가 버전 판올림이나 릴리스 준비를 요청하지 않는 한 패키지와 템플릿 버전 파일을 건드리지 않습니다. `require_user_confirmation = true`는 버전을 수정하기 전에 물어보라는 뜻이고, `false`는 자동 판올림이 켜져 있을 때 별도 확인 단계를 없앤다는 뜻입니다.

버전을 바꿀 때는 `sync_template_version`, `sync_docs_examples`, `sync_tests`에 따라 패키지 메타데이터, 템플릿 매니페스트, 문서 예시, 테스트를 같은 변경 안에서 맞춥니다.

이 선호값은 저장소가 버전을 어디에 저장하는지까지 정하지 않습니다. 에이전트는 버전을 제안하거나 수정하기 전에 언어와 프레임워크에 맞는 실제 버전 기준 원본을 찾아야 합니다.

`mf check --strict`는 버전 영향 선호값이 켜져 있을 때 버전 기준 원본을 찾을 수 있는지도 확인합니다. 현재는 `.mustflow/config/versioning.toml`에 선언한 기준 원본, 설치된 mustflow 템플릿 버전 잠금 파일, 루트의 `package.json`, `pyproject.toml`, `Cargo.toml`, `pom.xml`, `composer.json`, `pubspec.yaml`, `Chart.yaml`, Gradle 파일, .NET 프로젝트 파일, gemspec 등에서 실제 버전 값을 찾습니다. Go 모듈은 `v1.2.3` 같은 시맨틱 버전 릴리스 태그가 함께 있을 때만 `go.mod`를 기준 원본으로 인정합니다. 아무 기준도 없으면 에이전트가 임의로 `package.json`을 가정하지 않도록 엄격 검사 문제가 됩니다.

## 검증 선택

`[verification.selection]`은 에이전트가 설정된 검사 중 무엇을 고를지 안내합니다. 이 값은 명령 실행 권한이 아니며, 실제 명령 실행은 여전히 `.mustflow/config/commands.toml`을 따릅니다.

`strategy = "risk_based"`는 변경 위험에 맞춰 검증 범위를 고르라는 뜻입니다. `prefer_related_tests = true`이면 저장소가 관련 테스트 명령 의도를 제공할 때 직접 관련된 테스트를 우선합니다.

`skip_docs_only_full_test`, `skip_translation_only_full_test`, `skip_copy_only_full_test`는 코드가 아닌 변경에 대한 설정입니다. `skip_low_risk_code_full_test`는 공개 동작, 설정, 스키마, 보안, 마이그레이션 같은 높은 위험 표면에 영향이 없는 코드 변경일 때만 적용합니다. 이 값들은 전체 검증 묶음만 생략한다는 뜻이지 모든 검증을 생략한다는 뜻이 아닙니다.

`report_skipped = true`이면 최종 보고에서 어떤 넓은 검증을 왜 생략했는지 알려야 합니다.

## 테스트 작성

`[testing.authoring]`은 에이전트가 새 테스트를 만들지, 기존 테스트를 먼저 다룰지 안내합니다. `[verification.selection]`과는 별개입니다. 검증 선택은 설정된 검사 중 무엇을 검토할지 정하고, 테스트 작성 선호값은 새 테스트 파일이나 사례를 얼마나 쉽게 추가할지 정합니다.

기본값은 `new_test_policy = "evidence_required"`입니다. 공개 동작 변경, 회귀 위험, 설정이나 스키마 영향, 보안 또는 데이터 경로 위험처럼 동작 계약을 검증해야 한다는 근거가 있을 때 새 테스트를 추가하라는 뜻입니다.

`new_test_policy = "manual_approval"`은 사용자가 직접 테스트를 요청하지 않았다면 새 테스트 추가 전에 확인하라는 뜻입니다. `new_test_policy = "broad"`는 중요한 동작을 더 분명히 검증할 수 있을 때 새 테스트 작성을 더 적극적으로 허용합니다.

`prefer_existing_tests = true`이면 새 파일이나 사례를 만들기 전에 가까운 기존 테스트를 먼저 수정합니다. `require_new_test_rationale = true`이면 테스트를 추가했을 때 각 테스트가 왜 필요한지 최종 보고에 설명합니다.

이 선호값은 필요한 검증을 생략하거나, 유효한 테스트를 삭제하거나, 단언을 느슨하게 만들 근거가 아닙니다.

## 검사 기준

`mf check`는 이 파일이 있을 때 다음을 검사합니다.

- 주요 선호값은 문자열이어야 합니다.
- `mode`, `fallback`, `rule`은 문자열이어야 합니다.
- `[language.memory]`의 `summary`, `fallback`은 문자열이어야 하고, `preserve_code`, `preserve_paths`, `preserve_error_output`은 참/거짓 값이어야 합니다.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, `include_sensitive_data`는 참/거짓 값이어야 합니다.
- `git.commit_message.style`은 `conventional`, `descriptive`, `gitmoji` 중 하나여야 합니다.
- `git.commit_message.max_suggestions`는 양의 정수여야 합니다.
- `reporting.commit_suggestion.enabled`는 참/거짓 값이어야 합니다.
- `[release.versioning]` 필드는 참/거짓 값이어야 합니다.
- 버전 영향 선호값이 켜져 있으면, `mf check --strict`는 선언된 버전 기준 파일이나 감지 가능한 패키지/템플릿 버전 원본이 있는지 확인합니다.
- `[verification.selection]`은 허용된 전략 값과 참/거짓 생략·보고 값을 사용해야 합니다.
- `[testing.authoring]`은 허용된 새 테스트 정책과 참/거짓 작성 선호값을 사용해야 합니다.
- `docs.update_when`은 문자열 배열이어야 합니다.
- `project.profile`은 기본 프로필 목록 중 하나여야 합니다.
- `[product_i18n]`이 있으면 로케일, 번역 정책, 번역 제외 목록의 기본 형식을 검사합니다.
