# docs-site styles

전역 CSS는 역할별로 나눕니다.

- `tokens.css`: 사이트 전체에서 공유하는 크기와 간격 값입니다.
- `layout.css`: Starlight 레이아웃 영역의 너비와 주요 구조입니다.
- `markdown.css`: 본문 마크다운 요소입니다.
- `header-controls.css`: 상단 언어와 테마 선택 컨트롤입니다.
- `page-navigation.css`: 이전/다음 페이지 링크입니다.
- `interaction.css`: 로고, 사이드바, 버튼, 선택 상자처럼 조작용 UI의 텍스트 선택을 막습니다.
- `accessibility.css`: 포커스, 고대비 모드, 모션 감소, 방향 격리 같은 접근성 보강입니다.

적용 순서는 `../config/styles.mjs`를 기준으로 합니다.

키보드 동작처럼 CSS가 아닌 브라우저 동작 보강은 `../../public/keyboard-navigation.js`와
`../config/head.mjs`에서 관리합니다.
