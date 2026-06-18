---
title: mf check
description: 사용자 저장소에 설치된 mustflow 워크플로 구성을 점검하는 명령입니다.
---

`mf check`는 현재 저장소의 mustflow 파일을 에이전트가 문제없이 읽고 사용할 수 있는지 확인합니다.
워크플로 구성을 바꾼 뒤에는 `--strict` 옵션으로 안전 점검을 더 강하게 수행할 수 있습니다.
자동화 도구나 에이전트가 결과를 읽어야 한다면 `--json` 옵션을 사용하세요.

## 검증 기준

- 저장소 루트에 `AGENTS.md`가 있는지 확인합니다.
- `.mustflow/config/mustflow.toml`, `commands.toml` 파일이 유효하고 읽을 수 있는 형식인지 확인합니다.
- `.mustflow/config/preferences.toml`이 있으면, 해당 파일도 정상적으로 읽을 수 있는지 확인합니다.
- `mustflow.toml`의 `[map]`, `[workspace]`, `[context]` 항목에서 자료형과 상대 경로 안전성을 검사합니다.
- `preferences.toml`이 있으면 언어, 서식, 코드 스타일 등 설정값의 자료형을 검사합니다.
- `manifest.lock.toml`이 있으면 기록된 해시와 실제 파일 내용을 비교해 일치 여부를 확인합니다.
- `.mustflow/skills/router.toml`이 있는지 확인합니다.
- `.mustflow/skills/routes.toml`이 있는지 확인합니다.
- `.mustflow/skills/INDEX.md`가 있는지 확인합니다.
- 모든 스킬 문서(`.mustflow/skills/*/SKILL.md`)에 필수 섹션 식별자가 있는지 검사합니다.
- 프로젝트 맥락 문서(`.mustflow/context/*.md`)가 mustflow 규격에 맞는지 확인합니다.
- `status = "configured"`인 명령 의도에 필수 실행 정보(생명주기, 정책, 제한시간 등)가 있는지 확인합니다.
- 장기 실행 명령(long-running)이 `run_policy = "agent_allowed"`로 열려 있지 않은지 확인합니다.

## 엄격 검사

```sh
npx mf check --strict
```

`--strict`는 기본 검사에 더해, 에이전트 입력 안정성과 실행 안전성에 직접 영향을 주는 항목을 추가로 점검합니다.

