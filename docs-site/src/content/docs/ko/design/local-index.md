---
title: 로컬 색인
description: mustflow가 SQLite를 로컬 색인으로 사용하는 방향을 설명합니다.
---

mustflow는 SQLite를 기본 로컬 색인 저장소로 사용합니다.

## 원칙

파일이 항상 기준 원본입니다.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite는 더 빠른 검색과 분석을 위한 보조 로컬 색인입니다. 삭제해도 안전하게 다시 만들 수 있어야 합니다.

SQLite 로컬 데이터베이스는 재생성 가능한 캐시입니다. 기준 원본, 기억 저장소, 감사 로그, 대화 기록 저장소로 취급하면 안 됩니다.

## 예상 위치

```text
.mustflow/cache/mustflow.sqlite
```

`mf init`은 이 파일을 바로 만들지 않습니다. 색인은 `mf index`를 실행할 때 만들어집니다.
`mf search`는 이 파일을 읽지만 원본 문서는 수정하지 않습니다. 향후 `mf map`과 `mf dashboard` 기능이 이 파일을 다시 사용할 수 있습니다.

기본 템플릿은 이 상태를 다음처럼 선언합니다.

```toml
[capabilities]
local_index = "generated_optional"
```

즉 색인은 선택적으로 생성되는 데이터이며 기준 문서가 아닙니다.

## 색인이 저장할 수 있는 데이터

- 문서 경로
- 제목과 섹션 제목
- 앞부분 메타데이터
- 문서 revision과 해시
- 색인된 파일 지문
- 짧은 본문 발췌
- 명령 의도 메타데이터
- 스킬 참조

현재 `mf index` 명령은 `metadata_and_snippets` 모드를 사용합니다. 문서마다 최대 2048바이트의 짧은 발췌만 저장하고, 기본값으로 전체 문서 본문은 저장하지 않습니다. 대신 명령 의도 이름과 설명을 파생 검색어로 저장해 `mf search`가 관련 설정 파일을 찾을 수 있게 합니다.

`indexed_files` 테이블은 색인된 워크플로 파일, 선택적으로 포함된 소스 앵커 파일, 그리고 최신 실행 증거 파일이 있을 때 그 입력의 파생 지문을 저장합니다. 저장 항목은 경로, 출처 범위, 크기, 수정 시각, 내용 해시, 색인 시각, 색인 모드, 파서 버전입니다. `mf index --incremental`은 스키마, 파서 버전, 소스 범위 설정, 파일 입력이 모두 호환될 때만 기존 SQLite 파일을 재사용하고, 그렇지 않으면 전체 재생성으로 돌아갑니다. 소스 앵커 색인이 꺼져 있으면 모든 색인 입력을 다시 읽고 파싱하기 전에 파일 크기와 수정 시각만 비교하는 가벼운 사전 검사에서 재사용을 끝낼 수 있습니다.

`indexed_source_candidates` 테이블은 소스 후보 소속을 `indexed_files.source_scope`와 별도로 기록합니다. 그래서 하나의 경로가 워크플로 권한 문서이면서 소스 후보여도 오래된 인덱스로 잘못 판정되지 않습니다. 외래키는 모든 소스 후보에 `indexed_files` 지문이 남아 있도록 강제하고, 후보가 남아 있는 동안 해당 지문 경로를 먼저 삭제하거나 바꾸지 못하게 합니다. 색인 파일 경로는 반드시 프로젝트 안의 정규화된 상대 경로여야 하며, 색인 생성과 신선도 검사는 경로 탈출, 절대 경로, Windows 드라이브 또는 UNC 경로, 심볼릭 링크를 거부해 mustflow 루트 밖의 파일을 읽지 않습니다.

검색 메타데이터는 `search_ngrams` 테이블에도 저장됩니다. 이 행들은 짧은 파생 용어 조각이며, 공백이나 SQLite 토큰화가 약한 다국어 검색을 보조합니다. 문서, 스킬, 스킬 라우트, 명령 의도, 소스 앵커를 가리킬 뿐 전체 문서나 소스 본문을 저장하지 않고, 권한 정렬도 바꾸지 않습니다. n-gram 생성은 각 토큰의 앞 64자와 대상별 최대 512행으로 제한됩니다.

검색 전 `mf search`는 저장된 본문 해시와 현재 파일을 비교하고, 캐시가 오래되었으면 오류를 반환합니다. 마지막 검증 결과와 실행 분석은 향후 기능으로 남겨둡니다.

