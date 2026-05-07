---
title: Refresco de instrucciones
description: Por qué mustflow usa puntos de refresco en lugar de contadores de sesión en archivos del proyecto.
---

Las sesiones largas de agentes pueden perder alineación con las instrucciones cargadas al inicio. La
salida de herramientas, los diffs grandes, la compactación de contexto y los cambios en repositorios
anidados pueden hacer que el `AGENTS.md` inicial sea menos visible.

mustflow maneja esto con puntos de refresco.

## Qué resuelve

- Los agentes pueden volver a examinar los archivos de instrucciones relevantes antes de acciones de alto riesgo.
- La ejecución de comandos puede refrescar `commands.toml` en lugar de depender de la memoria.
- Los cambios de raíz pueden forzar la relectura del `AGENTS.md` más cercano.
- Los informes finales pueden confirmar las reglas de reporte antes de resumir el trabajo.

## Qué evita

mustflow no escribe contadores de turnos, número de mensajes ni actividad de sesión en archivos del proyecto.

Ese seguimiento de estado introduciría ruido innecesario en Git, chocaría entre varios agentes y expondría metadatos de actividad. Si una aplicación host rastrea la edad de la sesión, debe guardar ese estado en una caché local o en almacenamiento gestionado por el host.

## Niveles de refresco

- `light`: releer `AGENTS.md` y `agent-workflow.md`.
- `command`: releer `AGENTS.md` y `commands.toml`.
- `edit`: releer `AGENTS.md`, `mustflow.toml` y `agent-workflow.md` antes de ediciones sensibles.
- `report`: releer `AGENTS.md`, `mustflow.toml` y `preferences.toml` antes del informe final.
- `skill`: releer `AGENTS.md` y `skills/INDEX.md`.
- `full`: releer el orden completo de lectura de mustflow.

`before_command_run` significa refrescar el contrato de comandos cuando sea necesario antes de ejecutar un comando. No significa releer todo el conjunto de documentos mustflow antes de cada comando.

Los umbrales predeterminados son 8 turnos, 16 llamadas a herramientas o 100000 bytes de salida acumulada. La fuente de verdad es `.mustflow/config/mustflow.toml` `[refresh]`.

## Dirección de CLI

Futuros comandos como `mf orient` y `mf refresh` pueden exponer esta política como un plan legible por máquina. La plantilla actual comienza con la política y la documentación para que los hosts puedan adoptarla sin asumir que todas las herramientas comparten los mismos hooks de ciclo de vida.
