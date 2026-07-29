---
title: mf crash-evidence
description: सीमित native crash evidence को validate, normalize और deterministically replay करें।
---

`mf crash-evidence` evidence record validation, offline artifact normalization और modeled operation schedule replay को अलग दावे मानता है।

## Validate

```sh
npx mf crash-evidence validate crash/evidence.json --json
```

फ़ाइल mustflow root के अंदर regular file और अधिकतम 4 MiB होनी चाहिए। Exit `0` valid `ready` तथा valid `incomplete` दोनों के लिए है, इसलिए `readiness` हमेशा देखें। Rejected या unreadable input `1` देता है।

## Collect

```sh
npx mf crash-evidence collect crash/crash.dmp --adapter windows-minidump --binary bin/app.exe --output crash/evidence.json --json
```

Adapters `windows-minidump`, `linux-core` और `sanitizer` हैं। Collector debugger नहीं चलाता, symbols load नहीं करता और अनुपलब्ध registers या frames नहीं गढ़ता। `--binary` candidate file का exact SHA-256 `candidate_only` के रूप में दर्ज करता है; यह captured module से match सिद्ध नहीं करता। मौजूदा output बदलने के लिए `--overwrite` आवश्यक है।

Portable record से absolute module और source paths हटा दिए जाते हैं। Adapter सामान्य ASan, TSan, MSan, LSan तथा UBSan `runtime error:` forms स्वीकार करता है और frame collection सीमित रखता है।

## Race replay

```sh
npx mf crash-evidence race crash/race-scenario.json --json
```

Scenario actors, operations, exact schedule, optional failure ordinal और address reuse तय करता है। Report केवल modeled sequence को सिद्ध करता है, native memory ordering या production timing को नहीं।
