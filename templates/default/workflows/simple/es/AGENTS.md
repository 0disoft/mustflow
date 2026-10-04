---
mustflow_doc: agents.root
locale: es
canonical: false
revision: 1
lifecycle: user-editable
authority: binding
---

# AGENTS.md

Este repositorio usa el flujo simple de mustflow.

## Prioridad

Sigue primero la tarea del usuario y las reglas del proyecto más cercano. Están por encima de este archivo.

## Lectura

Lee solo el `AGENTS.md` más cercano y el código o la configuración de paquetes que toque la tarea. Los índices de skills ampliados y la documentación del flujo son opcionales; omítelos salvo que la tarea los necesite.

## Comandos

Usa directamente los scripts del paquete, el Makefile, el Taskfile o los comandos de Go y Rust del repositorio. `mf run check`, `test`, `typecheck`, `lint` y `build` son opcionales y descubren comandos habituales en los scripts del paquete y en los manifiestos de Go y Rust. Las restricciones de comandos escritas en el repositorio siguen aplicándose y `mf run` las respeta.

## Alcance

El desarrollo normal no necesita registrar intents ni sincronizar manifiestos. Elige comprobaciones concretas y relevantes, y reutiliza resultados válidos cuando la entrada no cambió. Un fallo, un comando ausente o una comprobación que nunca se ejecutó no es un aprobado. Ejecuta las comprobaciones completas de release solo para cambios reales de release, API pública, seguridad o datos dentro del alcance actual.

## Ediciones y Git

Mantén intactas las ediciones ajenas. Deja los secretos fuera de los logs y del repositorio. Prepara un alcance exacto y haz commits pequeños y lógicos. Push, publicación y despliegue solo con autorización del usuario.

## Higiene

Evita subir la versión automáticamente y los ciclos repetidos de permisos o lecturas. Los scripts que inician procesos en segundo plano deben limpiar sus propios procesos. La documentación global strict existente no rige los flujos simple normales.
