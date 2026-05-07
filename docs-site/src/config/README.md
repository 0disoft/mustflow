# docs-site configuration

이 폴더는 Starlight 설정의 단일 출처를 나눠 둡니다.

- `site.mjs`: 사이트 이름과 배포 주소입니다.
- `head.mjs`: 모든 문서 페이지의 `<head>`에 추가할 태그입니다.
- `locales.mjs`: 문서 언어 목록입니다.
- `machine-readable.mjs`: `ai.txt`, `llms.txt`, `llms-full.txt`, `robots.txt`에 들어갈 공개 메타 정보입니다.
- `navigation.mjs`: 사이드바에 노출되는 문서 링크와 그룹입니다.
- `sidebar.mjs`: Starlight에 넘기는 사이드바 진입점입니다.
- `styles.mjs`: 전역 CSS 적용 순서입니다.
- `starlight.mjs`: 위 설정들을 조합하는 Starlight 옵션입니다.

새 문서가 사이드바에 보여야 하면 `navigation.mjs`에 링크를 추가합니다.
새 전역 스타일 파일을 만들면 `styles.mjs`의 순서를 함께 확인합니다.
새 브라우저 스크립트를 추가하면 `head.mjs`에 등록합니다.
