---
title: mf init
description: 사용자 저장소에 mustflow 워크플로우를 설치하고 초기화하는 명령입니다.
---

`mf init`은 mustflow 템플릿을 사용자 저장소 루트에 설치합니다.

저장소 루트에는 `AGENTS.md`를 만들고, 자세한 가이드와 설정 파일은 `.mustflow/` 아래에 설치합니다.

## 설치 디렉터리 구조

```text
AGENTS.md
.gitignore
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
   ├─ codebase-orientation/SKILL.md
   ├─ diff-risk-review/SKILL.md
   ├─ docs-prose-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   ├─ project-context-authoring/SKILL.md
   ├─ readme-authoring/SKILL.md
   ├─ skill-authoring/SKILL.md
   ├─ security-regression-tests/SKILL.md
   ├─ test-design-guard/SKILL.md
   ├─ test-maintenance/SKILL.md
   ├─ vertical-slice-tdd/SKILL.md
   ├─ visual-review-artifact/SKILL.md
   └─ web-asset-optimization/SKILL.md
```

`REPO_MAP.md`는 고정 템플릿에서 복사하지 않고, 필요할 때 저장소 구조를 분석해 동적으로 생성합니다.
`manifest.lock.toml`은 설치 완료 후 실제 설치 상태를 기록하기 위해 자동으로 생성됩니다.
`DESIGN.md`는 mustflow가 생성하지 않습니다. 파일이 이미 있다면 `mf map`이 이를 시각 설계 관련 앵커로 활용합니다.

## 템플릿 소스 구조

저장소에 설치되는 최종 경로는 고정되지만, 패키지 내부 템플릿 원본은 용도별로 나뉘어 관리됩니다.

