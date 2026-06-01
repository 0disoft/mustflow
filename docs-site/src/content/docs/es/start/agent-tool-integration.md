---
title: Crear una integración de agente o herramienta
description: Conecta una herramienta de codificación con IA o un harness a mustflow mediante contratos locales y neutrales.
---

Usa esta ruta cuando construyes una herramienta de codificación con IA, un harness de agente, una integración de editor o una automatización que necesita datos estables de mustflow.

## Lectura

- Empieza por `AGENTS.md`.
- Usa `mf context --json` para obtener orientación del repositorio en formato legible por máquina.
- Trata los archivos de instrucciones específicos del host como entradas de compatibilidad, no como autoridad de comandos.

## Planificación y verificación

```sh
mf api workspace-summary --json
mf api serve --stdio
mf classify --changed --json
mf verify --reason code_change --plan-only --json
mf run <intent> --json
```

Usa salidas JSON y esquemas en vez de analizar texto de terminal pensado para personas. Los esquemas publicados están en `schemas/`.

## Límite de autoridad

`.mustflow/config/commands.toml` es la única fuente de autoridad para ejecutar comandos. La búsqueda, los índices locales, los mapas generados, las preferencias, el contexto y el estado de ejecución son solo datos explicativos.
