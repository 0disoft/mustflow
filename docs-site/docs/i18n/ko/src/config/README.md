# docs-site 설정

언어: [영어](../../../../../src/config/README.md) · [한국어](README.md) · [중국어](../../../zh/src/config/README.md) · [스페인어](../../../es/src/config/README.md) · [프랑스어](../../../fr/src/config/README.md) · [힌디어](../../../hi/src/config/README.md)

이 폴더에서는 Starlight 설정을 역할별로 분리하여 관리합니다.

- `site.mjs`: 사이트 이름과 배포 주소를 설정합니다.
- `head.mjs`: 모든 문서 페이지의 `<head>`에 추가할 태그를 정의합니다.
- `locales.mjs`: 지원하는 문서 언어 목록을 관리합니다.
- `machine-readable.mjs`: `ai.txt`, `llms.txt`, `llms-full.txt`, `robots.txt` 등에 포함될 공개 메타 정보를 정의합니다.
- `navigation.mjs`: 사이드바에 표시될 문서 링크와 그룹을 설정합니다.
- `sidebar.mjs`: Starlight에 전달할 사이드바 진입점을 정의합니다.
- `styles.mjs`: 전역 CSS의 적용 순서를 관리합니다.
- `starlight.mjs`: 위의 개별 설정들을 조합하여 최종 Starlight 옵션을 구성합니다.

새 문서를 사이드바에 추가하려면 `navigation.mjs`에 링크를 추가하십시오. 새 전역 스타일 파일을 생성한 경우 `styles.mjs`에서 적용 순서를 확인하십시오. 새 브라우저 스크립트를 추가하려면 `head.mjs`에 등록하십시오.
