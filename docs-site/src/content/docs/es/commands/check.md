---
title: mf check
description: Valida el flujo de documentos mustflow en un repositorio de usuario.
---

`mf check` comprueba que los archivos mustflow instalados sean legibles y utilizables por agentes.
Después de modificar el flujo de documentos, usa `--strict` para ejecutar comprobaciones de seguridad adicionales.
Usa `--json` cuando una automatización o un agente necesite analizar los resultados.

## Criterios de validación

- `AGENTS.md` existe en la raíz del repositorio.
- `.mustflow/config/mustflow.toml` existe y puede analizarse.
- `.mustflow/config/commands.toml` existe y puede analizarse.
- `.mustflow/config/preferences.toml`, si existe, puede analizarse.
- Los campos `[map]`, `[workspace]` y `[context]` de `.mustflow/config/mustflow.toml` usan tipos válidos y rutas relativas seguras.
- `.mustflow/config/preferences.toml`, si existe, usa formas básicas válidas para idioma, formato, estilo de código, Git, documentación y preferencias de registro.
- `.mustflow/config/manifest.lock.toml`, si existe, se valida contra el contenido actual de los archivos.
- `.mustflow/skills/INDEX.md` existe.
- Los archivos `.mustflow/skills/*/SKILL.md` contienen las secciones estándar requeridas.
- Los archivos `.mustflow/context/*.md`, si existen, están identificados correctamente como documentos de contexto mustflow.
- Las intenciones de `commands.toml` con `status = "configured"` incluyen la información de comando, el ciclo de vida, la política de ejecución y el tiempo de espera requeridos.
- Los ciclos de vida de larga duración no se exponen con `run_policy = "agent_allowed"`.

## Comprobaciones estrictas

```sh
npx mf check --strict
```

`--strict` habilita comprobaciones adicionales centradas en la estabilidad de la entrada del agente y la seguridad de los comandos.

El modo estricto es opcional para que el flujo normal siga siendo ligero. Se recomienda después de modificar documentos mustflow, skills, contratos de comando o reglas de generación del mapa del repositorio.

## Reglas de configuración

`mf check` trata `[map]`, `[workspace]` y `[context]` como configuración flexible con valores predeterminados, pero falla si los valores son inseguros o ambiguos.
En instalaciones antiguas, la ausencia de `manifest.lock.toml` no hace fallar la verificación. Sin embargo, si el archivo de bloqueo existe, los archivos bloqueados que falten o cuyos hashes no coincidan se informan como errores.

- `map.output`: debe ser una ruta relativa no vacía.
- `map.mode`: actualmente solo se admite `anchors_only`.
- `map.privacy`: actualmente solo se admite `minimal`.
- `map.include_nested`: debe ser booleano.
- `map.anchor_files`: debe ser una lista de rutas relativas no vacías.
- `workspace.roots`: deben ser rutas relativas dentro de la raíz actual.
- `workspace.max_depth`, `workspace.max_repositories`: deben ser enteros positivos.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: deben ser booleanos.
- `context.root`, `context.index`, `context.default_files` y `context.external_anchors`: deben usar rutas relativas no vacías.
- `context.read_policy`: actualmente solo se admite `task_relevant_only`.
- `context.authority`: actualmente solo se admite `contextual`.
- Los valores principales de `preferences.toml` deben ser cadenas.
- Las opciones de confirmación automática, datos sensibles y refactorizaciones automáticas de `preferences.toml` deben ser booleanas.
- `docs.update_when` en `preferences.toml` debe ser una lista de cadenas.
- Las intenciones ejecutables de `commands.toml` deben declarar `lifecycle`, `run_policy`, `timeout_seconds` y `stdin`.
- Las intenciones con `lifecycle = "oneshot"` requieren `timeout_seconds` y `stdin = "closed"`.
- Las intenciones `server`, `watch`, `interactive`, `browser` y `background` no deben exponerse como comandos predeterminados ejecutables por agentes.

## Secciones estándar de skill

Los documentos de skill deben incluir estas secciones.

```text
## Propósito
## Cuándo usar
## Cuándo no usar
## Entradas requeridas
## Procedimiento
## Validación
## Manejo de fallos
## Contrato de salida
```

## Ejemplo

```sh
npx mf check
```

Si tiene éxito, imprime:

```text
mustflow check passed
```

Si falla, imprime los archivos o secciones faltantes en el error estándar y sale con el código `1`.

## Campos JSON

```sh
npx mf check --json
```

La salida legible por máquinas usa estos campos:

- `ok` (`boolean`): si todas las comprobaciones pasaron.
- `strict` (`boolean`): si las comprobaciones `--strict` estaban habilitadas.
- `issueCount` (`number`): número de problemas encontrados.
- `issues` (`string[]`): mensajes de problema legibles para personas.

Cuando se encuentran problemas, la salida JSON también termina con el código `1`.

## Ayuda y códigos de salida

```sh
npx mf check --help
```

La salida de ayuda está ordenada como `Usage`, `Options`, `Examples` y `Exit codes`.

- Código de salida `0`: todos los archivos y ajustes requeridos son válidos.
- Código de salida `1`: la validación encontró problemas o el comando recibió una opción desconocida.

Los agentes y la automatización deben usar los campos `ok` e `issues` de la salida `--json` en lugar de analizar texto de éxito o error legible para personas.