## 구조화 소스 앵커

소스 앵커는 코드 탐색을 위한 작은 주석 예산이지, 일반 설명 문서 계층이 아닙니다.
`mf:anchor`는 에이전트가 더 안전한 문맥을 고르거나 깨지기 쉬운 계약을 이해하는 데
정확한 코드 경계가 도움이 되는 곳에만 둡니다.

앵커를 둘 만한 곳은 다음과 같습니다.

- 명령줄 입력이나 핵심 입력이 타입 있는 판단으로 바뀌는 공개 경계
- 명령 실행, 프로세스 제어, 파일 쓰기, 실행 기록, 최신 포인터 갱신
- 보안, 개인정보, 데이터 손실, 마이그레이션, 권한 부여, 상태 일관성 경계
- 테스트나 명령 계약이 의존하는, 겉으로 잘 드러나지 않는 불변 조건

일반 제어 흐름, 자명한 보조 함수, 생성물, 외부 제공 코드, 의존성 폴더, 넓은 구조 설명,
주변 타입이나 함수 이름을 반복하는 설명에는 앵커를 붙이지 않습니다.

앵커 ID는 파일명보다 안정적인 책임 이름을 사용합니다. `verify.receipts.write`,
`run.timeout.terminate`, `source-anchors.scan`처럼 소문자 점 구분 이름을 선호합니다. ID에는
소문자, 숫자, 점, 하이픈만 사용할 수 있고, 프로젝트 전체에서 고유해야 합니다.

허용 필드는 의도적으로 좁습니다.

- `purpose`: 이 코드 경계가 왜 중요한지 한 문장으로 설명합니다.
- `search`: 유지보수자나 에이전트가 검색할 법한 용어 3~8개를 적습니다.
- `invariant`: 권한, 안전, 상태, 증거와 관련해 깨지면 안 되는 조건을 적습니다.
- `risk`: `config`, `state`, `security`, `privacy`, `pii`, `secrets`, `data_loss` 같은 알려진 위험 태그를 적습니다.

```ts
/**
 * mf:anchor verify.receipts.write
 * purpose: Persist verify receipts and the latest pointer after scheduled intents finish.
 * search: verify receipt, latest.json, manifest, receipt binding
 * invariant: Receipt files explain evidence; they never grant command authority or verification success.
 * risk: state, data_consistency
 */
```

소스 앵커에는 에이전트 지시, 명령 실행 권한, 정책 우회, 비밀정보, 검증을 생략해도 된다는
주장을 넣을 수 없습니다. 수집된 요약은 항상 `navigationOnly: true`와
`canInstructAgent: false`를 유지합니다. SQLite가 앵커를 검색과 설명용으로 색인할 수는
있지만, 앵커는 명령을 허가하거나 `.mustflow/config/commands.toml`을 대체하거나 검증 성공을
증명하지 못합니다.

`mf check --strict`는 잘못된 앵커 ID, 지원하지 않는 필드, 중복 ID, 생성물이나 외부 제공 코드
경로, 알 수 없는 위험 태그, 비밀정보처럼 보이는 텍스트, 앵커 안의 에이전트 명령이나 정책
지시를 오류로 처리합니다. 또한 `purpose`가 너무 길거나, `search` 용어가 너무 많거나,
고위험 앵커에 `invariant`가 없거나, 한 파일이 앵커 예산을 과하게 쓰면 경고합니다. 이런
경고는 주석을 더 늘리라는 신호가 아니라 앵커를 줄이거나 짧게 만들거나 나누라는 신호로
취급해야 합니다.

## 쓰기 규칙

LLM이나 대시보드가 문서를 수정하더라도 최종 쓰기 대상은 Markdown이나 TOML이어야 합니다.

SQLite는 검색, 표시, 검증 속도를 높이기 위한 보조 데이터입니다.

원본 로그, 전체 터미널 출력, 전체 대화 전문, 숨은 추론 과정, 비밀정보, 환경값, 비공개 외부 저장소 본문은 색인이나 향후 지식 계층의 기준 문서가 아닙니다. mustflow는 프로젝트 안에 작은 실행 기록만 남기며, 기본값으로 원본 로그를 저장하지 않습니다. 이 원칙은 `.mustflow/config/mustflow.toml`의 `[retention]` 정책과 `mf check --strict`의 저장소 검사로 강제됩니다.
