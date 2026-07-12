---
title: mf tech
description: Gestiona preferencias tecnológicas de baja autoridad para agentes.
---

`mf tech` lee y actualiza `.mustflow/config/technology.toml`. Las preferencias son indicaciones: no instalan dependencias, no aprueban migraciones ni sustituyen el código o contrato actual.

```sh
npx mf tech list --json
npx mf tech suggest --scope frontend
npx mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --verify --why "Preferred React app framework"
npx mf tech remove framework.frontend.nextjs
```

Admite `list`, `suggest`, `add` y `remove`. `--verify` solo comprueba nombres de paquetes npm antes de escribir; no instala paquetes ni modifica `package.json`. `0` es éxito; `1`, fallo de entrada o verificación.
