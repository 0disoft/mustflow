export type ProcessSupervisorState =
	| 'running'
	| 'graceful_termination_requested'
	| 'force_termination_requested'
	| 'process_tree_confirmed_gone';

export type ProcessTreeInspection = 'alive' | 'gone' | 'unknown';
export type ProcessTerminationReason = 'timeout' | 'output_limit' | 'parent_signal';

export interface ProcessSupervisorBackend {
	readonly method: string;
	readonly gracefulSignal: string | null;
	readonly forcedSignal: string | null;
	requestGracefulTermination(pid: number): void;
	requestForceTermination(pid: number): void;
	inspectProcessTree(pid: number): ProcessTreeInspection;
}

export interface ProcessSupervisorSnapshot {
	readonly pid: number;
	readonly reason: ProcessTerminationReason | null;
	readonly state: ProcessSupervisorState;
	readonly method: string;
	readonly graceful_signal: string | null;
	readonly forced_signal: string | null;
	readonly direct_child_closed_at: string | null;
	readonly graceful_signal_sent_at: string | null;
	readonly force_kill_sent_at: string | null;
	readonly process_tree_confirmed_gone_at: string | null;
	readonly forced_kill_attempted: boolean;
	readonly confirmed: boolean;
	readonly cleanup_pending: boolean;
}

export class ProcessSupervisor {
	readonly #pid: number;
	readonly #backend: ProcessSupervisorBackend;
	readonly #now: () => string;
	#reason: ProcessTerminationReason | null = null;
	#state: ProcessSupervisorState = 'running';
	#directChildClosedAt: string | null = null;
	#gracefulSignalSentAt: string | null = null;
	#forceKillSentAt: string | null = null;
	#processTreeConfirmedGoneAt: string | null = null;

	constructor(pid: number, backend: ProcessSupervisorBackend, now: () => string = () => new Date().toISOString()) {
		if (!Number.isInteger(pid) || pid <= 0) {
			throw new Error(`process_supervisor_invalid_pid:${pid}`);
		}

		this.#pid = pid;
		this.#backend = backend;
		this.#now = now;
	}

	requestGracefulTermination(reason: ProcessTerminationReason): void {
		if (this.#state !== 'running') {
			return;
		}

		this.#reason = reason;
		this.#backend.requestGracefulTermination(this.#pid);
		this.#gracefulSignalSentAt = this.#now();
		this.#state = 'graceful_termination_requested';
	}

	requestForceTermination(reason: ProcessTerminationReason): void {
		if (this.#state === 'process_tree_confirmed_gone' || this.#state === 'force_termination_requested') {
			return;
		}
		if (this.#state === 'running') {
			this.requestGracefulTermination(reason);
		}

		this.#backend.requestForceTermination(this.#pid);
		this.#forceKillSentAt = this.#now();
		this.#state = 'force_termination_requested';
	}

	markDirectChildClosed(): void {
		this.#directChildClosedAt ??= this.#now();
	}

	refreshProcessTreeState(): ProcessTreeInspection {
		if (this.#state === 'process_tree_confirmed_gone') {
			return 'gone';
		}

		const inspection = this.#backend.inspectProcessTree(this.#pid);
		if (inspection === 'gone') {
			this.#processTreeConfirmedGoneAt = this.#now();
			this.#state = 'process_tree_confirmed_gone';
		}
		return inspection;
	}

	snapshot(): ProcessSupervisorSnapshot {
		return {
			pid: this.#pid,
			reason: this.#reason,
			state: this.#state,
			method: this.#backend.method,
			graceful_signal: this.#backend.gracefulSignal,
			forced_signal: this.#backend.forcedSignal,
			direct_child_closed_at: this.#directChildClosedAt,
			graceful_signal_sent_at: this.#gracefulSignalSentAt,
			force_kill_sent_at: this.#forceKillSentAt,
			process_tree_confirmed_gone_at: this.#processTreeConfirmedGoneAt,
			forced_kill_attempted: this.#forceKillSentAt !== null,
			confirmed: this.#state === 'process_tree_confirmed_gone',
			cleanup_pending: this.#state !== 'process_tree_confirmed_gone',
		};
	}
}
