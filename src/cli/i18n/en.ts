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
    "Open the local mustflow dashboard (not implemented yet)",
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
    "Reserved command for the local mustflow dashboard. This feature is not implemented yet.",
  "dashboard.help.exit.ok": "Help was printed",
  "dashboard.help.exit.notImplemented": "Dashboard is not implemented yet",
  "dashboard.notImplemented": "mf dashboard is not implemented yet",

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
    "Set an allowed preference value such as git.auto_commit=true",
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
