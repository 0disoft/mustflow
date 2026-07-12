---
title: mf adapters
description: adapter files बनाए बिना host instruction-file compatibility जाँचता है।
---

`mf adapters status` वर्तमान mustflow root में host-specific instruction files को read-only रूप में जाँचता है। यह agent files, optional adapter surfaces, compatibility notes, required changes और command-authority boundary बताता है; कोई adapter या host configuration नहीं बदलता।

```sh
npx mf adapters status
npx mf adapters status --json
```

`required_changes` में जरूरी कार्रवाई और `compatibility_notes` में जानकारी होती है। परिणाम `.mustflow/config/commands.toml` के बाहर command authority नहीं देते। सफलता `0`, गलत input `1` है।
