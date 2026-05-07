# docs-site शैलियाँ

भाषाएँ: [अंग्रेज़ी](../../../../../src/styles/README.md) · [कोरियाई](../../../ko/src/styles/README.md) · [चीनी](../../../zh/src/styles/README.md) · [स्पेनी](../../../es/src/styles/README.md) · [फ़्रांसीसी](../../../fr/src/styles/README.md) · [हिन्दी](README.md)

वैश्विक CSS को ज़िम्मेदारी के अनुसार बाँटा गया है।

- `tokens.css`: साझा आकार और अंतराल मान।
- `layout.css`: Starlight लेआउट क्षेत्रों की चौड़ाई और संरचना।
- `markdown.css`: मुख्य Markdown तत्व।
- `header-controls.css`: हेडर के भाषा और थीम नियंत्रण।
- `page-navigation.css`: पिछले और अगले पेज के लिंक।
- `interaction.css`: लोगो, साइडबार, बटन और चयन बॉक्स जैसे इंटरैक्टिव UI के लिए
  टेक्स्ट चयन व्यवहार।
- `accessibility.css`: फ़ोकस, उच्च कंट्रास्ट, कम गति और दिशा अलगाव के लिए
  पहुँच-योग्यता सुधार।

लोड क्रम `../config/styles.mjs` में परिभाषित है।

कीबोर्ड नेविगेशन जैसे CSS से बाहर के ब्राउज़र व्यवहार
`../../public/keyboard-navigation.js` और `../config/head.mjs` में प्रबंधित होते
हैं।
