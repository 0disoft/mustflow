import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'docs-site.yml');

test('docs site deploy workflow builds docs-site and deploys the Pages artifact', () => {
	assert.equal(existsSync(workflowPath), true);

	const workflow = readFileSync(workflowPath, 'utf8');

	assert.match(workflow, /branches:\n\s+- main/);
	assert.match(workflow, /paths:\n\s+- 'docs-site\/\*\*'/);
	assert.match(workflow, /workflow_dispatch:/);
	assert.match(workflow, /uses: actions\/checkout@v6/);
	assert.match(workflow, /uses: oven-sh\/setup-bun@v2/);
	assert.match(workflow, /bun-version-file: package\.json/);
	assert.match(workflow, /working-directory: docs-site/);
	assert.match(workflow, /run: bun install --frozen-lockfile/);
	assert.match(workflow, /run: bun run check/);
	assert.match(workflow, /uses: actions\/configure-pages@v5/);
	assert.match(workflow, /uses: actions\/upload-pages-artifact@v4/);
	assert.match(workflow, /path: docs-site\/dist/);
	assert.match(workflow, /pages: write/);
	assert.match(workflow, /id-token: write/);
	assert.match(workflow, /environment:\n\s+name: github-pages/);
	assert.match(workflow, /uses: actions\/deploy-pages@v4/);
});
