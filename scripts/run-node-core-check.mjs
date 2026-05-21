import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function run(label, args) {
	console.log(`$ node ${args.join(' ')}`);
	const result = spawnSync(process.execPath, args, {
		cwd: projectRoot,
		stdio: 'inherit',
		env: process.env,
	});

	if (result.error) {
		console.error(`${label} failed to start: ${result.error.message}`);
		process.exit(1);
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
console.log('package.json ok');

run('typecheck', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit']);

rmSync(path.join(projectRoot, 'dist'), { recursive: true, force: true });
run('build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
run('fast tests', ['scripts/run-cli-tests.mjs', 'fast']);
run('release tests', ['scripts/run-cli-tests.mjs', 'release']);
