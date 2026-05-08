import type { MessageKey } from "./en.js";

export const hiMessages = {
  "cli.error.withUsage": "त्रुटि: {message}\nउपयोग देखने के लिए `{helpCommand}` चलाएँ।",
  "cli.error.prefix": "त्रुटि: {message}",
  "cli.error.unknownCommand": "अज्ञात कमांड: {command}",
  "cli.error.unsupportedLanguage": "असमर्थित CLI भाषा: {language}",
  "cli.error.missingLangValue": "--lang का मान नहीं दिया गया",
  "cli.option.help": "यह सहायता संदेश दिखाएँ",
  "cli.option.json": "मशीन-पठनीय JSON प्रिंट करें",
  "cli.heading.usage": "उपयोग",
  "cli.heading.commands": "कमांड",
  "cli.heading.topics": "विषय",
  "cli.heading.options": "विकल्प",
  "cli.heading.examples": "उदाहरण",
  "cli.heading.exitCodes": "एक्ज़िट कोड",
  "cli.common.invalidInput": "अमान्य इनपुट दिया गया",
  "cli.error.unknownOption": "अज्ञात विकल्प: {option}",
  "cli.error.unexpectedArgument": "अनपेक्षित आर्ग्युमेंट: {argument}",
  "cli.error.unexpectedValue": "{option} के लिए अनपेक्षित मान",
  "cli.error.missingValue": "{option} का मान नहीं दिया गया",

  "command.init.summary": "डिफ़ॉल्ट mustflow एजेंट वर्कफ़्लो कॉपी करें",
  "command.check.summary": "mustflow फ़ाइलों की जाँच करें",
  "command.status.summary": "स्थानीय mustflow इंस्टॉल स्थिति दिखाएँ",
  "command.update.summary": "mustflow वर्कफ़्लो अपडेट का पूर्वावलोकन करें या लागू करें",
  "command.map.summary": "REPO_MAP.md बनाएँ",
  "command.run.summary": "कॉन्फ़िगर की गई एक-बार चलने वाली कमांड चलाएँ",
  "command.context.summary": "मशीन-पठनीय एजेंट संदर्भ प्रिंट करें",
  "command.doctor.summary": "mustflow स्वास्थ्य और अगले कदम जाँचें",
  "command.index.summary": "स्थानीय mustflow SQLite इंडेक्स बनाएँ",
  "command.search.summary": "स्थानीय mustflow SQLite इंडेक्स में खोजें",
  "command.dashboard.summary":
    "स्थानीय mustflow डैशबोर्ड शुरू करें",
  "command.help.summary": "इंस्टॉल किए गए वर्कफ़्लो की सहायता दिखाएँ",

  "top.help.option.lang":
    "CLI आउटपुट भाषा चुनें। समर्थित मान: {languages}",
  "top.help.option.version": "पैकेज संस्करण दिखाएँ",
  "top.help.exit.ok": "कमांड सफलतापूर्वक पूरी हुई",
  "top.help.exit.fail":
    "सत्यापन समस्याओं या अमान्य इनपुट के कारण कमांड विफल हुई",

  "check.help.summary":
    "वर्तमान रिपॉज़िटरी में mustflow फ़ाइलों की जाँच करें।",
  "check.help.option.strict": "एजेंट सुरक्षा के लिए अतिरिक्त कठोर जाँच चलाएँ",
  "check.help.exit.ok": "सभी आवश्यक mustflow फ़ाइलें और सेटिंग्स मान्य हैं",
  "check.help.exit.fail":
    "सत्यापन विफल हुआ या कमांड को अमान्य इनपुट मिला",
  "check.result.passed": "mustflow check पास हुआ",
  "check.result.strictPassed": "mustflow strict check पास हुआ",

  "context.help.summary":
    "वर्तमान mustflow रूट के लिए एजेंट संदर्भ प्रिंट करें।",
  "context.help.option.json": "मशीन-पठनीय संदर्भ JSON प्रिंट करें",
  "context.help.exit.ok": "संदर्भ जाँचा और प्रिंट किया गया",
  "context.title": "mustflow संदर्भ",
  "label.installed": "इंस्टॉल किया गया",
  "label.mustflowRoot": "mustflow रूट",
  "label.commandContract": "कमांड विनिर्देश",
  "label.runnableIntents": "चलाने योग्य कमांड",
  "label.latestRun": "नवीनतम रन",
  "label.manifestLock": "मैनिफ़ेस्ट लॉक",
  "label.trackedFiles": "ट्रैक की गई फ़ाइलें",
  "label.changedFiles": "बदली हुई फ़ाइलें",
  "label.missingFiles": "गुम फ़ाइलें",
  "label.database": "डेटाबेस",
  "label.documents": "दस्तावेज़",
  "label.skills": "स्किल",
  "label.commandIntents": "कमांड परिभाषाएँ",
  "label.wroteFiles": "लिखी गई फ़ाइलें",
  "label.query": "क्वेरी",
  "label.results": "परिणाम",

  "dashboard.help.summary":
    "सुरक्षित mustflow preferences देखने और संपादित करने के लिए स्थानीय डैशबोर्ड शुरू करें।",
  "dashboard.help.option.host": "डैशबोर्ड को स्थानीय host से बाँधें। डिफ़ॉल्ट: 127.0.0.1",
  "dashboard.help.option.port": "डैशबोर्ड को port से बाँधें। डिफ़ॉल्ट: 0 उपलब्ध port चुनता है",
  "dashboard.help.option.noOpen": "डैशबोर्ड को browser में अपने आप न खोलें",
  "dashboard.help.exit.ok": "डैशबोर्ड शुरू हुआ या सहायता प्रिंट हुई",
  "dashboard.help.exit.fail": "डैशबोर्ड शुरू नहीं हो सका या इनपुट अमान्य था",
  "dashboard.error.invalidPort": "अमान्य डैशबोर्ड port: {port}",
  "dashboard.error.nonLocalHost":
    "डैशबोर्ड host {host} अस्वीकार किया गया। localhost, 127.0.0.1 या ::1 उपयोग करें।",
  "dashboard.listening": "mf dashboard {url} पर सुन रहा है",
  "dashboard.ui.title": "mustflow डैशबोर्ड",
  "dashboard.ui.language": "भाषा",
  "dashboard.ui.noChanges": "कोई बदलाव नहीं",
  "dashboard.ui.unsavedChanges": "बिना सहेजे बदलाव",
  "dashboard.ui.reloaded": "फिर से लोड हुआ",
  "dashboard.ui.saved": "सहेजा गया",
  "dashboard.ui.reload": "फिर से लोड करें",
  "dashboard.ui.save": "सहेजें",
  "dashboard.ui.locked": "लॉक है",
  "dashboard.ui.customLocale": "कस्टम भाषा टैग",
  "dashboard.ui.openMustflow": ".mustflow फ़ोल्डर खोलें",
  "dashboard.ui.openedMustflow": ".mustflow फ़ोल्डर खोला गया",
  "dashboard.locked.git.auto_push": "Remote push के लिए स्पष्ट अनुरोध आवश्यक है।",
  "dashboard.group.git": "Git",
  "dashboard.group.commitMessage": "Commit संदेश",
  "dashboard.group.reporting": "रिपोर्टिंग",
  "dashboard.group.verification": "सत्यापन",
  "dashboard.group.codeStyle": "कोड शैली",
  "dashboard.group.versioning": "वर्जनिंग",
  "dashboard.setting.git.auto_stage": "Git auto stage",
  "dashboard.setting.git.auto_commit": "Git auto commit",
  "dashboard.setting.git.auto_push": "Git auto push",
  "dashboard.setting.git.commit_message.style": "Commit संदेश शैली",
  "dashboard.setting.git.commit_message.style.description.conventional":
    "feat: या fix: जैसे type prefix इस्तेमाल करें।",
  "dashboard.setting.git.commit_message.style.description.descriptive":
    "ज़रूरी type prefix के बिना छोटा natural-language सार लिखें।",
  "dashboard.setting.git.commit_message.style.description.gitmoji":
    "शुरू में Gitmoji emoji लगाएँ और feat: या fix: जैसा type prefix भी रखें।",
  "dashboard.setting.git.commit_message.language": "Commit संदेश भाषा",
  "dashboard.setting.git.commit_message.language.description.preserve_existing":
    "repository के मौजूदा commit message language का पालन करें।",
  "dashboard.setting.git.commit_message.language.description.agent_response":
    "agent response वाली भाषा ही इस्तेमाल करें।",
  "dashboard.setting.git.commit_message.language.description.docs":
    "project documents वाली भाषा इस्तेमाल करें।",
  "dashboard.setting.git.commit_message.language.description.en": "English में commit messages सुझाएँ।",
  "dashboard.setting.git.commit_message.language.description.ko": "Korean में commit messages सुझाएँ।",
  "dashboard.setting.git.commit_message.language.description.zh": "Chinese में commit messages सुझाएँ।",
  "dashboard.setting.git.commit_message.language.description.es": "Spanish में commit messages सुझाएँ।",
  "dashboard.setting.git.commit_message.language.description.fr": "French में commit messages सुझाएँ।",
  "dashboard.setting.git.commit_message.language.description.hi": "Hindi में commit messages सुझाएँ।",
  "dashboard.setting.git.commit_message.language.description":
    "commit message सुझावों के लिए चुना गया custom language tag इस्तेमाल करें।",
  "dashboard.setting.git.commit_message.max_suggestions": "Commit संदेश सुझाव संख्या",
  "dashboard.setting.git.commit_message.include_body": "Commit body",
  "dashboard.setting.git.commit_message.include_body.description.never":
    "commit message body कभी न जोड़ें; केवल subject line सुझाएँ।",
  "dashboard.setting.git.commit_message.include_body.description.when_non_trivial":
    "body तभी जोड़ें जब बदलाव को subject line से अधिक संदर्भ चाहिए।",
  "dashboard.setting.git.commit_message.include_body.description.always":
    "commit message सुझावों में हमेशा body जोड़ें।",
  "dashboard.setting.git.commit_message.split_when_multiple_concerns": "अलग commits सुझाएँ",
  "dashboard.setting.git.commit_message.avoid_sensitive_details": "संवेदनशील विवरण से बचें",
  "dashboard.setting.git.commit_message.avoid_sensitive_details.description":
    "secrets, credentials, personal data और private incident details से बचें।",
  "dashboard.setting.reporting.commit_suggestion.enabled": "Commit संदेश सुझाव",
  "dashboard.setting.verification.selection.strategy": "सत्यापन रणनीति",
  "dashboard.setting.verification.selection.strategy.description.risk_based":
    "बदलाव के जोखिम के अनुसार सत्यापन का दायरा तय करें।",
  "dashboard.setting.verification.selection.strategy.description.targeted":
    "बदले हुए हिस्से से जुड़ी checks को प्राथमिकता दें।",
  "dashboard.setting.verification.selection.strategy.description.full":
    "configured पूरे verification set को प्राथमिकता दें।",
  "dashboard.setting.verification.selection.prefer_related_tests": "संबंधित tests को प्राथमिकता दें",
  "dashboard.setting.verification.selection.skip_docs_only_full_test": "केवल docs बदलाव पर full test छोड़ें",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test": "कम जोखिम वाले code बदलाव पर full test छोड़ें",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test.description":
    "जब code बदलाव public behavior, config, schemas, security या migrations को प्रभावित नहीं करता, तब केवल full suite छोड़ें।",
  "dashboard.setting.verification.selection.skip_translation_only_full_test": "केवल translation बदलाव पर full test छोड़ें",
  "dashboard.setting.verification.selection.skip_copy_only_full_test": "केवल copy बदलाव पर full test छोड़ें",
  "dashboard.setting.verification.selection.report_skipped": "छोड़े गए सत्यापन रिपोर्ट करें",
  "dashboard.setting.code_style.avoid_drive_by_refactors": "असंबंधित refactor से बचें",
  "dashboard.setting.release.versioning.impact_check": "Version प्रभाव जाँच",
  "dashboard.setting.release.versioning.impact_check.description":
    "जाँचें कि बदलाव package या template version को प्रभावित करता है या नहीं।",
  "dashboard.setting.release.versioning.suggest_bump": "Version bump सुझाएँ",
  "dashboard.setting.release.versioning.suggest_bump.description":
    "जब version बदलना ज़रूरी लगे, तो bump level सुझाएँ।",
  "dashboard.setting.release.versioning.auto_bump": "Versions अपने आप बढ़ाएँ",
  "dashboard.setting.release.versioning.auto_bump.description":
    "अलग manual step के बिना version files सीधे बदलने दें।",
  "dashboard.setting.release.versioning.require_user_confirmation": "Version पुष्टि आवश्यक",
  "dashboard.setting.release.versioning.require_user_confirmation.description":
    "version बदलाव लागू या स्वीकार करने से पहले पुष्टि माँगें।",
  "dashboard.setting.release.versioning.sync_template_version": "Template version sync करें",
  "dashboard.setting.release.versioning.sync_template_version.description":
    "package version और template manifest version को साथ रखें।",
  "dashboard.setting.release.versioning.sync_docs_examples": "Docs examples sync करें",
  "dashboard.setting.release.versioning.sync_docs_examples.description":
    "documentation examples को चुने गए version से मिलाकर रखें।",
  "dashboard.setting.release.versioning.sync_tests": "Tests sync करें",
  "dashboard.setting.release.versioning.sync_tests.description":
    "version-sensitive tests और fixtures को साथ रखें।",

  "doctor.help.summary":
    "फ़ाइलों को बदले बिना mustflow रूट स्वास्थ्य जाँचें और अगले कदमों के संकेत पाएँ।",
  "doctor.help.option.json": "मशीन-पठनीय diagnostic JSON प्रिंट करें",
  "doctor.help.option.strict":
    "एजेंट सुरक्षा के लिए अतिरिक्त कठोर जाँच शामिल करें",
  "doctor.help.exit.ok":
    "mustflow स्थिति जाँची गई और कोई समस्या नहीं मिली",
  "doctor.help.exit.fail": "सत्यापन समस्याएँ मिलीं या इनपुट अमान्य था",
  "doctor.title": "mustflow doctor",
  "doctor.label.strict": "कठोर",
  "doctor.label.check": "जाँच",
  "doctor.label.issues": "समस्याएँ",
  "doctor.section.health": "स्वास्थ्य:",
  "doctor.section.issueList": "समस्या सूची:",
  "doctor.section.suggestedCommands": "सुझाई गई कमांड:",
  "doctor.actionLabel": "चलाएँ",
  "doctor.diagnostic.install": "इंस्टॉल",
  "doctor.diagnostic.validation": "सत्यापन",
  "doctor.diagnostic.commands": "कमांड विनिर्देश",
  "doctor.diagnostic.readOrder": "पढ़ने का क्रम",
  "doctor.diagnostic.optionalReadOrder": "वैकल्पिक पढ़ने का क्रम",
  "doctor.diagnostic.repoMap": "REPO_MAP.md",
  "doctor.diagnostic.localIndex": "स्थानीय इंडेक्स",
  "doctor.diagnostic.latestRun": "नवीनतम रन",

  "help.missingFile":
    "वर्तमान डायरेक्टरी में {path} नहीं मिला। पहले mf init चलाएँ या mustflow रूट पर जाएँ।",
  "help.commands.title": "कमांड",
  "help.commands.noIntents":
    "कमांड\n\n.mustflow/config/commands.toml में [intents] तालिका नहीं मिली।",
  "help.commands.configuredIntents":
    ".mustflow/config/commands.toml में कॉन्फ़िगर की गई कमांड:",
  "help.preferences.title": "Preferences",
  "help.preferences.intro":
    ".mustflow/config/preferences.toml में रिपॉज़िटरी-स्तर की एजेंट preferences:",
  "help.help.summary": "इंस्टॉल किए गए mustflow वर्कफ़्लो से सहायता दिखाएँ।",
  "help.topic.workflow": ".mustflow/docs/agent-workflow.md प्रिंट करें",
  "help.topic.skills": ".mustflow/skills/INDEX.md प्रिंट करें",
  "help.topic.commands": ".mustflow/config/commands.toml का सारांश दें",
  "help.topic.preferences": ".mustflow/config/preferences.toml का सारांश दें",
  "help.help.exit.ok":
    "सहायता विषय प्रिंट हुआ या कोई इंस्टॉल किया गया विषय उपलब्ध नहीं था",
  "help.help.exit.fail": "कमांड को अज्ञात विषय या विकल्प मिला",
  "help.error.unknownTopic": "अज्ञात सहायता विषय: {topic}",

  "index.help.summary":
    "mustflow वर्कफ़्लो के लिए फिर से बनाया जा सकने वाला SQLite इंडेक्स बनाएँ।",
  "index.help.option.dryRun": "फ़ाइलें लिखे बिना इंडेक्स लक्ष्य गणना करें",
  "index.help.exit.ok": "इंडेक्स लक्ष्य गणना किए गए और वैकल्पिक रूप से लिखे गए",
  "index.title": "mustflow इंडेक्स",
  "index.dryRunNoFiles": "ड्राई रन: कोई फ़ाइल नहीं लिखी गई।",

  "init.routerBlock": `<!-- mustflow:start schema=1 -->
यह रिपॉज़िटरी mustflow एजेंट वर्कफ़्लो का पालन करती है।

काम शुरू करने से पहले ये फ़ाइलें पढ़ें:
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\` यदि मौजूद हो
- \`.mustflow/skills/INDEX.md\`
<!-- mustflow:end -->`,
  "init.help.summary":
    "डिफ़ॉल्ट mustflow एजेंट वर्कफ़्लो को वर्तमान रिपॉज़िटरी में कॉपी करें।",
  "init.help.option.yes": "प्रॉम्प्ट के लिए सुरक्षित डिफ़ॉल्ट उपयोग करें",
  "init.help.option.dryRun": "फ़ाइलें लिखे बिना इंस्टॉल योजना प्रिंट करें",
  "init.help.option.interactive": "प्रॉम्प्ट से init सेटिंग्स चुनें",
  "init.help.option.merge":
    "मौजूदा AGENTS.md में mustflow प्रबंधित ब्लॉक मिलाएँ",
  "init.help.option.force": "टकराती फ़ाइलों का बैकअप लेकर उन्हें overwrite करें",
  "init.help.option.profile":
    "प्रोजेक्ट profile सेट करें: minimal, oss, team, product या library",
  "init.help.option.locale": "इंस्टॉल किए गए mustflow दस्तावेज़ों की भाषा सेट करें",
  "init.help.option.agentLang": "पसंदीदा एजेंट प्रतिक्रिया भाषा सेट करें",
  "init.help.option.set":
    "git.auto_commit=true या git.auto_push=false जैसी सुरक्षित preference सेट करें",
  "init.help.option.productSourceLocale":
    "उपयोगकर्ता-सामना करने वाले उत्पाद पाठ की स्रोत भाषा सेट करें",
  "init.help.option.productLocale":
    "उपयोगकर्ता-सामना करने वाला product locale जोड़ें; दोहराया जा सकता है",
  "init.help.exit.ok": "इंस्टॉल पूरा हुआ, छोड़ा गया, या योजना प्रिंट हुई",
  "init.help.exit.fail": "अमान्य विकल्पों या फ़ाइल टकरावों ने लिखना रोका",
  "init.error.cannotCombineMergeForce": "--merge और --force को साथ नहीं रखा जा सकता",
  "init.error.cannotCombineInteractiveYes":
    "--interactive और --yes को साथ नहीं रखा जा सकता",
  "init.error.unsupportedProfile": "असमर्थित profile: {profile}",
  "init.error.supportedProfiles": "समर्थित profiles: {profiles}",
  "init.error.unsupportedLocale": "असमर्थित locale: {locale}",
  "init.error.supportedLocales":
    "इस पैकेज के लिए समर्थित template locales: {locales}",
  "init.error.invalidLocaleTag": "{label} के लिए अमान्य locale tag: {value}",
  "init.error.invalidPreference":
    "अमान्य init preference override: {value}",
  "init.error.invalidPreferenceValue":
    "{key} के लिए अमान्य मान: {value}",
  "init.error.unsupportedPreference":
    "असमर्थित init preference setting: {key}",
  "init.prompt.locale": "mustflow दस्तावेज़ कौन सी भाषा उपयोग करें?",
  "init.prompt.profile": "mustflow कौन सा project profile उपयोग करे?",
  "init.prompt.agentLang":
    "एजेंट final reports के लिए कौन सी भाषा उपयोग करें?",
  "init.prompt.advanced": "Advanced preferences बदलें?",
  "init.prompt.autoStage":
    "एजेंटों को फ़ाइलें अपने आप stage करने दें?",
  "init.prompt.autoCommit":
    "एजेंटों को commits अपने आप बनाने दें?",
  "init.prompt.commitMessageLanguage":
    "पसंदीदा commit message भाषा?",
  "init.prompt.commitSuggestions":
    "Commit message suggestions चालू करें?",
  "init.prompt.preserveExisting": "मौजूदा रखें",
  "init.prompt.sameAsAgentReports": "एजेंट रिपोर्ट जैसी",
  "init.prompt.sameAsDocuments": "दस्तावेज़ जैसी",
  "init.prompt.select": "चुनें [{defaultChoice}]: ",
  "init.prompt.invalidChoice":
    "1 और {count} के बीच कोई संख्या दर्ज करें।",
  "init.prompt.invalidBoolean": "yes या no दर्ज करें।",
  "init.plan.would": "{action} {path} किया जाएगा",
  "init.plan.noFilesWritten": "कोई फ़ाइल नहीं लिखी गई।",
  "init.conflict":
    "टकराव: {path} पहले से मौजूद है और mustflow template से अलग है।",
  "init.conflictGuidance":
    "पूर्वावलोकन के लिए --dry-run, AGENTS.md में mustflow ब्लॉक जोड़ने के लिए --merge, या बैकअप लेकर overwrite करने के लिए --force उपयोग करें।",
  "init.selection.profile": "Template profile: {profile}",
  "init.selection.locale": "Template locale: {locale}",
  "init.selection.agentLang": "एजेंट प्रतिक्रिया भाषा: {locale}",
  "init.selection.productSourceLocale": "Product source locale: {locale}",
  "init.selection.productLocales": "Product locales: {locales}",
  "init.selection.sourceLocaleOnly": "(केवल source locale)",
  "init.backup.conflicts": "{count} टकराती {fileWord} का बैकअप {path} में लिया गया",
  "init.fileWord.singular": "फ़ाइल",
  "init.fileWord.plural": "फ़ाइलें",
  "init.action.created": "{path} बनाया गया",
  "init.action.unchanged": "{path} अपरिवर्तित",
  "init.action.merged": "{path} मिलाया गया",
  "init.action.overwrote": "{path} overwrite किया गया",
  "init.action.customizedPreferences":
    ".mustflow/config/preferences.toml अनुकूलित किया गया",
  "init.action.wrote": "{path} लिखा गया",
  "init.complete":
    "mustflow init पूरा: {created} बनाए गए, {merged} मिलाए गए, {overwritten} overwrite किए गए, {unchanged} अपरिवर्तित।",

  "map.help.summary":
    "रिपॉज़िटरी की मुख्य फ़ाइलों से एजेंट navigation map बनाएँ।",
  "map.help.option.stdout": "बनाया गया map प्रिंट करें",
  "map.help.option.write": "REPO_MAP.md लिखें",
  "map.help.option.depth": "कम प्राथमिकता वाली directories की depth सीमित करें",
  "map.help.option.includeNested":
    "कॉन्फ़िगर किए गए workspace roots से nested repositories शामिल करें",
  "map.help.option.rootOnly": "कॉन्फ़िगर होने पर भी nested repositories अनदेखा करें",
  "map.help.exit.ok": "Map बनाया गया और वैकल्पिक रूप से लिखा गया",
  "map.error.nestedConflict": "--include-nested और --root-only को साथ नहीं रखा जा सकता",
  "map.error.invalidDepth": "--depth के लिए अमान्य मान",
  "map.wrote": "REPO_MAP.md लिखा गया",

  "run.help.summary":
    ".mustflow/config/commands.toml से कॉन्फ़िगर की गई एक-बार चलने वाली कमांड चलाएँ।",
  "run.help.option.json": "Run record को JSON के रूप में प्रिंट करें",
  "run.help.exit.ok": "कमांड अनुमत exit code के साथ पूरी हुई",
  "run.help.exit.fail": "कमांड अमान्य थी, अस्वीकार हुई, timed out हुई या विफल हुई",
  "run.error.missingIntent": "कमांड नाम नहीं दिया गया",
  "run.error.unknownIntent": "अज्ञात कमांड: {intent}",
  "run.error.statusNotConfigured":
    'कमांड "{intent}" {status} है; केवल configured कमांड चलाई जा सकती हैं',
  "run.error.lifecycleNotOneshot":
    'अस्वीकृत: कमांड "{intent}" का lifecycle = "{lifecycle}" है; mf run केवल oneshot कमांड चलाता है',
  "run.error.runPolicy":
    'mf run के लिए कमांड "{intent}" में run_policy = "agent_allowed" चाहिए',
  "run.error.stdin": 'कमांड "{intent}" को stdin = "closed" सेट करना होगा',
  "run.error.timeout": 'कमांड "{intent}" को timeout_seconds परिभाषित करना होगा',
  "run.error.commandSource":
    'कमांड "{intent}" को argv या mode = "shell" के साथ cmd परिभाषित करना होगा',
  "run.error.timedOut": 'कमांड "{intent}" {seconds} सेकंड बाद time out हुई',
  "run.error.startFailed": 'कमांड "{intent}" शुरू नहीं हो सकी: {message}',

  "search.help.summary":
    "mustflow वर्कफ़्लो के लिए स्थानीय SQLite इंडेक्स में खोजें।",
  "search.help.option.limit":
    "प्रिंट किए जाने वाले परिणामों की संख्या सेट करें। डिफ़ॉल्ट: 10, अधिकतम: 50",
  "search.help.exit.ok": "खोज पूरी हुई",
  "search.help.exit.fail": "अमान्य इनपुट या स्थानीय इंडेक्स नहीं मिला",
  "search.error.missingLimit": "--limit का मान नहीं दिया गया",
  "search.error.invalidLimit": "--limit 1 और 50 के बीच पूर्णांक होना चाहिए",
  "search.error.missingQuery": "खोज क्वेरी आवश्यक है",
  "search.title": "mustflow खोज",
  "search.noMatches": "कोई मिलती हुई प्रविष्टि नहीं।",

  "status.help.summary":
    "फ़ाइलों को बदले बिना स्थानीय mustflow इंस्टॉल स्थिति दिखाएँ।",
  "status.help.exit.ok": "स्थिति जाँची और प्रिंट की गई",
  "status.title": "mustflow स्थिति",

  "update.help.summary":
    "इंस्टॉल किए गए mustflow वर्कफ़्लो के अपडेट का पूर्वावलोकन करें या लागू करें।",
  "update.help.option.dryRun": "फ़ाइलें लिखे बिना update plan प्रिंट करें",
  "update.help.option.apply":
    "जब कोई local change blocked न हो, सुरक्षित template updates लागू करें",
  "update.help.exit.ok": "Plan प्रिंट हुआ या सुरक्षित updates लागू किए गए",
  "update.help.exit.fail":
    "Plan में blocked changes, missing state, या अमान्य input मिला",
  "update.error.cannotCombineModes": "--dry-run और --apply को साथ नहीं रखा जा सकता।",
  "update.error.missingMode": "--dry-run या --apply निर्दिष्ट करें।",
  "update.backup.files": "{count} {fileWord} का बैकअप {path} में लिया गया",
  "update.action.created": "{path} बनाया गया",
  "update.action.updated": "{path} अपडेट किया गया",
  "update.action.wrote": "{path} लिखा गया",
  "update.policy.title": "नीति:",
  "update.policy.baseline": "Baseline",
  "update.policy.applyActions": "लागू की जाने वाली कार्रवाइयाँ",
  "update.policy.blockingActions": "Blocking actions",
  "update.policy.backupPath": "Backup path",
  "update.plan.title": "mustflow update plan",
  "update.plan.blocked": "Blocked local changes",
  "update.plan.manualReview": "Manual review",
  "update.plan.wouldUpdate": "अपडेट किया जाएगा",
  "update.plan.wouldCreate": "बनाया जाएगा",
  "update.plan.noUpdates": "Template updates आवश्यक नहीं हैं।",
  "update.plan.noFilesWritten": "कोई फ़ाइल नहीं लिखी गई।",
  "update.complete":
    "mustflow update पूरा: {updated} अपडेट किए गए, {created} बनाए गए।",
} satisfies Record<MessageKey, string>;
