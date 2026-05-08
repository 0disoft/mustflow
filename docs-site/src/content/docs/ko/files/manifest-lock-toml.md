---
title: .mustflow/config/manifest.lock.toml
description: mf init이 실제로 설치한 파일 상태를 기록하는 생성 파일입니다.
---

`.mustflow/config/manifest.lock.toml`은 `mf init`이 성공한 뒤 생성하거나 갱신하는 설치 상태 파일입니다.

이 파일은 템플릿에서 그대로 복사되지 않습니다. 실제 사용자 저장소에서 어떤 파일이 생성·병합·유지·덮어쓰기 되었는지 기록합니다.

## 언제 생성되는가

- `mf init`이 성공하면 생성하거나 갱신합니다.
- `--merge`로 기존 `AGENTS.md`에 관리 블록을 넣은 경우에도 생성합니다.
- `--force`로 충돌 파일을 백업하고 덮어쓴 경우에도 생성합니다.
- 충돌로 중단된 경우에는 생성하지 않습니다.
- `--dry-run`으로 설치 계획만 확인한 경우에는 생성하지 않습니다.

## 역할

- 설치에 사용한 템플릿 식별자와 판 번호를 남깁니다.
- 설치된 각 파일의 기준선 해시를 남깁니다.
- 파일별 처리 결과를 남깁니다.
- 이후 `mf check`, `mf status`, `mf update --dry-run` 같은 명령이 설치 상태를 비교할 수 있는 기준선을 제공합니다.

## 기본 형태

```toml
schema_version = "1"
generated_by = "mustflow"

[template]
id = "default"
version = "1.0.1"
profile = "minimal"
locale = "ko"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:..."
```

## 필드

- `schema_version`: 잠금 파일 형식의 판 번호입니다.
- `generated_by`: 이 파일을 만든 도구 이름입니다.
- `template.id`: 설치에 사용한 템플릿 식별자입니다.
- `template.version`: 설치에 사용한 템플릿 판 번호입니다.
- `template.profile`: 설치할 때 선택한 프로젝트 성격입니다.
- `template.locale`: 설치할 때 선택한 mustflow 문서 언어입니다.
- `template.agent_lang`: 선택했다면 에이전트 보고 언어입니다.
- `product_i18n`: 제품 사용자 문구 로케일을 선택했다면 기록하는 선택 섹션입니다.
- `files."<path>"`: 설치 대상 파일별 기록입니다.
- `source`: 파일 내용이 어디에서 왔는지 나타냅니다. `template_locale`, `template_common`, `managed_block`을 사용합니다.
- `last_action`: 마지막 설치 때 적용된 처리입니다. `created`, `unchanged`, `merged`, `overwritten`, `customized` 중 하나입니다.
- `content_hash`: mustflow가 마지막으로 안전하게 설치하거나 갱신했다고 기록한 파일 내용의 SHA-256 기준선 해시입니다.

`last_action = "customized"`는 기록된 해시가 저장소별 맞춤 기준선으로 승인되었다는 뜻입니다. `mf update`는 현재 파일 해시가 `content_hash`와 여전히 같으면 이 파일을 템플릿 내용으로 바꾸지 않습니다.

`mf dashboard`가 `.mustflow/config/preferences.toml`을 저장하면, `manifest.lock.toml`이 있을 때 해당 추적 파일을 `last_action = "customized"`로 갱신합니다. 이는 승인된 로컬 선호 설정 변경만 기준선으로 기록하며, 잠금 파일 전체를 현재 상태 스냅샷처럼 다루지는 않습니다.

## 해시 기준

현재 `content_hash`는 설치 당시 기준선입니다.
현재 파일의 실시간 해시가 아닙니다.

`mf check`, `mf status`, `mf update --dry-run`은 실행 시점에 현재 파일 해시를 다시 계산해 이 기준선과 비교합니다. 템플릿 해시도 잠금 파일에 저장하지 않고, 실행 시점의 설치 패키지 템플릿에서 계산합니다.

이 결정은 잠금 파일이 “현재 상태 스냅샷”이 아니라 “설치 기준선”으로 남게 하기 위한 것입니다.

나중에 파일 안의 관리 블록만 갱신하려면 먼저 잠금 파일 스키마에 블록 단위 기준선을 추가해야 합니다. v1의 파일 단위 `content_hash`만으로는 관리 블록 자체가 변경되지 않았는지 증명할 수 없습니다.

## 수정 규칙

이 파일은 사람이 직접 수정하는 기준 문서가 아닙니다.

설치 상태를 다시 기록해야 한다면 `mf init` 또는 이후 추가될 전용 갱신 명령으로 재생성해야 합니다. 수동으로 수정하면 실제 파일 내용과 해시가 어긋날 수 있습니다.

`mf update --dry-run`은 이 파일의 `content_hash`를 설치 당시 기준선으로 사용합니다. 현재 파일 해시가 기준선과 다르면 로컬 변경으로 보고 자동 갱신을 차단합니다.

자세한 결정 배경은 [manifest.lock.toml 구조 결정](../../design/manifest-lock-decision/)을 봅니다.
