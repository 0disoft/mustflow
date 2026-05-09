---
title: mf update
description: Previsualiza o aplica de forma segura actualizaciones para un flujo de documentos mustflow instalado.
---

`mf update` compara el flujo de documentos mustflow instalado con la plantilla incluida actualmente.

`mf update --dry-run` lee `manifest.lock.toml`, comprueba si los archivos actuales todavía coinciden con sus hashes de instalación y genera un plan de actualización.
`mf update --apply` ejecuta actualizaciones y creaciones solo cuando no hay cambios locales bloqueantes ni elementos que requieran revisión manual.
Incluye la bandera `--json` cuando una automatización o un agente necesite analizar el plan.

Tanto la salida legible para personas como la salida JSON siguen la misma política. La línea base de comparación es el `content_hash` registrado en el archivo de bloqueo; actualizaciones y creaciones son los únicos estados procesables.

## Intenciones de Comando Para Agentes

Los proyectos instalados pueden exponer las operaciones de actualización mediante intenciones configuradas de `mf run`, en lugar de pedir a los agentes que ejecuten `mf update` directamente.

- `mustflow_update_dry_run`: ejecuta `mf update --dry-run --json` y no escribe archivos.
- `mustflow_update_apply`: ejecuta `mf update --apply --json`; úsala solo después de que el plan de simulación no tenga elementos bloqueantes ni de revisión manual, y cuando la tarea requiera aplicar actualizaciones.

## Por qué la simulación va primero

Los archivos mustflow definen reglas y procedimientos para agentes, por lo que sobrescribir automáticamente archivos editados por el usuario podría borrar lógica específica del repositorio.

El comando de actualización distingue estos escenarios:

- **Coincidencia de hash**: si el archivo actual coincide con su hash de instalación inicial.
- **Diferencia con la plantilla**: si el archivo actual difiere de la plantilla incluida.
- **Cambio bloqueado**: si cambios locales del usuario impiden una actualización automática.
- **Revisión manual**: si el archivo requiere intervención humana.

## Categorías de salida

- `Blocked local changes`: el hash del archivo actual difiere del hash de instalación, lo que impide una actualización automática.
- `Manual review`: el archivo requiere inspección manual en lugar de una actualización automática, por ejemplo un bloque administrado.
- `Would update`: el archivo puede actualizarse mediante `mf update --apply`.
- `Would create`: el archivo existe en la plantilla pero todavía no está presente en la raíz actual.

Los archivos cuyo lock tiene `last_action = "customized"` se tratan como sin cambios mientras sigan coincidiendo con su línea base personalizada, aunque la plantilla incluida sea diferente.

## Ejemplo

```sh
npx mf update --dry-run
```

Cuando todo está actualizado, la salida se ve así:

```text
mustflow update plan
Policy:
- Baseline: manifest_lock_content_hash
- Apply actions: update, create
- Blocking actions: blocked-local-change, manual-review
- Backup path: .mustflow/backups/<timestamp>/
Blocked local changes: 0
Manual review: 0
Would update: 0
Would create: 0
No template updates needed.
No files were written.
```

Si se detectan cambios locales, el comando termina con el código `1`. Debes inspeccionar esos cambios antes de intentar futuras actualizaciones que escriban archivos.

## Aplicar actualizaciones

```sh
npx mf update --apply
```

`--apply` escribe archivos solo cuando se cumplen estas condiciones:

- `Blocked local changes` es `0`.
- `Manual review` es `0`.
- El elemento de destino está clasificado como `Would update` o `Would create`.

mustflow crea una copia de seguridad en `.mustflow/backups/<timestamp>/` antes de modificar cualquier archivo existente.
Después de aplicar los cambios, actualiza las entradas correspondientes en `.mustflow/config/manifest.lock.toml` con hashes nuevos y el estado `last_action`.
Si el manifest de la plantilla incluida enumera un destino fuera de `AGENTS.md` y `.mustflow/**`, la planificación de actualización falla antes de cualquier escritura.

Si un archivo de plantilla recién introducido ya existe en el repositorio pero no está registrado en el archivo de bloqueo, mustflow lo trata como un cambio local y se niega a sobrescribirlo si el contenido difiere.

## Campos JSON

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

La salida legible por máquinas incluye estos campos:

- `schema_version` (`number`): versión del formato de salida.
- `command` (`string`): siempre `update`.
- `mode` (`string`): modo de ejecución (`dry-run`, `apply` o `unspecified`).
- `policy` (`object`): política de seguridad de actualización.
- `ok` (`boolean`): si el plan no contiene elementos bloqueantes.
- `wroteFiles` (`boolean`): si realmente se escribieron archivos. Siempre es `false` para `--dry-run`.
- `summary` (`object`): recuentos del plan de actualización por estado.
- `items` (`object[]`): entradas del plan por archivo.
- `error` (`string`): motivo del error; solo aparece en salidas fallidas.

Los campos anidados usan estas estructuras:

- `policy.baseline` (`string`): línea base de decisión de actualización. Actualmente `manifest_lock_content_hash`.
- `policy.allowed_apply_actions` (`string[]`): estados que `--apply` tiene permitido escribir.
- `policy.blocking_actions` (`string[]`): estados que impiden que `--apply` escriba archivos.
- `policy.dry_run_writes_files` (`boolean`): si `--dry-run` escribe archivos. Siempre es `false`.
- `policy.backup_path_pattern` (`string`): patrón de ruta para las copias de seguridad creadas antes de reemplazar archivos.
- `policy.never_overwrite_local_changes` (`boolean`): declara que los cambios locales nunca se sobrescriben automáticamente.
- `policy.writes_only_template_manifest_paths` (`boolean`): declara que update solo escribe archivos definidos en el manifiesto de plantilla.
- `summary.blockedLocalChanges` (`number`): número de archivos bloqueados por cambios locales.
- `summary.manualReview` (`number`): número de archivos que requieren revisión manual.
- `summary.wouldUpdate` (`number`): número de archivos aptos para actualizarse.
- `summary.wouldCreate` (`number`): número de archivos aptos para crearse.
- `summary.unchanged` (`number`): número de archivos que ya coinciden con la plantilla actual.
- `items[].relativePath` (`string`): ruta de destino de la entrada del plan.
- `items[].sourceKind` (`string`): origen del elemento dentro de la fuente de plantilla.
- `items[].action` (`string`): estado de la acción planificada.
- `items[].reason` (`string`): justificación de la acción planificada.

Cuando la plantilla incluida cambió pero el usuario no editó el archivo instalado, el archivo aparece en `Would update` o `summary.wouldUpdate`.

## Ayuda y códigos de salida

```sh
npx mf update --help
```

La salida de ayuda está ordenada como `Usage`, `Options`, `Examples` y `Exit codes`.

- Código de salida `0`: el plan `--dry-run` no tiene elementos bloqueantes o `--apply` se completó correctamente.
- Código de salida `1`: cambios locales, elementos de revisión manual, archivo de bloqueo faltante, opciones no válidas o ausencia de un modo explícito impidieron el éxito.

Ejecutar `mf update` sin argumentos falla sin realizar cambios. Se recomienda revisar el plan con `mf update --dry-run` antes de ejecutar `mf update --apply`.
