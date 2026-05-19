import { spawn, spawnSync } from 'node:child_process';

import type { RunTerminationReceipt } from '../../../core/run-receipt.js';

function signalProcessTree(pid: number | undefined, signal: NodeJS.Signals): void {
	if (!pid || pid <= 0) {
		return;
	}

	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
			stdio: 'ignore',
			windowsHide: true,
		});
		if (signal === 'SIGKILL') {
			try {
				process.kill(pid, signal);
			} catch {
				// taskkill may already have terminated the direct child.
			}
		}
		return;
	}

	try {
		process.kill(-pid, signal);
	} catch {
		try {
			process.kill(pid, signal);
		} catch {
			// The child may already be gone after Node's spawn timeout handling.
		}
	}
}

function signalProcessTreeNonBlocking(pid: number | undefined, signal: NodeJS.Signals): void {
	if (!pid || pid <= 0) {
		return;
	}

	if (process.platform === 'win32') {
		const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
			stdio: 'ignore',
			windowsHide: true,
			detached: true,
		});
		killer.unref();

		if (signal === 'SIGKILL') {
			try {
				process.kill(pid, signal);
			} catch {
				// taskkill may already have terminated the direct child.
			}
		}
		return;
	}

	try {
		process.kill(-pid, signal);
	} catch {
		try {
			process.kill(pid, signal);
		} catch {
			// The child may already be gone after the timeout fired.
		}
	}
}

export function terminateProcessTree(pid: number | undefined): void {
	signalProcessTree(pid, 'SIGTERM');
}

export function forceTerminateProcessTree(pid: number | undefined): void {
	signalProcessTree(pid, 'SIGKILL');
}

export function terminateProcessTreeNonBlocking(pid: number | undefined): void {
	signalProcessTreeNonBlocking(pid, 'SIGTERM');
}

export function forceTerminateProcessTreeNonBlocking(pid: number | undefined): void {
	signalProcessTreeNonBlocking(pid, 'SIGKILL');
}

export function getKillMethod(): string {
	return process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm';
}

export function createPendingTimeoutTermination(method: string): RunTerminationReceipt {
	return {
		reason: 'timeout',
		method,
		graceful_signal: 'SIGTERM',
		forced_signal: 'SIGKILL',
		forced_kill_attempted: true,
		confirmed: false,
		cleanup_pending: true,
	};
}
