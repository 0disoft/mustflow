---
title: mf classify
description: 변경 경로, 공개 표면, 검증 이유를 분류하는 명령입니다.
---

`mf classify --changed`는 `git status --short --untracked-files=all`을 읽고 변경된 경로를 분류한 뒤, 어떤 공개 표면과 검증 이유가 영향을 받는지 보고합니다.
알려진 분류 규칙과 맞지 않는 경로도 `surface.kind: "unclassified_path"`와 `unknown_change`로 보고합니다. 그래서 검증 계획이 빈 상태로 끝나지 않고 보수적인 검증이나 명시적인 빈틈으로 드러납니다.

수정 전 계획 단계에서 경로만 확인하려면 명시 경로를 전달합니다.

```sh
npx mf classify README.md schemas/classify-report.schema.json --json
```

다른 도구가 분류 보고서를 파일로 읽어야 한다면 `--write <path>`를 사용합니다.

```sh
npx mf classify --changed --write .mustflow/state/change-classification.json
```

출력 경로는 현재 mustflow 루트 안에 있어야 합니다.

## 출력

- `mustflow 루트`: 현재 mustflow 루트입니다.
- `입력`: Git 변경 파일을 읽었는지, 직접 지정한 경로를 읽었는지 나타냅니다.
- `파일`: 분류된 파일 수입니다.
- `공개 표면`: 공개 문서나 설치 표면에 영향을 주는 경로 수입니다.
- `검증 이유`: 향후 검증 계획에서 사용할 수 있는 `required_after` 이유 문자열입니다.
- `갱신 정책`: 번역 문서나 지역화 템플릿의 `update_or_mark_stale` 같은 표면 갱신 정책을 합쳐 보여줍니다.
- `어긋남 검사`: 문서, 템플릿 목록, 번역, 예시, 스키마, 명령 예시에서 확인해야 할 공개 표면 검사를 합쳐 보여줍니다.
- `분류`: 경로별 변경 종류, 공개 표면 종류, 갱신 정책, 어긋남 검사입니다.

번역 문서와 지역화된 템플릿은 같은 변경에서 원문과 맞춰 갱신할 수 없을 때 `update_or_mark_stale` 정책을 사용합니다.

## JSON 필드

```sh
npx mf classify --changed --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `classify`입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `source` (`string`): `changed` 또는 `paths`입니다.
- `files` (`string[]`): 분류한 저장소 상대 경로입니다.
- `classifications` (`object[]`): 경로별 변경 종류와 공개 표면 계약입니다.
- `summary` (`object`): 개수, 통합된 검증 이유, 변경 종류, 갱신 정책, 어긋남 검사, 영향받는 계약입니다.

## 종료 코드

- `0`: 분류 결과를 출력했습니다.
- `1`: 입력이 올바르지 않습니다.
