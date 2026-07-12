---
title: mf quality
description: files लिखे बिना quality-metric gaming patterns जाँचता है।
---

`mf quality check` ऐसे shortcuts ढूँढता है जो visible metric पास कराते हुए वास्तविक engineering goal कमज़ोर करते हैं। default रूप में यह Git के changed text files जाँचता है और project files नहीं लिखता।

```sh
npx mf quality check --json
npx mf quality check --all --json
```

यह long-line stuffing, एक line में कई statements, नई suppressions, type escapes, test bypasses, placeholder implementations और errors निगलने वाले empty catch ढूँढता है। `--all` tracked files और बहुत बड़े helper/util containers को भी जाँचता है। कोई risk नहीं तो `0`; risk, Git/filesystem issue या invalid input पर `1`।
