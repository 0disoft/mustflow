import { readCommandContractIncludePaths } from '../../core/config-loading.js';

const WORKFLOW_PATHS = new Set([
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
	'.mustflow/skills/INDEX.md',
	'.mustflow/skills/routes.toml',
	'.mustflow/skills/router.toml',
	'.mustflow/skills/catalog.v2.json',
]);

export function isAllowedManifestCustomizationPath(projectRoot: string, relativePath: string): boolean {
	if (WORKFLOW_PATHS.has(relativePath) || /^\.mustflow\/skills\/[a-z0-9-]+\/SKILL\.md$/u.test(relativePath)) {
		return true;
	}
	return readCommandContractIncludePaths(projectRoot).includes(relativePath);
}
