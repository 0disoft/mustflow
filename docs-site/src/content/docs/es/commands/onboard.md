---
title: mf onboard commands
description: Sugerencias de onboarding de comandos solo para revisión.
---

`mf onboard commands` inspecciona archivos de comandos existentes en la raíz y muestra sugerencias command-intent solo para revisión.

Úsalo cuando un repositorio acaba de instalar mustflow y todavía tiene muchos intents `unknown`. El comando lee entradas de `package.json`, Makefile y justfile con el mismo modelo de sugerencias que `mf contract-lint --suggest`.

Las sugerencias no otorgan autoridad de ejecución. Cada fragmento usa `status = "unknown"` y omite campos ejecutables como `argv`, `lifecycle`, `run_policy`, `stdin`, `timeout_seconds`, `writes`, `network` y `destructive`. Una persona mantenedora debe revisar el comportamiento del comando antes de copiar o ampliar un fragmento en `.mustflow/config/commands.toml`.

El comando no escribe archivos.

## Ejemplo

```sh
npx mf onboard commands
npx mf onboard commands --json
```

## Campos JSON

```sh
npx mf onboard commands --json
```

- `schema_version` (`string`): Versión del formato de salida.
- `command` (`string`): Siempre `onboard commands`.
- `mustflow_root` (`string`): Root mustflow actual.
- `command_contract_path` (`string`): Siempre `.mustflow/config/commands.toml`.
- `policy` (`object`): Indica que las sugerencias son solo para revisión, no otorgan autoridad y no escriben archivos.
- `summary` (`object`): Conteos de intents, sugerencias y errores o advertencias del contrato.
- `suggestions` (`object[]`): Candidatos solo para revisión con archivo fuente, entrada fuente, nombre de intent sugerido, razón y fragmento TOML.
- `next_steps` (`string[]`): Guía de seguimiento para revisar y validar fragmentos aceptados.

## Ayuda y códigos de salida

```sh
npx mf onboard --help
```

- Código `0`: Las sugerencias se inspeccionaron e imprimieron.
- Código `1`: El comando recibió una entrada no válida.
