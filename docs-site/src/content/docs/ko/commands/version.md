---
title: mf version
description: 설치된 mustflow 패키지 버전을 출력하고 필요하면 npm 최신 버전을 확인합니다.
---

`mf version`은 설치된 mustflow CLI 패키지 버전을 출력합니다.

기본 실행은 조용하게 동작하며 네트워크에 접속하지 않습니다. 그래서 스크립트가 현재 버전만 안정적으로 읽을 수 있습니다.

## npm 확인

mustflow를 전역으로 설치했다면 `mf`를 바로 실행할 수 있습니다.

```sh
mf version --check
```

프로젝트 안에 설치한 경우에는 패키지 관리자를 거쳐 실행하세요.

```sh
npx mf version --check
bunx mf version --check
```

`--check`는 npm 레지스트리에 접속해 설치된 버전과 최신 게시 버전을 비교하고, 새 버전이 있으면 npm, Bun, pnpm, Yarn, Deno용 업데이트 명령을 출력합니다. 현재 실행 환경에서 패키지 관리자를 추정할 수 있으면 그 명령을 먼저 보여줍니다.

패키지를 설치하거나 파일을 수정하지 않습니다.

셸이 `mf: command not found`를 출력했다면 `version` 명령이 실행된 것이 아니라 셸이 `mf` 실행 파일을 찾지 못한 것입니다. mustflow를 전역으로 설치하거나 패키지 관리자의 전역 실행 파일 폴더를 `PATH`에 추가하세요.

```sh
npm install -g mustflow
bun add -g mustflow@latest
```

Bun을 사용할 때는 보통 `~/.bun/bin`인 Bun 전역 실행 파일 폴더가 `PATH`에 들어 있는지 확인하세요.

예시 출력:

```text
mustflow 1.10.0
최신 1.11.0 사용 가능

업데이트 명령:
npm: npm install -g mustflow@latest
bun: bun add -g mustflow@latest
pnpm: pnpm add -g mustflow@latest
yarn: yarn global add mustflow@latest
deno: deno install -g -A -n mf npm:mustflow@latest
```

Bun으로 전역 설치한 사용자는 `bun add -g mustflow@latest`로 전역 명령을 설치하거나 갱신할 수 있습니다.

## 도움말과 종료 코드

```sh
npx mf version --help
```

- 종료 코드 `0`: 버전 정보를 출력했습니다.
- 종료 코드 `1`: 알 수 없는 옵션을 받았거나 npm 확인에 실패했습니다.
