import { readCommandContract } from '../../../core/config-loading.js';
import { RunProfiler } from '../../../core/run-profile.js';
import type { CliLang } from '../../lib/i18n.js';
import { resolveMustflowRoot } from '../../lib/project-root.js';
import type { Reporter } from '../../lib/reporter.js';
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
	},
	reporter: Reporter,
	lang: CliLang,
	options: RunCommandOptions,
): number {
	const profiler = new RunProfiler();
	const projectRoot = profiler.measure('root_detection', () => resolveMustflowRoot());
	const contract = profiler.measure('command_contract', () => readCommandContract(projectRoot));
	const plan = profiler.measure('plan_creation', () =>
		createRunPlan(projectRoot, contract, input.intentName, { testTargets: options.testTargets }),
	);

	profiler.measure('preview_render', () => {
		if (input.json) {
			reporter.stdout(JSON.stringify(createRunPreview(plan, input.previewMode), null, 2));
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
