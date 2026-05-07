---
title: निर्देश ताज़ा करना
description: mustflow project-file session counters के बजाय refresh checkpoints क्यों उपयोग करता है।
---

लंबे समय तक चलने वाले agent sessions शुरुआत में पढ़े गए निर्देशों से अलग दिशा में जा सकते हैं। Tool output, बड़े diffs, context compaction, और nested repository बदलाव शुरुआती `AGENTS.md` को कम दिखाई देने वाला बना सकते हैं।

mustflow इसे refresh checkpoints से संभालता है।

## यह क्या हल करता है

- Agents अधिक जोखिम वाले कदमों से पहले संबंधित निर्देश फ़ाइलों को फिर से देख सकते हैं।
- Command execution स्मृति पर निर्भर रहने के बजाय `commands.toml` को ताज़ा पढ़ सकता है।
- Root बदलाव सबसे नज़दीकी `AGENTS.md` को फिर से पढ़ना अनिवार्य कर सकते हैं।
- अंतिम reports काम का सार लिखने से पहले reporting rules की पुष्टि कर सकती हैं।

## यह किससे बचता है

mustflow project files में turn counters, message counts, या session activity नहीं लिखता।

ऐसी state tracking Git में अनावश्यक शोर जोड़ेगी, कई agents के बीच टकरा सकती है, और activity metadata उजागर कर सकती है। यदि कोई host application session age को track करता है, तो उसे यह state local cache या host-managed storage में रखनी चाहिए।

## Refresh स्तर

- `light`: `AGENTS.md` और `agent-workflow.md` फिर से पढ़ें।
- `command`: `AGENTS.md` और `commands.toml` फिर से पढ़ें।
- `skill`: `AGENTS.md` और `skills/INDEX.md` फिर से पढ़ें।
- `full`: mustflow का पूरा reading order फिर से पढ़ें।

सत्य का स्रोत `.mustflow/config/mustflow.toml` का `[refresh]` है।

## CLI दिशा

भविष्य की `mf orient` और `mf refresh` जैसी कमांड इस नीति को मशीन-पठनीय योजना के रूप में उजागर कर सकती हैं। मौजूदा टेम्पलेट नीति और दस्तावेज़ीकरण से शुरू होता है ताकि host systems इसे अपना सकें, बिना यह मानें कि हर tool के lifecycle hooks समान हैं।
