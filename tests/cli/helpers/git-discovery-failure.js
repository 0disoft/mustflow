import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { cliPath } from '../run-support.js';

export function runCliWithUntrackedDiscoveryFailure(projectPath, args, partialStdout) {
	const injection = path.join(projectPath, '.git', 'fail-untracked.mjs');
	writeFileSync(injection, `
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const original = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  if (command === 'git' && args[0] === 'ls-files') {
    return { status: 128, stdout: ${JSON.stringify(partialStdout)}, stderr: 'fatal: injected untracked discovery failure' };
  }
  return original(command, args, options);
};
syncBuiltinESMExports();
`);
	return spawnSync(process.execPath, ['--import', pathToFileURL(injection).href, cliPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
	});
}
