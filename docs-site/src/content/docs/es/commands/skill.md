---
title: mf skill
description: Resuelve rutas de skills y previsualiza, instala o actualiza SKILL.md externos.
---

`mf skill route` es una preselección read-only para agentes e integraciones. A partir de tarea, rutas y motivos devuelve pocos candidatos ordenados usando metadatos de rutas y frontmatter, sin cargar por defecto el índice expandido.

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json
npx mf skill import https://github.com/example/agent-skills/tree/main/review/security --dry-run --json
npx mf skill outdated --json
npx mf skill update concurrency-review --dry-run --json
```

`read_plan` y `route_card` ayudan a cargar solo los documentos necesarios, pero no reemplazan la lectura obligatoria del `SKILL.md` elegido antes de editar ni conceden autoridad de comandos.

Los skills externos viven en `.mustflow/external-skills/`. `outdated` compara la procedencia guardada; `update <name>` o `update --all` actualiza desde ella. `--trust-scripts` puede generar fragmentos de contrato restringidos, pero no ejecuta scripts y conserva las aprobaciones de red y destrucción.
