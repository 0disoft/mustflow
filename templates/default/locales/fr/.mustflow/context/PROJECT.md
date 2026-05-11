---
mustflow_doc: context.project
kind: mustflow-context
locale: fr
canonical: false
revision: 1
lifecycle: user-editable
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# Contexte du Projet

Ce fichier décrit le contexte spécifique du projet destiné aux agents de codage.  
Si un champ est inconnu, laissez-le vide ; ne supposez rien et n’inventez aucun détail.

## Limites d’Autorité

- Ce fichier peut consigner le contexte confirmé, les inconnues et les conflits.  
- Il ne doit pas autoriser l’exécution de commandes, définir des interdictions de modification de fichiers, remplacer `AGENTS.md` ou `.mustflow/config/*.toml`, ni promettre des fonctionnalités non appuyées par les sources actuelles.  
- Placez les règles opérationnelles durables dans `AGENTS.md`, `.mustflow/docs/agent-workflow.md` ou dans le fichier de configuration approprié, plutôt que dans ce document.

## Objectif Actuel

Non défini. Remplacez ce champ par l’objectif actuel du projet dès que le propriétaire le fournit.

## Non-Objectifs

Non défini. Listez ici les domaines ou objectifs que l’agent ne doit pas poursuivre dans le cadre des tâches non liées.

## Promesses Principales

- Respecter `AGENTS.md` pour les règles opératoires obligatoires.  
- Considérer `.mustflow/config/commands.toml` comme la source de vérité pour les commandes.  
- Considérer `.mustflow/config/mustflow.toml` comme la source de vérité pour les limites des flux de travail et des documents.  
- Utiliser `REPO_MAP.md` comme carte de navigation de surface lorsqu’une vue plus large du dépôt est nécessaire.

## Termes du Domaine

Non défini. Ajoutez uniquement les termes qui influencent les décisions d’implémentation.

## Zones de Vigilance Supplémentaires

Non défini. Listez ici les chemins, API publiques, fichiers générés, migrations, secrets ou surfaces de compatibilité nécessitant une attention particulière.

## À Lire Ensuite

- `AGENTS.md`  
- `.mustflow/docs/agent-workflow.md`  
- `.mustflow/config/mustflow.toml`  
- `.mustflow/config/commands.toml`  
- `.mustflow/skills/INDEX.md`

## Vérification d’Obsolescence

- Si ce fichier entre en conflit avec le code actuel, les tests, les contrats de commandes ou les instructions utilisateur, considérez-le comme obsolète et signalez le conflit.  
- Mettez à jour ce fichier uniquement lorsque la direction du projet, les non-objectifs ou les promesses à l’échelle du dépôt évoluent réellement.