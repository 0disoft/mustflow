---
title: कार्य आइटम
description: स्थानीय कार्य आइटम डिफ़ॉल्ट रूप से क्यों install नहीं होते और mustflow भविष्य में उनका समर्थन कैसे कर सकता है।
---

डिफ़ॉल्ट रूप से mustflow local issue या proposal folders नहीं बनाता।

File-based कार्य आइटम उपयोगी हो सकते हैं, लेकिन उन्हें डिफ़ॉल्ट रूप से install करना mustflow को agent document flow से local issue tracker में बदल देगा। फिलहाल `.mustflow/config/mustflow.toml` केवल `work_items = "disabled"` और `handoff.mode = "report_only"` घोषित करता है।

## डिफ़ॉल्ट

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

इसका अर्थ है कि agents को नई backlog files बनाने के बजाय final handoff में unfinished work report करना चाहिए।

## ये डिफ़ॉल्ट क्यों नहीं हैं

- `mf init` का मुख्य उद्देश्य LLM-only workflow files set up करना है।
- Local issue files पुरानी हो सकती हैं और मौजूदा issue trackers की नकल कर सकती हैं।
- Failure logs, internal paths, customer names, और secret fragments documents में leak हो सकते हैं।
- यदि agents स्वतंत्र रूप से कार्य आइटम बनाएं और बंद करें, तो मानवीय निर्णय सीमा अस्पष्ट हो जाती है।

## वैकल्पिक दिशा

यदि यह भविष्य में वैकल्पिक सुविधा बनती है, तो `.mustflow/pr/` की तुलना में `.mustflow/work-items/` अधिक स्पष्ट है। Local files वास्तविक pull requests नहीं, बल्कि proposed work और solution notes का प्रतिनिधित्व करती हैं।

```text
.mustflow/
└─ work-items/
   ├─ README.md
   ├─ issues/
   │  └─ MF-0001.md
   └─ proposals/
      └─ MF-0001-P001.md
```

`issues/` स्थगित bugs, tasks, और feature requests रखता है। `proposals/` किसी specific issue के लिए proposed changes रखता है। Branches, diffs, reviews, और merges Git और collaboration platforms की जिम्मेदारी बने रहते हैं।

## एजेंट अनुमतियां

वैकल्पिक कार्य आइटम enabled होने पर भी permissions संकीर्ण रहनी चाहिए।

- Agents issue candidates create कर सकते हैं और changes propose कर सकते हैं।
- Agents human approval के बिना issues close या proposals accept नहीं कर सकते।
- Agents यह दावा नहीं कर सकते कि वास्तविक pull request मौजूद है।
- Agents कार्य आइटम में secrets, customer data, या विस्तृत failure logs नहीं रख सकते।

## भविष्य की command candidates

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

ये कमांड मौजूदा implementation scope से बाहर हैं। इस वैकल्पिक surface को जोड़ने से पहले mustflow को file-based workflow, command contract, और validation flow स्थिर करना चाहिए।
