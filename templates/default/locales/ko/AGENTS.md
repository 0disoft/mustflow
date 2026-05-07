---
mustflow_doc: agents.root
locale: ko
canonical: false
revision: 10
---

# AGENTS.md

이 파일은 LLM 코딩 에이전트가 이 저장소에서 가장 먼저 읽어야 하는 작업 규칙입니다.
이 저장소는 mustflow 에이전트 작업 흐름 구조를 따릅니다.
mustflow가 관리하는 세부 문서와 설정은 `.mustflow/` 아래에 둡니다.

## 읽는 순서

1. `AGENTS.md`
2. `.mustflow/docs/agent-workflow.md`
3. `.mustflow/config/mustflow.toml`
4. `.mustflow/config/commands.toml`
5. `.mustflow/config/preferences.toml`이 있으면 읽기
6. `.mustflow/skills/INDEX.md`
7. 프로젝트, 제품, 도메인, UI, 백엔드, 데이터, 보안, 운영 문맥이 필요한 작업일 때만
   `.mustflow/context/INDEX.md`
8. 문맥 색인이 고른 `.mustflow/context/<name>.md` 파일
9. 현재 작업과 맞는 `.mustflow/skills/<name>/SKILL.md`
10. 넓은 저장소 탐색이 필요할 때만 `REPO_MAP.md`
11. 관련 소스, 테스트, 문서 파일

## 핵심 규칙

- 기존 변경 사항을 되돌리지 않습니다.
- 명령어를 추측하지 않습니다.
- `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`인
  명령 의도만 실행합니다.
- 끝나는 명령은 가능하면 `mf run <intent>`로 실행하고, 자동화나 최종 보고 근거가
  필요하면 `mf run <intent> --json`의 실행 영수증을 사용합니다.
- 개발 서버, 감시 모드, 브라우저, 대화형 명령, 백그라운드 프로세스를 직접 실행하지 않습니다.
- 이 저장소가 명시적으로 설정하지 않았다면 자율 반복 실행기, 여러 작업자 조정, 페르소나
  시스템, 장기 실행 하네스를 시작하지 않습니다.
- 작업이 길게 실행되거나 민감한 상태에 영향을 줄 수 있으면 `.mustflow/config/mustflow.toml`의
  `[budget]`, `[approval]`, `[isolation]` 정책을 따릅니다.
- 수정 전 현재 mustflow 루트 상태와 다음 단계를 빠르게 확인해야 하면 `mf doctor`
  또는 `mf doctor --json`을 사용합니다. 이 명령은 파일을 쓰지 않는 진단 명령입니다.
- `mf context --json`을 사용할 수 있으면 읽기 전용 맥락 확인에 사용할 수 있지만,
  실제 작업 규칙과 명령 계약을 대신하지는 않습니다.
- `.mustflow/config/preferences.toml`의 선호값은 사용자 직접 지시와 기존 파일 스타일보다 낮은 기본값입니다.
- `.mustflow/context/` 파일은 프로젝트 방향과 도메인 약속을 설명하는 작업별 문맥입니다.
  코드, 테스트, 명령 계약, 사용자 지시를 대신하는 기준 원본으로 보지 않습니다.
- `DESIGN.md`가 있으면 UI, 시각 디자인, 레이아웃, 디자인 토큰, 접근성 작업에서만 읽습니다.
  없는 `DESIGN.md`를 추측해서 만들지 않습니다.
- 작업과 맞는 스킬이 있으면 해당 `SKILL.md`를 읽고 따릅니다.
- 생성 파일, 외부 의존성, 비밀정보 파일은 명시 요청 없이 수정하지 않습니다.
- 루트의 `config/`, `docs/`, `skills/`는 프로젝트 자체 경로일 수 있으므로
  mustflow 문서로 가정하지 않습니다.

## 상위/하위 규칙 우선순위

- 현재 작업 경로에 더 가까운 `AGENTS.md`가 더 구체적인 규칙입니다.
- 작업 방식, 코드 스타일, 테스트 방식, 명령 실행 규칙이 충돌하면 하위 저장소의
  `AGENTS.md`와 `.mustflow/config/commands.toml`을 우선합니다.
- 보안, 비밀정보, 개인정보, 파괴적 명령, 수정 가능 경로 같은 안전 규칙은 누적
  적용하고 더 엄격한 규칙을 따릅니다.
- 상위 작업대에서 하위 저장소로 들어온 경우, 하위 저장소의 `AGENTS.md`와
  `.mustflow/config/*.toml`을 다시 읽은 뒤 작업합니다.
- 명시 요청 없이 선택한 하위 저장소 밖의 파일을 수정하지 않습니다.

## 지침 새로고침 지점

- 긴 세션에서는 첫 수정 전, 명령 실행 전, 맥락 압축 뒤, `AGENTS.md` 또는
  `.mustflow/**` 수정 뒤, 루트 변경 뒤, 최종 보고 전에 mustflow 지침을 다시 확인합니다.
- `.mustflow/config/mustflow.toml`의 `[refresh]` 정책을 기준으로 가벼운 확인, 명령
  확인, 스킬 확인, 전체 확인 중 무엇이 필요한지 판단합니다.
- 대화 횟수나 세션 활동 상태를 프로젝트 파일에 저장하지 않습니다. 세션 새로고침
  상태는 로컬 캐시나 호스트 애플리케이션의 책임입니다.

세부 작업 흐름, 명령 실행 정책, 실패 대응, 보안 원칙은
`.mustflow/docs/agent-workflow.md`를 따릅니다.