```text
templates/default/
├─ common/
│  ├─ gitignore.mustflow
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

`common/`에는 언어와 무관한 설정과 `.gitignore` 관리 블록 조각이 들어 있고, `locales/<locale>/`에는 선택한 언어의 문서와 스킬 파일이 들어 있습니다. 지원되는 각 언어 폴더는 설치 가능하며, 번역 상태에 맞춰 독립적으로 갱신할 수 있습니다.

## 작동 원칙 및 규칙

- 설치 대상은 LLM 에이전트 전용 워크플로우 문서로 한정됩니다.
- 패키지를 설치하는 행위 자체로는 사용자 파일을 바꾸지 않습니다.
- 파일 충돌 발생 시 데이터 보호를 위해 작업을 중단하는 것이 기본 동작입니다.
- 기존 `AGENTS.md`가 있으면 `--merge` 옵션으로 mustflow 관리 블록만 안전하게 넣을 수 있습니다.
- `.gitignore`가 없으면 새로 만들고, 이미 있으면 사용자 규칙은 보존한 채 mustflow 관리 블록만 추가하거나 갱신합니다.
- `.gitignore` 관리 블록은 mustflow가 생성하는 로컬 산출물인 `.mustflow/cache/`, `.mustflow/state/`, `.mustflow/backups/`만 무시합니다. `repos/`, `node_modules/`, `dist/`, `.env` 같은 프로젝트별 산출물은 사용자가 직접 관리합니다.
- `--force` 옵션은 기존 파일을 `.mustflow/backups/` 경로에 백업한 후 덮어씁니다.
- `REPO_MAP.md`는 고정 템플릿이 아니라 현재 저장소 구조를 분석해 생성합니다.
- `manifest.lock.toml`은 설치된 워크플로우 파일의 해시값, 템플릿 식별자 및 처리 결과를 기록합니다. `.gitignore` 지원 블록은 락 파일에서 추적하지 않습니다.
- `.mustflow/context/`는 에이전트용 프로젝트 맥락 정보용이며, 일반 문서 보관소가 아닙니다.
- `README.md`, `.github/` 폴더 및 기존 프로젝트의 `config/`, `docs/`, `skills/` 디렉터리는 수정하지 않습니다.
- 애플리케이션 소스 코드나 패키지 관리자, CI/CD 설정 등은 생성하지 않습니다.
- 템플릿 매니페스트가 `AGENTS.md`와 `.mustflow/**` 밖의 설치 대상을 나열하면 거부합니다.
- `--dry-run` 옵션은 파일을 쓰지 않고 설치 계획만 미리 보여줍니다.
- 충돌로 중단됐거나 `--dry-run`으로 실행한 경우 `manifest.lock.toml`은 생성하지 않습니다.

## 예시

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --interactive
npx mf init --set git.auto_commit=true
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

대화형 터미널에서 `mf init`을 실행하면 문서 언어, 프로젝트 성격, 에이전트 보고
언어를 선택할 수 있습니다. `--interactive`는 이 선택 흐름을 강제로 켜고,
고급 설정을 켜면 자동 스테이징, 자동 커밋, 커밋 메시지 언어, 커밋 메시지 제안
여부도 선택할 수 있습니다. `--yes`는 질문 없이 영어 기본값으로 설치합니다.

`--set`은 설치 중 일부 허용된 설정만 바꿀 수 있습니다.

- `git.auto_stage`
- `git.auto_commit`
- `git.auto_push=false`
- `git.commit_message.style`
- `git.commit_message.language`
- `git.commit_message.max_suggestions`
- `git.commit_message.include_body`
- `git.commit_message.split_when_multiple_concerns`
- `reporting.commit_suggestion.enabled`
- `release.versioning.impact_check`
- `release.versioning.suggest_bump`
- `release.versioning.auto_bump`
- `release.versioning.require_user_confirmation`
- `release.versioning.sync_template_version`
- `release.versioning.sync_docs_examples`
- `release.versioning.sync_tests`
- `verification.selection.strategy`
- `verification.selection.prefer_related_tests`
- `verification.selection.skip_docs_only_full_test`
- `verification.selection.skip_low_risk_code_full_test`
- `verification.selection.skip_translation_only_full_test`
- `verification.selection.skip_copy_only_full_test`
- `verification.selection.report_skipped`
- `testing.authoring.new_test_policy`
- `testing.authoring.prefer_existing_tests`
- `testing.authoring.require_new_test_rationale`
- `language.memory.summary`

`git.commit_message.style`에는 `conventional`, `descriptive`, `gitmoji`를 지정할 수 있습니다. `gitmoji`는 `✨ feat: add dashboard setting`처럼 Gitmoji 이모지를 붙인 메시지를 제안하지만, 여전히 커밋 실행 권한이 아니라 메시지 제안 형식입니다.

`git.commit_message.language`에는 `preserve_existing`, `agent_response`, `docs`를 쓰거나 `ja`, `de`, `pt-BR` 같은 로케일 태그를 직접 지정할 수 있습니다.

`verification.selection.strategy`에는 `risk_based`, `targeted`, `full`을 지정할 수 있습니다.

`testing.authoring.new_test_policy`에는 `evidence_required`, `manual_approval`, `broad`를 지정할 수 있습니다.

`mf init`은 `git.auto_push=false`만 허용해 저장소를 안전한 기본값으로 되돌릴 수 있게 합니다. `git.auto_push=true`는 켤 수 없으며, 정말 필요한 저장소라면 설치 후 파일을 직접 수정해야 합니다.

`--yes`는 안전한 기본값 사용을 명시적으로 승인하는 옵션입니다. 단, 충돌 파일을 자동으로 덮어쓰지는 않습니다.

## 설정 경계

`mf init`은 저장소를 빌드 가능한 애플리케이션으로 초기화하지 않습니다. LLM 코딩 에이전트가 저장소 지침을 읽고, 명령을 추측하지 않으며, 작업을 검증하는 데 필요한 워크플로우 규칙만 설치합니다.

| 시점 | 설정 대상 |
| --- | --- |
| 대화형 질문 | 문서 언어, 프로젝트 성격, 에이전트 최종 보고 언어, 선택적 고급 Git/보고 선호도 |
| 설치 중 CLI 옵션 | 제품 원문 언어, 제품 대상 언어, 허용된 `--set` 선호도 |
| 설치 후 파일 수정 | 테스트, 린트, 빌드, 장기 실행 명령 계약, 승인 및 격리 정책, 프로젝트 맥락, 커스텀 스킬, CI, README, 애플리케이션 설정 |

## 프로필 및 로케일 설정

`profile` 옵션은 국가나 언어가 아니라 프로젝트 성격을 정합니다.

지원하는 기본 프로필 목록은 다음과 같습니다.

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale`은 저장소에 설치할 mustflow 문서 언어를 정합니다. 현재 기본 템플릿은 `en`, `ko`, `zh`, `es`, `fr`, `hi`를 지원하며 기본값은 `en`입니다.

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
