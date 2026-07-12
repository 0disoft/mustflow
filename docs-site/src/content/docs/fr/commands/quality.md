---
title: mf quality
description: Inspecte sans écriture les contournements qui maquillent les métriques de qualité.
---

`mf quality check` repère les raccourcis qui satisfont une métrique visible mais affaiblissent l'objectif réel. Par défaut, il analyse les fichiers texte modifiés dans Git sans écrire dans le projet.

```sh
npx mf quality check --json
npx mf quality check --all --json
```

Il cherche notamment du code tassé sur de longues lignes, plusieurs instructions par ligne, de nouvelles suppressions, échappements de type, contournements de tests, implémentations vides et `catch` silencieux. `--all` audite les fichiers suivis et les gros conteneurs helper ou util. `0`: aucun risque; `1`: risque, problème Git/fichier ou entrée invalide.
