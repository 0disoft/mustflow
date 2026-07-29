---
title: mf crash-evidence
description: Valida, normaliza y reproduce de forma determinista evidencia acotada de fallos nativos.
---

`mf crash-evidence` separa tres afirmaciones: validar un registro, normalizar un artefacto sin conexión y reproducir una secuencia modelada.

## Validar

```sh
npx mf crash-evidence validate crash/evidence.json --json
```

El archivo debe estar dentro de la raíz de mustflow y no superar 4 MiB. El código `0` incluye registros `ready` e `incomplete` válidos; consulta siempre `readiness`. Una entrada rechazada o ilegible devuelve `1`.

## Recopilar

```sh
npx mf crash-evidence collect crash/crash.dmp --adapter windows-minidump --binary bin/app.exe --output crash/evidence.json --json
```

Los adaptadores son `windows-minidump`, `linux-core` y `sanitizer`. El recopilador no ejecuta depuradores, no carga símbolos ni inventa registros o marcos ausentes. `--binary` registra el SHA-256 del archivo candidato como `candidate_only`, sin demostrar que coincide con el módulo capturado. Para reemplazar una salida existente se requiere `--overwrite`.

Las rutas absolutas de módulos y fuentes se eliminan del registro portable. El adaptador reconoce las formas habituales de ASan, TSan, MSan, LSan y `runtime error:` de UBSan con un límite estricto de marcos.

## Reproducir carreras

```sh
npx mf crash-evidence race crash/race-scenario.json --json
```

El escenario fija actores, operaciones, orden, fallo opcional y reutilización de direcciones. El informe solo demuestra la secuencia modelada, no el orden de memoria nativo ni los tiempos de producción.
