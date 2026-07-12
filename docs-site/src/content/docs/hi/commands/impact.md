---
title: mf impact
description: बदले paths के version impact की read-only report देता है।
---

`mf impact --changed` paths को classify करता है, version sources ढूँढता है और बताता है कि package या template version decision चाहिए या नहीं। यह version files नहीं बदलता, tag, commit या push नहीं करता।

```sh
npx mf impact --changed --json
npx mf impact package.json schemas/impact-report.schema.json --json
```

रिपोर्ट में preferences, severity, suggested bump, reasons, version sources और affected surfaces आते हैं। सुझाव repository policy या user instruction की जगह नहीं लेता। सफलता `0`, invalid input `1` है।
