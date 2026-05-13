---
title: mf dashboard
description: Inicia el panel local de mustflow.
---

`mf dashboard` inicia un panel local en el navegador para estado de mustflow, recomendaciones de verificación, command intents, explicaciones de efectos de comandos, preferencias seguras y revisión de documentos.

La pestaña de estado muestra la instalación, el bloqueo de manifiesto, la plantilla, archivos rastreados cambiados o faltantes, comandos ejecutables, la ejecución más reciente y documentos pendientes de revisión. La pestaña de verificación lee los archivos cambiados y recomienda command intents `mf run ...` que se pueden copiar, sin ejecutarlos. La pestaña de comandos lee `.mustflow/config/commands.toml`; si el índice local está actualizado, también muestra bloqueos compartidos y conflictos derivados del grafo SQLite de efectos de comando. `commands.toml` sigue siendo la única fuente de autoridad para comandos y el panel no ejecuta intents. La pestaña de configuración edita `.mustflow/config/preferences.toml`. La pestaña de revisión de documentos lee `.mustflow/review/docs.toml` y puede marcar entradas existentes como aprobadas, ignoradas o pendientes de revisión humana. No prepara cambios, no crea commits, no hace push, no cambia versiones y no ejecuta command intents.

La pestaña de comandos es de solo lectura. Muestra estado, ciclo de vida, política de ejecución, entrada estándar, tiempo límite, directorio de trabajo, rutas de escritura y motivo de bloqueo declarado. Cuando `.mustflow/cache/mustflow.sqlite` existe y está actualizado, también muestra los bloqueos de escritura derivados de cada intent y otros intents que comparten un bloqueo en conflicto. Si el índice falta o está obsoleto, muestra una indicación para reconstruirlo en lugar de devolver detalles obsoletos.

Los grupos editables incluyen valores de Git, sugerencias de commit, informes, selección de verificación, escritura de tests, umbrales y límites de candidatos de refactorización, estilo de código y preferencias de impacto de versión.

## Comportamiento actual

```sh
npx mf dashboard
```

Este comando inicia un servidor HTTP local vinculado a `127.0.0.1` por defecto, imprime la URL del panel y la abre en el navegador predeterminado.

La página del panel incluye un selector de idioma para inglés, coreano, chino, español, francés e hindi. El idioma seleccionado se guarda en el navegador.

La pestaña de revisión de documentos muestra las entradas activas por defecto. Las entradas aprobadas o ignoradas solo aparecen cuando el filtro de estado las solicita.

Usa `--port` para solicitar un puerto concreto. Usa `--no-open` para mantener cerrado el navegador. Usa `--json` cuando otra herramienta necesite leer la URL; el modo JSON no abre el navegador.

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
npx mf dashboard --export .mustflow/state/artifacts/dashboard.html
npx mf dashboard --export-json .mustflow/state/artifacts/dashboard.json
```

Usa `--export <path>` para escribir una instantánea HTML estática del dashboard sin iniciar el servidor local. Usa `--export-json <path>` para escribir la misma instantánea acotada como JSON estructurado. Las rutas de exportación deben quedar dentro de la raíz mustflow actual. Los archivos exportados no incluyen el token de sesión del dashboard, llamadas API, controles para guardar preferencias, controles de mutación de revisión de documentos, colas de salida cruda de comandos ni supuestos de servidor activo.

## Salida estructurada

Con `--json`, el comando imprime la URL del panel, la raíz mustflow y la ruta de preferencias antes de mantener activo el servidor local.

Con `--export-json`, el comando escribe un archivo JSON en lugar de imprimir la URL del servidor. El JSON incluye instantáneas de estado, verificación, comandos, actualización, skills, revisión de documentos y preferencias; omite la salida cruda de ejecuciones y registra los recortes en `limits`.

La API del panel usa un token por sesión y acepta actualizaciones solo para los campos de preferencias y transiciones de estado de revisión expuestos por la página. `git.auto_push` aparece como ajuste bloqueado.

Cuando se guarda una preferencia, el panel escribe `.mustflow/config/preferences.toml` y, si `.mustflow/config/manifest.lock.toml` existe, actualiza la entrada de ese archivo como `last_action = "customized"`. Así `mf check`, `mf status` y `mf update --dry-run` quedan alineados con la línea base local de preferencias aceptada.

Cuando una acción de revisión se guarda, el panel actualiza `.mustflow/review/docs.toml`. El tipo de revisor se mantiene amplio (`human`, `llm`, `tool` o `external`); el ID del revisor y el resumen son texto libre.

## Ayuda y códigos de salida

```sh
npx mf dashboard --help
```

- Código de salida `0`: el panel se inició o se imprimió la ayuda.
- Código de salida `1`: el panel no pudo iniciarse o la entrada no fue válida.