- 스킬 문서에 `sh`, `bash`, `powershell` 같은 원시 셸 코드 블록이 있는지 확인합니다.
- mustflow가 관리하는 Markdown 파일이 경로에 맞는 `mustflow_doc`, `locale`, `canonical`, `revision`, `authority`, `lifecycle` 앞부분 메타데이터를 유지하는지 확인합니다. 관련 문제 메시지에는 논리 문서 식별자와 상대 경로가 함께 표시됩니다.
- 컨텍스트 문서가 직접 사용자 지시, 현재 코드, 테스트, 명령 계약보다 우선한다고 주장하지 않는지 확인합니다.
- 소스 앵커가 구조화된 코드 탐색 힌트로만 남아 있는지 확인합니다. 엄격 검사는 잘못된 앵커 선언, 중복 앵커 ID, 앵커 안의 에이전트 명령 또는 정책 지시, 비밀값처럼 보이는 앵커 내용, 생성물 또는 외부 코드 경로의 앵커, 허용되지 않은 위험 태그를 실패로 처리합니다.
- 소스 앵커의 `purpose`가 너무 길거나, `search` 항목이 너무 많거나, 한 파일에 앵커가 지나치게 몰린 경우는 경고로 표시하며 검사를 실패시키지 않습니다.
- 권한 부여, 개인정보, 결제, 마이그레이션, 데이터 손실, 비밀값, 보안처럼 고위험 태그가 붙은 소스 앵커는 더 낮은 기준으로 경고하며, `invariant`가 없으면 검수 필요 경고를 표시합니다.
- `.mustflow/skills/INDEX.md`와 `.mustflow/context/INDEX.md`가 절차 문서로 변하지 않고 라우팅 색인 역할만 유지하는지 확인합니다.
- `.mustflow/skills/INDEX.md`의 경로가 실제 `SKILL.md`를 가리키는지, 설치된 모든 스킬이 색인에 들어 있는지 확인합니다.
- 선택적 `.mustflow/skills/route-fixtures.json` 케이스의 예상 main route, 필수 후보, 필수 adjunct, 금지 후보가 `mf skill route` 결과와 맞는지 확인합니다.
- `SKILL.md` 앞부분 메타데이터의 `metadata.mustflow_schema`는 `"1"`, `metadata.mustflow_kind`는 `procedure`, `name`은 `.mustflow/skills/<name>/` 폴더 이름과 일치해야 합니다.
- 스킬 앞부분 메타데이터의 `metadata.command_intents`는 `.mustflow/config/commands.toml`에 선언된 명령 의도만 참조해야 합니다.
- `.mustflow/skills/INDEX.md`에 적은 명령 의도는 해당 스킬 앞부분 메타데이터에도 선언되어 있어야 합니다.
- 스킬 본문이 명령 실행 권한을 직접 부여한다고 주장하지 않는지 확인합니다. 실행 권한은 `.mustflow/config/commands.toml`에만 둡니다.
- `.mustflow/skills/<name>/` 아래에 `SKILL.md` 없이 보조 파일만 있는 폴더가 있는지 점검합니다.
- `resources.toml`에 등록한 자원이 실제 경로(`references/`, `assets/`, `scripts/`)에 있는지 확인합니다.
- `.mustflow/skills/<name>/scripts/` 아래에 등록되지 않은 파일이 있는지 확인합니다.
- 스크립트 자원이 `run_policy = "requires_command_contract"`를 지키고, 연결된 의도가 `commands.toml`에 정의되어 있는지 확인합니다.
- 스크립트 자원이 네트워크 접근, 파괴적 작업, 폴더 밖 쓰기 권한을 기본으로 열어두지 않았는지 검사합니다.
- `REPO_MAP.md`에 생성 시각, 파일 수처럼 입력 안정성을 해칠 수 있는 가변 메타데이터가 들어갔는지 확인합니다.
- `REPO_MAP.md`에 원격 저장소 주소, 브랜치 정보 같은 민감 정보가 노출되지 않았는지 확인합니다.
- `commands.toml`에 `max_output_bytes`, `on_timeout` 설정이 있는지 확인합니다.
- `mustflow.toml`에 `[retention]` 보존 정책이 정의되어 있는지 확인합니다.
- 프롬프트 캐시 stable prefix 항목이 실제 파일인지, volatile source set에 섞이지 않는지, 확장 skill index, route metadata, leaf skill 파일을 포함하지 않는지, 결정적 reference bundle 렌더링 후 `prompt_cache.max_stable_prefix_kb` hard budget 안에 들어가는지 확인합니다.
- 버전 영향 선호값이 켜져 있을 때, 선언된 버전 기준 파일이나 감지 가능한 패키지/템플릿 버전 원본이 있는지 확인합니다.
- 생성 파일(`REPO_MAP.md`, `latest.json` 등)이 보존 크기 제한을 지키는지 확인합니다.
- `.mustflow/context/*.md`가 크기 제한을 넘기거나 절대 경로, 민감한 키/값, 중복된 디자인 토큰 등을 담고 있지 않은지 검사합니다.
- `.mustflow/knowledge/**` 파일이 크기 제한을 지키는지 확인합니다.
- `.mustflow/**` 경로에 원시 JSONL 로그가 그대로 노출되지 않았는지 확인합니다.
- `.mustflow/state/runs/latest.json`의 JSON 구조가 유효한지 확인합니다.

엄격 검사는 워크플로를 가볍게 유지하기 위해 선택 항목으로 제공됩니다. mustflow 문서, 스킬, 명령 계약, 저장소 지도 생성 규칙을 변경한 뒤 실행하는 것을 권장합니다.

## 오류와 경고 분류

`mf check`는 구조 위반을 차단 오류로 처리합니다. 차단 오류가 있으면 종료 코드 `1`로 끝나며, 경고는 별도로 보고하지만 명령을 실패시키지 않습니다.

- 기본 오류는 필수 파일 누락, 파싱 실패, 안전하지 않은 설정값, 명령 계약 위반, 스킬 필수 섹션 식별자 누락, 컨텍스트 문서 식별 오류, 잠금 파일 기준 이탈에서 나옵니다.
- 엄격 오류는 문서 식별 정보, 라우팅, 스킬 메타데이터, 프롬프트 캐시 예산, 소스 앵커, 명령 경계, 저장소 지도, 보존 정책, 실행 기록, 컨텍스트 위생 상태를 추가로 검사할 때 나옵니다. 이 항목은 `--strict`를 켰을 때만 표시됩니다.
- 차단하지 않는 관찰 결과는 JSON 출력의 `warnings`나 사람이 읽는 출력의 경고 줄로 표시될 수 있습니다. 자동화에서 더 넓은 정보성 상태 신호가 필요하면 `mf doctor` 진단 정보를 사용합니다.

## 설정 검사 기준

