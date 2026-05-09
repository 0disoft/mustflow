---
title: mf update
description: 설치된 mustflow 문서 흐름의 갱신 계획을 미리 계산하거나 안전한 갱신을 적용하는 명령입니다.
---

`mf update`는 설치된 mustflow 문서 흐름을 현재 패키지 템플릿과 비교합니다.

`mf update --dry-run`은 `manifest.lock.toml`을 기준으로 현재 파일이 설치 시점과 달라졌는지 확인하고, 템플릿 갱신 가능 여부를 계획으로만 출력합니다.
`mf update --apply`는 차단된 로컬 변경이나 수동 검토 항목이 없을 때만 `update`, `create` 항목을 실제 적용합니다.
자동화 도구나 에이전트가 계획을 읽어야 한다면 `--json`을 함께 사용하세요.

사람용 출력과 JSON 출력은 같은 정책을 따릅니다. 기준선은 잠금 파일의 `content_hash`이고,
적용 가능한 상태는 `update`, `create`뿐입니다.

## 에이전트 명령 의도

설치된 프로젝트는 에이전트가 원시 `mf update`를 직접 실행하게 하기보다 설정된 `mf run` 의도로 갱신 작업을 열 수 있습니다.

- `mustflow_update_dry_run`: `mf update --dry-run --json`을 실행하며 파일을 쓰지 않습니다.
- `mustflow_update_apply`: `mf update --apply --json`을 실행합니다. dry-run 계획에 차단 항목이나 수동 검토 항목이 없고, 작업이 실제 적용을 요구할 때만 사용합니다.

## 왜 dry-run이 먼저인가

mustflow 파일에는 에이전트 작업 규칙과 절차가 담겨 있습니다. 사용자가 직접 고친 파일을 자동으로 덮어쓰면 저장소 고유 규칙을 잃을 수 있습니다.

그래서 갱신 명령은 먼저 다음을 구분해야 합니다.

- 현재 파일이 설치 당시 해시와 같은지
- 현재 파일이 새 템플릿과 다른지
- 사용자가 수정한 로컬 변경이 있는지
- 자동 갱신보다 수동 검토가 필요한지

## 출력 항목

- `Blocked local changes`: 설치 당시 해시와 현재 파일 해시가 달라 자동 갱신을 막는 항목입니다.
- `Manual review`: 관리 블록처럼 아직 안전하게 자동 갱신하지 않는 항목입니다.
- `Would update`: 실제 갱신 명령이 생기면 바꿀 수 있는 항목입니다.
- `Would create`: 템플릿에는 있지만 현재 루트에 없는 항목입니다.

잠금 항목의 `last_action`이 `customized`인 파일은 현재 파일이 맞춤 기준선과 여전히 같으면 새 템플릿과 달라도 변경 없는 항목으로 봅니다.

## 예시

```sh
npx mf update --dry-run
```

파일이 최신이면 다음처럼 출력합니다.

```text
mustflow update plan
Policy:
- Baseline: manifest_lock_content_hash
- Apply actions: update, create
- Blocking actions: blocked-local-change, manual-review
- Backup path: .mustflow/backups/<timestamp>/
Blocked local changes: 0
Manual review: 0
Would update: 0
Would create: 0
No template updates needed.
No files were written.
```

로컬 변경이 있으면 종료 코드 `1`로 끝납니다. 이 경우 사용자가 변경 내용을 확인한 뒤 수동으로 정리해야 합니다.

## 실제 적용

```sh
npx mf update --apply
```

`--apply`는 다음 조건을 모두 만족할 때만 파일을 씁니다.

- `Blocked local changes`가 `0`입니다.
- `Manual review`가 `0`입니다.
- 적용 대상은 `Would update` 또는 `Would create` 항목입니다.

기존 파일을 갱신하기 전에는 `.mustflow/backups/<timestamp>/` 아래에 백업을 만듭니다.
적용 뒤에는 `.mustflow/config/manifest.lock.toml`의 해당 파일 항목을 새 해시와 `last_action`으로 갱신합니다.
번들 템플릿 매니페스트가 `AGENTS.md`와 `.mustflow/**` 밖의 대상을 나열하면, 업데이트 계획 단계에서 실패하며 파일을 쓰지 않습니다.

