---
title: mf quality
description: 파일을 쓰지 않고 변경 파일에서 품질 지표 꼼수 패턴을 검사합니다.
---

`mf quality check`는 눈에 보이는 지표만 통과시키면서 실제 목표를 약화시키는 우회 패턴을 검사합니다. 기본으로 Git의 변경 텍스트 파일을 확인하며 프로젝트 파일을 쓰지 않습니다.

```sh
npx mf quality check --json
npx mf quality check --all --json
```

검사는 긴 줄에 코드 몰아넣기, 한 줄 다중 문장, 새 suppression, 타입 탈출, 테스트 우회, placeholder 구현, 오류를 삼키는 빈 catch, 생성물·vendor 경로의 실행처럼 보이는 코드를 찾습니다. `--all`은 추적 파일 전체를 감사하며 지나치게 큰 helper·util·manager 컨테이너도 설계 위험 후보로 보고합니다.

성공은 위험이 없을 때 `0`, 위험·Git/파일 시스템 문제·잘못된 입력은 `1`입니다.