`mf check`는 `[map]`, `[workspace]`, `[context]` 설정을 유연하게 해석하되, 보안상 위험하거나 의미가 모호한 값은 실패로 처리합니다.
`manifest.lock.toml`이 없으면 기존 설치 환경과의 호환성을 위해 경고 없이 통과합니다. 반대로 파일이 있으면, 기록된 파일 누락이나 해시 불일치를 엄격하게 검사합니다.

- `map.output`: 비어 있지 않은 유효한 상대 경로여야 합니다.
- `map.mode`: 현재는 `anchors_only` 모드만 지원합니다.
- `map.privacy`: 현재는 `minimal` 수준만 지원합니다.
- `map.include_nested`: 불리언(Boolean) 값이어야 합니다.
- `map.anchor_files`: 비어 있지 않은 상대 경로 문자열의 배열이어야 합니다.
- `workspace.roots`: 현재 루트 내부의 유효한 상대 경로 배열이어야 합니다.
- `workspace.max_depth`, `workspace.max_repositories`: 양의 정수여야 합니다.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: 불리언 값이어야 합니다.
- `context.root`, `context.index` 등: 비어 있지 않은 유효한 상대 경로를 사용해야 합니다.
- `context.read_policy`: 현재는 `task_relevant_only`만 지원합니다.
- `context.authority`: 현재는 `contextual`만 지원합니다.
- `preferences.toml` 내 주요 설정값: 유효한 문자열이어야 합니다.
- 자동 커밋, 민감 정보 포함 설정 등: 불리언 값이어야 합니다.
- `docs.update_when`: 문자열 배열 형태여야 합니다.
- 실행 가능한 명령 의도: `lifecycle`, `run_policy`, `timeout_seconds`, `stdin` 항목을 반드시 포함해야 합니다.
- `lifecycle = "oneshot"` 의도: `timeout_seconds` 설정 및 `stdin = "closed"` 상태가 필수입니다.
- 장기 실행 의도(`server`, `watch` 등): 에이전트가 직접 실행 가능한 명령으로 노출되면 안 됩니다.

## 표준 스킬 섹션 식별자

스킬 문서는 현지화된 섹션 제목 앞에 다음 안정적인 섹션 식별자를 포함해야 합니다.

```text
<!-- mustflow-section: purpose -->
<!-- mustflow-section: use-when -->
<!-- mustflow-section: do-not-use-when -->
<!-- mustflow-section: required-inputs -->
<!-- mustflow-section: preconditions -->
<!-- mustflow-section: allowed-edits -->
<!-- mustflow-section: procedure -->
<!-- mustflow-section: postconditions -->
<!-- mustflow-section: verification -->
<!-- mustflow-section: failure-handling -->
<!-- mustflow-section: output-format -->
```


## 예시

```sh
npx mf check
```

성공하면 다음처럼 보고합니다.

```text
mustflow check passed
```

실패하면 빠진 파일이나 섹션 식별자를 표준 오류로 출력하고 종료 코드 `1`로 끝납니다.

## JSON 필드

```sh
npx mf check --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `ok` (`boolean`): 모든 검사를 통과했는지 나타냅니다.
- `strict` (`boolean`): `--strict` 검사를 함께 실행했는지 나타냅니다.
- `issueCount` (`number`): 발견된 문제의 총 개수입니다.
- `issues` (`string[]`): 사용자 가독성을 위한 문제 설명 목록입니다.
- `warningCount` (`number`): 발견된 비차단 경고 개수입니다.
- `warnings` (`string[]`): 사용자 가독성을 위한 경고 설명 목록입니다.
- `issueDetails` (`object[]`): 기계가 읽기 좋은 문제와 경고 상세 목록입니다. `id`는 명령 경계 및 관련 엄격 검사에 해당할 때 안정적인 식별자를 담고, `severity`는 `error` 또는 `warning`이며, `mode`는 `base` 또는 `strict`입니다. `message`는 `issues` 또는 `warnings`의 해당 설명을 담습니다.

차단 오류가 발견될 경우 JSON 출력 모드에서도 종료 코드 `1`을 반환합니다. 경고만 있으면 종료 코드 `0`을 유지합니다.

## 도움말 및 종료 코드

```sh
npx mf check --help
```

도움말 출력은 `Usage`, `Options`, `Examples`, `Exit codes` 순서를 따릅니다.

- 종료 코드 `0`: 모든 필수 파일 및 설정의 유효성이 확인되었습니다.
- 종료 코드 `1`: 검증 실패 또는 유효하지 않은 옵션이 제공되었습니다.

에이전트나 자동화 도구는 텍스트 기반 성공/실패 메시지 대신 `--json` 출력의 `ok`, `issues`, `issueDetails` 필드를 활용하세요.
