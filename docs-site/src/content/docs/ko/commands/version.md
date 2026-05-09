---
title: mf version
description: 설치된 mustflow 패키지 버전을 출력하고 필요하면 npm 최신 버전을 확인합니다.
---

`mf version`은 설치된 mustflow CLI 패키지 버전을 출력합니다.

기본 실행은 조용하게 동작하며 네트워크에 접속하지 않습니다. 그래서 스크립트가 현재 버전만 안정적으로 읽을 수 있습니다.

## npm 확인

```sh
npx mf version --check
```

`--check`는 npm 레지스트리에 접속해 설치된 버전과 최신 게시 버전을 비교하고, 새 버전이 있으면 업데이트 명령을 출력합니다.

패키지를 설치하거나 파일을 수정하지 않습니다.

예시 출력:

```text
mustflow 1.10.0
최신 1.11.0 사용 가능

업데이트 명령:
npm install -g mustflow@latest
```

## 도움말과 종료 코드

```sh
npx mf version --help
```

- 종료 코드 `0`: 버전 정보를 출력했습니다.
- 종료 코드 `1`: 알 수 없는 옵션을 받았거나 npm 확인에 실패했습니다.
