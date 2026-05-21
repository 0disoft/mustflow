import type { RunWriteDriftReceipt } from '../../../core/run-write-drift.js';
import {
	createRunReceipt,
	createRunReceiptRelativePath,
	type RunReceipt,
	type RunReceiptPerformancePhase,
	type RunReceiptStatus,
	type RunTerminationReceipt,
} from '../../../core/run-receipt.js';
import type { RunnableRunPlan } from '../../lib/run-plan.js';
import type { CommandResult } from './executor.js';

interface AssembleRunReceiptInput {
	readonly correlationId: string;
	readonly intentName: string;
	readonly runStatus: RunReceiptStatus;
	readonly startedAt: Date;
	readonly finishedAt: Date;
	readonly projectRoot: string;
	readonly plan: RunnableRunPlan;
	readonly result: CommandResult;
	readonly exitCode: number | null;
	readonly killMethod: string | null;
	readonly termination: RunTerminationReceipt | null;
	readonly writeDrift: RunWriteDriftReceipt;
	readonly executorOverheadMs: number;
	readonly phaseTimings: readonly RunReceiptPerformancePhase[];
	readonly stdoutTailBytes: number;
	readonly stderrTailBytes: number;
}

export function assembleRunReceipt(input: AssembleRunReceiptInput): RunReceipt {
	return createRunReceipt({
		correlationId: input.correlationId,
		intent: input.intentName,
		status: input.runStatus,
		timedOut: input.runStatus === 'timed_out',
		startedAt: input.startedAt,
		finishedAt: input.finishedAt,
		projectRoot: input.projectRoot,
		cwd: input.plan.cwd,
		lifecycle: input.plan.lifecycle ?? 'oneshot',
		runPolicy: input.plan.runPolicy ?? 'agent_allowed',
		mode: input.plan.mode,
		argv: input.plan.commandArgv,
		cmd: input.plan.shellCommand,
		envPolicy: input.plan.envPolicy,
		envAllowlist: input.plan.envAllowlist,
		timeoutSeconds: input.plan.timeoutSeconds,
		killAfterSeconds: input.plan.killAfterSeconds,
		maxOutputBytes: input.plan.maxOutputBytes,
		successExitCodes: input.plan.successExitCodes,
		exitCode: input.exitCode,
		signal: input.result.signal,
		error: input.result.error?.message ?? null,
		killMethod: input.killMethod,
		termination: input.termination,
		stdout: input.result.stdout,
		stderr: input.result.stderr,
		writeDrift: input.writeDrift,
		executorOverheadMs: input.executorOverheadMs,
		phaseTimings: input.phaseTimings,
		selectionSummary: {
			strategy: input.plan.testTargets.length > 0 ? 'project_test_selection' : 'direct_intent',
			changed_file_count: 0,
			changed_surface_counts: {},
			selected_target_count: Math.max(1, input.plan.testTargets.length),
			fallback_used: false,
		},
		stdoutTailBytes: input.stdoutTailBytes,
		stderrTailBytes: input.stderrTailBytes,
		receiptPath: createRunReceiptRelativePath(),
	});
}
