import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findMergedPullRequests } from '../../scripts/clarissimi-merged-prs.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'docs-site.yml');
const clarissimiWorkflowPath = path.join(projectRoot, '.github', 'workflows', 'clarissimi.yml');
const clarissimiReviewPath = path.join(projectRoot, '.github', 'workflows', 'clarissimi-review.yml');
const pinnedActionPattern = '[a-f0-9]{40}';
const checkoutCommit = '9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';
const clarissimiCommit = 'aeb23a8e5efed45c145d4dffa91498db7304ff76';

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

test('Clarissimi review runs with read access on pull requests', () => {
	const workflow = readFileSync(clarissimiReviewPath, 'utf8').replace(/\r\n/g, '\n');

	assert.match(workflow, /pull_request:\n    branches:\n      - main/);
	assert.match(workflow, /types:\n      - opened\n      - reopened\n      - synchronize\n\n/);
	assert.match(workflow, /permissions: \{\}/);
	assert.match(workflow, /review-decision:\n    name: Clarissimi review decision/);
	assert.match(workflow, /permissions:\n      contents: read\n      pull-requests: read\n      issues: read/);
	assert.match(workflow, new RegExp(`uses: 0disoft/clarissimi@${clarissimiCommit} # v1\\.1\\.0`));
	assert.match(workflow, /mode: gate/);
	assert.match(workflow, /gate-mode: \$\{\{ vars\.CLARISSIMI_GATE_MODE \|\| 'advisory' \}\}/);
	assert.doesNotMatch(workflow, /pull_request_target:|workflow_dispatch:|actions\/checkout@|: write|secrets\.|mode: (?:stage|promote)-draft/);
});

test('Clarissimi stages merged drafts from main and promotes approved drafts manually', () => {
	const workflow = readFileSync(clarissimiWorkflowPath, 'utf8').replace(/\r\n/g, '\n');

	assert.match(workflow, /push:\n    branches:\n      - main/);
	assert.match(workflow, /workflow_dispatch:\n\s+inputs:\n\s+draft-path:/);
	assert.match(workflow, /permissions: \{\}/);
	assert.doesNotMatch(workflow, /^  pull_request(?:_target)?:|secrets\.|mode: gate/m);
	assert.equal(
		workflow.match(new RegExp(`uses: 0disoft\\/clarissimi@${clarissimiCommit} # v1\\.1\\.0`, 'g'))?.length,
		2,
	);
	assert.equal(workflow.match(new RegExp(`uses: actions\\/checkout@${checkoutCommit}`, 'g'))?.length, 3);
	assert.equal(workflow.match(/ref: main/g)?.length, 2);
	assert.equal(workflow.match(/persist-credentials: true/g)?.length, 2);
	assert.equal(workflow.match(/contents: write/g)?.length, 2);
	assert.equal(workflow.match(/pull-requests: write/g)?.length, 2);
	assert.equal(workflow.match(/issues: read/g)?.length, 2);

	const discovery = workflow.slice(workflow.indexOf('  merged-pull-requests:'), workflow.indexOf('  stage-draft:'));
	assert.match(discovery, /github\.event_name == 'push'/);
	assert.match(discovery, /persist-credentials: false/);
	assert.match(discovery, /run: node scripts\/clarissimi-merged-prs\.mjs/);
	assert.doesNotMatch(discovery, /: write/);

	assert.match(workflow, /needs: merged-pull-requests/);
	assert.match(workflow, /fromJSON\(needs\.merged-pull-requests\.outputs\.numbers\)/);
	assert.ok(workflow.includes('select(.merged == true and .base.ref == "main" and .base.repo.full_name == $repo)'));
	assert.ok(workflow.includes('startswith("clarissimi/") | not'));
	assert.match(workflow, /mode: stage-draft/);
	assert.match(workflow, /event-path: \$\{\{ runner\.temp \}\}\/clarissimi-event\.json/);
	assert.match(workflow, /comment-mode: upsert/);
	assert.match(workflow, /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
	assert.match(workflow, /mode: promote-draft/);
	assert.match(workflow, /draft-path: \$\{\{ inputs\.draft-path \}\}/);
	assert.match(workflow, /markdown-summary: gallery/);
	assert.match(workflow, /include-automation-contributors: true/);
});

test('Clarissimi selects every PR merged by a main push, including fork PRs', () => {
	const repository = '0disoft/mustflow';
	const base = { ref: 'main', repo: { full_name: repository } };
	const merged = { merged_at: '2026-11-28T01:00:00Z', base, head: { ref: 'feature' } };
	const sameRepo = { ...merged, number: 12, merge_commit_sha: 'merge' };
	const fork = {
		...merged,
		number: 13,
		merge_commit_sha: 'squash',
		head: { ref: 'fork-feature', repo: { full_name: 'contributor/mustflow' } },
	};
	const rebased = { ...merged, number: 14, merge_commit_sha: 'rebase-end' };
	const associated = {
		merge: [
			sameRepo,
			{ ...sameRepo, number: 20, merged_at: null },
			{ ...sameRepo, number: 21, base: { ...base, ref: 'dev' } },
			{ ...sameRepo, number: 22, base: { ...base, repo: { full_name: 'another/repo' } } },
			{ ...sameRepo, number: 23, head: { ref: 'clarissimi/drafts/pull-request-12' } },
		],
		squash: [sameRepo, fork, fork],
		'rebase-start': [rebased],
		'rebase-end': [rebased],
		direct: [],
	};
	const list = (commit) => associated[commit];

	assert.deepEqual(findMergedPullRequests(Object.keys(associated), repository, list), [12, 13, 14]);
	assert.deepEqual(findMergedPullRequests(['direct'], repository, list), []);
});
