---
title: रिलीज़ जांचें
description: mustflow npm package प्रकाशित करने से पहले चलाया जाने वाला verification flow।
---

mustflow npm के माध्यम से CLI और templates को साथ प्रकाशित करता है।

प्रकाशित करने से पहले केवल स्थानीय source tree की जांचों पर निर्भर न रहें। npm artifact को pack करें, उसे अस्थायी project में install करें, और public कमांड को `npx mf` से सत्यापित करें।

## कमांड

```sh
bun run release:check
```

इस रिपॉज़िटरी में agent verification के सामान्य कामों के लिए कॉन्फ़िगर किए गए
mustflow command intents को प्राथमिकता दें।

```sh
mf run build
mf run test_fast
mf run test_related
mf run test
mf run test_release
mf run docs_validate
mf run mustflow_check
```

`bun run release:check` publishing gate बना रहता है। `test_fast` fast CLI
regression baseline चलाता है, `test_related` changed files से tests चुनता है और
match न मिले तो उसी baseline पर लौटता है, और `test_release` package metadata और
packaging checks को routine local edits से अलग रखता है। `lint`, coverage, और
test-audit intents तब तक unset या manual-only रहते हैं जब तक इस repository में
उन flows के लिए अधिक संकीर्ण gates न हों।

## उद्देश्य

- `bun run release:check`: CLI checks, documentation checks चलाता है, और वास्तविक npm package installation सत्यापित करता है।
- `bun run check:pack`: package contents देखने के लिए `npm pack --dry-run --json` उपयोग करता है। यह पहले `prepack` भी चलाता है।
- `bun run check:install`: वास्तविक `.tgz` बनाता है, उसे temporary project में install करता है, और public `npx mf` workflow चलाता है।
- `bun run docs:check`: documentation site build करता है और navigation सत्यापित करता है।

## दस्तावेज़ साइट परिनियोजन

documentation site का source `main` branch पर `docs-site/` में है।

GitHub Pages settings में `Deploy from a branch` के बजाय publishing source के रूप में `GitHub Actions` चुनें।

`.github/workflows/docs-site.yml` तब चलता है जब `docs-site/**` या workflow file बदलती है। `docs-site/` के भीतर यह चलाता है:

```sh
bun install --frozen-lockfile
bun run check
```

चलने के बाद यह `docs-site/dist` को GitHub Pages artifact के रूप में upload करता है और Pages environment में deploy करता है।

ध्यान दें कि `docs-site/dist` generated output है और इसे repository में commit नहीं करना चाहिए।

## check:install प्रवाह

`check:install` यह public package workflow सत्यापित करता है:

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf --version
npx mf init --dry-run
npx mf init --yes
npx mf check --strict --json
npx mf doctor --strict --json
npx mf context --json
npx mf run mustflow_check --json
npx mf status --json
npx mf index --json
npx mf search mustflow_check --json
npx mf update --dry-run --json
npx mf map --write
```

इससे सुनिश्चित होता है कि पैकेज किया गया `dist/` आउटपुट, `templates/`, कमांड अनुबंध, और स्थानीय सूचकांक कार्यप्रवाह स्थापना के बाद साथ में सही काम करते हैं।

## विफलताओं का समाधान

- `npm pack` failure: package metadata और शामिल फ़ाइलें जांचें।
- `npm install` failure: dependencies, package structure, और npm compatibility जांचें।
- `npx mf init` failure: प्रकाशित CLI bundled templates नहीं ढूंढ पा सकती।
- `check/doctor/status/update/map` विफलता: बनी हुई फ़ाइलें, कमांड अनुबंध, स्थानीय सूचकांक, या manifest-lock कार्यप्रवाह स्थापना के बाद टूटे हो सकते हैं।
