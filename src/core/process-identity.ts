import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const POSIX_PROCESS_QUERY_TIMEOUT_MS = 2_000;
const WINDOWS_PROCESS_QUERY_TIMEOUT_MS = 15_000;
const PROCESS_QUERY_MAX_BUFFER = 16 * 1024;

function readLinuxProcessStartToken(pid: number): string | null {
	try {
		const bootId = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
		const stat = readFileSync(`/proc/${pid}/stat`, 'utf8').trim();
		const commandEnd = stat.lastIndexOf(')');
		if (commandEnd < 0) {
			return null;
		}

		const fieldsAfterCommand = stat.slice(commandEnd + 2).split(/\s+/u);
		const startTimeTicks = fieldsAfterCommand[19];
		return bootId && startTimeTicks ? `linux:${bootId}:${startTimeTicks}` : null;
	} catch {
		return null;
	}
}

function readWindowsProcessStartToken(pid: number): string | null {
	const systemRoot = process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows';
	const bundledPowerShell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
	const executable = existsSync(bundledPowerShell) ? bundledPowerShell : 'powershell.exe';
	const script = `$p=Get-Process -Id ${pid} -ErrorAction Stop; [Console]::Out.Write($p.StartTime.ToUniversalTime().Ticks)`;
	const result = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
		encoding: 'utf8',
		windowsHide: true,
		timeout: WINDOWS_PROCESS_QUERY_TIMEOUT_MS,
		maxBuffer: PROCESS_QUERY_MAX_BUFFER,
	});
	const ticks = result.status === 0 ? result.stdout.trim() : '';
	return /^\d+$/u.test(ticks) ? `win32:${ticks}` : null;
}

function readDarwinProcessStartToken(pid: number): string | null {
	const result = spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], {
		encoding: 'utf8',
		timeout: POSIX_PROCESS_QUERY_TIMEOUT_MS,
		maxBuffer: PROCESS_QUERY_MAX_BUFFER,
	});
	const startedAt = result.status === 0 ? result.stdout.trim().replace(/\s+/gu, ' ') : '';
	return startedAt ? `darwin:${startedAt}` : null;
}

export function readProcessStartToken(pid: number): string | null {
	if (!Number.isInteger(pid) || pid <= 0) {
		return null;
	}

	if (process.platform === 'linux') {
		return readLinuxProcessStartToken(pid);
	}
	if (process.platform === 'win32') {
		return readWindowsProcessStartToken(pid);
	}
	if (process.platform === 'darwin') {
		return readDarwinProcessStartToken(pid);
	}

	return null;
}

const UNVERIFIED_PROCESS_START_TOKEN_PREFIX = 'unverified:';

export function processStartTokensProveMismatch(
	recordedToken: string | null,
	currentToken: string | null,
): boolean {
	return recordedToken !== null &&
		currentToken !== null &&
		!recordedToken.startsWith(UNVERIFIED_PROCESS_START_TOKEN_PREFIX) &&
		!currentToken.startsWith(UNVERIFIED_PROCESS_START_TOKEN_PREFIX) &&
		recordedToken !== currentToken;
}

let currentProcessStartToken: string | undefined;

export function readCurrentProcessStartToken(): string {
	if (currentProcessStartToken === undefined) {
		currentProcessStartToken = readProcessStartToken(process.pid) ??
			`${UNVERIFIED_PROCESS_START_TOKEN_PREFIX}${process.platform}:${process.pid}:${randomUUID()}`;
	}

	return currentProcessStartToken;
}
