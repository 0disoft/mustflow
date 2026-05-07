# Estilos de docs-site

Idiomas: [Inglés](../../../../../src/styles/README.md) · [Coreano](../../../ko/src/styles/README.md) · [Chino](../../../zh/src/styles/README.md) · [Español](README.md) · [Francés](../../../fr/src/styles/README.md) · [Hindi](../../../hi/src/styles/README.md)

El CSS global se divide por responsabilidad.

- `tokens.css`: Valores compartidos de tamaños y espaciado.
- `layout.css`: Anchura y estructura de las áreas de diseño de Starlight.
- `markdown.css`: Elementos Markdown del cuerpo.
- `header-controls.css`: Controles de idioma y tema de la cabecera.
- `page-navigation.css`: Enlaces de página anterior y siguiente.
- `interaction.css`: Comportamiento de selección de texto para interfaces
  interactivas como logotipos, barras laterales, botones y selectores.
- `accessibility.css`: Mejoras de accesibilidad para foco, alto contraste,
  reducción de movimiento y aislamiento de dirección.

El orden de carga se define en `../config/styles.mjs`.

El comportamiento del navegador que no pertenece al CSS, como la navegación con
teclado, se gestiona en `../../public/keyboard-navigation.js` y
`../config/head.mjs`.
