# docs-site lib

언어: [영어](../../../../../src/lib/README.md) · [한국어](README.md) · [중국어](../../../zh/src/lib/README.md) · [스페인어](../../../es/src/lib/README.md) · [프랑스어](../../../fr/src/lib/README.md) · [힌디어](../../../hi/src/lib/README.md)

이 폴더에서는 문서 사이트의 여러 라우트에서 공유하여 사용하는 생성 유틸리티를 관리합니다.

- `machine-readable.mjs`: `ai.txt`, `llms.txt`, `llms-full.txt`, `robots.txt` 응답을 생성합니다.

라우트 파일의 로직은 최대한 단순하게 유지하며, 공개 메타 텍스트의 기준 정보는
`../config/machine-readable.mjs`에서 관리합니다.
