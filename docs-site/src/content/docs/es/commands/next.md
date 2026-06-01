---
title: mf next
description: Guía de siguiente acción de solo lectura para roots mustflow.
---

`mf next` inspecciona el root mustflow actual y muestra la siguiente acción segura.

Revisa instalación, validación mustflow, archivos cambiados, requisitos de verificación, intents configurados ejecutables y brechas del contrato de comandos. No ejecuta comandos, no modifica archivos y no otorga autoridad de comandos.

Cuando los archivos cambiados no tienen verificación configurada ejecutable, `mf next` apunta a `mf onboard commands` y a la API verification-plan en lugar de adivinar comandos del package manager.

## Ejemplo

```sh
npx mf next
npx mf next --json
```

## Campos JSON

```sh
npx mf next --json
```

- `schema_version` (`string`): Versión del formato de salida.
- `command` (`string`): Siempre `next`.
- `status` (`string`): `setup_required`, `blocked`, `idle`, `needs_verification` o `unavailable`.
- `policy` (`object`): Indica que el reporte es de solo lectura y que `.mustflow/config/commands.toml` conserva la autoridad.
- `state` (`object`): Resumen de instalación, validación, archivos cambiados, intents seleccionados y brechas.
- `decision` (`object`): La acción principal siguiente, con un comando cuando es seguro sugerirlo.
- `recommended_commands` (`string[]`): Comandos mustflow de apoyo para inspeccionar, configurar o verificar.
- `gaps` (`object[]`): Requisitos de verificación sin cobertura ejecutable configurada.

## Ayuda y códigos de salida

```sh
npx mf next --help
```

- Código `0`: La siguiente acción se inspeccionó.
- Código `1`: No se pudo inspeccionar la siguiente acción porque el estado del repositorio no estaba disponible.
