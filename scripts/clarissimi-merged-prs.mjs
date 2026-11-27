import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function findMergedPullRequests(commits, repository, listAssociatedPullRequests) {
	const numbers = new Set();
	for (const commit of commits) {
		for (const pr of listAssociatedPullRequests(commit)) {
			if (
				pr.merged_at &&
				pr.merge_commit_sha === commit &&
				pr.base?.ref === 'main' &&
				pr.base.repo?.full_name === repository &&
				typeof pr.head?.ref === 'string' &&
				!pr.head.ref.startsWith('clarissimi/') &&
				Number.isSafeInteger(pr.number) &&
				pr.number > 0
			) {
				numbers.add(pr.number);
			}
		}
	}
	return [...numbers];
}

function main({ BEFORE_SHA: before, GITHUB_SHA: after, GITHUB_REPOSITORY: repository, GITHUB_OUTPUT: output }) {
	if (![before, after].every((sha) => /^[a-f0-9]{40}$/.test(sha ?? ''))) {
		throw new Error('Clarissimi requires valid before and after commit SHAs.');
	}

	// The final commit for each merge, squash, or rebase is on main's first-parent history.
	const history = execFileSync('git', ['rev-list', '--first-parent', '--reverse', `${before}..${after}`], {
		encoding: 'utf8',
	});
	const commits = history.trim().split(/\s+/).filter(Boolean);
	const numbers = findMergedPullRequests(commits, repository, (commit) => {
		const pages = execFileSync('gh', [
			'api', '--paginate', '--slurp', `repos/${repository}/commits/${commit}/pulls?per_page=100`,
		], { encoding: 'utf8' });
		return JSON.parse(pages).flat();
	});
	appendFileSync(output, `numbers=${JSON.stringify(numbers)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main(process.env);
}
