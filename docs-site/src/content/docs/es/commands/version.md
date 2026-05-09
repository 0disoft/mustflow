---
title: mf version
description: Imprime la versión instalada de mustflow y opcionalmente consulta npm.
---

`mf version` imprime la versión instalada del paquete CLI de mustflow.

De forma predeterminada no hace llamadas de red, para que los scripts puedan leer la versión de forma estable.

## Consultar npm

```sh
npx mf version --check
```

`--check` consulta el registro de npm, compara la versión instalada con la última versión publicada e imprime un comando de actualización cuando existe una versión más nueva.

No instala paquetes ni modifica archivos.

## Ayuda y códigos de salida

```sh
npx mf version --help
```

- Código de salida `0`: Se imprimió la información de versión.
- Código de salida `1`: La orden recibió una opción desconocida o no pudo consultar npm.
