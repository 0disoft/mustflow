---
title: कार्य आइटम
description: Optional local work items mustflow को bounded handoff records रखते हुए कैसे extend कर सकते हैं।
---

Work items repository के अंदर deferred issues, proposals, और restart points capture करने वाली optional mustflow surface हैं।

Default template इस surface को `work_items = "disabled"` और `handoff.mode = "report_only"` के साथ inactive रखता है, जब तक project bounded lifecycle न चुने।

## डिफ़ॉल्ट

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

इसका अर्थ है कि agents को नई backlog files बनाने के बजाय final handoff में unfinished work report करना चाहिए।

## Default inactive क्यों है

- Default install छोटा रहना चाहिए, जब तक project work-item lifecycle opt into न करे।
- Local issue files पुरानी हो सकती हैं और मौजूदा issue trackers की नकल कर सकती हैं।
- Failure logs, internal paths, customer names, और secret fragments documents में leak हो सकते हैं।
- यदि agents स्वतंत्र रूप से कार्य आइटम बनाएं और बंद करें, तो मानवीय निर्णय सीमा अस्पष्ट हो जाती है।

## दिशा

जब work-item writing enabled हो, तो `.mustflow/pr/` की तुलना में `.mustflow/work-items/` अधिक स्पष्ट है। Local files वास्तविक pull requests नहीं, बल्कि proposed work और solution notes का प्रतिनिधित्व करती हैं।

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

## Command candidates

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

Agents automatically records create या close कर सकें, उससे पहले writer और lifecycle commands को bounded schemas, command contracts, redaction, और human approval rules के साथ incrementally जोड़ें।
