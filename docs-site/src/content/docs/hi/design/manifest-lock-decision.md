---
title: manifest.lock.toml संरचना निर्णय
description: mustflow अभी manifest.lock.toml hash fields को अलग-अलग क्यों नहीं करता।
---

mustflow फिलहाल `manifest.lock.toml` में एक ही `content_hash` field रखता है।

यह मान live file का वर्तमान hash नहीं है। यह अंतिम install या update के समय दर्ज किया गया file content hash है। नाम सरल है, लेकिन यह installation baseline के रूप में काम करता है।

## निर्णय

इस समय lock file को `installed_hash`, `template_hash`, और `current_hash` में विभाजित न करें।

इसके बजाय ये नियम लागू करें:

- `content_hash`: lock file में संग्रहीत installation baseline।
- Current file hash: runtime पर file system से गणना किया गया।
- Bundled template hash: runtime पर installed package के भीतर मौजूद template से गणना किया गया।

## कारण

lock file को केवल पुनरुत्पादित की जा सकने वाली installation state दर्ज करनी चाहिए।

`current_hash` हर बार बदलता है जब उपयोगकर्ता कोई फ़ाइल संपादित करता है। इसे lock file में रखने से सामान्य संपादन के बाद भी lock को फिर से लिखना पड़ेगा, जिससे baseline का उद्देश्य कमजोर होगा।

`template_hash` वर्तमान installed mustflow package से निकाला जा सकता है। जब package बदलता है, bundled template hash भी बदलता है। lock file में पुराना template hash रखने से सत्य के स्रोत आपस में टकरा सकते हैं।

## Update तुलना

`mf update --dry-run` इन तुलनाओं पर निर्भर करता है:

```text
current file hash == lock content_hash
current file hash == bundled template hash
```

- यदि पहली तुलना false है, तो फ़ाइल में local changes हैं।
- यदि पहली तुलना true और दूसरी false है, तो फ़ाइल template update candidate है।
- यदि दोनों true हैं, तो update की आवश्यकता नहीं है।

## भविष्य का विस्तार

यदि mustflow को आवश्यकता हुई, तो schema version बढ़ाया जाएगा और बाद में fields जोड़े जाएंगे:

- कई template sources के बीच तुलना।
- `AGENTS.md` या `.gitignore` जैसे managed blocks को block-level baselines के साथ सुरक्षित रूप से update करना।
- प्रत्येक template source hash का offline verification।
- mustflow package installed न होने पर भी पुनरुत्पादित update planning।
- Signed templates या supply-chain verification।

तब तक installation baseline के रूप में एक ही `content_hash` रखना सरल और अधिक मजबूत है।
