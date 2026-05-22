# Biblioteca de docs-site

Idiomas: [Inglés](../../../../../src/lib/README.md) · [Coreano](../../../ko/src/lib/README.md) · [Chino](../../../zh/src/lib/README.md) · [Español](README.md) · [Francés](../../../fr/src/lib/README.md) · [Hindi](../../../hi/src/lib/README.md)

Este directorio actúa como la capa de utilidad compartida para el sitio de documentación. Contiene ayudantes de generación de código puros y reutilizables que se comparten entre múltiples rutas, páginas o puntos finales de Astro.

---

## Principios Arquitectónicos: Controladores Delgados (Thin Controllers)

Para garantizar que el sitio de documentación siga siendo eficiente y fácil de probar, el proyecto sigue la arquitectura de **Controlador Delgado / Ruta Delgada**:
* **Sin Lógica Compleja en Línea**: Las plantillas de ruta y las páginas de Astro deben centrarse puramente en resolver solicitudes y ensamblar el diseño (layout).
* **Desacoplamiento Funcional**: El formato de metadatos complejos, el procesamiento de manifiestos y la sanitización de cadenas deben residir en funciones ayudantes puras dentro de este directorio.
* **Comprobabilidad (Testability)**: Mantener a los ayudantes puros y aislados permite probarlos unitariamente sin tener que iniciar todo el entorno de renderizado de Astro.

---

## Registro de Archivos

* **`machine-readable.mjs`**: Contiene el motor de renderizado principal que agrega configuraciones estructuradas de `../config/machine-readable.mjs` y las traduce a formatos de texto plano para los puntos finales de `ai.txt`, `llms.txt`, `llms-full.txt` y `robots.txt`.

---

## Pautas para Introducir Nuevos Ayudantes

Al agregar un nuevo ayudante o utilidad:
1. Asegúrese de que la función sea **pura** (produce salidas idénticas para entradas idénticas, sin efectos secundarios).
2. Desacóplela de los contextos específicos de Astro (ej. evite hacer referencia a globales de Astro o API de navegador directamente a menos que sea estrictamente necesario).
3. Actualice este registro con el propósito del ayudante y los archivos de referencia.
