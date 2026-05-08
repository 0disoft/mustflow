---
title: Documents racine optionnels et contrats
description: Documents racine appartenant au projet et contrats lisibles par machine que mustflow peut utiliser comme ancres de navigation lorsqu’ils existent.
---

mustflow n’exige pas ces fichiers et ne les crée pas, mais il peut les détecter
comme ancres de navigation à la racine lorsqu’ils existent déjà dans un projet.

## Fichiers Markdown courants

- `README.md`: vue d’ensemble du projet destinée aux personnes. C’est du contexte, pas une politique pour agents.
- `PROJECT.md`: résumé appartenant au projet. Si `.mustflow/context/PROJECT.md` existe aussi, le fichier de contexte mustflow a le rôle le plus clair pour le flux de travail des agents.
- `ROADMAP.md`: travaux prévus, priorités, jalons et non-objectifs explicites.
- `DESIGN.md`: identité visuelle, mise en page, accessibilité et référence de design tokens pour les travaux d’interface.
- `CONTRIBUTING.md`: flux de contribution, attentes pour les pull requests et notes de développement local.
- `SECURITY.md`: signalement des vulnérabilités et recommandations pour les changements sensibles à la sécurité.
- `CHANGELOG.md`: historique des versions et changements visibles par les utilisateurs.
- `CODE_OF_CONDUCT.md`: attentes de participation communautaire.
- `SUPPORT.md`: canaux de support et attentes de maintenance.
- `GOVERNANCE.md`: prise de décision, autorité et processus de maintenance.
- `MAINTAINERS.md`: liste des mainteneurs, responsabilité de revue et chemins d’escalade.
- `RELEASING.md` ou `RELEASE.md`: procédure de publication et liste de vérification.
- `TESTING.md`: stratégie de test, contrôles requis et critères de validation.
- `DEPLOYMENT.md`: environnements de déploiement, cibles de publication et recommandations de déploiement progressif.
- `OPERATIONS.md` ou `RUNBOOK.md`: opérations de production et procédures récurrentes.
- `CONFIGURATION.md`: variables d’environnement, feature flags et configuration d’exécution.
- `DATA_MODEL.md` ou `SCHEMA.md`: modèle de données métier ou référence de schéma.
- `PRIVACY.md`: confidentialité, traitement des données et règles de rétention.
- `TROUBLESHOOTING.md`: échecs connus et procédures de récupération.
- `ARCHITECTURE.md`: structure du système, limites de modules et décisions d’architecture.
- `API.md`: surface d’API publique et contrats d’intégration.

## Fichiers de contrat lisibles par machine

Privilégiez des noms qui indiquent clairement leur usage plutôt qu’un fichier
générique comme `SSOT.json`.

- `project.contract.json`: contrat au niveau du dépôt que les outils peuvent valider.
- `project.constants.json`: constantes partagées du projet que le code ou les outils peuvent lire.
- `design-tokens.json`: contrat de design tokens.
- `openapi.json`, `openapi.yaml` ou `openapi.yml`: contrat OpenAPI.
- `asyncapi.json`, `asyncapi.yaml` ou `asyncapi.yml`: contrat AsyncAPI.
- `schema.graphql`: contrat de schéma GraphQL.
- `schema.prisma`: contrat de schéma de données Prisma.

## Relation avec mf init

`mf init` ne copie pas ces fichiers. Les dépôts utilisateur possèdent souvent
déjà cette documentation, et mustflow ne doit pas l’écraser.

## Relation avec REPO_MAP.md

`mf map` inclut ces fichiers lorsqu’ils existent afin que les agents trouvent
du contexte utile sans traiter chaque fichier Markdown comme une lecture
obligatoire. Ces fichiers ne remplacent pas `AGENTS.md`,
`.mustflow/config/*.toml` ni le contrat de commande.
