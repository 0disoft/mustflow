# docs-site 스타일

언어: [영어](../../../../../src/styles/README.md) · [한국어](README.md) · [중국어](../../../zh/src/styles/README.md) · [스페인어](../../../es/src/styles/README.md) · [프랑스어](../../../fr/src/styles/README.md) · [힌디어](../../../hi/src/styles/README.md)

전역 CSS는 역할별로 분리하여 관리합니다.

- `tokens.css`: 사이트 전체에서 공유하는 크기와 간격 값을 정의합니다.
- `layout.css`: Starlight 레이아웃 영역의 너비와 주요 구조를 설정합니다.
- `markdown.css`: 본문 마크다운 요소의 스타일을 정의합니다.
- `header-controls.css`: 상단 언어 및 테마 선택 컨트롤의 스타일을 설정합니다.
- `page-navigation.css`: 이전/다음 페이지 링크의 스타일을 정의합니다.
- `interaction.css`: 로고, 사이드바, 버튼 등 조작 가능한 UI 요소의 텍스트 선택을 방지하는 스타일을 정의합니다.
- `accessibility.css`: 포커스, 고대비 모드, 모션 감소 등 접근성 개선 사항을 정의합니다.

CSS 적용 순서는 `../config/styles.mjs`에서 관리합니다.

키보드 내비게이션과 같이 CSS 외의 브라우저 동작 개선 사항은 `../../public/keyboard-navigation.js`와
`../config/head.mjs`에서 관리합니다.
