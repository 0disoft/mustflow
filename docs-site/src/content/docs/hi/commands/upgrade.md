---
title: mf upgrade
description: package version जाँचता है और installed mustflow workflow files को सुरक्षित रूप से update करता है।
---

`mf upgrade` package update के बाद project workflow update के लिए है। यह पहले npm जाँचता है और CLI current होने पर `mf update --apply` जैसी safe policy लागू करता है।

```sh
bun update -g --latest
mf upgrade --dry-run
mf upgrade
mf check --strict
```

यह packages install नहीं करता। केवल manifest के `update` और `create` items तब लिखता है जब `Blocked local changes` और `Manual review` दोनों `0` हों; replacement से पहले backup बनाता है।

Custom `AGENTS.md`, command contract, skill index या route table plan को block कर सकते हैं। यह रुकने का संकेत है, delete या force overwrite करने का नहीं। जरूरी template change merge करें, declared manifest-lock workflow से baseline दर्ज करें और फिर `mf check --strict` चलाएँ।
