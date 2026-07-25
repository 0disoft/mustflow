import { RunProfiler } from '../../../core/run-profile.js';
import type { CliLang } from '../../lib/i18n.js';
import type { Reporter } from '../../lib/reporter.js';
import { resolveRunCommandContext } from '../../lib/run-context.js';
import {
	createRunPlan,
	createRunPreview,
	renderRunPreviewText,
	type RunPreviewMode,
} from '../../lib/run-plan.js';
import type { RunCommandOptions } from './execution.js';
import { writeLatestRunProfile } from './profile.js';

export function getRunPreviewMode(input: {
	readonly dryRun: boolean;
	readonly planOnly: boolean;
}): RunPreviewMode | null {
	return input.dryRun ? 'dry-run' : input.planOnly ? 'plan-only' : null;
}

export function executeRunPreviewCommand(
	input: {
		readonly intentName: string;
		readonly json: boolean;
		readonly previewMode: RunPreviewMode;
		readonly allowApprovals: readonly string[];
		readonly repository?: string | null;
	},
	reporter: Reporter,
	lang: CliLang,
	options: RunCommandOptions,
): number {
	const profiler = new RunProfiler();
	const runContext = profiler.measure('root_detection', () =>
		resolveRunCommandContext({ repository: input.repository, intentName: input.intentName }),
	);
	const projectRoot = runContext.projectRoot;
	const contract = profiler.measure('command_contract', () => runContext.contract);
	const plan = profiler.measure('plan_creation', () =>
		createRunPlan(projectRoot, contract, input.intentName, {
			testTargets: options.testTargets,
			approvedActions: input.allowApprovals,
		}),
	);

	profiler.measure('preview_render', () => {
		if (input.json) {
			const preview = createRunPreview(plan, input.previewMode);
			reporter.stdout(JSON.stringify(
				runContext.workspaceScope ? { ...preview, workspace_scope: runContext.workspaceScope } : preview,
				null,
				2,
			));
		} else {
			reporter.stdout(renderRunPreviewText(plan, input.previewMode, lang));
		}
	});
	writeLatestRunProfile(profiler, options, {
		projectRoot,
		intent: input.intentName,
		status: plan.ok ? 'previewed' : 'blocked',
		previewMode: input.previewMode,
	});

	return plan.ok ? 0 : 1;
}
