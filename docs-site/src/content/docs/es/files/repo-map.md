---
title: REPO_MAP.md
description: Mapa basado en archivos ancla para agentes que navegan por la raíz mustflow actual.
---

`REPO_MAP.md` es un archivo generado opcional en la raíz mustflow actual.

No es una lista completa de archivos. Encuentra archivos ancla importantes como `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, `.mustflow/context/INDEX.md` y archivos de configuración específicos de lenguaje, para que los agentes sepan dónde mirar primero dentro de la raíz actual.

La raíz no tiene por qué significar exactamente un único repositorio Git. Si la raíz mustflow actual es un espacio de trabajo que contiene repositorios independientes anidados, el mismo `REPO_MAP.md` puede incluir puntos de entrada limitados para esos repositorios.

## Dónde se usa

Los agentes lo leen solo cuando necesitan una navegación amplia por la raíz mustflow actual. No es obligatorio para cada cambio pequeño.

La navegación de la raíz pertenece a este archivo generado para que `AGENTS.md` y `.mustflow/docs/agent-workflow.md` puedan mantenerse breves.

## Función

- Resume por qué existen los archivos y directorios principales de la raíz actual.
- Reduce los primeros lugares que un agente necesita inspeccionar.
- Ayuda a los agentes a elegir un alcance de cambio seguro.
- Mantiene breve `AGENTS.md`.
- Separa la navegación del repositorio de la lista completa de archivos. Usa `git ls-files` o un editor cuando necesites todos los archivos.
- Si la raíz actual es un espacio de trabajo, enumera solo puntos de entrada de repositorios independientes anidados en lugar de describir sus detalles internos.

## Componentes

- Frase inicial: indica que es un mapa de navegación basado en archivos ancla, no una lista completa de archivos.
- Cómo usarlo: remite a los agentes a `git ls-files` cuando necesitan la lista completa.
- Anclas prioritarias: muestra archivos de primera lectura como `AGENTS.md`, `.mustflow/config/*.toml`, `.mustflow/context/INDEX.md` y `.mustflow/skills/INDEX.md`.
- Anclas por directorio: agrupa por directorio archivos importantes como `README.md`, `AGENTS.md`, `package.json`, `SKILL.md` y archivos de configuración de herramientas.
- Repositorios anidados: muestra solo puntos de entrada como `AGENTS.md`, `REPO_MAP.md`, archivos de índice de contexto y archivos de contrato de comando para repositorios independientes descubiertos bajo raíces de espacio de trabajo.
- Archivos generados: indica que `REPO_MAP.md` se genera y no debe editarse a mano.
- Reglas de exclusión: omite dependencias, salidas de compilación, cachés y archivos grandes.

## Reglas de generación

- Genéralo con la intención de comando `repo_map` o con un comando como `mf map`.
- Usa tanto `git ls-files` como el descubrimiento de anclas del sistema de archivos cuando sea posible.
- La profundidad predeterminada es 3. Esto no significa una profundidad completa del árbol; limita hasta dónde se descubren archivos ancla no prioritarios.
- Excluye `node_modules`, `dist`, `build`, `.git`, cachés y salidas grandes.
- No resumas el contenido de los archivos.
- No coloques valores volátiles, como hora de generación, hashes o recuentos de archivos, en la parte superior.
- No enumeres todos los archivos fuente. Incluye solo archivos ancla que ayuden a navegar el repositorio.
- Incluye como anclas prioritarias los archivos de configuración necesarios para interpretar el comportamiento del agente, como `.mustflow/config/preferences.toml`.
- Incluye `.mustflow/context/INDEX.md` y `.mustflow/context/PROJECT.md` cuando existan, pero no expandas de forma predeterminada todos los futuros archivos de contexto de dominio.
- Incluye `DESIGN.md` cuando exista como ancla externa opcional de diseño visual. No lo crees como parte de `mf map`.
- Aunque se enumeren repositorios anidados, no incluyas de forma predeterminada URL remotas, nombres de ramas, estado de cambios recientes, listas de comandos ni resúmenes automáticos.

## Reglas de autoría

La primera línea debe indicar que este es un mapa de navegación para la raíz mustflow actual, no un árbol completo.

```md
# REPO_MAP.md

Este archivo es un mapa de navegación basado en archivos ancla para la raíz mustflow actual, no una lista completa de archivos.
```

Cuando cambie la estructura, regénéralo en lugar de mantenerlo como un documento largo escrito a mano.
