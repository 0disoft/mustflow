# mustflow

mustflow는 LLM 코딩 에이전트가 저장소에 들어왔을 때 추측 없이 읽고, 실행하고,
검증할 수 있도록 돕는 에이전트용 문서 흐름과 CLI입니다.

핵심은 단순합니다. 사용자 프로젝트 루트에는 `AGENTS.md`를 두고, 세부 작업 흐름은
`.mustflow/` 아래에 모읍니다. 에이전트는 `AGENTS.md`에서 시작해 명령 계약, 작업
스킬, 프로젝트 문맥, 검증 절차를 순서대로 확인합니다.

- 문서 사이트: <https://mustflow.github.io>
- 저장소: <https://github.com/0disoft/mustflow>
- 이슈: <https://github.com/0disoft/mustflow/issues>

## 하는 일

mustflow는 사용자 프로젝트에 에이전트가 읽을 작업 흐름을 설치하고 검증합니다.

- `AGENTS.md`와 `.mustflow/**` 문서 흐름을 설치합니다.
- `.mustflow/config/commands.toml`로 실행 가능한 명령 의도를 선언합니다.
- `mf check`와 `mf doctor`로 설치 상태와 설정 형식을 확인합니다.
- `mf run <intent>`로 허용된 단발성 명령만 제한 시간 안에서 실행합니다.
- `mf map`으로 현재 mustflow 루트의 얕은 탐색 지도인 `REPO_MAP.md`를 생성합니다.
- `mf index`와 `mf search`로 mustflow 문서, 스킬, 명령 의도를 SQLite 색인으로 검색합니다.
- `mf update`로 mustflow 템플릿 변경을 안전하게 미리 보고 적용합니다.

## 하지 않는 일

mustflow는 프로젝트 자동 수정 도구나 특정 에이전트 제품 전용 규약이 아닙니다.

- 사용자 애플리케이션 소스 코드를 자동 생성하거나 수정하지 않습니다.
- 설치만으로 프로젝트 파일을 바꾸지 않습니다. 파일 생성은 `mf init`을 실행했을 때만 합니다.
- `CLAUDE.md`, `GEMINI.md`처럼 특정 도구 이름에 묶인 파일명을 표준으로 삼지 않습니다.
- 빌드 시스템, 테스트 실행기, 패키지 관리자, CI/CD 설정을 대체하지 않습니다.
- GitHub, GitLab 같은 플랫폼별 설정 파일을 기본 템플릿에 넣지 않습니다.
- `justfile`, `Makefile`, `Taskfile.yml`을 기본 생성하지 않습니다.
- 대시보드는 아직 구현하지 않았습니다. `mf dashboard`는 예약된 명령입니다.

## 검토 중인 기능

다음 항목은 아이디어를 잊지 않기 위해 남겨 둔 후보이며, 아직 mustflow의 공개 동작으로
간주하지 않습니다.

- `mf dashboard`
- 커뮤니티 스킬 저장소와 스킬 팩 설치
- 선택형 `.mustflow/work-items/`
- `mf orient`, `mf refresh`
- 도구별 어댑터

## 빠른 시작

Node.js 20 이상이 필요합니다. npm 패키지로 배포되며, CLI 실행 이름은 `mf`입니다.

```sh
npm install -D mustflow
npx mf init --dry-run
npx mf init --yes
npx mf check --strict
```

pnpm과 Bun도 npm 패키지를 설치하는 방식으로 사용할 수 있습니다.

```sh
pnpm add -D mustflow
pnpm exec mf init --yes

bun add -d mustflow
bunx mf init --yes
```

Deno의 `npm:` 실행은 별도 검증 전까지 실험적 사용으로 봅니다.

## 설치되는 파일

`mf init`은 현재 폴더에 에이전트용 문서 흐름만 설치합니다.

```text
your-project/
├─ AGENTS.md
└─ .mustflow/
   ├─ config/
   │  ├─ commands.toml
   │  ├─ manifest.lock.toml
   │  ├─ mustflow.toml
   │  └─ preferences.toml
   ├─ context/
   │  ├─ INDEX.md
   │  └─ PROJECT.md
   ├─ docs/
   │  └─ agent-workflow.md
   └─ skills/
      ├─ INDEX.md
      ├─ code-review/
      │  └─ SKILL.md
      ├─ docs-update/
      │  └─ SKILL.md
      ├─ failure-triage/
      │  └─ SKILL.md
      └─ test-maintenance/
         └─ SKILL.md
```

`README.md`, 기여 안내, 보안 정책, CI 설정, 일반 `docs/`, 일반 `skills/`는 기본 생성하지
않습니다. 사용자 프로젝트에 이미 같은 이름의 폴더가 있을 수 있기 때문입니다.

`REPO_MAP.md`는 템플릿에서 복사하지 않습니다. 필요할 때 `mf map --write`로 생성합니다.
`.mustflow/cache/mustflow.sqlite`도 `mf index`로 만드는 재생성 가능한 로컬 색인입니다.

## 기본 흐름

```sh
npx mf init --dry-run
npx mf init --yes
npx mf doctor
npx mf check --strict
npx mf map --write
```

검색이 필요하면 선택적으로 색인을 만듭니다.

```sh
npx mf index --dry-run --json
npx mf index
npx mf search mustflow_check
```

템플릿 갱신은 먼저 계획을 확인한 뒤 적용합니다.

```sh
npx mf status
npx mf update --dry-run
npx mf update --apply
```

## 명령 목록

