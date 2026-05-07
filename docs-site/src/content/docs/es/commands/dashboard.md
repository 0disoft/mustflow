---
title: mf dashboard
description: Comando reservado para el panel local de mustflow.
---

`mf dashboard` está reservado para un futuro panel local que permita inspeccionar y editar visualmente el flujo de documentos mustflow.

La función aún no está implementada. Ejecutar el comando imprime un mensaje de no implementación y termina con el código `1`.

## Comportamiento actual

```sh
npx mf dashboard
```

Este comando no inicia un servidor ni modifica archivos.

## Salida estructurada

`mf dashboard` actualmente no proporciona un formato de salida JSON.

La automatización y los agentes no deben tratar este comando como un comando de flujo de trabajo disponible.

## Ayuda y códigos de salida

```sh
npx mf dashboard --help
```

- Código de salida `0`: se imprimió la ayuda.
- Código de salida `1`: el panel aún no está implementado.
