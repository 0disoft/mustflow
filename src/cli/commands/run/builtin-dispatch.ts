import { canRunMustflowBuiltinInProcess, isMustflowBinName } from '../../../core/command-classification.js';
import type { CliLang } from '../../lib/i18n.js';
import { getPackageVersion } from '../../lib/package-info.js';
import type { Reporter } from '../../lib/reporter.js';
import type { CommandResult } from './executor.js';
import { createBufferedReporter } from './output.js';

/**
 * mf:anchor cli.run.builtin-inprocess
 * purpose: Dispatch selected mustflow built-in commands without spawning a nested CLI process.
 * search: builtin intent, in-process command, nested mf run, run receipt
 * invariant: Only commands classified by command-classification can use this path.
 * risk: config, state
 */
async function runKnownBuiltinCommand(args: readonly string[], reporter: Reporter, lang: CliLang): Promise<number | undefined> {
	const [command, ...commandArgs] = args;

	if ((command === '--version' || command === '-v' || command === 'version') && commandArgs.length === 0) {
		reporter.stdout(getPackageVersion());
		return 0;
	}

	if (!canRunMustflowBuiltinInProcess(command)) {
		return undefined;
	}

	if (command === 'check') {
		return (await import('../check.js')).runCheck(commandArgs, reporter, lang);
	}

	if (command === 'classify') {
		return (await import('../classify.js')).runClassify(commandArgs, reporter, lang);
	}

	if (command === 'context') {
		return (await import('../context.js')).runContext(commandArgs, reporter, lang);
	}

	if (command === 'doctor') {
		return (await import('../doctor.js')).runDoctor(commandArgs, reporter, lang);
	}

	if (command === 'help') {
		return (await import('../help.js')).runHelp(commandArgs, reporter, lang);
	}

	if (command === 'impact') {
		return (await import('../impact.js')).runImpact(commandArgs, reporter, lang);
	}

	if (command === 'line-endings') {
		return (await import('../line-endings.js')).runLineEndings(commandArgs, reporter, lang);
	}

	if (command === 'map') {
		return (await import('../map.js')).runMap(commandArgs, reporter, lang);
	}

	if (command === 'status') {
		return (await import('../status.js')).runStatus(commandArgs, reporter, lang);
	}

	if (command === 'update') {
		return (await import('../update.js')).runUpdate(commandArgs, reporter, lang);
	}

	if (command === 'version-sources') {
		return (await import('../version-sources.js')).runVersionSources(commandArgs, reporter, lang);
	}

	return undefined;
}

async function withWorkingDirectory<T>(cwd: string, callback: () => T | Promise<T>): Promise<T> {
	const previousCwd = process.cwd();

	process.chdir(cwd);

	try {
		return await callback();
	} finally {
		process.chdir(previousCwd);
	}
}

export async function runBuiltinArgvInProcess(commandArgv: readonly string[], cwd: string, lang: CliLang): Promise<CommandResult | undefined> {
	const [command = '', ...builtinArgs] = commandArgv;

	if (!isMustflowBinName(command)) {
		return undefined;
	}

	const output = createBufferedReporter();

	try {
		const status = await withWorkingDirectory(cwd, () => runKnownBuiltinCommand(builtinArgs, output.reporter, lang));

		if (status === undefined) {
			return undefined;
		}

		return {
			status,
			signal: null,
			stdout: output.stdout(),
			stderr: output.stderr(),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		return {
			status: 1,
			signal: null,
			stdout: output.stdout(),
			stderr: `${output.stderr()}${message}\n`,
		};
	}
}
