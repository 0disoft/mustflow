---
title: .mustflow/context/PROJECT.md
description: agents के लिए project goals, non-goals, terms, और repository-wide promises दर्ज करता है।
---

`.mustflow/context/PROJECT.md` वह डिफ़ॉल्ट project context file है जिसे `mf init` स्थापित करता है।

इसे छोटा रहना चाहिए। यह पूरा architecture document, roadmap, API reference, meeting log, या generated summary archive नहीं है।

## इसका उपयोग कहां होता है

- जब कोई task scope, behavior, या repository-wide promises को प्रभावित कर सकता है, तब agents को project direction देता है।
- non-goals दर्ज करता है ताकि agents unrelated work न बढ़ाएं।
- domain terms और extra-care areas सूचीबद्ध करता है जो implementation decisions बदल सकते हैं।

## Authority

डिफ़ॉल्ट authority `contextual` है।

इसका अर्थ है कि यह फ़ाइल agent को दिशा देती है, लेकिन direct user instructions, current code, tests, command contracts, और configured policies से कम authority रखती है।

यदि यह current files से टकराती है, तो agents को conflict report करना चाहिए और इस context को stale मानना चाहिए।

## Sections

- `Current Goal`: मौजूदा project goal। नया invent करने के बजाय खाली छोड़ें।
- `Non-Goals`: वे बातें जिनमें agents को unrelated tasks के दौरान विस्तार नहीं करना चाहिए।
- `Core Promises`: repository-wide promises जिन्हें agents को सुरक्षित रखना चाहिए।
- `Domain Terms`: implementation decisions को प्रभावित करने वाले terms।
- `Extra Care Areas`: वे paths, APIs, generated files, migrations, secrets, या compatibility surfaces जिनमें सावधानी चाहिए।
- `Read Next`: इस context के बाद पढ़ी जाने वाली files।
- `Staleness Check`: file outdated होने का पता कैसे चले।
