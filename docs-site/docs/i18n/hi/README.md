# mustflow दस्तावेज़ साइट

भाषाएँ: [अंग्रेज़ी](../../../README.md) · [कोरियाई](../ko/README.md) · [चीनी](../zh/README.md) · [स्पेनी](../es/README.md) · [फ़्रांसीसी](../fr/README.md) · [हिन्दी](README.md)

यह `mustflow.github.io` पर परिनियोजित दस्तावेज़ साइट है।

दस्तावेज़ साइट `mf init` के माध्यम से उपयोगकर्ता रिपॉज़िटरी में इंस्टॉल नहीं
होती। यह mustflow द्वारा बनाई जाने वाली फ़ाइलों और कॉन्फ़िगरेशन पर विस्तृत
मार्गदर्शन देती है।

साइट सामग्री `src/content/docs/<locale>/` में भाषा के अनुसार स्थानीयकृत की जाती
है।

## कमांड

```sh
bun run dev
bun run check
bun run build
bun run preview
```

रिपॉज़िटरी रूट से ये आवरण कमांड उपयोग करें:

```sh
bun run docs:dev
bun run docs:check
bun run docs:build
bun run docs:preview
```

रिपॉज़िटरी root से agent documentation verification के लिए configured mustflow
intent को प्राथमिकता दें:

```sh
mf run docs_validate
```
