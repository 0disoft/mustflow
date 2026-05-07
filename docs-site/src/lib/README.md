# docs-site lib

이 폴더는 문서 사이트에서 여러 라우트가 공유하는 작은 생성 로직을 둡니다.

- `machine-readable.mjs`: `ai.txt`, `llms.txt`, `llms-full.txt`, `robots.txt` 응답을 생성합니다.

라우트 파일은 가능한 얇게 유지하고, 공개 메타 텍스트의 기준값은
`../config/machine-readable.mjs`에서 관리합니다.
