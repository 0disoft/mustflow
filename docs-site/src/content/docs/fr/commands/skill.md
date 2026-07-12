---
title: mf skill
description: Résout des routes de skills et prévisualise, installe ou met à jour des SKILL.md externes.
---

`mf skill route` est une présélection en lecture seule pour les agents et intégrations. Il classe quelques candidats à partir de la tâche, des chemins et des raisons, en utilisant les métadonnées de route et le frontmatter sans charger par défaut l'index étendu.

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json
npx mf skill import https://github.com/example/agent-skills/tree/main/review/security --dry-run --json
npx mf skill outdated --json
npx mf skill update concurrency-review --dry-run --json
```

`read_plan` et `route_card` aident à charger seulement les documents nécessaires; ils ne remplacent pas la lecture obligatoire du `SKILL.md` choisi et ne donnent pas d'autorité de commande.

Les skills externes vivent sous `.mustflow/external-skills/`. `outdated` compare la provenance enregistrée; `update <name>` ou `update --all` actualise depuis elle. `--trust-scripts` peut créer un fragment de contrat limité, sans exécuter de script et en conservant les approbations réseau et destructives.
