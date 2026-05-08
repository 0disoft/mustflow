export const enMessages = {
  "cli.error.withUsage": "Error: {message}\nRun `{helpCommand}` for usage.",
  "cli.error.prefix": "Error: {message}",
  "cli.error.unknownCommand": "Unknown command: {command}",
  "cli.error.unsupportedLanguage": "Unsupported CLI language: {language}",
  "cli.error.missingLangValue": "Missing value for --lang",
  "cli.option.help": "Show this help message",
  "cli.option.json": "Print machine-readable JSON",
  "cli.heading.usage": "Usage",
  "cli.heading.commands": "Commands",
  "cli.heading.topics": "Topics",
  "cli.heading.options": "Options",
  "cli.heading.examples": "Examples",
  "cli.heading.exitCodes": "Exit codes",
  "cli.common.invalidInput": "Invalid input provided",
  "cli.error.unknownOption": "Unknown option: {option}",
  "cli.error.unexpectedArgument": "Unexpected argument: {argument}",
  "cli.error.unexpectedValue": "Unexpected value for {option}",
  "cli.error.missingValue": "Missing value for {option}",

  "command.init.summary": "Copy the default mustflow agent workflow",
  "command.check.summary": "Validate mustflow files",
  "command.status.summary": "Show local mustflow install status",
  "command.update.summary": "Preview or apply mustflow workflow updates",
  "command.map.summary": "Generate REPO_MAP.md",
  "command.run.summary": "Run a configured oneshot command",
  "command.context.summary": "Print machine-readable agent context",
  "command.doctor.summary": "Inspect mustflow health and next steps",
  "command.index.summary": "Build the local mustflow SQLite index",
  "command.search.summary": "Search the local mustflow SQLite index",
  "command.dashboard.summary":
    "Start the local mustflow dashboard",
  "command.versionSources.summary": "Show detected version sources",
  "command.help.summary": "Show installed workflow help",

  "top.help.option.lang":
    "Select CLI output language. Supported values: {languages}",
  "top.help.option.version": "Show package version",
  "top.help.exit.ok": "Command completed successfully",
  "top.help.exit.fail":
    "Command failed due to validation issues or invalid input",

  "check.help.summary":
    "Validate the mustflow files in the current repository.",
  "check.help.option.strict": "Run additional strict checks for agent safety",
  "check.help.exit.ok": "All required mustflow files and settings are valid",
  "check.help.exit.fail":
    "Validation failed or the command received invalid input",
  "check.result.passed": "mustflow check passed",
  "check.result.strictPassed": "mustflow strict check passed",

  "context.help.summary":
    "Print the agent context for the current mustflow root.",
  "context.help.option.json": "Print machine-readable context JSON",
  "context.help.exit.ok": "Context was inspected and printed",
  "context.title": "mustflow context",
  "label.installed": "Installed",
  "label.mustflowRoot": "mustflow root",
  "label.commandContract": "Command specification",
  "label.runnableIntents": "Runnable commands",
  "label.latestRun": "Latest run",
  "label.manifestLock": "Manifest lock",
  "label.trackedFiles": "Tracked files",
  "label.changedFiles": "Changed files",
  "label.missingFiles": "Missing files",
  "label.database": "Database",
  "label.documents": "Documents",
  "label.skills": "Skills",
  "label.commandIntents": "Command definitions",
  "label.wroteFiles": "Wrote files",
  "label.query": "Query",
  "label.results": "Results",

  "dashboard.help.summary":
    "Start a local dashboard for viewing and editing safe mustflow preferences.",
  "dashboard.help.option.host": "Bind the dashboard to a local host. Default: 127.0.0.1",
  "dashboard.help.option.port": "Bind the dashboard to a port. Default: 0 chooses an available port",
  "dashboard.help.option.noOpen": "Do not open the dashboard in a browser automatically",
  "dashboard.help.exit.ok": "Dashboard was started or help was printed",
  "dashboard.help.exit.fail": "Dashboard could not start or input was invalid",
  "dashboard.error.invalidPort": "Invalid dashboard port: {port}",
  "dashboard.error.nonLocalHost":
    "Refused dashboard host {host}. Use localhost, 127.0.0.1, or ::1.",
  "dashboard.listening": "mf dashboard listening at {url}",
  "dashboard.ui.title": "mustflow dashboard",
  "dashboard.ui.language": "Language",
  "dashboard.ui.noChanges": "No changes",
  "dashboard.ui.unsavedChanges": "Unsaved changes",
  "dashboard.ui.reloaded": "Reloaded",
  "dashboard.ui.saved": "Saved",
  "dashboard.ui.reload": "Reload",
  "dashboard.ui.save": "Save",
  "dashboard.ui.locked": "Locked",
  "dashboard.ui.customLocale": "Custom language tag",
  "dashboard.ui.openMustflow": "Open .mustflow folder",
  "dashboard.ui.openedMustflow": ".mustflow folder opened",
  "dashboard.locked.git.auto_push": "Remote pushes require an explicit request.",
  "dashboard.group.git": "Git",
  "dashboard.group.commitMessage": "Commit message",
  "dashboard.group.reporting": "Reporting",
  "dashboard.group.verification": "Verification",
  "dashboard.group.testAuthoring": "Test authoring",
  "dashboard.group.codeStyle": "Code style",
  "dashboard.group.versioning": "Versioning",
  "dashboard.setting.git.auto_stage": "Git auto stage",
  "dashboard.setting.git.auto_commit": "Git auto commit",
  "dashboard.setting.git.auto_push": "Git auto push",
  "dashboard.setting.git.commit_message.style": "Commit message style",
  "dashboard.setting.git.commit_message.style.description.conventional":
    "Use type-prefixed messages such as feat: or fix:.",
  "dashboard.setting.git.commit_message.style.description.descriptive":
    "Use a short natural-language summary without a required type prefix.",
  "dashboard.setting.git.commit_message.style.description.gitmoji":
    "Prefix messages with a Gitmoji emoji while keeping a type prefix such as feat: or fix:.",
  "dashboard.setting.git.commit_message.language": "Commit message language",
  "dashboard.setting.git.commit_message.language.description.preserve_existing":
    "Follow the repository's existing commit message language.",
  "dashboard.setting.git.commit_message.language.description.agent_response":
    "Use the same language as the agent response.",
  "dashboard.setting.git.commit_message.language.description.docs":
    "Use the same language as the project documents.",
  "dashboard.setting.git.commit_message.language.description.en": "Suggest commit messages in English.",
  "dashboard.setting.git.commit_message.language.description.ko": "Suggest commit messages in Korean.",
  "dashboard.setting.git.commit_message.language.description.zh": "Suggest commit messages in Chinese.",
  "dashboard.setting.git.commit_message.language.description.es": "Suggest commit messages in Spanish.",
  "dashboard.setting.git.commit_message.language.description.fr": "Suggest commit messages in French.",
  "dashboard.setting.git.commit_message.language.description.hi": "Suggest commit messages in Hindi.",
  "dashboard.setting.git.commit_message.language.description":
    "Use the selected custom language tag for commit message suggestions.",
  "dashboard.setting.git.commit_message.max_suggestions": "Commit message suggestion count",
  "dashboard.setting.git.commit_message.include_body": "Commit body",
  "dashboard.setting.git.commit_message.include_body.description.never":
    "Never include a commit message body; suggest a subject line only.",
  "dashboard.setting.git.commit_message.include_body.description.when_non_trivial":
    "Include a body only when the change needs more context than the subject line.",
  "dashboard.setting.git.commit_message.include_body.description.always":
    "Always include a commit message body in suggestions.",
  "dashboard.setting.git.commit_message.split_when_multiple_concerns": "Suggest split commits",
  "dashboard.setting.git.commit_message.avoid_sensitive_details": "Avoid sensitive details",
  "dashboard.setting.git.commit_message.avoid_sensitive_details.description":
    "Avoid secrets, credentials, personal data, and private incident details.",
  "dashboard.setting.reporting.commit_suggestion.enabled": "Commit message suggestions",
  "dashboard.setting.verification.selection.strategy": "Verification strategy",
  "dashboard.setting.verification.selection.strategy.description.risk_based":
    "Balance verification scope against change risk.",
  "dashboard.setting.verification.selection.strategy.description.targeted":
    "Run only checks tied to the changed area.",
  "dashboard.setting.verification.selection.strategy.description.full":
    "Prefer the complete configured verification set.",
  "dashboard.setting.verification.selection.prefer_related_tests": "Prefer related tests",
  "dashboard.setting.verification.selection.skip_docs_only_full_test": "Skip full test for docs-only changes",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test": "Skip full test for low-risk code changes",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test.description":
    "Skip only the full suite when code changes do not affect public behavior, config, schemas, security, or migrations.",
  "dashboard.setting.verification.selection.skip_translation_only_full_test": "Skip full test for translation-only changes",
  "dashboard.setting.verification.selection.skip_copy_only_full_test": "Skip full test for copy-only changes",
  "dashboard.setting.verification.selection.report_skipped": "Report skipped verification",
  "dashboard.setting.testing.authoring.new_test_policy": "New test policy",
  "dashboard.setting.testing.authoring.new_test_policy.description.evidence_required":
    "Add new tests only when behavior-contract evidence supports them.",
  "dashboard.setting.testing.authoring.new_test_policy.description.manual_approval":
    "Ask before adding new tests unless the user directly requested them.",
  "dashboard.setting.testing.authoring.new_test_policy.description.broad":
    "Allow proactive new tests when they clarify important behavior.",
  "dashboard.setting.testing.authoring.prefer_existing_tests": "Prefer existing tests",
  "dashboard.setting.testing.authoring.prefer_existing_tests.description":
    "Update nearby existing tests before creating new test files or cases.",
  "dashboard.setting.testing.authoring.require_new_test_rationale": "Require new test rationale",
  "dashboard.setting.testing.authoring.require_new_test_rationale.description":
    "Report why each new test is needed when tests are added.",
  "dashboard.setting.code_style.avoid_drive_by_refactors": "Avoid drive-by refactors",
  "dashboard.setting.release.versioning.impact_check": "Version impact check",
  "dashboard.setting.release.versioning.impact_check.description":
    "Check whether the change should affect a package or template version.",
  "dashboard.setting.release.versioning.suggest_bump": "Suggest version bump",
  "dashboard.setting.release.versioning.suggest_bump.description":
    "Suggest the bump level when a version change looks necessary.",
  "dashboard.setting.release.versioning.auto_bump": "Auto bump versions",
  "dashboard.setting.release.versioning.auto_bump.description":
    "Allow direct version file edits without a separate manual step.",
  "dashboard.setting.release.versioning.require_user_confirmation": "Require version confirmation",
  "dashboard.setting.release.versioning.require_user_confirmation.description":
    "Ask before applying or accepting a version change.",
  "dashboard.setting.release.versioning.sync_template_version": "Sync template version",
  "dashboard.setting.release.versioning.sync_template_version.description":
    "Keep package and template manifest versions aligned.",
  "dashboard.setting.release.versioning.sync_docs_examples": "Sync docs examples",
  "dashboard.setting.release.versioning.sync_docs_examples.description":
    "Keep documentation examples aligned with the selected version.",
  "dashboard.setting.release.versioning.sync_tests": "Sync tests",
  "dashboard.setting.release.versioning.sync_tests.description":
    "Keep version-sensitive tests and fixtures aligned.",

  "doctor.help.summary":
    "Inspect mustflow root health and get hints for next steps without modifying files.",
  "doctor.help.option.json": "Print machine-readable diagnostic JSON",
  "doctor.help.option.strict":
    "Include additional strict checks for agent safety",
  "doctor.help.exit.ok":
    "mustflow state was inspected and no issues were found",
  "doctor.help.exit.fail": "Validation issues were found or input was invalid",
  "doctor.title": "mustflow doctor",
  "doctor.label.strict": "Strict",
  "doctor.label.check": "Check",
  "doctor.label.issues": "Issues",
  "doctor.section.health": "Health:",
  "doctor.section.issueList": "Issue list:",
  "doctor.section.suggestedCommands": "Suggested commands:",
  "doctor.actionLabel": "run",
  "doctor.diagnostic.install": "Install",
  "doctor.diagnostic.validation": "Validation",
  "doctor.diagnostic.skillRoutes": "Skill routes",
  "doctor.diagnostic.commands": "Command specification",
  "doctor.diagnostic.readOrder": "Read order",
  "doctor.diagnostic.optionalReadOrder": "Optional read order",
  "doctor.diagnostic.repoMap": "REPO_MAP.md",
  "doctor.diagnostic.localIndex": "Local index",
  "doctor.diagnostic.latestRun": "Latest run",

  "help.missingFile":
    "No {path} found in the current directory. Run mf init first or switch to a mustflow root.",
  "help.commands.title": "Commands",
  "help.commands.noIntents":
    "Commands\n\nNo [intents] table was found in .mustflow/config/commands.toml.",
  "help.commands.configuredIntents":
    "Configured commands in .mustflow/config/commands.toml:",
  "help.preferences.title": "Preferences",
  "help.preferences.intro":
    "Repository-level agent preferences in .mustflow/config/preferences.toml:",
  "help.help.summary": "Show help from the installed mustflow workflow.",
  "help.topic.workflow": "Print .mustflow/docs/agent-workflow.md",
  "help.topic.skills": "Print .mustflow/skills/INDEX.md",
  "help.topic.commands": "Summarize .mustflow/config/commands.toml",
  "help.topic.preferences": "Summarize .mustflow/config/preferences.toml",
  "help.help.exit.ok":
    "Help topic was printed or no installed topic was available",
  "help.help.exit.fail": "The command received an unknown topic or option",
  "help.error.unknownTopic": "Unknown help topic: {topic}",

  "index.help.summary":
    "Build a SQLite index that can be regenerated for the mustflow workflow.",
  "index.help.option.dryRun": "Calculate index targets without writing files",
  "index.help.exit.ok": "Index targets were calculated and optionally written",
  "index.title": "mustflow index",
  "index.dryRunNoFiles": "Dry run: no files were written.",

  "init.routerBlock": `<!-- mustflow:start schema=1 -->
This repository follows the mustflow agent workflow.

Read these files before working:
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\` if present
- \`.mustflow/skills/INDEX.md\`
<!-- mustflow:end -->`,
  "init.help.summary":
    "Copy the default mustflow agent workflow into the current repository.",
  "init.help.option.yes": "Use safe defaults for prompts",
  "init.help.option.dryRun": "Print the install plan without writing files",
  "init.help.option.interactive": "Choose init settings from prompts",
  "init.help.option.merge":
    "Merge a mustflow managed block into an existing AGENTS.md",
  "init.help.option.force": "Back up conflicting files and overwrite them",
  "init.help.option.profile":
    "Set project profile: minimal, oss, team, product, or library",
  "init.help.option.locale": "Set installed mustflow document locale",
  "init.help.option.agentLang": "Set the preferred agent response language",
  "init.help.option.set":
    "Set a safe preference value such as git.auto_commit=true or git.auto_push=false",
  "init.help.option.productSourceLocale":
    "Set source locale for user-facing product text",
  "init.help.option.productLocale":
    "Add a user-facing product locale; can be repeated",
  "init.help.exit.ok": "Install completed, skipped, or plan printed",
  "init.help.exit.fail": "Invalid options or file conflicts prevented writing",
  "init.error.cannotCombineMergeForce": "Cannot combine --merge and --force",
  "init.error.cannotCombineInteractiveYes":
    "Cannot combine --interactive and --yes",
  "init.error.unsupportedProfile": "Unsupported profile: {profile}",
  "init.error.supportedProfiles": "Supported profiles: {profiles}",
  "init.error.unsupportedLocale": "Unsupported locale: {locale}",
  "init.error.supportedLocales":
    "Supported template locales for this package: {locales}",
  "init.error.invalidLocaleTag": "Invalid locale tag for {label}: {value}",
  "init.error.invalidPreference":
    "Invalid init preference override: {value}",
  "init.error.invalidPreferenceValue":
    "Invalid value for {key}: {value}",
  "init.error.unsupportedPreference":
    "Unsupported init preference setting: {key}",
  "init.prompt.locale": "Which language should mustflow documents use?",
  "init.prompt.profile": "Which project profile should mustflow use?",
  "init.prompt.agentLang":
    "Which language should agents use for final reports?",
  "init.prompt.advanced": "Customize advanced preferences?",
  "init.prompt.autoStage":
    "Allow agents to stage files automatically?",
  "init.prompt.autoCommit":
    "Allow agents to create commits automatically?",
  "init.prompt.commitMessageLanguage":
    "Preferred commit message language?",
  "init.prompt.commitSuggestions":
    "Enable commit message suggestions?",
  "init.prompt.preserveExisting": "Preserve existing",
  "init.prompt.sameAsAgentReports": "Same as agent reports",
  "init.prompt.sameAsDocuments": "Same as documents",
  "init.prompt.select": "Select [{defaultChoice}]: ",
  "init.prompt.invalidChoice":
    "Enter a number between 1 and {count}.",
  "init.prompt.invalidBoolean": "Enter yes or no.",
  "init.plan.would": "Would {action} {path}",
  "init.plan.noFilesWritten": "No files were written.",
  "init.conflict":
    "Conflict: {path} already exists and differs from the mustflow template.",
  "init.conflictGuidance":
    "Use --dry-run to preview, --merge to add a mustflow block to AGENTS.md, or --force to back up and overwrite.",
  "init.selection.profile": "Template profile: {profile}",
  "init.selection.locale": "Template locale: {locale}",
  "init.selection.agentLang": "Agent response language: {locale}",
  "init.selection.productSourceLocale": "Product source locale: {locale}",
  "init.selection.productLocales": "Product locales: {locales}",
  "init.selection.sourceLocaleOnly": "(source locale only)",
  "init.backup.conflicts": "Backed up {count} conflicting {fileWord} to {path}",
  "init.fileWord.singular": "file",
  "init.fileWord.plural": "files",
  "init.action.created": "Created {path}",
  "init.action.unchanged": "Unchanged {path}",
  "init.action.merged": "Merged {path}",
  "init.action.overwrote": "Overwrote {path}",
  "init.action.customizedPreferences":
    "Customized .mustflow/config/preferences.toml",
  "init.action.wrote": "Wrote {path}",
  "init.complete":
    "mustflow init complete: {created} created, {merged} merged, {overwritten} overwritten, {unchanged} unchanged.",

  "map.help.summary":
    "Generate an agent navigation map from repository key files.",
  "map.help.option.stdout": "Print the generated map",
  "map.help.option.write": "Write REPO_MAP.md",
  "map.help.option.depth": "Limit depth for non-priority directories",
  "map.help.option.includeNested":
    "Include nested repositories from configured workspace roots",
  "map.help.option.rootOnly": "Ignore nested repositories even when configured",
  "map.help.exit.ok": "Map was generated and optionally written",
  "map.error.nestedConflict": "Cannot combine --include-nested and --root-only",
  "map.error.invalidDepth": "Invalid value for --depth",
  "map.wrote": "Wrote REPO_MAP.md",

  "run.help.summary":
    "Run a configured oneshot command from .mustflow/config/commands.toml.",
  "run.help.option.json": "Print the run record as JSON",
  "run.help.exit.ok": "The command completed with an allowed exit code",
  "run.help.exit.fail": "The command was invalid, refused, timed out, or failed",
  "run.error.missingIntent": "Missing command name",
  "run.error.unknownIntent": "Unknown command: {intent}",
  "run.error.statusNotConfigured":
    'Command "{intent}" is {status}; only configured commands can be run',
  "run.error.lifecycleNotOneshot":
    'Refused: command "{intent}" has lifecycle = "{lifecycle}"; mf run only executes oneshot commands',
  "run.error.runPolicy":
    'Command "{intent}" requires run_policy = "agent_allowed" for mf run',
  "run.error.stdin": 'Command "{intent}" must set stdin = "closed"',
  "run.error.timeout": 'Command "{intent}" must define timeout_seconds',
  "run.error.commandSource":
    'Command "{intent}" must define argv or mode = "shell" with cmd',
  "run.error.timedOut": 'Command "{intent}" timed out after {seconds} seconds',
  "run.error.startFailed": 'Command "{intent}" failed to start: {message}',

  "search.help.summary":
    "Search the local SQLite index for the mustflow workflow.",
  "search.help.option.limit":
    "Set the number of results to print. Default: 10, max: 50",
  "search.help.exit.ok": "Search completed",
  "search.help.exit.fail": "Invalid input or missing local index",
  "search.error.missingLimit": "Missing value for --limit",
  "search.error.invalidLimit": "--limit must be an integer between 1 and 50",
  "search.error.missingQuery": "Search query is required",
  "search.title": "mustflow search",
  "search.noMatches": "No matching entries.",

  "status.help.summary":
    "Show the local mustflow install status without modifying files.",
  "status.help.exit.ok": "Status was inspected and printed",
  "status.title": "mustflow status",

  "versionSources.help.summary":
    "Show detected package and template version sources without modifying files.",
  "versionSources.help.exit.ok": "Version sources were inspected and printed",
  "versionSources.title": "mustflow version sources",
  "versionSources.label.versioning": "Versioning preferences",
  "versionSources.label.sources": "Sources",
  "versionSources.value.enabled": "enabled",
  "versionSources.value.disabled": "disabled",
  "versionSources.noSources": "No version sources detected",

  "update.help.summary":
    "Preview or apply updates for the installed mustflow workflow.",
  "update.help.option.dryRun": "Print the update plan without writing files",
  "update.help.option.apply":
    "Apply safe template updates when no local changes are blocked",
  "update.help.exit.ok": "Plan was printed or safe updates were applied",
  "update.help.exit.fail":
    "Plan found blocked changes, missing state, or invalid input",
  "update.error.cannotCombineModes": "Cannot combine --dry-run and --apply.",
  "update.error.missingMode": "Specify --dry-run or --apply.",
  "update.backup.files": "Backed up {count} {fileWord} to {path}",
  "update.action.created": "Created {path}",
  "update.action.updated": "Updated {path}",
  "update.action.wrote": "Wrote {path}",
  "update.policy.title": "Policy:",
  "update.policy.baseline": "Baseline",
  "update.policy.applyActions": "Apply actions",
  "update.policy.blockingActions": "Blocking actions",
  "update.policy.backupPath": "Backup path",
  "update.plan.title": "mustflow update plan",
  "update.plan.blocked": "Blocked local changes",
  "update.plan.manualReview": "Manual review",
  "update.plan.wouldUpdate": "Would update",
  "update.plan.wouldCreate": "Would create",
  "update.plan.noUpdates": "No template updates needed.",
  "update.plan.noFilesWritten": "No files were written.",
  "update.complete":
    "mustflow update complete: {updated} updated, {created} created.",
} as const;

export type MessageKey = keyof typeof enMessages;
