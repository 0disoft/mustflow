---
mustflow_doc: skills.index
locale: fr
canonical: false
revision: 6
---

# Index Des Skills

Consulte uniquement le document de skill pertinent pour la tache en cours. Si aucune skill specifique ne s'applique,
refere-toi a `AGENTS.md` et `.mustflow/config/commands.toml` pour appliquer le changement sur le plus petit perimetre sur.

## Regles De Selection

- Au debut d'une tache et avant la premiere edition, comparer la demande utilisateur et les fichiers
  qui devraient changer avec les scenarios ci-dessous.
- Si un ou plusieurs scenarios correspondent, lire chaque `SKILL.md` correspondant avant d'editer cette portee.
- Si une nouvelle condition apparait pendant la tache, comme un echec de commande, un changement de
  contrat de test ou un changement de documentation, s'arreter et lire la skill nouvellement pertinente.
- Si aucun scenario ne s'applique, ne pas inventer de skill. Continuer avec `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md` et `.mustflow/config/commands.toml`.
- Les documents de skill guident seulement la procedure. Ils n'autorisent pas l'execution de commandes
  hors des command intents declares.

| Scenario | Document De Skill | Command Intents Associes |
| --- | --- | --- |
| Revoir des changements de code | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Ajouter, mettre a jour, supprimer ou auditer des tests | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investiguer un echec | `.mustflow/skills/failure-triage/SKILL.md` | L'intent d'echec original |
| Remplir ou maintenir `.mustflow/context/PROJECT.md` | `.mustflow/skills/project-context-authoring/SKILL.md` | `mustflow_check` |
| Creer ou maintenir des procedures `.mustflow/skills/*/SKILL.md` | `.mustflow/skills/skill-authoring/SKILL.md` | `mustflow_check`, `docs_validate` |
| Ajouter, convertir, redimensionner ou remplacer des images web | `.mustflow/skills/web-asset-optimization/SKILL.md` | `asset_optimize`, `build` |
| Mettre a jour la documentation | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

Lors de l'introduction d'une nouvelle skill, ajoute le lien ici et definis les scenarios specifiques d'utilisation.
Evite d'inclure des commandes shell brutes dans les documents de skill; reference plutot les noms
de command intent tels qu'ils sont definis dans `.mustflow/config/commands.toml`.
