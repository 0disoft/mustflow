---
title: Usar mustflow en tu repositorio
description: Instala mustflow en un proyecto y verifica el flujo sin adivinar comandos.
---

Usa esta ruta cuando mantienes un repositorio y quieres que los agentes sigan reglas locales del proyecto.

## Instalación

```sh
npm install -D mustflow
npx mf init --yes
npx mf check --strict
```

`mf init` instala `AGENTS.md` y `.mustflow/**`. No crea código de aplicación, archivos de CI ni documentos raíz propios del proyecto.

## Primer cambio

```sh
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
```

La autoridad para ejecutar comandos viene solo de `.mustflow/config/commands.toml`. Las skills, los archivos de contexto, los mapas generados, la búsqueda, la caché y el estado pueden guiar o explicar el trabajo, pero no conceden permiso para ejecutar comandos.

## Siguientes archivos

- Lee `AGENTS.md` para ver las reglas locales que los agentes leen primero.
- Configura intents ejecutables en `.mustflow/config/commands.toml`.
- Usa `mf doctor` cuando necesites una revisión de estado de solo lectura.
- Revisa `examples/minimal-js/` para ver la forma mínima de un proyecto.
