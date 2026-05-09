import type { MessageKey } from "./en.js";

export const zhMessages = {
  "cli.error.withUsage": "错误：{message}\n运行 `{helpCommand}` 查看用法。",
  "cli.error.prefix": "错误：{message}",
  "cli.error.unknownCommand": "未知命令：{command}",
  "cli.error.unsupportedLanguage": "不支持的 CLI 语言：{language}",
  "cli.error.missingLangValue": "--lang 缺少值",
  "cli.option.help": "显示此帮助信息",
  "cli.option.json": "输出机器可读的 JSON",
  "cli.heading.usage": "用法",
  "cli.heading.commands": "命令",
  "cli.heading.topics": "主题",
  "cli.heading.options": "选项",
  "cli.heading.examples": "示例",
  "cli.heading.exitCodes": "退出码",
  "cli.common.invalidInput": "提供了无效输入",
  "cli.error.unknownOption": "未知选项：{option}",
  "cli.error.unexpectedArgument": "意外参数：{argument}",
  "cli.error.unexpectedValue": "{option} 的值不符合预期",
  "cli.error.missingValue": "{option} 缺少值",
  "value.yes": "是",
  "value.no": "否",
  "value.none": "无",

  "command.init.summary": "复制默认的 mustflow 代理工作流",
  "command.check.summary": "验证 mustflow 文件",
  "command.status.summary": "显示本地 mustflow 安装状态",
  "command.update.summary": "预览或应用 mustflow 工作流更新",
  "command.map.summary": "生成 REPO_MAP.md",
  "command.run.summary": "运行已配置的一次性命令",
  "command.context.summary": "输出机器可读的代理上下文",
  "command.doctor.summary": "检查 mustflow 健康状态和后续步骤",
  "command.index.summary": "构建本地 mustflow SQLite 索引",
  "command.search.summary": "搜索本地 mustflow SQLite 索引",
  "command.dashboard.summary":
    "启动本地 mustflow 仪表板",
  "command.versionSources.summary": "显示检测到的版本来源",
  "command.verify.summary": "按原因运行必需验证",
  "command.explain.summary": "解释 mustflow 策略决策",
  "command.help.summary": "显示已安装工作流的帮助",

  "top.help.option.lang":
    "选择 CLI 输出语言。支持的值：{languages}",
  "top.help.option.version": "显示包版本",
  "top.help.exit.ok": "命令已成功完成",
  "top.help.exit.fail":
    "命令因验证问题或无效输入而失败",

  "check.help.summary":
    "验证当前仓库中的 mustflow 文件。",
  "check.help.option.strict": "运行额外的代理安全严格检查",
  "check.help.exit.ok": "所有必需的 mustflow 文件和设置均有效",
  "check.help.exit.fail":
    "验证失败，或命令收到了无效输入",
  "check.result.passed": "mustflow 检查已通过",
  "check.result.strictPassed": "mustflow 严格检查已通过",

  "context.help.summary":
    "输出当前 mustflow 根目录的代理上下文。",
  "context.help.option.json": "输出机器可读的上下文 JSON",
  "context.help.exit.ok": "已检查并输出上下文",
  "context.title": "mustflow 上下文",
  "label.installed": "已安装",
  "label.mustflowRoot": "mustflow 根目录",
  "label.commandContract": "命令规范",
  "label.runnableIntents": "可运行命令",
  "label.latestRun": "最近运行",
  "label.manifestLock": "清单锁定文件",
  "label.trackedFiles": "已跟踪文件",
  "label.changedFiles": "已更改文件",
  "label.missingFiles": "缺失文件",
  "label.database": "数据库",
  "label.documents": "文档",
  "label.skills": "技能",
  "label.commandIntents": "命令定义",
  "label.wroteFiles": "已写入文件",
  "label.query": "查询",
  "label.results": "结果",

  "dashboard.help.summary":
    "启动本地仪表板，用于查看和编辑安全的 mustflow 偏好设置。",
  "dashboard.help.option.host": "将仪表板绑定到本地主机。默认值：127.0.0.1",
  "dashboard.help.option.port": "将仪表板绑定到端口。默认值 0 会选择可用端口",
  "dashboard.help.option.noOpen": "不要自动在浏览器中打开仪表板",
  "dashboard.help.exit.ok": "仪表板已启动，或已输出帮助",
  "dashboard.help.exit.fail": "仪表板无法启动，或输入无效",
  "dashboard.error.invalidPort": "无效的仪表板端口：{port}",
  "dashboard.error.nonLocalHost":
    "已拒绝仪表板主机 {host}。请使用 localhost、127.0.0.1 或 ::1。",
  "dashboard.listening": "mf dashboard 正在监听 {url}",
  "dashboard.ui.title": "mustflow 仪表板",
  "dashboard.ui.language": "语言",
  "dashboard.ui.noChanges": "无更改",
  "dashboard.ui.unsavedChanges": "未保存的更改",
  "dashboard.ui.reloaded": "已重新加载",
  "dashboard.ui.saved": "已保存",
  "dashboard.ui.reload": "重新加载",
  "dashboard.ui.save": "保存",
  "dashboard.ui.locked": "已锁定",
  "dashboard.ui.customLocale": "自定义语言标签",
  "dashboard.ui.openMustflow": "打开 .mustflow 文件夹",
  "dashboard.ui.openedMustflow": "已打开 .mustflow 文件夹",
  "dashboard.locked.git.auto_push": "远程推送需要明确请求。",
  "dashboard.group.git": "Git",
  "dashboard.group.commitMessage": "提交消息",
  "dashboard.group.reporting": "报告",
  "dashboard.group.verification": "验证",
  "dashboard.group.testAuthoring": "测试编写",
  "dashboard.group.codeStyle": "代码风格",
  "dashboard.group.versioning": "版本",
  "dashboard.setting.git.auto_stage": "Git 自动暂存",
  "dashboard.setting.git.auto_commit": "Git 自动提交",
  "dashboard.setting.git.auto_push": "Git 自动推送",
  "dashboard.setting.git.commit_message.style": "提交消息风格",
  "dashboard.setting.git.commit_message.style.description.conventional": "使用 feat: 或 fix: 等类型前缀。",
  "dashboard.setting.git.commit_message.style.description.descriptive": "使用简短的自然语言摘要，不强制类型前缀。",
  "dashboard.setting.git.commit_message.style.description.gitmoji": "在消息前添加 Gitmoji 表情，并保留 feat: 或 fix: 等类型前缀。",
  "dashboard.setting.git.commit_message.language": "提交消息语言",
  "dashboard.setting.git.commit_message.language.description.preserve_existing": "沿用仓库现有的提交消息语言。",
  "dashboard.setting.git.commit_message.language.description.agent_response": "使用与代理回复相同的语言。",
  "dashboard.setting.git.commit_message.language.description.docs": "使用与项目文档相同的语言。",
  "dashboard.setting.git.commit_message.language.description.en": "用英语建议提交消息。",
  "dashboard.setting.git.commit_message.language.description.ko": "用韩语建议提交消息。",
  "dashboard.setting.git.commit_message.language.description.zh": "用中文建议提交消息。",
  "dashboard.setting.git.commit_message.language.description.es": "用西班牙语建议提交消息。",
  "dashboard.setting.git.commit_message.language.description.fr": "用法语建议提交消息。",
  "dashboard.setting.git.commit_message.language.description.hi": "用印地语建议提交消息。",
  "dashboard.setting.git.commit_message.language.description": "使用选定的自定义语言标签来建议提交消息。",
  "dashboard.setting.git.commit_message.max_suggestions": "提交消息建议数",
  "dashboard.setting.git.commit_message.include_body": "提交正文",
  "dashboard.setting.git.commit_message.include_body.description.never": "不包含提交正文；只建议标题行。",
  "dashboard.setting.git.commit_message.include_body.description.when_non_trivial":
    "只有当标题行不足以说明变更时，才建议提交正文。",
  "dashboard.setting.git.commit_message.include_body.description.always": "始终在建议中包含提交正文。",
  "dashboard.setting.git.commit_message.split_when_multiple_concerns": "建议拆分提交",
  "dashboard.setting.git.commit_message.avoid_sensitive_details": "避免敏感细节",
  "dashboard.setting.git.commit_message.avoid_sensitive_details.description": "避免写入密钥、凭据、个人数据和非公开事故细节。",
  "dashboard.setting.reporting.commit_suggestion.enabled": "提交消息建议",
  "dashboard.setting.verification.selection.strategy": "验证策略",
  "dashboard.setting.verification.selection.strategy.description.risk_based":
    "根据变更风险调整验证范围。",
  "dashboard.setting.verification.selection.strategy.description.targeted":
    "优先运行与变更区域直接相关的检查。",
  "dashboard.setting.verification.selection.strategy.description.full":
    "优先运行已配置的完整验证集合。",
  "dashboard.setting.verification.selection.prefer_related_tests": "优先运行相关测试",
  "dashboard.setting.verification.selection.skip_docs_only_full_test": "仅文档变更时跳过完整测试",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test": "低风险代码变更时跳过完整测试",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test.description":
    "仅当代码变更不影响公开行为、配置、schema、安全或迁移时，才跳过完整测试集合。",
  "dashboard.setting.verification.selection.skip_translation_only_full_test": "仅翻译变更时跳过完整测试",
  "dashboard.setting.verification.selection.skip_copy_only_full_test": "仅文案变更时跳过完整测试",
  "dashboard.setting.verification.selection.report_skipped": "报告跳过的验证",
  "dashboard.setting.testing.authoring.new_test_policy": "新测试策略",
  "dashboard.setting.testing.authoring.new_test_policy.description.evidence_required":
    "只有存在行为契约依据时才添加新测试。",
  "dashboard.setting.testing.authoring.new_test_policy.description.manual_approval":
    "除非用户直接要求测试，否则添加新测试前先询问。",
  "dashboard.setting.testing.authoring.new_test_policy.description.broad":
    "当新测试能说明重要行为时，允许主动添加。",
  "dashboard.setting.testing.authoring.prefer_existing_tests": "优先使用现有测试",
  "dashboard.setting.testing.authoring.prefer_existing_tests.description":
    "创建新的测试文件或用例前，先更新附近的现有测试。",
  "dashboard.setting.testing.authoring.require_new_test_rationale": "要求说明新测试理由",
  "dashboard.setting.testing.authoring.require_new_test_rationale.description":
    "添加测试时，在最终报告中说明每个新测试为什么必要。",
  "dashboard.setting.code_style.avoid_drive_by_refactors": "避免无关重构",
  "dashboard.setting.release.versioning.impact_check": "版本影响检查",
  "dashboard.setting.release.versioning.impact_check.description":
    "检查变更是否应影响包或模板版本。",
  "dashboard.setting.release.versioning.suggest_bump": "建议版本变更",
  "dashboard.setting.release.versioning.suggest_bump.description":
    "当看起来需要版本变更时建议提升级别。",
  "dashboard.setting.release.versioning.auto_bump": "自动提升版本",
  "dashboard.setting.release.versioning.auto_bump.description":
    "允许不经过单独手动步骤就直接编辑版本文件。",
  "dashboard.setting.release.versioning.require_user_confirmation": "需要版本确认",
  "dashboard.setting.release.versioning.require_user_confirmation.description":
    "在应用或接受版本变更前先请求确认。",
  "dashboard.setting.release.versioning.sync_template_version": "同步模板版本",
  "dashboard.setting.release.versioning.sync_template_version.description":
    "保持包版本和模板 manifest 版本一致。",
  "dashboard.setting.release.versioning.sync_docs_examples": "同步文档示例",
  "dashboard.setting.release.versioning.sync_docs_examples.description":
    "保持文档示例中的版本值与所选版本一致。",
  "dashboard.setting.release.versioning.sync_tests": "同步测试",
  "dashboard.setting.release.versioning.sync_tests.description":
    "保持对版本敏感的测试和 fixture 一致。",

  "doctor.help.summary":
    "检查 mustflow 根目录健康状态并提示后续步骤，不修改文件。",
  "doctor.help.option.json": "输出机器可读的诊断 JSON",
  "doctor.help.option.strict":
    "包含额外的代理安全严格检查",
  "doctor.help.exit.ok":
    "已检查 mustflow 状态，未发现问题",
  "doctor.help.exit.fail": "发现验证问题，或输入无效",
  "doctor.title": "mustflow 诊断",
  "doctor.label.strict": "严格",
  "doctor.label.check": "检查",
  "doctor.label.issues": "问题",
  "doctor.section.health": "健康状态：",
  "doctor.section.issueList": "问题列表：",
  "doctor.section.suggestedCommands": "建议命令：",
  "doctor.actionLabel": "运行",
  "doctor.diagnostic.install": "安装",
  "doctor.diagnostic.validation": "验证",
  "doctor.diagnostic.skillRoutes": "技能路由",
  "doctor.diagnostic.commands": "命令规范",
  "doctor.diagnostic.readOrder": "读取顺序",
  "doctor.diagnostic.optionalReadOrder": "可选读取顺序",
  "doctor.diagnostic.repoMap": "REPO_MAP.md",
  "doctor.diagnostic.localIndex": "本地索引",
  "doctor.diagnostic.latestRun": "最近运行",

  "help.missingFile":
    "当前目录中未找到 {path}。请先运行 mf init，或切换到 mustflow 根目录。",
  "help.commands.title": "命令",
  "help.commands.noIntents":
    "命令\n\n在 .mustflow/config/commands.toml 中未找到 [intents] 表。",
  "help.commands.configuredIntents":
    ".mustflow/config/commands.toml 中配置的命令：",
  "help.preferences.title": "偏好设置",
  "help.preferences.intro":
    ".mustflow/config/preferences.toml 中的仓库级代理偏好设置：",
  "help.help.summary": "显示已安装 mustflow 工作流中的帮助。",
  "help.topic.workflow": "输出 .mustflow/docs/agent-workflow.md",
  "help.topic.skills": "输出 .mustflow/skills/INDEX.md",
  "help.topic.commands": "汇总 .mustflow/config/commands.toml",
  "help.topic.preferences": "汇总 .mustflow/config/preferences.toml",
  "help.help.exit.ok":
    "已输出帮助主题，或没有可用的已安装主题",
  "help.help.exit.fail": "命令收到了未知主题或选项",
  "help.error.unknownTopic": "未知帮助主题：{topic}",

  "index.help.summary":
    "为 mustflow 工作流构建可重新生成的 SQLite 索引。",
  "index.help.option.dryRun": "计算索引目标但不写入文件",
  "index.help.exit.ok": "已计算索引目标，并可选写入",
  "index.title": "mustflow 索引",
  "index.dryRunNoFiles": "试运行：未写入文件。",

  "init.routerBlock": `<!-- mustflow:start schema=1 -->
此仓库遵循 mustflow 代理工作流。

开始工作前请阅读这些文件：
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\`（如果存在）
- \`.mustflow/skills/INDEX.md\`
<!-- mustflow:end -->`,
  "init.help.summary":
    "将默认的 mustflow 代理工作流复制到当前仓库。",
  "init.help.option.yes": "对提示使用安全默认值",
  "init.help.option.dryRun": "输出安装计划但不写入文件",
  "init.help.option.interactive": "通过提示选择初始化设置",
  "init.help.option.merge":
    "将 mustflow 管理块合并到现有 AGENTS.md",
  "init.help.option.force": "备份冲突文件并覆盖它们",
  "init.help.option.profile":
    "设置项目配置：minimal、oss、team、product 或 library",
  "init.help.option.locale": "设置已安装 mustflow 文档的语言",
  "init.help.option.agentLang": "设置首选代理响应语言",
  "init.help.option.set":
    "设置安全偏好值，例如 git.auto_commit=true 或 git.auto_push=false",
  "init.help.option.productSourceLocale":
    "设置面向用户产品文本的源语言",
  "init.help.option.productLocale":
    "添加面向用户的产品 locale；可重复指定",
  "init.help.exit.ok": "安装已完成、已跳过，或已输出计划",
  "init.help.exit.fail": "无效选项或文件冲突阻止了写入",
  "init.error.cannotCombineMergeForce": "不能同时使用 --merge 和 --force",
  "init.error.cannotCombineInteractiveYes":
    "不能同时使用 --interactive 和 --yes",
  "init.error.unsupportedProfile": "不支持的配置：{profile}",
  "init.error.supportedProfiles": "支持的配置：{profiles}",
  "init.error.unsupportedLocale": "不支持的 locale：{locale}",
  "init.error.supportedLocales":
    "此包支持的模板 locale：{locales}",
  "init.error.invalidLocaleTag": "{label} 的 locale 标记无效：{value}",
  "init.error.invalidPreference":
    "无效的初始化偏好覆盖：{value}",
  "init.error.invalidPreferenceValue":
    "{key} 的值无效：{value}",
  "init.error.unsupportedPreference":
    "不支持的初始化偏好设置：{key}",
  "init.prompt.locale": "mustflow 文档应使用哪种语言？",
  "init.prompt.profile": "mustflow 应使用哪个项目配置？",
  "init.prompt.agentLang":
    "代理最终报告应使用哪种语言？",
  "init.prompt.advanced": "是否自定义高级偏好？",
  "init.prompt.autoStage":
    "是否允许代理自动暂存文件？",
  "init.prompt.autoCommit":
    "是否允许代理自动创建提交？",
  "init.prompt.commitMessageLanguage":
    "首选提交消息语言？",
  "init.prompt.commitSuggestions":
    "是否启用提交消息建议？",
  "init.prompt.preserveExisting": "保留现有值",
  "init.prompt.sameAsAgentReports": "与代理报告相同",
  "init.prompt.sameAsDocuments": "与文档相同",
  "init.prompt.select": "选择 [{defaultChoice}]：",
  "init.prompt.invalidChoice":
    "请输入 1 到 {count} 之间的数字。",
  "init.prompt.invalidBoolean": "请输入 yes 或 no。",
  "init.plan.would": "将 {action} {path}",
  "init.plan.noFilesWritten": "未写入文件。",
  "init.conflict":
    "冲突：{path} 已存在，且不同于 mustflow 模板。",
  "init.conflictGuidance":
    "使用 --dry-run 预览，使用 --merge 向 AGENTS.md 添加 mustflow 块，或使用 --force 备份并覆盖。",
  "init.selection.profile": "模板配置：{profile}",
  "init.selection.locale": "模板 locale：{locale}",
  "init.selection.agentLang": "代理响应语言：{locale}",
  "init.selection.productSourceLocale": "产品源 locale：{locale}",
  "init.selection.productLocales": "产品 locale：{locales}",
  "init.selection.sourceLocaleOnly": "（仅源 locale）",
  "init.backup.conflicts": "已将 {count} 个冲突{fileWord}备份到 {path}",
  "init.fileWord.singular": "文件",
  "init.fileWord.plural": "文件",
  "init.action.created": "已创建 {path}",
  "init.action.unchanged": "{path} 未改变",
  "init.action.merged": "已合并 {path}",
  "init.action.overwrote": "已覆盖 {path}",
  "init.action.customizedPreferences":
    "已自定义 .mustflow/config/preferences.toml",
  "init.action.wrote": "已写入 {path}",
  "init.complete":
    "mustflow init 完成：创建 {created}，合并 {merged}，覆盖 {overwritten}，未改变 {unchanged}。",

  "map.help.summary":
    "基于仓库关键文件生成代理导航地图。",
  "map.help.option.stdout": "输出生成的地图",
  "map.help.option.write": "写入 REPO_MAP.md",
  "map.help.option.depth": "限制非优先目录的深度",
  "map.help.option.includeNested":
    "包含已配置工作区根目录下的嵌套仓库",
  "map.help.option.rootOnly": "即使已配置也忽略嵌套仓库",
  "map.help.exit.ok": "地图已生成，并可选写入",
  "map.error.nestedConflict": "不能同时使用 --include-nested 和 --root-only",
  "map.error.invalidDepth": "--depth 的值无效",
  "map.wrote": "已写入 REPO_MAP.md",

  "run.help.summary":
    "从 .mustflow/config/commands.toml 运行已配置的一次性命令。",
  "run.help.option.json": "将运行记录输出为 JSON",
  "run.help.exit.ok": "命令已以允许的退出码完成",
  "run.help.exit.fail": "命令无效、被拒绝、超时或失败",
  "run.error.missingIntent": "缺少命令名称",
  "run.error.unknownIntent": "未知命令：{intent}",
  "run.error.statusNotConfigured":
    '命令 "{intent}" 的状态为 {status}；只能运行已配置的命令',
  "run.error.lifecycleNotOneshot":
    '已拒绝：命令 "{intent}" 的 lifecycle = "{lifecycle}"；mf run 只执行 oneshot 命令',
  "run.error.runPolicy":
    '命令 "{intent}" 需要 run_policy = "agent_allowed" 才能通过 mf run 执行',
  "run.error.stdin": '命令 "{intent}" 必须设置 stdin = "closed"',
  "run.error.timeout": '命令 "{intent}" 必须定义 timeout_seconds',
  "run.error.commandSource":
    '命令 "{intent}" 必须定义 argv，或定义 mode = "shell" 并提供 cmd',
  "run.error.timedOut": '命令 "{intent}" 在 {seconds} 秒后超时',
  "run.error.startFailed": '命令 "{intent}" 启动失败：{message}',

  "search.help.summary":
    "搜索本地 SQLite 索引中的 mustflow 工作流。",
  "search.help.option.limit":
    "设置要输出的结果数量。默认值：10，最大：50",
  "search.help.exit.ok": "搜索完成",
  "search.help.exit.fail": "输入无效或缺少本地索引",
  "search.error.missingLimit": "--limit 缺少值",
  "search.error.invalidLimit": "--limit 必须是 1 到 50 之间的整数",
  "search.error.missingQuery": "需要搜索查询",
  "search.title": "mustflow 搜索",
  "search.noMatches": "没有匹配条目。",

  "status.help.summary":
    "显示本地 mustflow 安装状态，不修改文件。",
  "status.help.exit.ok": "已检查并输出状态",
  "status.title": "mustflow 状态",

  "versionSources.help.summary":
    "显示检测到的包和模板版本来源，不修改文件。",
  "versionSources.help.exit.ok": "已检查并输出版本来源",
  "versionSources.title": "mustflow 版本来源",
  "versionSources.label.versioning": "版本管理偏好",
  "versionSources.label.sources": "来源",
  "versionSources.value.enabled": "已启用",
  "versionSources.value.disabled": "已禁用",
  "versionSources.noSources": "未检测到版本来源",

  "verify.help.summary":
    "运行由 required_after 元数据选出的已配置验证意图。",
  "verify.help.option.reason": "选择要验证的 required_after 原因",
  "verify.help.exit.ok": "选中的所有验证意图均已通过",
  "verify.help.exit.fail":
    "验证失败、部分完成、被阻止，或输入无效",
  "verify.title": "mustflow verify",
  "verify.label.reason": "原因",
  "verify.label.status": "状态",
  "verify.label.results": "结果",
  "verify.error.missingReason": "缺少验证原因",

  "explain.help.summary":
    "在不修改文件的情况下解释 mustflow 策略决策为何适用。",
  "explain.help.exit.ok": "已检查并输出策略决策",
  "explain.title": "mustflow explain",
  "explain.label.topic": "主题",
  "explain.label.decision": "决策",
  "explain.label.reason": "原因",
  "explain.label.effectiveAction": "有效操作",
  "explain.label.countsAsMustflowVerification": "算作 mustflow 验证",
  "explain.label.sourceFiles": "来源文件",
  "explain.label.expectedFrontmatter": "预期 frontmatter",
  "explain.label.authorityBoundary": "权威边界",
  "explain.label.canDefine": "可以定义",
  "explain.label.cannotDefine": "不能定义",
  "explain.label.commandIntent": "命令意图",
  "explain.label.commandName": "命令",
  "explain.label.retentionPolicy": "保留策略",
  "explain.label.skillRoute": "技能路由",
  "explain.label.skillRoutes": "技能路由",
  "explain.error.missingTopic": "缺少 explain 主题",
  "explain.error.missingCommand": "缺少命令意图",
  "explain.error.missingSkill": "缺少技能标识",
  "explain.error.unknownTopic": "未知 explain 主题：{topic}",

  "update.help.summary":
    "预览或应用已安装 mustflow 工作流的更新。",
  "update.help.option.dryRun": "输出更新计划但不写入文件",
  "update.help.option.apply":
    "在没有被阻止的本地更改时应用安全的模板更新",
  "update.help.exit.ok": "已输出计划或已应用安全更新",
  "update.help.exit.fail":
    "计划发现被阻止的更改、缺失状态或无效输入",
  "update.error.cannotCombineModes": "不能同时使用 --dry-run 和 --apply。",
  "update.error.missingMode": "请指定 --dry-run 或 --apply。",
  "update.backup.files": "已将 {count} 个{fileWord}备份到 {path}",
  "update.action.created": "已创建 {path}",
  "update.action.updated": "已更新 {path}",
  "update.action.wrote": "已写入 {path}",
  "update.policy.title": "策略：",
  "update.policy.baseline": "基线",
  "update.policy.applyActions": "应用操作",
  "update.policy.blockingActions": "阻止操作",
  "update.policy.backupPath": "备份路径",
  "update.plan.title": "mustflow 更新计划",
  "update.plan.blocked": "被阻止的本地更改",
  "update.plan.manualReview": "人工审查",
  "update.plan.wouldUpdate": "将更新",
  "update.plan.wouldCreate": "将创建",
  "update.plan.noUpdates": "不需要模板更新。",
  "update.plan.noFilesWritten": "未写入文件。",
  "update.complete":
    "mustflow update 完成：已更新 {updated}，已创建 {created}。",
} satisfies Record<MessageKey, string>;
