---
mustflow_doc: context.project
kind: mustflow-context
locale: es
canonical: false
revision: 1
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# Contexto Del Proyecto

Este archivo documenta contexto especifico del proyecto para agentes de codificacion.
Si un campo es desconocido, dejalo sin completar; no supongas ni inventes detalles.

## Objetivo Actual

Sin definir. Sustituye esto por el objetivo actual del proyecto cuando la persona responsable lo proporcione.

## No-Objetivos

Sin definir. Enumera areas u objetivos que el agente no debe perseguir en tareas no relacionadas.

## Promesas Principales

- Sigue `AGENTS.md` para reglas operativas obligatorias.
- Trata `.mustflow/config/commands.toml` como la fuente de verdad para comandos.
- Trata `.mustflow/config/mustflow.toml` como la fuente de verdad para limites de flujo de trabajo y documentos.
- Usa `REPO_MAP.md` como mapa de navegacion superficial cuando se necesite una vista mas amplia del repositorio.

## Terminos Del Dominio

Sin definir. Agrega solo terminos que afecten decisiones de implementacion.

## Areas De Cuidado Especial

Sin definir. Lista rutas, API publicas, archivos generados, migraciones, secretos o superficies de compatibilidad que requieran atencion especial.

## Leer A Continuacion

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## Verificacion De Obsolescencia

- Si este archivo entra en conflicto con el codigo actual, pruebas, contratos de comandos o instrucciones del usuario, tratalo como desactualizado y reporta el conflicto.
- Actualiza este archivo solo cuando cambien realmente la direccion del proyecto, los no-objetivos o las promesas de alcance del repositorio.
