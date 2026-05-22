# Styles de docs-site

Langues : [Anglais](../../../../../src/styles/README.md) · [Coréen](../../../ko/src/styles/README.md) · [Chinois](../../../zh/src/styles/README.md) · [Español](../../../es/src/styles/README.md) · [Français](README.md) · [Hindi](../../../hi/src/styles/README.md)

Ce répertoire héberge les couches de style visuel pour le site de documentation. Plutôt que de s'appuyer sur des frameworks d'interface utilisateur monolithiques, `docs-site` gère sa mise en page, ses composants et sa typographie à l'aide de feuilles CSS pures (vanilla) et modulaires, séparées selon des préoccupations spécialisées de mise en page et d'interaction avec l'utilisateur.

---

## Ordre de chargement & Cascade (Cascading)

L'ordre de chargement et de compilation de ces feuilles de style est strictement défini dans `../config/styles.mjs`. Lors de l'ajout de nouvelles règles visuelles, assurez-vous qu'elles héritent des styles de manière prévisible le long de la cascade CSS.

---

## Registre des modules de feuilles de style

* **`tokens.css`** : Le moteur de tokens de conception. Régule les propriétés CSS personnalisées (variables globales) centralisées pour les palettes de couleurs (variables HSL), la typographie (polices Inter, Outfit), les rayons de bordure et les systèmes de grille spatiale.
* **`layout.css`** : Définit les métriques de la grille de la fenêtre d'affichage (viewport), les marges et les conteneurs flex pour le cadre central de Starlight (barre latérale de navigation, conteneur de contenu, en-tête).
* **`markdown.css`** : Gère le rendu du texte enrichi. Régit le style des tableaux, des paragraphes, des alertes personnalisées, des blocs de citation, des codes en ligne et des blocs avec coloration syntaxique.
* **`header-controls.css`** : Surcharge spécifiquement les mises en page des éléments d'en-tête de navigation, y compris le menu déroulant du sélecteur de langue, les boutons de changement de thème et les formulaires de recherche.
* **`page-navigation.css`** : Règles pour les liens de pagination en pied de page (ex : Page précédente / Page suivante).
* **`interaction.css`** : Contrôle les micro-animations dynamiques, les états actifs, les effets de survol (hover) et les surcharges de sélection de texte pour les éléments d'interface utilisateur statiques tels que les logos et les liens de navigation.
* **`accessibility.css`** : Le protecteur central de l'accessibilité web. Impose des anneaux de mise au point (focus) à contraste élevé, des surcharges de contour personnalisées, l'isolation de la direction CSS (`unicode-bidi`) et des requêtes média de réduction de mouvement (`prefers-reduced-motion: reduce`).

---

## Bonnes pratiques pour les tokens de conception (`tokens.css`)

Utilisez toujours des variables CSS au lieu de valeurs hexadécimales codées en dur pour prendre en charge de manière fluide le basculement dynamique entre les thèmes clair et sombre :
```css
/* Bonne pratique */
.my-card {
  background-color: var(--sl-color-bg-inline);
  padding: var(--sl-spacing-md);
}

/* Mauvaise pratique */
.my-card {
  background-color: #1a1a1a;
  padding: 16px;
}
```

---

## Accessibilité & Contrôles au clavier

Les modifications de style doivent respecter les paramètres de l'utilisateur :
* **États de mise au point (Focus)** : Les indicateurs de focus à haute visibilité doivent être conservés ; n'écrivez pas `outline: none` à moins de fournir un sélecteur de focus explicitement équivalent.
* **Mouvement réduit** : Toute animation personnalisée, effet de glissement ou transition doit s'adapter gracieusement lorsque le système d'exploitation de l'utilisateur a désactivé les mouvements. Assurez-vous que ces exceptions sont ajoutées dans `@media (prefers-reduced-motion: reduce)`.
* **Navigation au clavier** : Les états interactifs non-CSS (tels que les pièges de focus au clavier) sont gérés dynamiquement dans `../../public/keyboard-navigation.js` et enregistrés dans `../config/head.mjs`.
