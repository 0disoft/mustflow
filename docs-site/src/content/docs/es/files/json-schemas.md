---
title: schemas/
description: Contratos JSON Schema publicados para la salida JSON estable de mustflow.
---

`schemas/` contiene los contratos JSON Schema publicados para la salida de
mustflow pensada para herramientas y para las formas de configuración ya
analizadas.

## Instalado por mf init

No. `mf init` no copia `schemas/` en el repositorio del usuario.

La plantilla inicial se mantiene intencionalmente pequeña. Instala `AGENTS.md`,
`.mustflow/**` y el bloque gestionado por mustflow en `.gitignore`; `REPO_MAP.md`
se genera después con `mf map`.

## Distribuido con el paquete npm

Sí. `schemas/` se incluye en el paquete npm para que las herramientas puedan
depender de estos contratos sin analizar texto pensado para personas.

Al crear automatizaciones para la salida `--json`, usa los esquemas del paquete
instalado o los del repositorio de mustflow.

## Esquemas actuales

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `contract-lint-report.schema.json`: `mf contract-lint --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `docs-review-list.schema.json`: `mf docs review list --json`
- `latest-run-pointer.schema.json`: `.mustflow/state/runs/latest.json` cuando `mf verify`
  escribe un puntero al último paquete de verificación
- `verify-report.schema.json`: `mf verify --reason <event> --json`
- `verify-run-manifest.schema.json`: `.mustflow/state/runs/verify-latest/manifest.json`
- `run-receipt.schema.json`: `mf run <intent> --json` y `.mustflow/state/runs/latest.json`
- `commands.schema.json`: `.mustflow/config/commands.toml` analizado

La salida de comandos pensada para personas no está cubierta por estos esquemas.
