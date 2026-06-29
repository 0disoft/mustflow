---
title: REPO_FLOW.md
description: 현재 mustflow 루트의 설계 흐름을 보여주는 생성 문서입니다.
---

`REPO_FLOW.md`는 mustflow 루트 안에서 작업이 어떤 순서로 흘러가는지 설명하는 생성 파일입니다.

명령 권한은 `.mustflow/config/commands.toml`, 저장소 지침은 `AGENTS.md`, 실제 동작은 현재 코드와 테스트와 문서가 기준입니다. `REPO_FLOW.md`는 이 기준들을 대체하지 않습니다.

## REPO_MAP.md와의 관계

- `REPO_MAP.md`: 중요한 파일과 앵커가 어디 있는지 보여줍니다.
- `REPO_FLOW.md`: 그 파일들 사이에서 작업과 설계 흐름이 어떻게 이어지는지 보여줍니다.

파일 위치만으로 안전한 작업 순서가 잘 보이지 않는 저장소에서 둘을 함께 사용합니다.

## 생성

```sh
npx mf flow --write
```

최신 여부 확인:

```sh
npx mf flow --check
```

`mf check --strict`는 `REPO_FLOW.md`가 있을 때 frontmatter, source fingerprint, 휘발성 메타데이터 포함 여부도 검사합니다. 직접 수정하지 말고 다시 생성하세요.
