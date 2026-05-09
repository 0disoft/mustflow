---
title: mf dashboard
description: Inicia el panel local de mustflow.
---

`mf dashboard` inicia un panel local en el navegador para estado de mustflow, recomendaciones de verificación, command intents, preferencias seguras y revisión de documentos.

La pestaña de estado muestra la instalación, el bloqueo de manifiesto, la plantilla, archivos rastreados cambiados o faltantes, comandos ejecutables, la ejecución más reciente y documentos pendientes de revisión. La pestaña de verificación lee los archivos cambiados y recomienda command intents `mf run ...` que se pueden copiar, sin ejecutarlos. La pestaña de comandos lee `.mustflow/config/commands.toml` y muestra qué command intents son ejecutables, requieren solicitud del usuario, no están configurados o están bloqueados. La pestaña de configuración edita `.mustflow/config/preferences.toml`. La pestaña de revisión de documentos lee `.mustflow/review/docs.toml` y puede marcar entradas existentes como aprobadas, ignoradas o pendientes de revisión humana. No prepara cambios, no crea commits, no hace push, no cambia versiones y no ejecuta command intents.

Los grupos editables incluyen valores de Git, sugerencias de commit, informes, selección de verificación, escritura de tests, estilo de código y preferencias de impacto de versión.

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
```

## Salida estructurada

Con `--json`, el comando imprime la URL del panel, la raíz mustflow y la ruta de preferencias antes de mantener activo el servidor local.

La API del panel usa un token por sesión y acepta actualizaciones solo para los campos de preferencias y transiciones de estado de revisión expuestos por la página. `git.auto_push` aparece como ajuste bloqueado.

Cuando se guarda una preferencia, el panel escribe `.mustflow/config/preferences.toml` y, si `.mustflow/config/manifest.lock.toml` existe, actualiza la entrada de ese archivo como `last_action = "customized"`. Así `mf check`, `mf status` y `mf update --dry-run` quedan alineados con la línea base local de preferencias aceptada.

Cuando una acción de revisión se guarda, el panel actualiza `.mustflow/review/docs.toml`. El tipo de revisor se mantiene amplio (`human`, `llm`, `tool` o `external`); el ID del revisor y el resumen son texto libre.

## Ayuda y códigos de salida

```sh
npx mf dashboard --help
```

- Código de salida `0`: el panel se inició o se imprimió la ayuda.
- Código de salida `1`: el panel no pudo iniciarse o la entrada no fue válida.
