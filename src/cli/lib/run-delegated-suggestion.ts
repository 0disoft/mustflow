import type { RunCommandContext } from './run-context.js';
import type { RunPlan } from './run-plan.js';
import { t, type CliLang } from './i18n.js';

export function addDelegatedIntentGuidance(
	plan: RunPlan,
	context: RunCommandContext,
	lang: CliLang,
): RunPlan {
	if (plan.ok || plan.reasonCode !== 'intent_not_table' || context.delegatedIntentCandidates.length === 0) {
		return plan;
	}

	const commands = context.delegatedIntentCandidates.map((candidate) => candidate.runCommand);
	const detail = commands.length === 1
		? t(lang, 'run.error.delegatedIntentSuggestion', { command: commands[0] })
		: t(lang, 'run.error.delegatedIntentChoices', { commands: commands.join('\n') });

	return { ...plan, detail };
}
