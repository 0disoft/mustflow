---
title: mf docs
description: LLM이 수정한 문서의 문장 검수 대기열을 추적합니다.
---

`mf docs review`는 에이전트가 생성하거나 수정한 문서를 저장소 안쪽 검수 대기열로 관리합니다.

대기열은 `.mustflow/review/docs.toml`에 저장됩니다. 이 파일은 `mf init`이 만들지 않으며, 문서를 검수 대상으로 추가할 때만 생성됩니다.

## 검수 모델

대기열은 특정 검수 제품 목록이 아니라 문서 상태를 추적합니다.

- `pending`: 검수가 필요합니다.
- `in_review`: 검수가 시작되었습니다.
- `changes_made`: 검수자가 문서를 수정했습니다.
- `approved`: 검수가 끝났고 기본 목록에서 숨깁니다.
- `needs_human`: 검수자가 안전하게 승인하지 못했습니다.
- `ignored`: 이 문서는 검수하지 않기로 명시했습니다.

검수자 종류는 `human`, `llm`, `tool`, `external`처럼 넓게만 구분합니다. 구체적인 이름, 제공자, 모델, 명령 의도는 자유 형식 메타데이터로 기록합니다.
각 항목에는 검수 코멘트도 붙일 수 있습니다. 검수 코멘트는 대상 문서 본문에 삽입하지 않고 대기열 기록에 저장되며, 여러 줄을 담을 수 있습니다. 파일에서 코멘트를 가져온 경우에는 대기열 갱신이 성공한 뒤 그 원본 파일을 삭제합니다.

## 문서 목록 보기

```sh
npx mf docs review list
npx mf docs review list --json
npx mf docs review list --all
```

기본 목록은 활성 항목만 보여줍니다. 승인 또는 무시된 항목까지 보려면 `--all`을 사용합니다.

## 문서 추가

```sh
npx mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex
npx mf docs review add docs/guide.md --comment "도입부의 직역투를 자연스럽게 다듬기"
```

문서를 추가하면 검수 항목을 만들거나 갱신하고 상태를 `pending`으로 둡니다.

## 검수 코멘트 추가

```sh
npx mf docs review comment docs/guide.md --comment "설치 절차의 용어를 확인하기"
npx mf docs review comment docs/guide.md --comment-file review-note.md --actor-kind human --actor-id cherr
```

짧은 지시는 `--comment`, 여러 줄 메모는 `--comment-file`을 사용합니다. `--comment-file`은 파일 내용을 `.mustflow/review/docs.toml`에 가져온 다음, 갱신에 성공하면 원본 파일을 삭제하므로 임시 검수 메모가 계속 쌓이지 않습니다. 코멘트 파일은 검수 대상 문서 자체를 가리킬 수 없습니다.

검수 코멘트는 기존 대기열 항목을 `pending`으로 표시하고, 다음 사람, LLM, 도구, 외부 검수자가 먼저 확인할 지시사항을 남깁니다. 코멘트가 없으면 검수자가 문서를 직접 판단합니다.

## 문서 승인

```sh
npx mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --reviewer-provider deepseek --reviewer-model deepseek-reasoner --summary "문장을 자연스럽게 다듬었습니다."
```

승인된 문서는 기본 목록에서 사라지지만 검수 기록은 남습니다. 검수자가 안전하게 승인할 수 없으면 `needs-human`, 저장소가 검수 대상에서 제외하기로 한 파일이면 `ignore`를 사용합니다.

## 도움말 및 종료 코드

```sh
npx mf docs --help
```

- 종료 코드 `0`: 대기열을 확인했거나 갱신했습니다.
- 종료 코드 `1`: 입력이 올바르지 않거나 대기열을 갱신하지 못했습니다.
