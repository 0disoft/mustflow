---
title: हार्नेस अनुबंध
description: mustflow लंबे समय तक चलने वाले एजेंट हार्नेस का समर्थन कैसे करता है, बिना स्वयं हार्नेस बने।
---

mustflow स्वायत्त, लंबे समय तक चलने वाले एजेंटों को होस्ट नहीं करता। यह एजेंट हार्नेस को ऐसा repository-local अनुबंध देता है जिसे वे पढ़ और सत्यापित कर सकें।

## सीमा

- mustflow workers, personas, fleets, या cloud sandboxes शुरू नहीं करता।
- mustflow असीमित कच्चे session logs संग्रहित नहीं करता।
- mustflow hosted agent platforms या IDE agents का प्रतिस्थापन नहीं है।
- mustflow नियम, कमांड अनुबंध, refresh checkpoints, compaction policies, receipts, budgets, approvals, और handoff सीमाएं परिभाषित करता है।

## Brain, Hands, Session

- Brain: `AGENTS.md`, `agent-workflow.md`, और `skills/*/SKILL.md`।
- Hands: `commands.toml`, सीमित कमांड जीवनचक्र, और `mf run`।
- Session: सीमित run receipts, वैकल्पिक checkpoints, स्रोत से जुड़ी summaries, संक्षिप्त handoffs, और फिर से बने indexes।
- Judge: मूल स्वीकृति शर्तें, बदली हुई फ़ाइलें, कमांड अनुबंध, और receipts।

यह ढांचा सुनिश्चित करता है कि mustflow किसी एक उपकरण से बंधा न रहे। कोई host एक chat session, background cloud agent, या बाहरी orchestration loop चला सकता है, जबकि repository अनुबंध पढ़ने योग्य बना रहता है।

## अभी अपनाया गया

- `.mustflow/config/mustflow.toml` में policy fields: `[harness]`, `[budget]`, `[approval]`, और `[isolation]`।
- `agent-workflow.md` में verification ratchet rules।
- Refresh checkpoints, tiered compaction policy, और bounded retention।

संक्षिप्त summaries कम प्राथमिकता वाली सहायक memory की तरह काम करती हैं। वर्तमान उपयोगकर्ता निर्देश, वर्तमान फ़ाइलें, कमांड अनुबंध, और run receipts उनसे ऊपर माने जाते हैं। mustflow परियोजना में छिपी हुई chain of thought या पूरे chat transcripts संग्रहित नहीं करता।

## स्थगित

`completion-judge`, कार्य आइटम, handoff लिखने वाली कमांड, checkpoint कमांड, और autonomous loops वैकल्पिक भविष्य की क्षमताएं हैं। जिन अनुबंधों पर वे निर्भर हैं, उनके स्थिर होने तक उन्हें डिफ़ॉल्ट टेम्पलेट में नहीं आना चाहिए।
