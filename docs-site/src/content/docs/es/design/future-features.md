---
title: Funciones futuras
description: Funciones propuestas para mustflow que aún no están implementadas.
---

Esta página no describe el comportamiento actual; funciona como hoja de ruta para funciones en consideración.

Hasta que se implementen, estas funciones no forman parte de la plantilla predeterminada, el contrato de comando ni las reglas de validación.

## Funciones propuestas

| Elemento | Estado | Decisión actual |
| --- | --- | --- |
| `mf dashboard` | En consideración | Nombre de comando reservado; implementación pendiente. |
| Repositorio comunitario de skills | En consideración | Las reglas de instalación y actualización de skills externos aún no están definidas. |
| Instalación de paquetes de skills | En consideración | Pendiente de estabilizar el límite entre skills predeterminados y opcionales. |
| `.mustflow/work-items/` | En consideración | Excluido de la plantilla predeterminada; sigue siendo una función opcional. |
| `mf orient` | En consideración | Actualmente cubierto por una combinación de `mf context`, `mf map` y `mf help`. |
| `mf refresh` | En consideración | Actualmente cubierto por `mf update` y `mf check --strict` para la frescura de instrucciones. |
| Adaptadores específicos de herramientas | En consideración | Evitar que nombres de productos de herramientas se conviertan en nombres de archivo predeterminados requeridos o reglas obligatorias. |

## Criterios de promoción

Una función se promoverá a comportamiento público solo cuando cumpla estas condiciones:

- No aumenta innecesariamente el flujo de documentos predeterminado creado por `mf init`.
- Proporciona un contrato de comando claro que los agentes puedan ejecutar de forma predecible.
- El uso incorrecto puede detectarse mediante `mf check --strict` u otros validadores.
- Sigue siendo legible para personas y fácil de editar manualmente.
