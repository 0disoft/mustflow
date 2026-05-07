# mustflow docs site

언어: [영어](../../../README.md) · [한국어](README.md) · [중국어](../zh/README.md) · [스페인어](../es/README.md) · [프랑스어](../fr/README.md) · [힌디어](../hi/README.md)

`mustflow.github.io`에 배포되는 문서 사이트입니다.

이 사이트는 `mf init`으로 사용자 저장소에 설치되는 문서가 아닙니다.
mustflow가 생성하는 파일과 설정에 대한 상세 가이드 문서입니다.

사이트 콘텐츠는 `src/content/docs/<locale>/` 경로에서 언어별로 관리됩니다.

## 명령어

```sh
bun run dev
bun run check
bun run build
bun run preview
```

저장소 루트에서는 다음 래퍼 명령을 사용할 수 있습니다.

```sh
bun run docs:dev
bun run docs:check
bun run docs:build
bun run docs:preview
```
