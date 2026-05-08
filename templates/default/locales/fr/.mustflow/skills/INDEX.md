---
mustflow_doc: skills.index
locale: fr
canonical: false
revision: 10
lifecycle: mustflow-owned
authority: router
---

# Index des skills

Consultez seulement le document de skill pertinent pour la tache courante. Si aucune skill ne s'applique,
utilisez `AGENTS.md` et `.mustflow/config/commands.toml` pour faire le plus petit changement sur.

## Regles de selection

- Au debut de la tache et avant la premiere modification, comparez la demande utilisateur et les fichiers prevus avec les declencheurs ci-dessous.
- Si un ou plusieurs declencheurs correspondent, lisez chaque `SKILL.md` avant de modifier ce perimetre.
- Quand une skill est utilisee, ou quand une skill plausible est volontairement ignoree, laissez
  une courte note de selection dans la prochaine mise a jour utilisateur ou dans le rapport final.
- Si une nouvelle condition apparait pendant la tache, comme un echec de commande, un changement de contrat de test ou une modification documentaire, arretez-vous et lisez la skill correspondante avant de continuer.
- Si aucun declencheur ne s'applique, n'inventez pas de skill. Continuez avec `AGENTS.md`, `.mustflow/docs/agent-workflow.md` et `.mustflow/config/commands.toml`.
- Les documents de skill guident seulement la procedure. Ils n'autorisent pas l'execution de commandes hors des intentions declarees.
- Gardez la table de routage compacte : chaque route indique le declencheur, l'entree requise, le perimetre de modification, le risque, les intentions de verification et la sortie attendue.

| Declencheur | Document de skill | Entree requise | Perimetre de modification | Risque | Intentions de verification | Sortie attendue |
| --- | --- | --- | --- | --- | --- | --- |
| Les changements de code doivent etre relus avant le rapport | `.mustflow/skills/code-review/SKILL.md` | Diff et objectif de la tache | Fichiers modifies | comportement et regression | `test`, `test_related`, `test_audit`, `lint` | Constats ou note sans probleme |
| Les fichiers modifies exigent une classification de risque et un choix de verification | `.mustflow/skills/diff-risk-review/SKILL.md` | Liste des changements, resume du diff et objectif | Surfaces changees et rapport de verification | verification insuffisante ou excessive | `changes_status`, `changes_diff_summary`, `test`, `test_related`, `test_audit`, `lint`, `build`, `docs_validate`, `mustflow_check` | Risque, verification et notes de retour arriere |
| Des tests sont ajoutes, modifies, supprimes ou audites | `.mustflow/skills/test-maintenance/SKILL.md` | Comportement change ou preuve de test obsolete | Tests et source liee | derive de contrat | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | Justification des tests et verification |
| Les changements sensibles de securite exigent des tests de regression de cas d'abus | `.mustflow/skills/security-regression-tests/SKILL.md` | Frontiere changee, acteurs et rejet attendu | Tests et source de la frontiere de securite | fausse confiance et couverture risquee | `test`, `test_related`, `test_audit`, `lint`, `build` | Frontiere de securite, cas d'abus, tests et risques restants |
| Une intention de commande configuree ou une verification echoue | `.mustflow/skills/failure-triage/SKILL.md` | Intention echouee et fin de sortie | Cause de l'echec seulement | mauvais diagnostic | `mustflow_check`; intention echouee d'origine | Cause, correction et resultat de relance |
| `.mustflow/context/PROJECT.md` a besoin d'un contexte prudent | `.mustflow/skills/project-context-authoring/SKILL.md` | Faits projet etayes | `.mustflow/context/PROJECT.md` | derive d'autorite | `mustflow_check` | Contexte prudent mis a jour |
| Des procedures ou routes de skills sont creees ou maintenues | `.mustflow/skills/skill-authoring/SKILL.md` | Preuve de tache repetee | `.mustflow/skills/**` | chevauchement et derive de commande | `mustflow_check`, `docs_validate` | Changements de route et procedure |
| Des images web sont ajoutees, converties, redimensionnees ou remplacees | `.mustflow/skills/web-asset-optimization/SKILL.md` | Demande d'image et chemin cible | Images web | qualite et taille du fichier | `asset_optimize`, `build` | Notes d'optimisation |
| Des changements documentaires touchent les docs publiques ou le workflow | `.mustflow/skills/docs-update/SKILL.md` | Comportement ou champ modifie | Docs pertinentes seulement | docs publiques obsoletes | `docs_validate`, `mustflow_check` | Changements docs et verifications ignorees |

Lors de l'ajout d'une skill, liez-la ici et definissez le declencheur et les champs de route precis.
N'ajoutez pas de commandes shell brutes dans les skills ; referencez les noms d'intentions de `.mustflow/config/commands.toml`.
