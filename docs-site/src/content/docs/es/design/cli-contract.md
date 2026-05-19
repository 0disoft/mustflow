---
title: Contrato de salida de la CLI
description: Explica cómo los comandos mf deben formatear ayuda, errores y códigos de salida.
---

Los comandos `mf` deben permitir que agentes y personas decidan la siguiente acción a partir de la misma salida.

Por eso, cada página de ayuda de comando sigue un orden compartido.

## Forma de la ayuda

Cada salida de ayuda de comando debe incluir estos campos cuando correspondan:

- `Usage`: forma del comando.
- `Commands` o `Topics`: subcomandos o temas de ayuda.
- `Options`: opciones admitidas.
- `Examples`: comandos que pueden copiarse y ejecutarse.
- `Exit codes`: significado de los códigos de salida del proceso.

Por ejemplo, `mf check --help` debe mostrar qué opciones acepta el comando de validación y cómo informa éxito o fallo.

## Resolución de raíz mustflow

`mf init` instala un nuevo flujo de documentos mustflow en el directorio actual.

Los demás comandos posteriores a la instalación ascienden desde el directorio actual y usan el marcador `.mustflow/` más cercano como raíz mustflow actual.
Leen y escriben archivos relativos a esa raíz.

Esta regla se aplica a:

- `mf check`
- `mf status`
- `mf context`
- `mf update`
- `mf map`
- `mf help`
- `mf run`

Por ejemplo, cuando un usuario ejecuta `mf check --strict` desde `src/feature/deep`, el comando sigue validando la raíz ancestral que contiene `.mustflow/config/mustflow.toml`.
`mf map --write` y `mf run <intent> --json` también escriben `REPO_MAP.md` y `.mustflow/state/runs/latest.json` en esa misma raíz.

## Límites de módulos de comando

Los archivos grandes de comando deben dividirse por responsabilidad, no por número de líneas. Un
comando necesita un nuevo límite de módulo cuando un archivo mezcla parseo de argumentos, validación,
planificación, ejecución, escritura de recibos, renderizado de salida y adaptadores de sistemas externos.

Usa estos nombres de responsabilidad al dividir código de comando:

- Parser: convierte argumentos de CLI, archivos JSON y flags en entrada tipada.
- Validator: comprueba que la entrada siga el contrato mustflow y devuelve errores para el usuario.
- Planner: decide qué trabajo debe ocurrir sin escribir archivos ni ejecutar comandos.
- Executor: ejecuta comandos, lee o escribe archivos, controla procesos u otros efectos secundarios.
- Recorder: persiste recibos, manifests, punteros latest y referencias de evidencia.
- Renderer: convierte resultados internos en texto humano o JSON.

La dirección de dependencias debe mantenerse simple:

- `src/cli/commands/<name>.ts` o `src/cli/commands/<name>/command.ts` controla entrada CLI y salida final.
- `src/core/**` controla decisiones deterministas, identificadores, resúmenes, cálculo de estado y validaciones de contrato.
- Los módulos adapter o shell controlan ejecución de procesos, escrituras de archivos, SQLite, relojes y comportamiento de plataforma.

Los módulos core no deben importar reporters CLI, process handles, estado global mutable ni escritores
de filesystem. Los módulos CLI pueden llamar a core y adapters, pero no deben ocultar decisiones de
negocio dentro del renderizado o la escritura de recibos. Cuando un refactor toque JSON público, exit
codes, recibos o scheduling de comandos, conserva el wrapper anterior y extrae primero la porción más
pequeña que preserve comportamiento.

## Idioma de salida de la CLI

`--lang` es una opción global que selecciona el idioma del texto fijo de la CLI.
Los valores actuales son `en`, `ko`, `zh`, `es`, `fr` y `hi`. Los catálogos `es`, `fr` y `hi` siguen reutilizando texto en inglés hasta que se traduzcan.

```sh
mf --lang en help
mf --lang ko help
mf --lang zh help
mf --lang es help
mf --lang fr help
mf --lang hi help
```

`--lang` es diferente de `mf init --locale`. `--lang` controla la ayuda de terminal y las indicaciones de error; `--locale` controla el idioma de los documentos mustflow instalados.

Los valores leídos desde los archivos `.mustflow/` instalados no se traducen automáticamente. Por ejemplo, una `description` de `commands.toml` se muestra tal como está escrita, mientras que las etiquetas envolventes como `Commands`, `Preferences` o `Path` siguen el idioma de la CLI.

## Forma de error

Cuando un usuario pasa un comando u opción desconocidos, los errores comienzan con un mensaje estándar.

```text
Error: Unknown option: --bad
Run `mf check --help` for usage.
```

La salida localizada mantiene la misma forma con texto fijo traducido.

El motivo se imprime en `stderr` y el texto de uso relacionado puede imprimirse en `stdout`. Cuando la automatización necesite resultados estructurados, debe usar comandos que admitan `--json`.

## Códigos de salida

- `0`: el comando se completó normalmente, imprimió la información solicitada, pasó la validación o calculó un plan sin bloqueos.
- `1`: el comando recibió una entrada no válida, encontró problemas de validación, encontró cambios bloqueantes o recibió una solicitud de algo aún no admitido.

La CLI actual mantiene códigos de salida amplios. Los códigos más granulares deben esperar hasta que casos reales de automatización los justifiquen.

## Salida JSON

`mf check`, `mf status` y `mf update --dry-run` admiten `--json`.

La salida JSON es la superficie para agentes y scripts. Deben leer campos JSON en lugar de analizar texto de ayuda para personas.
