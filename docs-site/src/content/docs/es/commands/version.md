---
title: mf version
description: Imprime la versión instalada de mustflow y opcionalmente consulta npm.
---

`mf version` imprime la versión instalada del paquete CLI de mustflow.

De forma predeterminada no hace llamadas de red, para que los scripts puedan leer la versión de forma estable.

## Consultar npm

Usa el comando directo `mf` cuando mustflow esté instalado globalmente.

```sh
mf version --check
```

Desde una instalación local del proyecto, ejecútalo mediante el gestor de paquetes.

```sh
npx mf version --check
bunx mf version --check
```

`--check` consulta el registro de npm, compara la versión instalada con la última versión publicada e imprime comandos de actualización para npm, Bun, pnpm, Yarn y Deno cuando existe una versión más nueva.

No instala paquetes ni modifica archivos.

Si la shell muestra `mf: command not found`, la orden `version` no llegó a ejecutarse: la shell no encontró el ejecutable `mf`. Instala mustflow globalmente o agrega el directorio global de ejecutables del gestor de paquetes a `PATH`.

```sh
npm install -g mustflow
bun add -g mustflow@latest
```

Con Bun, confirma que el directorio global de ejecutables de Bun, normalmente `~/.bun/bin`, esté en `PATH`.

## Ayuda y códigos de salida

```sh
npx mf version --help
```

- Código de salida `0`: Se imprimió la información de versión.
- Código de salida `1`: La orden recibió una opción desconocida o no pudo consultar npm.
