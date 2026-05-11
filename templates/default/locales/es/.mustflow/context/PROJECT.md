---
mustflow_doc: context.project
kind: mustflow-context
locale: es
canonical: false
revision: 1
lifecycle: user-editable
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# Contexto del Proyecto

Este archivo documenta el contexto específico del proyecto para agentes de codificación.  
Si algún campo es desconocido, déjalo sin completar; no supongas ni inventes detalles.

## Límites de Autoridad

- Este archivo puede registrar contexto respaldado, incógnitas y conflictos.  
- No debe otorgar permisos para ejecutar comandos, definir prohibiciones de edición de archivos, reemplazar `AGENTS.md` o `.mustflow/config/*.toml`, ni prometer funciones que no estén respaldadas por las fuentes actuales.  
- Traslada las reglas operativas duraderas a `AGENTS.md`, `.mustflow/docs/agent-workflow.md` o al archivo de configuración correspondiente en lugar de guardarlas aquí.

## Objetivo Actual

Sin definir. Sustituye este texto por el objetivo actual del proyecto cuando la persona responsable lo proporcione.

## No-Objetivos

Sin definir. Enumera áreas u objetivos que el agente no debe perseguir en tareas no relacionadas.

## Promesas Principales

- Sigue `AGENTS.md` para las reglas operativas obligatorias.  
- Considera `.mustflow/config/commands.toml` como la fuente de verdad para comandos.  
- Considera `.mustflow/config/mustflow.toml` como la fuente de verdad para límites de flujo de trabajo y documentos.  
- Usa `REPO_MAP.md` como mapa de navegación superficial cuando se requiera una vista más amplia del repositorio.

## Términos del Dominio

Sin definir. Agrega solo términos que afecten decisiones de implementación.

## Áreas de Cuidado Especial

Sin definir. Lista rutas, API públicas, archivos generados, migraciones, secretos o superficies de compatibilidad que requieran atención especial.

## Lectura Recomendada

- `AGENTS.md`  
- `.mustflow/docs/agent-workflow.md`  
- `.mustflow/config/mustflow.toml`  
- `.mustflow/config/commands.toml`  
- `.mustflow/skills/INDEX.md`

## Verificación de Obsolescencia

- Si este archivo entra en conflicto con el código actual, pruebas, contratos de comandos o instrucciones del usuario, trátalo como desactualizado y reporta el conflicto.  
- Actualiza este archivo solo cuando cambie realmente la dirección del proyecto, los no-objetivos o las promesas de alcance del repositorio.