import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'docs-site.yml');
const clarissimiWorkflowPath = path.join(projectRoot, '.github', 'workflows', 'clarissimi.yml');
const pinnedActionPattern = '[a-f0-9]{40}';
const checkoutCommit = '9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';
const clarissimiReleaseCommit = '24a0ff299fecfa6cb70fd8f425945b2f13e284c9';
const clarissimiGateCommit = '7403aeffbdb064da3e96bc6be552ff22c20d64e0';

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

test('Clarissimi gates PR decisions, stages merged drafts, and promotes approved recognition', () => {
	assert.equal(existsSync(clarissimiWorkflowPath), true);

	const workflow = readFileSync(clarissimiWorkflowPath, 'utf8').replace(/\r\n/g, '\n');

	assert.match(workflow, /pull_request_target:\n\s+branches:\n\s+- main/);
	assert.match(workflow, /types:\n\s+- opened\n\s+- reopened\n\s+- synchronize\n\s+- closed/);
	assert.match(workflow, /workflow_dispatch:\n\s+inputs:\n\s+draft-path:/);
	assert.match(workflow, /permissions: \{\}/);
	assert.match(workflow, /github\.event\.pull_request\.merged == true/);
	assert.match(
		workflow,
		/!startsWith\(github\.event\.pull_request\.head\.ref, 'clarissimi\/'\)/,
	);
	assert.doesNotMatch(workflow, /github\.event\.pull_request\.head\.sha/);
	assert.doesNotMatch(workflow, /secrets\./);
	assert.match(workflow, /review-decision:\n\s+name: Clarissimi review decision/);
	assert.match(workflow, /github\.event\.action != 'closed'/);
	assert.match(workflow, new RegExp(`uses: 0disoft\\/clarissimi@${clarissimiGateCommit}`));
	assert.match(workflow, /mode: gate/);
	assert.match(
		workflow,
		/gate-mode: \$\{\{ vars\.CLARISSIMI_GATE_MODE \|\| 'advisory' \}\}/,
	);
	assert.match(
		workflow,
		/review-decision:[\s\S]*?permissions:\n\s+contents: read\n\s+pull-requests: read\n\s+issues: read[\s\S]*?mode: gate/,
	);
	assert.doesNotMatch(
		workflow,
		/review-decision:[\s\S]*?actions\/checkout@[a-f0-9]{40}[\s\S]*?stage-draft:/,
	);

	assert.equal(workflow.match(new RegExp(`uses: actions\\/checkout@${checkoutCommit}`, 'g'))?.length, 2);
	assert.equal(
		workflow.match(new RegExp(`uses: 0disoft\\/clarissimi@${clarissimiReleaseCommit}`, 'g'))
			?.length,
		2,
	);
	assert.equal(workflow.match(/persist-credentials: true/g)?.length, 2);
	assert.equal(workflow.match(/contents: write/g)?.length, 2);
	assert.equal(workflow.match(/pull-requests: write/g)?.length, 2);
	assert.equal(workflow.match(/issues: read/g)?.length, 3);

	assert.match(workflow, /mode: stage-draft/);
	assert.match(workflow, /comment-mode: upsert/);
	assert.match(workflow, /mode: promote-draft/);
	assert.match(workflow, /draft-path: \$\{\{ inputs\.draft-path \}\}/);
	assert.match(workflow, /markdown-summary: gallery/);
	assert.match(workflow, /include-automation-contributors: true/);
});
