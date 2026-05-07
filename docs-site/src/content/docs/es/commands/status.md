---
title: mf status
description: Comando de solo lectura para ver el estado de la instalación local de mustflow.
---

`mf status` inspecciona la instalación del flujo de documentos mustflow en la raíz actual e informa cualquier archivo modificado o faltante según el archivo de bloqueo del manifiesto.

Este comando no modifica archivos. Aunque `mf check` se recomienda para puertas de automatización, `mf status` es ideal para obtener un resumen local rápido.
Usa la bandera `--json` cuando una automatización o un agente necesite salida estructurada.

## Salida

- `Installed`: si `AGENTS.md` y `.mustflow/` están presentes.
- `Manifest lock`: estado del archivo de bloqueo. Uno de `present`, `missing` o `invalid`.
- `Tracked files`: número de archivos registrados en el archivo de bloqueo.
- `Changed files`: número de archivos cuyo hash de contenido actual difiere del bloqueo.
- `Missing files`: número de archivos registrados en el bloqueo que faltan en disco.

## Ejemplo

```sh
npx mf status
```

Salida de ejemplo:

```text
mustflow status
Installed: yes
Manifest lock: present
Tracked files: 10
Changed files: 0
Missing files: 0
```

Si faltan archivos o fueron modificados, sus rutas se muestran debajo del resumen.

## Campos JSON

```sh
npx mf status --json
```

La salida legible por máquinas usa estos campos:

- `installed` (`boolean`): si existen `AGENTS.md` y `.mustflow/`.
- `manifestLock` (`string`): estado del archivo de bloqueo.
- `trackedFiles` (`number`): número de archivos registrados en el archivo de bloqueo.
- `changedFiles` (`string[]`): rutas cuyos hashes cambiaron.
- `missingFiles` (`string[]`): rutas que desaparecieron.
- `issues` (`string[]`): mensajes de problema legibles para personas.
- `template` (`object | null`): identificador y versión de plantilla registrados en el archivo de bloqueo.

## Ayuda y códigos de salida

```sh
npx mf status --help
```

La salida de ayuda está ordenada como `Usage`, `Options`, `Examples` y `Exit codes`.

- Código de salida `0`: el estado se inspeccionó e imprimió correctamente. Ten en cuenta que los archivos modificados no hacen fallar la comprobación de estado.
- Código de salida `1`: el comando recibió una opción desconocida.

Si la automatización necesita que los archivos modificados provoquen un fallo del flujo de trabajo, analiza la salida de `mf status --json` o usa `mf check`.
