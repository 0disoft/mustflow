export interface DashboardDocReviewSnapshot {
	readonly schema_version: '1';
	readonly command: 'docs review list';
	readonly ledger_path: string;
	readonly count: number;
	readonly documents: readonly unknown[];
}

export type DashboardCommandEffectGraphStatusKind = 'fresh' | 'missing' | 'stale' | 'unreadable';

export interface DashboardCommandEffectGraphStatus {
	readonly source: 'local_index';
	readonly authority: 'explanation_only';
	readonly command_authority: '.mustflow/config/commands.toml';
	readonly grants_command_authority: false;
	readonly status: DashboardCommandEffectGraphStatusKind;
	readonly database_path: string;
	readonly index_fresh: boolean;
	readonly stale_paths: readonly string[];
	readonly refresh_hint: string | null;
}

export interface DashboardCommandWriteLock {
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly sources: readonly string[];
	readonly concurrencies: readonly string[];
	readonly effect_count: number;
}

export interface DashboardCommandLockConflict {
	readonly intent: string;
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly concurrencies: readonly string[];
	readonly conflicting_paths: readonly string[];
	readonly conflicting_modes: readonly string[];
	readonly conflicting_concurrencies: readonly string[];
}

export interface DashboardCommandEffectGraph extends DashboardCommandEffectGraphStatus {
	readonly write_locks: readonly DashboardCommandWriteLock[];
	readonly lock_conflicts: readonly DashboardCommandLockConflict[];
}

export interface DashboardStatusSnapshot {
	readonly schema_version: '1';
	readonly command: 'dashboard status';
	readonly installed: boolean;
	readonly manifest_lock: 'missing' | 'invalid' | 'present';
	readonly template: { readonly id: string; readonly version: string } | null;
	readonly release: {
		readonly package_name: string;
		readonly package_version: string;
		readonly version_sources: readonly {
			readonly path: string;
			readonly kind: string;
			readonly declared?: boolean;
			readonly authority?: string;
		}[];
		readonly release_sensitive_changed_files: readonly string[];
	};
	readonly update: {
		readonly command: 'update';
		readonly mode: 'dry-run';
		readonly dry_run_command: string;
		readonly apply_command: string;
		readonly ok: boolean;
		readonly apply_ready: boolean;
		readonly error?: string;
		readonly summary: {
			readonly blockedLocalChanges: number;
			readonly manualReview: number;
			readonly wouldUpdate: number;
			readonly wouldCreate: number;
			readonly unchanged: number;
		};
		readonly blockers: readonly {
			readonly relativePath: string;
			readonly sourceKind: string;
			readonly action: string;
			readonly reason: string;
		}[];
		readonly changes: readonly {
			readonly relativePath: string;
			readonly sourceKind: string;
			readonly action: string;
			readonly reason: string;
		}[];
	};
	readonly run_history:
		| { readonly path: string; readonly exists: false }
		| { readonly path: string; readonly exists: true; readonly valid: false; readonly error: string }
		| {
				readonly path: string;
				readonly exists: true;
				readonly valid: true;
				readonly intent: string;
				readonly status: string;
				readonly timed_out: boolean;
				readonly started_at: string;
				readonly finished_at: string;
				readonly duration_ms: number;
				readonly cwd: string;
				readonly lifecycle: string;
				readonly run_policy: string;
				readonly mode: string;
				readonly command_line: readonly string[];
				readonly timeout_seconds: number;
				readonly max_output_bytes: number;
				readonly success_exit_codes: readonly number[];
				readonly exit_code: number | null;
				readonly signal: string | null;
				readonly error: string | null;
				readonly kill_method: string | null;
				readonly receipt_path: string;
				readonly stdout: {
					readonly bytes: number;
					readonly truncated: boolean;
					readonly tail: string;
					readonly redacted: boolean;
					readonly redaction_count: number;
					readonly redaction_kinds: readonly string[];
				};
				readonly stderr: {
					readonly bytes: number;
					readonly truncated: boolean;
					readonly tail: string;
					readonly redacted: boolean;
					readonly redaction_count: number;
					readonly redaction_kinds: readonly string[];
				};
		  };
	readonly skills: {
		readonly index_path: string;
		readonly exists: boolean;
		readonly count: number;
		readonly routes: readonly {
			readonly skill: string;
			readonly skill_path: string;
			readonly trigger: string;
			readonly required_input: string;
			readonly edit_scope: string;
			readonly risk: string;
			readonly verification_intents: readonly string[];
			readonly declared_command_intents: readonly string[];
			readonly expected_output: string;
			readonly exists: boolean;
			readonly aligned: boolean;
		}[];
	};
	readonly tracked_files: number;
	readonly changed_files: readonly string[];
	readonly missing_files: readonly string[];
	readonly issues: readonly string[];
	readonly runnable_intents: readonly string[];
	readonly command_contract: {
		readonly path: string;
		readonly exists: boolean;
		readonly effect_graph_status?: DashboardCommandEffectGraphStatus;
		readonly intents: readonly {
			readonly name: string;
			readonly status: string;
			readonly lifecycle: string | null;
			readonly run_policy: string | null;
			readonly stdin: string | null;
			readonly timeout_seconds: number | null;
			readonly cwd: string | null;
			readonly description: string | null;
			readonly reason: string | null;
			readonly agent_action: string | null;
			readonly writes: readonly string[];
			readonly required_after: readonly string[];
			readonly runnable: boolean;
			readonly effect_graph?: DashboardCommandEffectGraph;
		}[];
	};
	readonly verification: {
		readonly changed_files: readonly string[];
		readonly surfaces: readonly string[];
		readonly recommendations: readonly {
			readonly intent: string;
			readonly command: string;
			readonly reason_key: string;
			readonly files: readonly string[];
			readonly runnable: boolean;
		}[];
		readonly skipped: readonly {
			readonly intent: string;
			readonly reason_key: string;
		}[];
		readonly read_model: unknown;
		readonly schedule: {
			readonly runner: string;
			readonly failurePolicy: {
				readonly mode: string;
				readonly startedBatch: string;
				readonly nextBatch: string;
			};
			readonly batches: readonly {
				readonly index: number;
				readonly intents: readonly string[];
				readonly commands: readonly string[];
				readonly locks: readonly string[];
			}[];
			readonly entries: readonly {
				readonly intent: string;
				readonly command: string;
				readonly parallelEligible: boolean;
				readonly parallelReason: string;
				readonly locks: readonly string[];
				readonly effects: readonly {
					readonly access: string;
					readonly mode: string;
					readonly path: string | null;
					readonly lock: string;
					readonly concurrency: string;
				}[];
				readonly conflicts: readonly {
					readonly intent: string;
					readonly lock: string;
					readonly detail: string;
				}[];
			}[];
			readonly notes: readonly string[];
		};
	};
	readonly latest_run:
		| { readonly path: string; readonly exists: false }
		| { readonly path: string; readonly exists: true; readonly valid: false; readonly error: string }
		| {
				readonly path: string;
				readonly exists: true;
				readonly valid: true;
				readonly intent: string;
				readonly status: string;
				readonly timed_out: boolean;
				readonly exit_code: number | null;
				readonly finished_at: string | null;
				readonly duration_ms: number | null;
		  };
	readonly active_review_documents: number;
}
