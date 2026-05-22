# Configuración de docs-site

Idiomas: [Inglés](../../../../../src/config/README.md) · [Coreano](../../../ko/src/config/README.md) · [Chino](../../../zh/src/config/README.md) · [Español](README.md) · [Francés](../../../fr/src/config/README.md) · [Hindi](../../../hi/src/config/README.md)

Este directorio alberga los componentes de configuración para Starlight. En lugar de depender de un único archivo de configuración monolítico, `docs-site` adopta un enfoque de diseño modularizado donde las opciones se dividen en archivos enfocados y específicos de cada dominio.

---

## Racional del Diseño

El mantenimiento de un sitio de documentación global requiere escalar la localización, el estilo, los metadatos y la navegación simultáneamente. Al desacoplar las configuraciones en módulos `.mjs` individuales, aseguramos:
* **Aislamiento de Preocupaciones**: Los cambios en la barra lateral de navegación no afectan los metadatos de SEO ni las rutas de configuración regional (locales).
* **Fusiones más Seguras**: Múltiples colaboradores pueden actualizar las traducciones y los enlaces de navegación simultáneamente con mínimos riesgos de conflictos en git.

---

## Mapa de Archivos de Configuración

* **`site.mjs`**: Contiene metadatos principales del sitio, como la URL de producción, el título y la configuración predeterminada.
* **`head.mjs`**: Regula las etiquetas personalizadas inyectadas en el `<head>` HTML de cada página de documentación. Registre herramientas de análisis, enlaces CDN externos o scripts globales aquí.
* **`locales.mjs`**: Define los idiomas de traducción compatibles y las prioridades de mapeo.
* **`machine-readable.mjs`**: Declara los parámetros de metadatos públicos utilizados para generar `ai.txt`, `llms.txt`, `llms-full.txt` y `robots.txt`.
* **`navigation.mjs`**: El registro autorizado para la estructura de la barra lateral de documentación, los grupos anidados y los enlaces.
* **`sidebar.mjs`**: Orquesta y pasa la configuración de navegación estructurada directamente a Starlight.
* **`styles.mjs`**: Regula el orden estricto de carga y la herencia de los archivos de estilo globales.
* **`starlight.mjs`**: El compositor central que agrega dinámicamente todos los módulos anteriores en la configuración final de Starlight.

---

## El Rol de `machine-readable.mjs` (Alineación con IA y LLM)

Con el auge de los asistentes de codificación de IA basados en agentes y los rastreadores web de LLM, la documentación moderna debe ser fácilmente indexable por máquinas.
* **`llms.txt` y `llms-full.txt`**: Puntos finales estandarizados que presentan diseños markdown puros y condensados, optimizados para LLM.
* **`ai.txt`**: Proporciona sugerencias y límites de contexto estrictos diseñados específicamente para herramientas de desarrollador y agentes de codificación que leen este sitio.
* Las propiedades configuradas en `machine-readable.mjs` gobiernan directamente cómo se renderizan estos archivos.

---

## Guías de Mantenimiento Paso a Paso

### Agregar un Nuevo Documento a la Barra Lateral
1. Escriba o coloque su nuevo archivo markdown en `src/content/docs/<locale>/path/to/file.md`.
2. Abra `src/config/navigation.mjs`.
3. Localice el array de la sección de destino. Agregue su objeto de entrada:
   ```javascript
   { label: 'Mi Nueva Página', slug: 'path/to/file' }
   ```
4. Verifique que la navegación se construya correctamente usando `bun run docs:check`.

### Registrar un Archivo de Estilo Global
1. Cree su archivo CSS bajo `src/styles/`.
2. Abra `src/config/styles.mjs`.
3. Agregue la ruta relativa de su hoja de estilo al array exportado, asegurando el orden correcto en cascada.
