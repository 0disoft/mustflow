---
title: .mustflow/context/INDEX.md
description: agents को task-specific project context files तक भेजता है।
---

`.mustflow/context/INDEX.md` agents को बताता है कि मौजूदा task के लिए कौन सी project context files प्रासंगिक हैं।

## इसका उपयोग कहां होता है

- agents को हर context file डिफ़ॉल्ट रूप से पढ़ने से बचाता है।
- project direction को छोटे `AGENTS.md` router से अलग रखता है।
- `README.md` और `DESIGN.md` जैसे optional बाहरी anchors की ओर इशारा करता है, उन्हें mustflow-owned files बनाए बिना।

## Fields

frontmatter इस फ़ाइल को mustflow context document के रूप में पहचानता है:

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: content कितनी स्थिर रहने की उम्मीद है।
- `review_status`: क्या किसी मनुष्य ने context review किया है।

## तालिका

मुख्य table हर context name को use condition और path से जोड़ती है।

डिफ़ॉल्ट template केवल `.mustflow/context/PROJECT.md` सूचीबद्ध करता है।
frontend, backend, API, data, security, या operations context जैसी domain-specific files डिफ़ॉल्ट रूप से नहीं बनतीं।

## बाहरी anchors

`README.md` मनुष्यों के लिए overview है। Agents इसे context के रूप में उपयोग कर सकते हैं, policy के रूप में नहीं।

`DESIGN.md` mustflow द्वारा नहीं बनाया जाता। यदि यह मौजूद है, तो agents इसे UI, visual design, layout, design-token, या accessibility work के लिए पढ़ सकते हैं।
