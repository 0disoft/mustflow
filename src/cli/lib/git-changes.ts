import { spawnSync } from 'node:child_process';

import { parseGitStatusOutput } from '../../core/change-classification.js';

export function readGitChangedFiles(projectRoot: string): string[] {
	const result = spawnSync('git', ['status', '--short', '--untracked-files=all'], {
		cwd: projectRoot,
		encoding: 'utf8',
		windowsHide: true,
	});

	if (result.status !== 0 || typeof result.stdout !== 'string') {
		return [];
	}

	return parseGitStatusOutput(result.stdout);
}
