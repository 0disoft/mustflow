import { spawn, type ChildProcess } from 'node:child_process';

export interface BrowserOpenCommand {
	readonly bin: string;
	readonly args: readonly string[];
}

export interface BrowserOpenOptions {
	readonly platform?: NodeJS.Platform;
	readonly spawnProcess?: (bin: string, args: readonly string[]) => ChildProcess;
}

function spawnDetached(bin: string, args: readonly string[]): ChildProcess {
	return spawn(bin, [...args], {
		detached: true,
		stdio: 'ignore',
		windowsHide: true,
	});
}

export function getBrowserOpenCommand(url: string, platform: NodeJS.Platform = process.platform): BrowserOpenCommand | undefined {
	if (platform === 'win32') {
		return { bin: 'cmd', args: ['/c', 'start', '', url] };
	}

	if (platform === 'darwin') {
		return { bin: 'open', args: [url] };
	}

	if (platform === 'linux' || platform === 'freebsd' || platform === 'openbsd') {
		return { bin: 'xdg-open', args: [url] };
	}

	return undefined;
}

export function getFileManagerOpenCommand(
	targetPath: string,
	platform: NodeJS.Platform = process.platform,
): BrowserOpenCommand | undefined {
	if (platform === 'win32') {
		return { bin: 'cmd', args: ['/c', 'start', '', targetPath] };
	}

	if (platform === 'darwin') {
		return { bin: 'open', args: [targetPath] };
	}

	if (platform === 'linux' || platform === 'freebsd' || platform === 'openbsd') {
		return { bin: 'xdg-open', args: [targetPath] };
	}

	return undefined;
}

export function openUrlInBrowser(url: string, options: BrowserOpenOptions = {}): boolean {
	const command = getBrowserOpenCommand(url, options.platform);

	if (!command) {
		return false;
	}

	const spawnProcess = options.spawnProcess ?? spawnDetached;
	const child = spawnProcess(command.bin, command.args);
	child.once('error', () => {
		// The dashboard URL is still printed, so browser-open failure must not stop the server.
	});
	child.unref();
	return true;
}

export function openPathInFileManager(targetPath: string, options: BrowserOpenOptions = {}): boolean {
	const command = getFileManagerOpenCommand(targetPath, options.platform);

	if (!command) {
		return false;
	}

	const spawnProcess = options.spawnProcess ?? spawnDetached;
	const child = spawnProcess(command.bin, command.args);
	child.once('error', () => {
		// The dashboard can report the failure through the API response path.
	});
	child.unref();
	return true;
}
