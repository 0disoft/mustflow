---
title: Documentos raíz y contratos opcionales
description: Documentos raíz y contratos legibles por máquina que mustflow puede usar como anclas de navegación cuando existen.
---

mustflow no requiere ni crea estos archivos, pero puede descubrirlos como anclas
de navegación de nivel raíz cuando ya existen en un proyecto.

## Archivos Markdown habituales

- `README.md`: resumen del proyecto para personas. Es contexto, no política para agentes.
- `PROJECT.md`: resumen propiedad del proyecto. Si también existe `.mustflow/context/PROJECT.md`, el archivo de contexto mustflow tiene el rol más claro para el flujo de agentes.
- `ROADMAP.md`: trabajo planificado, prioridades, hitos y no objetivos explícitos.
- `DESIGN.md`: identidad visual, diseño de interfaz, accesibilidad y tokens de diseño para trabajo de UI.
- `CONTRIBUTING.md`: flujo de contribución, expectativas de pull request y notas de desarrollo local.
- `SECURITY.md`: reporte de vulnerabilidades y guía para cambios sensibles de seguridad.
- `CHANGELOG.md`: historial de versiones y cambios visibles para usuarios.
- `CODE_OF_CONDUCT.md`: expectativas de participación comunitaria.
- `SUPPORT.md`: canales de soporte y expectativas de mantenimiento.
- `GOVERNANCE.md`: toma de decisiones, autoridad y proceso de mantenimiento.
- `MAINTAINERS.md`: mantenedores, propiedad de revisión y rutas de escalamiento.
- `RELEASING.md` o `RELEASE.md`: procedimiento de release y checklist de publicación.
- `TESTING.md`: estrategia de pruebas, verificaciones requeridas y criterios de validación.
- `DEPLOYMENT.md`: entornos de despliegue, objetivos de release y guía de rollout.
- `OPERATIONS.md` o `RUNBOOK.md`: operación de producción y procedimientos recurrentes.
- `CONFIGURATION.md`: variables de entorno, feature flags y configuración de ejecución.
- `DATA_MODEL.md` o `SCHEMA.md`: modelo de datos de dominio o referencia de esquema.
- `PRIVACY.md`: privacidad, manejo de datos y retención.
- `TROUBLESHOOTING.md`: fallos conocidos y recuperación.
- `ARCHITECTURE.md`: estructura del sistema, límites de módulos y decisiones de arquitectura.
- `API.md`: superficie pública de API y contratos de integración.

## Contratos legibles por máquina

Prefiere nombres específicos al propósito en lugar de un `SSOT.json` genérico.

- `project.contract.json`: contrato de repositorio que las herramientas pueden validar.
- `project.constants.json`: constantes compartidas que el código o las herramientas pueden leer.
- `design-tokens.json`: contrato de tokens de diseño.
- `openapi.json`, `openapi.yaml` o `openapi.yml`: contrato OpenAPI.
- `asyncapi.json`, `asyncapi.yaml` o `asyncapi.yml`: contrato AsyncAPI.
- `schema.graphql`: contrato de esquema GraphQL.
- `schema.prisma`: contrato de esquema de datos Prisma.

## Relación con mf init

`mf init` no copia estos archivos. Los repositorios de usuario suelen ser dueños
de esta documentación, y mustflow no debe sobrescribirla.

## Relación con REPO_MAP.md

`mf map` incluye estos archivos cuando existen para que los agentes encuentren
contexto útil sin tratar cada Markdown como lectura obligatoria. Estos archivos
no sustituyen `AGENTS.md`, `.mustflow/config/*.toml` ni el contrato de comandos.
