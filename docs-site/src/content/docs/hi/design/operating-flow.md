---
title: संचालन प्रवाह
description: mustflow स्थापित करने के बाद अनुशंसित mf command sequence।
---

डिफ़ॉल्ट mustflow संचालन प्रवाह यह जांचता है कि मौजूदा root agents द्वारा पढ़े जाने के लिए तैयार है या नहीं, और ऐसा करते समय अनावश्यक फ़ाइलें नहीं बनाता।

## लिखने से पहले पूर्वावलोकन

installation plan का पूर्वावलोकन करके शुरू करें।

```sh
npx mf init --dry-run
```

मौजूदा `AGENTS.md` फ़ाइलें या `.mustflow/` directories conflicts पैदा कर सकती हैं, इसलिए बदलाव लागू करने से पहले planned writes की समीक्षा करें।

## प्रारंभ करना

यदि plan सही है, तो workflow प्रारंभ करें।

```sh
npx mf init --yes
```

यदि `AGENTS.md` पहले से मौजूद है और केवल mustflow-managed block चाहिए, तो `--merge` उपयोग करें। `--force` केवल तब उपयोग करें जब मौजूदा फ़ाइलों का backup लेकर उन्हें overwrite करना हो।

## सत्यापित करना

प्रारंभ करने के बाद document flow और settings सत्यापित करें।

```sh
npx mf check
npx mf check --json
```

मैनुअल समीक्षा के लिए डिफ़ॉल्ट मानव-पठनीय output उपयोग करें। जब किसी agent या automation को अगला कदम तय करना हो, तो JSON आउटपुट उपयोग करें।

## स्थिति जांचना

status command से देखें कि initialization के बाद installed files बदली हैं या नहीं।

```sh
npx mf status
npx mf status --json
```

यह command वर्तमान फ़ाइलों की तुलना `manifest.lock.toml` में दर्ज install-time baseline से करती है।

## Updates का पूर्वावलोकन

कोई भी बदलाव लिखने से पहले template updates का पूर्वावलोकन करें।

```sh
npx mf update --dry-run
npx mf update --dry-run --json
```

यदि plan सुरक्षित है, तो साफ़ template updates को स्पष्ट रूप से लागू करें।

```sh
npx mf update --apply
```

`mf update --apply` केवल उन फ़ाइलों को लिखता है जो अभी भी अपने installed baseline से मेल खाती हैं।
स्थानीय रूप से संपादित फ़ाइलें और new-file collisions blocked items के रूप में रिपोर्ट होते हैं।

## Navigation map बनाना

जब agents को मौजूदा root की महत्वपूर्ण फ़ाइलों का त्वरित overview चाहिए, तो navigation map बनाएं।

```sh
npx mf map --write
```

Nested repository mapping का उपयोग केवल तब करें जब workspace roots configured हों और उन child repositories के entry points चाहिए हों।

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md` मौजूदा mustflow root के लिए anchor-file map है, पूरी file listing नहीं।
