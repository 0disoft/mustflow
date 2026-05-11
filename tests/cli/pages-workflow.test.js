import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'docs-site.yml');
const pinnedActionPattern = '[a-f0-9]{40}';

test('docs site deploy workflow builds docs-site and deploys the Pages artifact', () => {
	assert.equal(existsSync(workflowPath), true);

	const workflow = readFileSync(workflowPath, 'utf8').replace(/\r\n/g, '\n');

	assert.match(workflow, /branches:\n\s+- main/);
	assert.match(workflow, /paths:\n\s+- 'docs-site\/\*\*'/);
	assert.match(workflow, /workflow_dispatch:/);
	assert.match(workflow, new RegExp(`uses: actions\\/checkout@${pinnedActionPattern}`));
	assert.match(workflow, new RegExp(`uses: actions\\/setup-node@${pinnedActionPattern}`));
	assert.match(workflow, /node-version: "24"/);
	assert.match(workflow, new RegExp(`uses: oven-sh\\/setup-bun@${pinnedActionPattern}`));
	assert.match(workflow, /bun-version-file: package\.json/);
	assert.match(workflow, /working-directory: docs-site/);
	assert.match(workflow, /run: bun install --frozen-lockfile/);
	assert.match(workflow, /run: bun run check/);
	assert.match(workflow, new RegExp(`uses: actions\\/configure-pages@${pinnedActionPattern}`));
	assert.match(workflow, new RegExp(`uses: actions\\/upload-pages-artifact@${pinnedActionPattern}`));
	assert.match(workflow, /path: docs-site\/dist/);
	assert.match(workflow, /pages: write/);
	assert.match(workflow, /id-token: write/);
	assert.match(workflow, /environment:\n\s+name: github-pages/);
	assert.match(workflow, new RegExp(`uses: actions\\/deploy-pages@${pinnedActionPattern}`));
});
