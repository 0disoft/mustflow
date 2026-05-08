---
title: mf version-sources
description: Package और template version sources देखने के लिए read-only command.
---

`mf version-sources` वर्तमान mustflow root में package या template version source जैसे दिखने वाले files रिपोर्ट करता है। यह `.mustflow/config/versioning.toml` से optional declarations भी पढ़ता है।

यह command versions edit नहीं करती, tags नहीं बनाती, commit नहीं करती, और push नहीं करती। इससे agents और भविष्य के dashboard panes वही version-source discovery देख सकते हैं जो `mf check --strict` उपयोग करता है।

## Output

- `mustflow root`: वर्तमान mustflow root.
- `Versioning preferences`: `[release.versioning]` preferences enabled हैं या नहीं.
- `Sources`: Detected या declared files और उनका source kind.

## Example

```sh
npx mf version-sources
```

## JSON Fields

```sh
npx mf version-sources --json
```

- `schema_version` (`string`): Output format version.
- `command` (`string`): हमेशा `version-sources`.
- `mustflow_root` (`string`): वर्तमान mustflow root.
- `versioning_enabled` (`boolean`): Version-impact preferences enabled हैं या नहीं.
- `sources` (`object[]`): `path`, `kind`, और optional `declared` तथा `authority` fields वाले version sources.

## Help and Exit Codes

```sh
npx mf version-sources --help
```

- Exit code `0`: Version sources जाँचे और प्रिंट किए गए.
- Exit code `1`: Command को unknown option मिला.
