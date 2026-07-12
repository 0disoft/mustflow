---
title: mf upgrade
description: Comprueba la versión del paquete y actualiza con seguridad los archivos de flujo instalados.
---

`mf upgrade` se usa después de actualizar el paquete. Comprueba primero npm y, si la CLI está al día, aplica la misma política segura que `mf update --apply`.

```sh
bun update -g --latest
mf upgrade --dry-run
mf upgrade
mf check --strict
```

No instala paquetes. Solo escribe elementos `update` y `create` del manifest cuando `Blocked local changes` y `Manual review` son `0`; crea copias de seguridad antes de reemplazar archivos.

Un `AGENTS.md`, contrato, índice de skills o tabla de rutas personalizado puede bloquear el plan. Es una señal para detenerse, no para borrar o sobrescribir a la fuerza. Fusiona solo el cambio necesario, registra la línea base mediante el flujo manifest-lock declarado y ejecuta después `mf check --strict`.
