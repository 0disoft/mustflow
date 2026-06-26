---
title: technology.toml
description: Preferencias tecnológicas opcionales y de baja autoridad para agentes.
---

`.mustflow/config/technology.toml` registra preferencias tecnológicas locales del repositorio para agentes.

El archivo es opcional y de baja autoridad. Puede ayudar a un agente a ver lenguajes, frameworks,
bibliotecas, runtimes y herramientas preferidas, permitidas o evitadas, pero no autoriza instalar
paquetes, actualizar dependencias, ejecutar migraciones, ejecutar comandos ni ignorar el código actual.

## Uso

- Registrar tecnologías preferidas para áreas como frontend, backend, UI, data o CLI.
- Registrar bibliotecas o runtimes permitidos o evitados para trabajo nuevo.
- Dar una razón breve y restricciones que mantengan las propuestas alineadas con el proyecto.
- Mantener las elecciones tecnológicas fuera de `AGENTS.md`.

Las instrucciones directas del usuario, los `AGENTS.md` con alcance, el código actual, las pruebas y
`.mustflow/config/commands.toml` tienen prioridad sobre este archivo.

## CLI

Usa `mf tech list` y `mf tech suggest` para inspeccionar preferencias tecnológicas.
Usa `mf tech add` y `mf tech remove` para actualizar este archivo de forma intencional.

`mf tech add --verify` puede verificar nombres de paquetes npm antes de escribir una preferencia, pero
no instala paquetes ni concede permiso para actualizar dependencias.
