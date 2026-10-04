import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { TemplateFileSource, TemplatePaths } from './templates.js';

export function getSimpleWorkflowTemplateFiles(template: TemplatePaths, locale: string, profile: string): TemplateFileSource[] {
	const common = path.join(template.templateRoot, template.manifest.commonRoot);
	const agentsPath = path.join(template.templateRoot, 'workflows', 'simple', locale, 'AGENTS.md');
	const config = `version = 1
profile = ${JSON.stringify(profile)}
read_order = ["AGENTS.md"]
optional_read_order = []

[workflow]
mode = "simple"

[authority]
primary_instruction = "AGENTS.md"
command_contract = ".mustflow/config/commands.toml"
workflow_preferences = ".mustflow/config/preferences.toml"

[workspace]
enabled = false
authority_mode = "repository_local"

[verification]
require_configured_intents = false
allow_inferred_commands = true

[refresh]
required_at = []
`;
	const commands = `schema_version = "1"

[defaults]
default_cwd = "."
stdin = "closed"
default_timeout_seconds = 600
on_timeout = "terminate_process_tree"
max_output_bytes = 1048576
env_policy = "inherit"

# Optional explicit restrictions or project-specific commands go here.
[intents]
`;
	const preferences = `version = 1
profile = ${JSON.stringify(profile)}

[language]
agent_response = ${JSON.stringify(locale)}
docs = ${JSON.stringify(locale)}

[git]
auto_stage = false
auto_commit = false
auto_push = false

[verification.selection]
strategy = "risk_based"
skip_low_risk_code_full_test = true

[release.versioning]
auto_bump = false

[reporting]
verbosity = "concise"
`;
	return [
		{ relativePath: 'AGENTS.md', sourcePath: agentsPath, sourceKind: 'locale', content: readFileSync(agentsPath, 'utf8') },
		...[
			['.mustflow/config/mustflow.toml', config],
			['.mustflow/config/commands.toml', commands],
			['.mustflow/config/preferences.toml', preferences],
		].map(([relativePath, content]): TemplateFileSource => ({
			relativePath, content, sourcePath: path.join(common, relativePath), sourceKind: 'common',
		})),
	];
}
