---
title: mf update 정책
description: mf update가 계획 계산과 안전한 적용을 어떻게 구분하는지 설명합니다.
---

`mf update`는 mustflow가 설치한 에이전트 문서 흐름을 새 템플릿 기준으로 갱신하는 명령입니다.

이 파일들은 저장소별 작업 규칙을 담기 때문에 자동 갱신은 조심스러워야 합니다.
그래서 `mf update --dry-run`으로 먼저 계획을 확인하고, `mf update --apply`는 차단 항목이 없을 때만 제한적으로 파일을 씁니다.

## 기준선

갱신 판단의 기준선은 `.mustflow/config/manifest.lock.toml`의 `content_hash`입니다.

`content_hash`는 마지막으로 `mf init` 또는 `mf update --apply`가 기록한 파일 내용 해시입니다. 현재 파일 해시가 이 값과 다르면 사용자가 파일을 수정한 것으로 봅니다.

이 정책은 `mf update --json`의 `policy` 객체에도 들어갑니다. 문서, 사람용 출력,
자동화 출력이 서로 다른 기준을 말하지 않게 하기 위해서입니다.

현재 정책 값은 다음과 같습니다.

```text
baseline: manifest_lock_content_hash
allowed_apply_actions: update, create
blocking_actions: blocked-local-change, manual-review
dry_run_writes_files: false
backup_path_pattern: .mustflow/backups/<timestamp>/
never_overwrite_local_changes: true
writes_only_template_manifest_paths: true
```

## 상태 구분

`mf update --dry-run`은 파일을 다음 상태로 나눕니다.

- `unchanged`: 현재 파일이 잠금 파일 기준선과 같고, 현재 템플릿과도 같습니다.
- `update`: 현재 파일은 잠금 파일 기준선과 같지만, 현재 템플릿과 다릅니다.
- `create`: 템플릿에는 있지만 사용자 저장소에 없습니다.
- `blocked-local-change`: 현재 파일이 잠금 파일 기준선과 다릅니다.
- `manual-review`: 자동 갱신보다 사람이 확인해야 하는 파일입니다.

## 실제 적용 규칙

실제 파일을 바꾸는 `mf update --apply`는 다음 규칙을 따릅니다.

- `blocked-local-change`는 자동으로 수정하지 않습니다.
- `manual-review`는 자동으로 수정하지 않습니다.
- `update`는 갱신 전 백업을 만든 뒤 템플릿 내용으로 교체합니다.
- `create`는 부모 폴더를 만들고 새 파일을 씁니다.
- 잠금 파일에 없는 기존 파일과 새 템플릿 파일이 충돌하면 로컬 변경으로 보고 덮어쓰지 않습니다.
- 갱신 후에는 `manifest.lock.toml`의 적용 파일 항목을 새 해시와 처리 결과로 갱신합니다.
- `mf update`는 템플릿 매니페스트에 선언된 mustflow 파일과 잠금 파일만 씁니다.
- 갱신 중 하나라도 실패하면 이미 쓴 파일과 백업 경로를 보고해야 합니다.

## AGENTS.md 처리

`AGENTS.md`는 루트 진입점이므로 일반 파일보다 신중하게 다룹니다.

기존 `AGENTS.md`에 mustflow 관리 블록만 병합한 경우에는 파일 전체를 템플릿으로 덮어쓰면 안 됩니다. 이 경우는 `manual-review`로 두거나, 관리 블록만 안전하게 교체하는 전용 병합 로직이 필요합니다.

## 백업 위치

`update` 상태의 기존 파일을 바꾸기 전에는 다음 위치에 백업을 둡니다.

```text
.mustflow/backups/<timestamp>/
```

백업은 사용자가 수정한 파일을 보호하기 위한 마지막 방어선입니다. 단, 백업이 있다고 해서 `blocked-local-change`를 자동 덮어써도 된다는 뜻은 아닙니다.

## 종료 코드

- 차단 항목 없이 계획을 계산하면 종료 코드 `0`입니다.
- `blocked-local-change`나 `manual-review`가 있으면 `--apply`도 종료 코드 `1`입니다.
- 잠금 파일이 없거나 깨져 있으면 종료 코드 `1`입니다.
- `mf update`만 실행하고 `--dry-run` 또는 `--apply`를 고르지 않으면 종료 코드 `1`입니다.
