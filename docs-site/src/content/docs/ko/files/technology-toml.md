---
title: technology.toml
description: 에이전트를 위한 낮은 권위의 기술 선호도 설정 파일입니다.
---

`.mustflow/config/technology.toml`은 저장소에서 선호하거나 피해야 할 기술을 에이전트에게 알려주는 선택 파일입니다.

이 파일은 힌트일 뿐입니다. 패키지 설치, 의존성 업데이트, 마이그레이션, 명령 실행, 현재 코드베이스 무시는 허용하지 않습니다.

## 사용

- frontend, backend, UI, data, CLI 같은 영역별 선호 기술을 기록합니다.
- 새 작업에서 허용하거나 피해야 할 라이브러리와 런타임을 기록합니다.
- 에이전트가 제안을 만들 때 참고할 짧은 이유와 제약을 둡니다.
- 도구 선호도를 `AGENTS.md`에 길게 넣지 않고 별도 설정으로 분리합니다.

에이전트는 변경 전에 기존 스택과 명령 계약을 확인해야 합니다. 사용자 직접 지시, scoped `AGENTS.md`, 현재 소스, 테스트, `.mustflow/config/commands.toml`이 이 파일보다 우선합니다.

## 기본 형태

```toml
schema_version = "1"

[[preferences]]
id = "framework.frontend.nextjs"
kind = "framework"
name = "nextjs"
status = "preferred"
authority = "hint"
scope = ["frontend", "web", "react"]
ecosystem = "npm"
packages = ["next", "react", "react-dom"]
rationale = "Preferred React full-stack framework for product web apps."
constraints = [
  "Check existing project stack before proposing migration.",
  "Do not install packages without direct user approval or a configured command intent.",
]
```

## CLI

`mf tech list`와 `mf tech suggest`로 기술 선호도를 확인합니다.
`mf tech add`와 `mf tech remove`로 이 파일을 의도적으로 수정합니다.

`mf tech add --verify`는 쓰기 전에 npm 패키지 이름을 확인할 수 있지만, 패키지를 설치하거나 의존성 업데이트 권한을 주지는 않습니다.
