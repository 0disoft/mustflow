---
title: mf help
description: Muestra ayuda leyendo los documentos y la configuración mustflow instalados.
---

`mf help` no es un manual largo separado. Lee los archivos mustflow instalados desde la raíz actual y muestra la vista correspondiente.

## Temas

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

- `workflow`: imprime `.mustflow/docs/agent-workflow.md`.
- `skills`: imprime `.mustflow/skills/INDEX.md`.
- `commands`: resume las intenciones de comando y su estado desde `.mustflow/config/commands.toml`.
- `preferences`: resume las preferencias desde `.mustflow/config/preferences.toml`.

## Principio

La salida de ayuda no introduce otra fuente de verdad. Cada tema está respaldado por un archivo mustflow instalado.

Esto reduce la divergencia entre la documentación, la configuración y la ayuda de la CLI.

## Idioma de la salida de CLI

`--lang` selecciona el idioma del texto fijo de la CLI, como encabezados de ayuda e indicaciones de error.
Los valores actuales son `en`, `ko`, `zh`, `es`, `fr` y `hi`.

```sh
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

Esto es diferente de `mf init --locale`. `--lang` controla la salida del terminal; `--locale` controla el idioma de los documentos mustflow instalados.

Cuando `mf help commands` o `mf help preferences` lee descripciones desde archivos de proyecto instalados, esos valores no se traducen automáticamente. Solo las etiquetas envolventes de la CLI usan el idioma seleccionado para la CLI.

## Salida estructurada

`mf help` actualmente no proporciona un formato de salida JSON.

Los agentes y la automatización que necesiten información estructurada de comandos deben usar `mf context --json` para obtener nombres de intenciones ejecutables y luego leer `.mustflow/config/commands.toml` cuando necesiten el contrato completo.

## Ayuda y códigos de salida

```sh
npx mf help --help
```

La salida de ayuda en inglés está ordenada como `Usage`, `Topics`, `Options`, `Examples` y `Exit codes`.
La ayuda localizada usa el mismo orden con encabezados traducidos.

- Código de salida `0`: se imprimió el tema de ayuda solicitado o se informó que falta un archivo de tema instalado.
- Código de salida `1`: el comando recibió un tema u opción desconocidos.

La lista de temas está integrada en la CLI, pero el cuerpo de cada tema se lee desde los archivos `.mustflow/` de la raíz actual.
