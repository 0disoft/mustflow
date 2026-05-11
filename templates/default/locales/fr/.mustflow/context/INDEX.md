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

# Index de Contexte

Consultez ce fichier pour identifier les fichiers de contexte projet pertinents pour la tâche en cours.  
Évitez de lire tous les fichiers de contexte par défaut afin de limiter le bruit.

## Contexte Disponible

| Contexte | Utiliser quand | Chemin |
| --- | --- | --- |
| project | La tâche peut impacter l’orientation du projet, le périmètre, le comportement public, les non-objectifs ou les conventions du dépôt. | `.mustflow/context/PROJECT.md` |

## Références Externes Optionnelles

| Ancre | Utiliser quand | Chemin |
| --- | --- | --- |
| vue humaine | Une vue publique du projet ou un guide d’installation est nécessaire. À considérer comme un contexte général plutôt qu’une politique obligatoire. | `README.md` |
| roadmap | Un contexte de planification, de priorités, de jalons ou de non-objectifs du projet est nécessaire. À considérer comme un contexte de planification plutôt qu’une politique Mustflow installée. | `ROADMAP.md` |
| design visuel | La tâche implique des changements d’interface, d’identité visuelle, de design tokens, de mise en page ou d’accessibilité. | `DESIGN.md` |

## Règles de Lecture

- Consultez uniquement les fichiers de contexte pertinents pour la tâche en cours.  
- Traitez les fichiers de contexte comme des indications, sauf si une source plus autoritaire est explicitement indiquée.  
- En cas de conflit entre le contexte et le code, les tests, les spécifications de commandes ou les instructions explicites de l’utilisateur, signalez le conflit et référez-vous à la source la plus autoritaire.  
- Ne supposez pas et ne créez pas les objectifs manquants du projet, les non-objectifs, les design tokens, les contrats d’API ou les règles de données.  
- Ne dupliquez pas les design tokens de `DESIGN.md` dans `.mustflow/context/`.