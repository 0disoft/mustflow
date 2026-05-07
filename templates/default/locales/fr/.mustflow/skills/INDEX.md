---
mustflow_doc: skills.index
locale: fr
canonical: false
revision: 2
---

# Index Des Skills

Consulte uniquement le document de skill pertinent pour la tache en cours. Si aucune skill specifique ne s'applique,
refere-toi a `AGENTS.md` et `.mustflow/config/commands.toml` pour appliquer le changement sur le plus petit perimetre sur.

| Scenario | Document De Skill | Command Intents Associes |
| --- | --- | --- |
| Revoir des changements de code | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Ajouter, mettre a jour, supprimer ou auditer des tests | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investiguer un echec | `.mustflow/skills/failure-triage/SKILL.md` | L'intent d'echec original |
| Mettre a jour la documentation | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

Lors de l'introduction d'une nouvelle skill, ajoute le lien ici et definis les scenarios specifiques d'utilisation.
Evite d'inclure des commandes shell brutes dans les documents de skill; reference plutot les noms
de command intent tels qu'ils sont definis dans `.mustflow/config/commands.toml`.
