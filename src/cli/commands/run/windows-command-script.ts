export interface WindowsCommandScriptSpawn {
	readonly executable: string;
	readonly args: readonly string[];
	readonly shell: false;
	readonly windowsVerbatimArguments: true;
}

export function isWindowsCommandScriptPath(executablePath: string): boolean {
	return /\.(?:cmd|bat)$/iu.test(executablePath);
}

export function quoteWindowsCommandScriptToken(value: string): string {
	if (/[\u0000\r\n]/u.test(value)) {
		throw Object.assign(new Error('Windows command script arguments must not contain NUL or line breaks'), { code: 'EINVAL' });
	}

	if (/^[A-Za-z0-9_./:\\@+=,-]+$/u.test(value)) {
		return value;
	}

	return `"${value.replace(/"/gu, '""')}"`;
}

export function createWindowsCommandScriptLine(executablePath: string, args: readonly string[]): string {
	return ['call', quoteWindowsCommandScriptToken(executablePath), ...args.map(quoteWindowsCommandScriptToken)].join(' ');
}

export function createWindowsCommandScriptSpawn(
	executablePath: string,
	args: readonly string[],
	comspec: string | undefined = process.env.ComSpec ?? process.env.COMSPEC,
): WindowsCommandScriptSpawn {
	return {
		executable: comspec && comspec.trim().length > 0 ? comspec : 'cmd.exe',
		args: ['/d', '/s', '/c', createWindowsCommandScriptLine(executablePath, args)],
		shell: false,
		windowsVerbatimArguments: true,
	};
}
