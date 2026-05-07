---
title: Refresco de instrucciones
description: Por qué mustflow usa puntos de refresco en lugar de contadores de sesión en archivos del proyecto.
---

Las sesiones de agente de larga duración pueden alejarse de las instrucciones cargadas al inicio. La salida de herramientas, diffs grandes, compactación de contexto y cambios en repositorios anidados pueden hacer que el `AGENTS.md` inicial quede menos visible.

mustflow maneja esto con puntos de refresco.

## Qué resuelve

- Los agentes pueden volver a examinar los archivos de instrucciones relevantes antes de acciones de alto riesgo.
- La ejecución de comandos puede refrescar `commands.toml` en lugar de depender de la memoria.
- Los cambios de raíz pueden forzar la relectura del `AGENTS.md` más cercano.
- Los informes finales pueden confirmar las reglas de reporte antes de resumir el trabajo.

## Qué evita

mustflow no escribe contadores de turnos, recuentos de mensajes ni actividad de sesión en archivos del proyecto.

Ese seguimiento de estado introduciría ruido innecesario en Git, chocaría entre varios agentes y expondría metadatos de actividad. Si una aplicación host rastrea la antigüedad de la sesión, debe guardar ese estado en una caché local o almacenamiento administrado por el host.

## Niveles de refresco

- `light`: releer `AGENTS.md` y `agent-workflow.md`.
- `command`: releer `AGENTS.md` y `commands.toml`.
- `skill`: releer `AGENTS.md` y `skills/INDEX.md`.
- `full`: releer el orden completo de lectura de mustflow.

La fuente de verdad es `[refresh]` en `.mustflow/config/mustflow.toml`.

## Dirección de la CLI

Comandos futuros como `mf orient` y `mf refresh` pueden exponer esta política como un plan legible por máquinas. La plantilla actual comienza con la política y la documentación para que los hosts puedan adoptarla sin asumir que todas las herramientas comparten los mismos hooks de ciclo de vida.
