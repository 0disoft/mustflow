# docs-site कॉन्फ़िगरेशन

भाषाएँ: [अंग्रेज़ी](../../../../../src/config/README.md) · [कोरियाई](../../../ko/src/config/README.md) · [चीनी](../../../zh/src/config/README.md) · [स्पेनी](../../../es/src/config/README.md) · [फ़्रांसीसी](../../../fr/src/config/README.md) · [हिन्दी](README.md)

यह डायरेक्टरी Starlight कॉन्फ़िगरेशन को केंद्रित स्रोत फ़ाइलों में बाँटती है।

- `site.mjs`: साइट का नाम और परिनियोजन URL।
- `head.mjs`: हर दस्तावेज़ पेज के `<head>` में जोड़ी जाने वाली टैग।
- `locales.mjs`: दस्तावेज़ भाषाओं की सूची।
- `machine-readable.mjs`: `ai.txt`, `llms.txt`, `llms-full.txt` और
  `robots.txt` के लिए सार्वजनिक मेटाडेटा।
- `navigation.mjs`: साइडबार में दिखने वाले दस्तावेज़ लिंक और समूह।
- `sidebar.mjs`: Starlight को दिया जाने वाला साइडबार प्रवेश बिंदु।
- `styles.mjs`: वैश्विक CSS लोड क्रम।
- `starlight.mjs`: ऊपर की फ़ाइलों से संयोजित Starlight विकल्प।

जब कोई नया दस्तावेज़ साइडबार में दिखना चाहिए, तो उसका लिंक `navigation.mjs` में
जोड़ें। जब कोई वैश्विक शैली फ़ाइल जोड़ें, तो उसी समय `styles.mjs` भी अपडेट
करें। जब कोई ब्राउज़र स्क्रिप्ट जोड़ें, तो उसे `head.mjs` में पंजीकृत करें।
