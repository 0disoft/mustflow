---
title: mf dashboard
description: स्थानीय mustflow डैशबोर्ड के लिए आरक्षित कमांड।
---

`mf dashboard` भविष्य के स्थानीय डैशबोर्ड के लिए आरक्षित है, जो mustflow document flow को दृश्य रूप से inspect और edit कर सकेगा।

यह feature अभी implemented नहीं है। command चलाने पर केवल not-implemented message print होता है और code `1` के साथ बाहर निकलता है।

## वर्तमान व्यवहार

```sh
npx mf dashboard
```

यह command server start नहीं करता और फ़ाइलें modify नहीं करता।

## संरचित आउटपुट

`mf dashboard` अभी JSON output format नहीं देता।

स्वचालन और एजेंटों को इस command को उपलब्ध workflow command नहीं मानना चाहिए।

## सहायता और निकास कोड

```sh
npx mf dashboard --help
```

- निकास कोड `0`: सहायता print हुई।
- निकास कोड `1`: डैशबोर्ड अभी implemented नहीं है।
