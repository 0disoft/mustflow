---
title: Especificaciones de contrato
description: Documentos raiz versionados que definen las reglas verificables de mustflow.
---

mustflow mantiene sus especificaciones de contrato versionadas en el repositorio,
en [`docs/spec/`](https://github.com/0disoft/mustflow/tree/main/docs/spec).

Estos documentos definen las reglas que los comandos y esquemas futuros deben
compartir. Son documentos de referencia concisos, no tutoriales.

## JSON Schemas

Los JSON Schemas publicados viven en
[`schemas/`](https://github.com/0disoft/mustflow/tree/main/schemas) y se
incluyen en el paquete npm.

- `doctor-report.schema.json`: `mf doctor --json`.
- `context-report.schema.json`: `mf context --json`.
- `run-receipt.schema.json`: `mf run <intent> --json` y `.mustflow/state/runs/latest.json`.
- `commands.schema.json`: `.mustflow/config/commands.toml` parseado.

`commands.schema.json` acepta metadatos `preconditions` para planificacion: pueden mostrar rutas
faltantes o artefactos obsoletos en dry-run, verify-plan y explain, pero `satisfy_intent` nunca se
ejecuta implicitamente como dependencia.

## Especificaciones actuales

- `instruction-authority-v1.md`: resolucion de reglas efectivas entre instrucciones de usuario, politica del host, archivos del repositorio, contratos de comando y estado generado.
- `command-contract-v1.md`: cuando un command intent puede ejecutarse mediante `mf run`.
- `verification-receipt-v1.md`: el recibo de ejecucion mas reciente escrito por `mf run`.
- `state-retention-v1.md`: limites para estado generado, cache, recibos y salida sin procesar.

## Relacion con archivos instalados

Las especificaciones describen el comportamiento de archivos instalados como
`AGENTS.md`, `.mustflow/docs/agent-workflow.md`,
`.mustflow/config/mustflow.toml` y `.mustflow/config/commands.toml`.

Si una especificacion y el comportamiento actual no coinciden, tratalo como un
bug de implementacion o documentacion. No uses una especificacion para anular
instrucciones actuales del usuario, controles de seguridad del host ni el root
mustflow instalado mas cercano.
