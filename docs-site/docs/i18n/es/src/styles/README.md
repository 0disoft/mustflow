# Estilos de docs-site

Idiomas: [Inglés](../../../../../src/styles/README.md) · [Coreano](../../../ko/src/styles/README.md) · [Chino](../../../zh/src/styles/README.md) · [Español](README.md) · [Francés](../../../fr/src/styles/README.md) · [Hindi](../../../hi/src/styles/README.md)

Este directorio alberga las capas de estilo visual para el sitio de documentación. En lugar de depender de marcos de interfaz de usuario monolíticos, `docs-site` gestiona su diseño, componentes y tipografía utilizando hojas CSS puras (vanilla) modulares separadas por preocupaciones especializadas de diseño y de interacción con el usuario.

---

## Orden de Carga y Cascada (Cascading)

El orden de carga y compilación de estas hojas de estilo está estrictamente definido en `../config/styles.mjs`. Al agregar nuevas reglas visuales, asegúrese de que hereden los estilos de manera predecible a lo largo de la cascada CSS.

---

## Registro de Módulos de Hojas de Estilo

* **`tokens.css`**: El motor de tokens de diseño. Regula las propiedades CSS personalizadas (variables globales) centralizadas para paletas de colores (variables HSL), tipografía (fuentes Inter, Outfit), radios de borde y sistemas de cuadrícula espacial.
* **`layout.css`**: Define las métricas de cuadrícula de la vista (viewport), los márgenes y los contenedores flex para el marco central de Starlight (barra lateral de navegación, contenedor de contenido, cabecera).
* **`markdown.css`**: Gestiona la renderización de texto enriquecido. Gobierna el estilo de tablas, párrafos, alertas personalizadas, bloques de citas, códigos en línea y bloques con resaltado de sintaxis.
* **`header-controls.css`**: Anula específicamente los diseños para los elementos de la cabecera de navegación, incluido el menú desplegable del selector de idiomas, los botones de cambio de tema y los formularios de búsqueda.
* **`page-navigation.css`**: Reglas para los enlaces de paginación del pie de página (ej., Página anterior / Página siguiente).
* **`interaction.css`**: Controla las microanimaciones dinámicas, los estados activos, los efectos de cernido (hover) y las anulaciones de selección de texto para elementos estáticos de la interfaz de usuario, como marcas de logotipos y enlaces de navegación.
* **`accessibility.css`**: El protector de accesibilidad web central. Impone anillos de enfoque de alta visibilidad, anulaciones de contorno personalizadas, aislamiento de dirección CSS (`unicode-bidi`) y consultas de medios para reducir el movimiento (`prefers-reduced-motion: reduce`).

---

## Mejores Prácticas para Tokens de Diseño (`tokens.css`)

Consuma siempre variables CSS en lugar de valores hexadecimales codificados para admitir el cambio dinámico entre temas claros y oscuros de manera fluida:
```css
/* Buena práctica */
.my-card {
  background-color: var(--sl-color-bg-inline);
  padding: var(--sl-spacing-md);
}

/* Mala práctica */
.my-card {
  background-color: #1a1a1a;
  padding: 16px;
}
```

---

## Accesibilidad y Controles del Teclado

Los cambios de estilo deben respetar la configuración del usuario:
* **Estados de Enfoque (Focus States)**: Se deben conservar los indicadores de enfoque de alta visibilidad; no escriba `outline: none` a menos que proporcione un selector de enfoque explíitamente equivalente.
* **Movimiento Reducido (Reduced Motion)**: Cualquier animación personalizada, efecto de deslizamiento o transición debe adaptarse con elegancia cuando el sistema operativo del usuario ha desactivado el movimiento. Asegúrese de agregar estas excepciones dentro de `@media (prefers-reduced-motion: reduce)`.
* **Navegación por Teclado**: Los estados interactivos que no son de CSS (como las trampas de enfoque de teclado) se gestionan dinámicamente en `../../public/keyboard-navigation.js` y se registran en `../config/head.mjs`.
