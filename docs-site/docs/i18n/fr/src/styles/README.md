# Styles docs-site

Langues : [Anglais](../../../../../src/styles/README.md) · [Coréen](../../../ko/src/styles/README.md) · [Chinois](../../../zh/src/styles/README.md) · [Espagnol](../../../es/src/styles/README.md) · [Français](README.md) · [Hindi](../../../hi/src/styles/README.md)

Le CSS global est séparé par responsabilité.

- `tokens.css` : valeurs partagées de taille et d'espacement.
- `layout.css` : largeur et structure des zones de mise en page Starlight.
- `markdown.css` : éléments Markdown du corps.
- `header-controls.css` : contrôles de langue et de thème dans l'en-tête.
- `page-navigation.css` : liens vers les pages précédente et suivante.
- `interaction.css` : comportement de sélection de texte pour les interfaces
  interactives comme les logos, barres latérales, boutons et listes de sélection.
- `accessibility.css` : améliorations d'accessibilité pour le focus, le
  contraste élevé, la réduction des animations et l'isolation de direction.

L'ordre de chargement est défini dans `../config/styles.mjs`.

Les comportements du navigateur qui ne relèvent pas du CSS, comme la navigation
au clavier, sont gérés dans `../../public/keyboard-navigation.js` et
`../config/head.mjs`.