| 명령 | 역할 |
| --- | --- |
| `mf init` | `AGENTS.md`와 `.mustflow/**`를 설치합니다. |
| `mf init --dry-run` | 어떤 파일을 만들지 보여주고 파일은 쓰지 않습니다. |
| `mf init --merge` | 기존 `AGENTS.md`에 mustflow 관리 블록을 병합합니다. |
| `mf init --force` | 충돌 파일을 백업한 뒤 덮어씁니다. |
| `mf check` | mustflow 파일, TOML 설정, 스킬 문서 형식을 검사합니다. |
| `mf check --strict` | 보존 정책, 실행 출력 제한, 원시 로그, 비밀정보 흔적 같은 추가 안전 조건까지 검사합니다. |
| `mf doctor` | 현재 mustflow 루트를 읽기 전용으로 진단합니다. |
| `mf context --json` | 읽기 순서, 명령 의도, 기능 표면, 최근 실행 요약을 JSON으로 출력합니다. |
| `mf map --stdout` | 현재 mustflow 루트의 탐색 지도를 터미널에 출력합니다. |
| `mf map --write` | `REPO_MAP.md`를 생성하거나 갱신합니다. |
| `mf run <intent>` | 허용된 단발성 명령 의도를 실행합니다. |
| `mf index` | mustflow 문서와 명령 의도를 SQLite 색인으로 만듭니다. |
| `mf search <query>` | SQLite 색인에서 문서, 스킬, 명령 의도를 검색합니다. |
| `mf status` | 설치 상태와 변경/누락 파일을 확인합니다. |
| `mf update --dry-run` | 템플릿 갱신 계획을 계산하고 파일은 쓰지 않습니다. |
| `mf update --apply` | 차단 항목이 없을 때 템플릿 갱신을 적용합니다. |
| `mf help <topic>` | 설치된 mustflow 도움말을 보여줍니다. |
| `mf dashboard` | 예약된 명령입니다. 아직 구현하지 않았습니다. |

자동화나 에이전트가 결과를 읽어야 하면 사람용 문장을 파싱하지 말고 `--json` 출력을
사용하세요.

## 명령 실행 정책

에이전트가 명령어를 추측하지 않도록 실행 가능한 작업은
`.mustflow/config/commands.toml`에 명령 의도로 선언합니다.

`mf run`은 다음 조건을 만족하는 명령만 실행합니다.

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`

개발 서버, 감시 모드, 브라우저 UI, 대화형 명령, 백그라운드 프로세스는 직접 실행하지
않습니다.

명령을 실행하면 `.mustflow/state/runs/latest.json`에 마지막 실행 영수증을 씁니다.
실행 영수증에는 의도 이름, 실행 디렉터리, 제한 시간, 종료 코드, 시간 초과 여부,
표준 출력과 오류의 끝부분이 들어갑니다.

## 언어와 프로필

설치 문서 언어, 에이전트 보고 언어, 제품 사용자 문구 언어는 서로 다른 설정입니다.

```sh
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --product-source-locale en --product-locale ko-KR
```

- `--profile`: 프로젝트 성격입니다. 기본값은 `minimal`입니다.
- `--locale`: 설치되는 mustflow 문서 언어입니다. 현재 기본 템플릿은 `en`, `ko`를 제공합니다.
- `--agent-lang`: 에이전트 최종 보고 언어 기본값입니다.
- `--product-source-locale`, `--product-locale`: 제품 사용자 문구의 기준 언어와 대상 로케일입니다.
- `--lang`: CLI 출력 언어입니다. 현재 `en`, `ko`를 지원합니다.

## 저장소 구조

mustflow 저장소 자체는 CLI, 템플릿, 문서 사이트를 함께 둡니다.

```text
mustflow/
├─ README.md
├─ LICENSE
├─ package.json
├─ tsconfig.json
├─ docs-site/
├─ src/
│  └─ cli/
├─ templates/
│  └─ default/
└─ tests/
```

사용자 프로젝트에 복사되는 원본은 `templates/default/common/`과
`templates/default/locales/<locale>/` 아래에 있습니다.

## 개발

이 저장소의 개발 명령은 Bun을 사용합니다. 사용자 프로젝트에서 `mf`를 실행하기 위해
Bun이 필요한 것은 아닙니다.

```sh
bun install
bun run check
bun run docs:check
bun run check:install
```

`dist/`는 저장소에 커밋하지 않는 생성물입니다. `npm pack`과 `npm publish`를 실행하면
`prepack`이 먼저 `npm run build`를 실행하므로, npm 패키지 안에는 빌드된 CLI가 들어갑니다.

공개 전 전체 확인은 다음 명령을 사용합니다.

```sh
bun run release:check
```

`release:check`는 CLI 검사, 문서 사이트 빌드, npm tarball 포장, 임시 프로젝트 설치,
공개 `mf` 명령 실행까지 확인합니다.

## 문서 사이트

문서 사이트는 `docs-site/`에 있습니다.

```sh
bun run docs:dev
bun run docs:build
bun run docs:preview
```

GitHub Pages는 `main` 브랜치의 `docs-site/` 소스를 GitHub Actions로 빌드하고,
`docs-site/dist`를 Pages artifact로 배포합니다. `docs-site/dist`는 커밋하지 않습니다.

## 패키지 포함 범위

npm 패키지에는 다음만 포함합니다.

```text
dist/
templates/
README.md
LICENSE
```

`docs-site/`, `tests/`, `src/`, 작업 메모는 npm 패키지에 포함하지 않습니다.

## 라이선스

MIT-0
