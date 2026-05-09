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

# Contexte Du Projet

Ce fichier documente le contexte specifique du projet pour les agents de codage.
Si un champ est inconnu, laisse-le non renseigne; ne suppose pas et n'invente pas de details.

## Limites D'Autorite

- Ce fichier peut consigner le contexte confirme, les inconnues et les conflits.
- Il ne doit pas accorder d'autorisation d'executer des commandes, definir des
  interdictions de modification de fichiers, remplacer `AGENTS.md` ou
  `.mustflow/config/*.toml`, ni promettre des fonctionnalites sans appui dans les
  sources actuelles.
- Place les regles operationnelles durables dans `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md` ou le fichier de configuration correspondant
  au lieu de les stocker ici.

## Objectif Actuel

Non defini. Remplacer ceci par l'objectif actuel du projet quand le proprietaire du projet le fournit.

## Non-Objectifs

Non defini. Lister les domaines ou objectifs que l'agent ne doit pas poursuivre dans les taches non liees.

## Promesses Principales

- Suivre `AGENTS.md` pour les regles operatoires obligatoires.
- Considerer `.mustflow/config/commands.toml` comme la source de verite pour les commandes.
- Considerer `.mustflow/config/mustflow.toml` comme la source de verite pour les limites de flux de travail et de documents.
- Utiliser `REPO_MAP.md` comme carte de navigation de surface quand une vue plus large du depot est necessaire.

## Termes Du Domaine

Non defini. Ajouter uniquement les termes qui influencent les decisions d'implementation.

## Zones De Vigilance Supplementaires

Non defini. Lister les chemins, API publiques, fichiers generes, migrations, secrets ou surfaces de compatibilite qui demandent une attention particuliere.

## Lire Ensuite

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## Verification D'Obsolescence

- Si ce fichier entre en conflit avec le code actuel, les tests, les contrats de commandes ou les instructions utilisateur, le traiter comme obsolete et signaler le conflit.
- Mettre a jour ce fichier seulement quand la direction du projet, les non-objectifs ou les promesses a l'echelle du depot changent reellement.
