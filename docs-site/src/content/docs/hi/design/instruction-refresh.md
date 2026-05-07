---
title: निर्देश ताज़ा करना
description: mustflow project-file session counters के बजाय refresh checkpoints क्यों उपयोग करता है।
---

लंबे agent sessions शुरुआत में पढ़े गए निर्देशों से alignment खो सकते हैं। Tool output, बड़े diffs, context compaction, और nested repository changes प्रारंभिक `AGENTS.md` को कम visible बना सकते हैं।

mustflow इसे refresh checkpoints से संभालता है।

## यह क्या हल करता है

- Agents high-risk actions से पहले relevant instruction files फिर से पढ़ सकते हैं।
- Command execution memory पर निर्भर रहने के बजाय `commands.toml` refresh कर सकता है।
- Root changes nearest `AGENTS.md` reread करवा सकते हैं।
- Final reports काम summarize करने से पहले reporting rules confirm कर सकते हैं।

## यह क्या बचाता है

mustflow turn counters, message counts, या session activity को project files में नहीं लिखता।

ऐसी state tracking Git में unnecessary noise लाएगी, multiple agents के बीच collide करेगी, और activity metadata expose करेगी। अगर host application session age track करे, तो उसे local cache या host-managed storage में रखना चाहिए।

## Refresh levels

- `light`: `AGENTS.md` और `agent-workflow.md` फिर से पढ़ें।
- `command`: `AGENTS.md` और `commands.toml` फिर से पढ़ें।
- `edit`: sensitive edits से पहले `AGENTS.md`, `mustflow.toml`, और `agent-workflow.md` फिर से पढ़ें।
- `report`: final report से पहले `AGENTS.md`, `mustflow.toml`, और `preferences.toml` फिर से पढ़ें।
- `skill`: `AGENTS.md` और `skills/INDEX.md` फिर से पढ़ें।
- `full`: mustflow का पूरा reading order फिर से पढ़ें।

`before_command_run` का अर्थ है command execution से पहले जरूरत पड़ने पर command contract refresh करना। इसका अर्थ हर command से पहले पूरा mustflow document set फिर से पढ़ना नहीं है।

Default thresholds 8 turns, 16 tool calls, या 100000 bytes accumulated output हैं। Source of truth `.mustflow/config/mustflow.toml` का `[refresh]` है।

## CLI दिशा

भविष्य की `mf orient` और `mf refresh` जैसी commands इस policy को machine-readable plan के रूप में expose कर सकती हैं। मौजूदा template policy और documentation से शुरू होता है ताकि host systems इसे अपना सकें, बिना यह मानें कि हर tool के lifecycle hooks समान हैं।
