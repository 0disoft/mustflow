import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const queryOptions = {
	encoding: 'utf8',
	timeout: 2_000,
	maxBuffer: 16 * 1024,
};

export function readProcessStartToken(pid) {
	if (!Number.isInteger(pid) || pid <= 0) {
		return undefined;
	}

	if (process.platform === 'linux') {
		try {
			const bootId = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
			const stat = readFileSync(`/proc/${pid}/stat`, 'utf8').trim();
			const commandEnd = stat.lastIndexOf(')');
			const startTimeTicks = commandEnd < 0 ? undefined : stat.slice(commandEnd + 2).split(/\s+/u)[19];
			return bootId && startTimeTicks ? `linux:${bootId}:${startTimeTicks}` : undefined;
		} catch {
			return undefined;
		}
	}

	if (process.platform === 'win32') {
		const systemRoot = process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows';
		const bundledPowerShell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
		const executable = existsSync(bundledPowerShell) ? bundledPowerShell : 'powershell.exe';
		const script = `$p=Get-Process -Id ${pid} -ErrorAction Stop; [Console]::Out.Write($p.StartTime.ToUniversalTime().Ticks)`;
		const result = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
			...queryOptions,
			windowsHide: true,
		});
		const ticks = result.status === 0 ? result.stdout.trim() : '';
		return /^\d+$/u.test(ticks) ? `win32:${ticks}` : undefined;
	}

	if (process.platform === 'darwin') {
		const result = spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], queryOptions);
		const startedAt = result.status === 0 ? result.stdout.trim().replace(/\s+/gu, ' ') : '';
		return startedAt ? `darwin:${startedAt}` : undefined;
	}

	return undefined;
}
