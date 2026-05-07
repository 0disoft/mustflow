# Configuración de docs-site

Idiomas: [Inglés](../../../../../src/config/README.md) · [Coreano](../../../ko/src/config/README.md) · [Chino](../../../zh/src/config/README.md) · [Español](README.md) · [Francés](../../../fr/src/config/README.md) · [Hindi](../../../hi/src/config/README.md)

Este directorio divide la configuración de Starlight en archivos de origen
enfocados.

- `site.mjs`: Nombre del sitio y URL de despliegue.
- `head.mjs`: Etiquetas añadidas al `<head>` de cada página de documentación.
- `locales.mjs`: Lista de idiomas de la documentación.
- `machine-readable.mjs`: Metadatos públicos para `ai.txt`, `llms.txt`,
  `llms-full.txt` y `robots.txt`.
- `navigation.mjs`: Enlaces y grupos de documentación mostrados en la barra
  lateral.
- `sidebar.mjs`: Punto de entrada de la barra lateral pasado a Starlight.
- `styles.mjs`: Orden de carga del CSS global.
- `starlight.mjs`: Opciones de Starlight compuestas a partir de los archivos
  anteriores.

Cuando un documento nuevo deba aparecer en la barra lateral, añade su enlace a
`navigation.mjs`. Cuando añadas un archivo de estilo global, actualiza
`styles.mjs` al mismo tiempo. Cuando añadas un script de navegador, regístralo
en `head.mjs`.
