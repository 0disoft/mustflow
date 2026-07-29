---
title: mf crash-evidence
description: 범위가 제한된 네이티브 크래시 증거를 검증하고 정규화하며 결정적으로 재현합니다.
---

`mf crash-evidence`는 증거 기록 검증, 오프라인 아티팩트 정규화, 모델링한 작업 순서 재현을
서로 다른 주장으로 다룹니다.

## 검증

```sh
npx mf crash-evidence validate crash/evidence.json --json
```

경로는 mustflow 루트 안의 4 MiB 이하 일반 파일이어야 합니다. 종료 코드 `0`은 구조와 의미가
유효하다는 뜻이며 `ready`만 뜻하지 않습니다. 유효하지만 `incomplete`인 기록도 `0`이므로
반드시 `readiness`를 확인합니다. 거부되거나 읽을 수 없는 입력은 `1`입니다.

## 수집

```sh
npx mf crash-evidence collect crash/crash.dmp --adapter windows-minidump --binary bin/app.exe --output crash/evidence.json --json
```

어댑터는 `windows-minidump`, `linux-core`, `sanitizer`입니다. 수집기는 오프라인으로만 동작하며
디버거 실행, 심볼 로드, 없는 레지스터나 프레임 추측을 하지 않습니다. `--binary`는 정확한 후보 파일의
SHA-256을 `candidate_only`로 기록하며 dump module과 일치한다고 증명하지 않습니다. 출력은 mustflow
루트 안에만 쓰며 기존 파일 교체에는 `--overwrite`가 필요합니다. `captured_at`은 사고 시각이 아니라
증거 수집 시각이며 minidump의 절대 module 경로와 sanitizer summary/frame의 절대 source 경로는
portable 기록에서 제거합니다. Sanitizer adapter는 일반적인 ASan, TSan, MSan, LSan 및 UBSan
`runtime error:` 형식을 지원하며 frame 수집은 제한 범위 안에서만 수행합니다.

## Race 재현

```sh
npx mf crash-evidence race crash/race-scenario.json --json
```

시나리오는 actor, 작업, 정확한 schedule, 선택적 실패 순번, 주소 재사용 정책을 선언합니다.
결과는 use-after-free, 오래된 generation, 획득 중 free, 누락 schedule 같은 finding과 결정적 trace를
기록합니다. 이 결과는 모델링한 작업 순서만 증명하며 실제 네이티브 메모리 순서나 운영 타이밍은 증명하지 않습니다.
