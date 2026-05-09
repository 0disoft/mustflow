---
title: mf impact
description: 변경 경로의 버전 영향을 보고하는 읽기 전용 명령입니다.
---

`mf impact --changed`는 변경 경로를 읽고 공개 표면을 분류한 뒤, 버전 기준 원본을 감지해서 패키지나 템플릿 버전 결정을 해야 하는 변경인지 보고합니다.

수정 전 계획 단계에서 경로만 확인하려면 명시 경로를 전달합니다.

```sh
npx mf impact package.json schemas/impact-report.schema.json --json
```

이 명령은 버전 파일을 수정하거나 태그, 커밋, 푸시를 만들지 않습니다. 버전 영향 선호값과 변경된 표면을 기준으로 버전 결정이 필요한지만 보고합니다.

## 출력

- `mustflow 루트`: 현재 mustflow 루트입니다.
- `입력`: Git 변경 파일을 읽었는지, 직접 지정한 경로를 읽었는지 나타냅니다.
- `파일`: 확인한 파일 수입니다.
- `버전 관리 선호값`: 릴리스 버전 영향 선호값이 켜져 있는지 나타냅니다.
- `버전 결정 필요`: 변경 경로가 릴리스 관련 표면에 영향을 주는지 나타냅니다.
- `영향 심각도`: 패키지, 템플릿, 버전 기준 원본 변경은 `metadata`, 공개 API나 스키마 계약 변경은 `contract`, 버전 결정이 필요 없으면 `none`입니다.
- `제안 버전 올림`: 메타데이터 수준 변경은 `patch`, 공개 계약 변경은 `minor`, 그 외에는 `none`입니다.
- `이유`: `version_source_changed`, `public_contract_changed` 같은 안정적인 이유 식별자입니다.
- `버전 기준 원본`: 감지된 패키지와 템플릿 버전 기준 원본입니다.
- `영향받은 버전 기준 원본`: 이번 변경이 직접 건드린 버전 기준 원본입니다.
- `영향받은 공개 표면`: 이번 변경이 영향을 준 공개 표면 종류입니다.

## JSON 필드

```sh
npx mf impact --changed --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `impact`입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `source` (`string`): `changed` 또는 `paths`입니다.
- `files` (`string[]`): 확인한 저장소 상대 경로입니다.
- `versioning_enabled` (`boolean`): 버전 영향 선호값이 켜져 있는지 나타냅니다.
- `version_sources` (`object[]`): 감지된 패키지와 템플릿 버전 기준 원본입니다.
- `classification_summary` (`object`): 검증 이유, 갱신 정책, 어긋남 검사를 포함한 통합 변경 분류 요약입니다.
- `version_impact` (`object`): 버전 결정 여부, 영향 심각도, 제안 버전 올림, 이유, 영향받은 버전 기준 원본, 영향받은 공개 표면입니다.

## 종료 코드

- `0`: 버전 영향 보고서를 출력했습니다.
- `1`: 입력이 올바르지 않습니다.
