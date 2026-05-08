---
title: वैकल्पिक root docs और contracts
description: Project-owned root documents और machine-readable contracts जिन्हें mustflow मौजूद होने पर navigation anchors की तरह उपयोग कर सकता है।
---

mustflow इन files को required नहीं मानता और इन्हें create भी नहीं करता। लेकिन
अगर ये project में पहले से मौजूद हैं, तो mustflow इन्हें root-level navigation
anchors के रूप में discover कर सकता है।

## आम Markdown files

- `README.md`: लोगों के लिए project overview। यह context है, agent policy नहीं।
- `PROJECT.md`: project-owned छोटा परिचय। अगर `.mustflow/context/PROJECT.md` भी मौजूद है, तो agent workflow के लिए mustflow context file की भूमिका अधिक स्पष्ट है।
- `ROADMAP.md`: planned work, priorities, milestones, और explicit non-goals।
- `DESIGN.md`: UI work के लिए visual identity, layout, accessibility, और design-token reference।
- `CONTRIBUTING.md`: contribution workflow, pull request expectations, और local development notes।
- `SECURITY.md`: vulnerability reporting और security-sensitive changes के लिए guidance।
- `CHANGELOG.md`: release history और user-visible changes।
- `CODE_OF_CONDUCT.md`: community participation expectations।
- `SUPPORT.md`: support channels और maintenance expectations।
- `GOVERNANCE.md`: decision-making, authority, और maintainer process।
- `MAINTAINERS.md`: maintainer list, review ownership, और escalation paths।
- `RELEASING.md` या `RELEASE.md`: release procedure और publishing checklist।
- `TESTING.md`: testing strategy, required checks, और verification guidance।
- `DEPLOYMENT.md`: deployment environments, release targets, और rollout guidance।
- `OPERATIONS.md` या `RUNBOOK.md`: production operations और recurring procedures।
- `CONFIGURATION.md`: environment variables, feature flags, और runtime configuration guidance।
- `DATA_MODEL.md` या `SCHEMA.md`: domain data model या schema reference।
- `PRIVACY.md`: privacy, data handling, और retention guidance।
- `TROUBLESHOOTING.md`: known failures और recovery guide।
- `ARCHITECTURE.md`: system structure, module boundaries, और architectural decisions।
- `API.md`: public API surface और integration contracts।

## Machine-readable contract files

Generic `SSOT.json` file के बजाय ऐसे names उपयोग करें जिनसे purpose तुरंत
समझ आए।

- `project.contract.json`: repository-level contract जिसे tools validate कर सकते हैं।
- `project.constants.json`: shared project constants जिन्हें code या tools पढ़ सकते हैं।
- `design-tokens.json`: design token contract।
- `openapi.json`, `openapi.yaml`, या `openapi.yml`: OpenAPI contract।
- `asyncapi.json`, `asyncapi.yaml`, या `asyncapi.yml`: AsyncAPI contract।
- `schema.graphql`: GraphQL schema contract।
- `schema.prisma`: Prisma data schema contract।

## mf init से संबंध

`mf init` इन files को copy नहीं करता। User repositories अक्सर इस documentation
की owner होती हैं, और mustflow को project documentation overwrite नहीं करनी
चाहिए।

## REPO_MAP.md से संबंध

`mf map` इन files के मौजूद होने पर उन्हें map में शामिल करता है, ताकि agents
useful context ढूंढ सकें और हर Markdown file को mandatory reading न मानें। ये
files `AGENTS.md`, `.mustflow/config/*.toml`, या command contract को override
नहीं करतीं।
