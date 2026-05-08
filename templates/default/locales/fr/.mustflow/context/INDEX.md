---
mustflow_doc: context.index
kind: mustflow-context
locale: fr
canonical: false
revision: 1
lifecycle: mustflow-owned
name: context-index
authority: router
stability: medium
review_status: needs_human_review
---

# Index De Contexte

Consulte ce fichier pour determiner quels fichiers de contexte projet sont pertinents pour la tache en cours.
Evite de lire tous les fichiers de contexte par defaut afin de limiter le bruit.

## Contexte Disponible

| Contexte | Utiliser quand | Chemin |
| --- | --- | --- |
| project | La tache peut impacter la direction du projet, le perimetre, le comportement public, les non-objectifs, ou les conventions du depot. | `.mustflow/context/PROJECT.md` |

## References Externes Optionnelles

| Ancre | Utiliser quand | Chemin |
| --- | --- | --- |
| vue humaine | Une vue publique du projet ou un guide d'installation est necessaire. La traiter comme un contexte general plutot qu'une politique obligatoire. | `README.md` |
| roadmap | Un contexte de planification, de priorites, de jalons ou de non-objectifs du projet est necessaire. La traiter comme un contexte de planification plutot qu'une politique mustflow installee. | `ROADMAP.md` |
| design visuel | La tache implique des changements d'interface, d'identite visuelle, de design tokens, de mise en page ou d'accessibilite. | `DESIGN.md` |

## Regles De Lecture

- Consulte uniquement les fichiers de contexte pertinents pour la tache en cours.
- Traite les fichiers de contexte comme des indications, sauf si une source plus autoritaire est explicitement indiquee.
- Si le contexte entre en conflit avec le code, les tests, les specifications de commandes ou les instructions explicites de l'utilisateur, signale le conflit et reporte-toi a la source la plus autoritaire.
- Ne suppose pas et ne fabrique pas les objectifs manquants du projet, les non-objectifs, les design tokens, les contrats d'API ou les regles de donnees.
- Ne duplique pas les design tokens de `DESIGN.md` dans `.mustflow/context/`.