새 템플릿 파일이 사용자 저장소에 이미 있지만 잠금 파일에 기록되어 있지 않고 내용도 다르면, mustflow는 이를 로컬 변경으로 판단해 덮어쓰지 않습니다.

## JSON 필드

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

자동화 도구가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 판 번호입니다.
- `command` (`string`): 항상 `update`입니다.
- `mode` (`string`): 실행 방식입니다. `dry-run`, `apply`, `unspecified` 중 하나입니다.
- `policy` (`object`): 갱신 안전 정책입니다.
- `ok` (`boolean`): 차단 항목 없이 계획이 계산되었는지 나타냅니다.
- `wroteFiles` (`boolean`): 실제 파일을 썼는지 나타냅니다. `--dry-run`에서는 항상 `false`입니다.
- `summary` (`object`): 갱신 계획을 상태별 개수로 요약한 값입니다.
- `items` (`object[]`): 파일별 계획 목록입니다.
- `error` (`string`): 계획 계산 또는 적용에 실패한 이유입니다. 실패한 출력에만 포함될 수 있습니다.

중첩 객체는 다음 필드를 가집니다.

- `policy.baseline` (`string`): 갱신 판단 기준입니다. 현재는 `manifest_lock_content_hash`입니다.
- `policy.allowed_apply_actions` (`string[]`): `--apply`가 실제로 쓸 수 있는 상태 목록입니다. 현재는 `update`, `create`입니다.
- `policy.blocking_actions` (`string[]`): 하나라도 있으면 `--apply`가 파일을 쓰지 않는 상태 목록입니다.
- `policy.dry_run_writes_files` (`boolean`): `--dry-run`이 파일을 쓰는지 나타냅니다. 항상 `false`입니다.
- `policy.backup_path_pattern` (`string`): 기존 파일을 갱신하기 전 백업하는 위치 형식입니다.
- `policy.never_overwrite_local_changes` (`boolean`): 로컬 변경 파일은 자동으로 덮어쓰지 않는다는 정책입니다.
- `policy.writes_only_template_manifest_paths` (`boolean`): 템플릿 매니페스트에 들어 있는 mustflow 파일만 쓴다는 선언입니다.
- `summary.blockedLocalChanges` (`number`): 로컬 변경 때문에 차단된 파일 수입니다.
- `summary.manualReview` (`number`): 수동 검토가 필요한 파일 수입니다.
- `summary.wouldUpdate` (`number`): 업데이트 시 바뀔 수 있는 파일 수입니다.
- `summary.wouldCreate` (`number`): 업데이트 시 새로 만들 수 있는 파일 수입니다.
- `summary.unchanged` (`number`): 현재 템플릿과 이미 같은 파일 수입니다.
- `items[].relativePath` (`string`): 갱신 계획 대상 경로입니다.
- `items[].sourceKind` (`string`): 항목이 템플릿 원본에서 온 방식입니다.
- `items[].action` (`string`): 계획된 처리 상태입니다.
- `items[].reason` (`string`): 해당 상태로 분류한 이유입니다.

템플릿이 바뀌었지만 사용자가 해당 파일을 수정하지 않았다면 `Would update` 또는 `summary.wouldUpdate`에 잡힙니다.

## 도움말과 종료 코드

```sh
npx mf update --help
```

도움말은 `Usage`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.

- 종료 코드 `0`: `--dry-run` 계획이 계산되었고 차단 항목이 없습니다.
- 종료 코드 `0`: `--apply`가 차단 항목 없이 필요한 파일을 적용했거나 적용할 항목이 없습니다.
- 종료 코드 `1`: 로컬 변경, 수동 검토 항목, 빠진 잠금 파일, 잘못된 선택지, 또는 명시적인 모드가 없는 상태입니다.

`mf update`만 단독으로 실행하면 파일을 바꾸지 않고 실패합니다. 먼저 `mf update --dry-run`으로 계획을 확인한 뒤, 안전하다고 판단될 때 `mf update --apply`를 사용합니다.
