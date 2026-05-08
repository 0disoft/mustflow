---
title: mf dashboard
description: Inicia el panel local de mustflow.
---

`mf dashboard` inicia un panel local en el navegador para preferencias seguras de mustflow.

La primera superficie del panel edita `.mustflow/config/preferences.toml`. No prepara cambios, no crea commits, no hace push, no cambia versiones y no ejecuta command intents.

Los grupos editables incluyen valores de Git, sugerencias de commit, informes, selección de verificación, escritura de tests, estilo de código y preferencias de impacto de versión.

## Comportamiento actual

```sh
npx mf dashboard
```

Este comando inicia un servidor HTTP local vinculado a `127.0.0.1` por defecto, imprime la URL del panel y la abre en el navegador predeterminado.

La página del panel incluye un selector de idioma para inglés, coreano, chino, español, francés e hindi. El idioma seleccionado se guarda en el navegador.

Usa `--port` para solicitar un puerto concreto. Usa `--no-open` para mantener cerrado el navegador. Usa `--json` cuando otra herramienta necesite leer la URL; el modo JSON no abre el navegador.

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
```

## Salida estructurada

Con `--json`, el comando imprime la URL del panel, la raíz mustflow y la ruta de preferencias antes de mantener activo el servidor local.

La API del panel usa un token por sesión y acepta actualizaciones solo para los campos de preferencias limitados que muestra la página. `git.auto_push` aparece como ajuste bloqueado.

Cuando se guarda una preferencia, el panel escribe `.mustflow/config/preferences.toml` y, si `.mustflow/config/manifest.lock.toml` existe, actualiza la entrada de ese archivo como `last_action = "customized"`. Así `mf check`, `mf status` y `mf update --dry-run` quedan alineados con la línea base local de preferencias aceptada.

## Ayuda y códigos de salida

```sh
npx mf dashboard --help
```

- Código de salida `0`: el panel se inició o se imprimió la ayuda.
- Código de salida `1`: el panel no pudo iniciarse o la entrada no fue válida.
