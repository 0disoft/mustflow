import { explainCommandIntent, type CommandIntentSummary } from '../../core/command-explanation.js';
import { readCommandContract } from '../../core/config-loading.js';
import {
	createVerificationDecisionGraph,
	type VerificationDecisionGraph,
} from '../../core/verification-decision-graph.js';
import {
	createVerificationPlan,
	type VerificationRunnableStatus,
	type VerificationSkipReason,
} from '../../core/verification-plan.js';
import { createVerificationSchedule } from '../../core/verification-scheduler.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	readLocalCommandEffectGraphs,
	type LocalCommandEffectGraph,
} from '../lib/local-index.js';
import { planErrorMessageKey, readInputFromPlan } from './verify.js';

export type ExplainVerificationCandidate = {
	readonly intent: string | null;
	readonly status: VerificationRunnableStatus;
	readonly skipReason: VerificationSkipReason | null;
	readonly detail: string | null;
	readonly requiredAfter: readonly string[];
	readonly command: CommandIntentSummary | null;
	readonly effectGraph: LocalCommandEffectGraph | null;
};

export type ExplainVerificationRequirement = {
	readonly reason: string;
	readonly matchingIntents: readonly string[];
	readonly candidates: readonly ExplainVerificationCandidate[];
	readonly gap: string | null;
};

export type ExplainVerificationDecision = {
	readonly kind: 'verify';
	readonly input: {
		readonly reason: string | null;
		readonly planSource: string | null;
	};
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly verification: {
		readonly planSource: string | null;
		readonly reasons: readonly string[];
		readonly candidateCount: number;
		readonly runnableCount: number;
		readonly skippedCount: number;
		readonly requirements: readonly ExplainVerificationRequirement[];
		readonly decisionGraph: VerificationDecisionGraph;
	};
};

export interface ExplainVerifyOutput {
	readonly schema_version: string;
	readonly command: 'explain';
	readonly topic: 'verify';
	readonly mustflow_root: string;
	readonly decision: ExplainVerificationDecision;
}

export function parseExplainVerifyArgs(args: readonly string[]): {
	reason?: string;
	fromPlan?: string;
	error?: string;
} {
	let reason: string | undefined;
	let fromPlan: string | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--reason') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { reason, fromPlan, error: 'missing_reason_value' };
			}

			reason = value;
			index += 1;
			continue;
		}

		if (arg === '--from-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { reason, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--reason=')) {
			const value = arg.slice('--reason='.length);
			if (value.length === 0) {
				return { reason, fromPlan, error: 'missing_reason_value' };
			}

			reason = value;
			continue;
		}

		if (arg.startsWith('--from-plan=')) {
			const value = arg.slice('--from-plan='.length);
			if (value.length === 0) {
				return { reason, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			continue;
		}

		if (arg.startsWith('-')) {
			return { reason, fromPlan, error: arg };
		}

		return { reason, fromPlan, error: `unexpected:${arg}` };
	}

	return { reason, fromPlan };
}

export function explainVerifyArgErrorMessage(error: string, lang: CliLang): string {
	if (error === 'missing_reason_value') {
		return t(lang, 'cli.error.missingValue', { option: '--reason' });
	}

	if (error === 'missing_from_plan_value') {
		return t(lang, 'cli.error.missingValue', { option: '--from-plan' });
	}

	if (error.startsWith('unexpected:')) {
		return t(lang, 'cli.error.unexpectedArgument', { argument: error.slice('unexpected:'.length) });
	}

	return t(lang, 'cli.error.unknownOption', { option: error });
}

export function explainVerifyPlanErrorMessage(error: unknown, lang: CliLang): string {
	const code = error instanceof Error ? error.message : 'invalid_plan_file';
	return t(lang, planErrorMessageKey(code));
}

export function readExplainVerifyPlanReasons(projectRoot: string, planPath: string): readonly string[] {
	return readInputFromPlan(projectRoot, planPath).reasons;
}

export async function getVerifyExplainOutput(
	schemaVersion: string,
	projectRoot: string,
	reasons: readonly string[],
	inputReason: string | null,
	planSource: string | null,
): Promise<ExplainVerifyOutput> {
	const contract = readCommandContract(projectRoot);
	const plans = reasons.map((reason) => createVerificationPlan(contract, reason));
	const graphRequirements = reasons.map((reason) => ({
		reason,
		files: [],
		surfaces: [],
		affectedContracts: [],
		driftChecks: [],
		updatePolicies: [],
		source: 'change_classification' as const,
	}));
	const graphCandidates = plans.flatMap((plan) =>
		plan.candidates.map((candidate) => ({
			reason: plan.reason,
			intent: candidate.intent.length > 0 ? candidate.intent : null,
			status: candidate.status,
			skipReason: candidate.reason,
			detail: candidate.detail,
		})),
	);
	const graphGaps = graphRequirements
		.filter((requirement) =>
			graphCandidates.every((candidate) => candidate.reason !== requirement.reason || candidate.status !== 'runnable'),
		)
		.map((requirement) => ({
			reason: requirement.reason,
			files: requirement.files,
			surfaces: requirement.surfaces,
			detail: `No runnable command intents cover required_after = "${requirement.reason}".`,
		}));
	const schedule = createVerificationSchedule(projectRoot, contract, plans.flatMap((plan) => plan.candidates));
	const decisionGraph = createVerificationDecisionGraph(contract, graphRequirements, graphCandidates, graphGaps, schedule);
	const intentNames = [
		...new Set(
			plans.flatMap((plan) => plan.candidates.map((candidate) => candidate.intent).filter((intent) => intent.length > 0)),
		),
	];
	const graphsByIntent =
		intentNames.length > 0 ? await readLocalCommandEffectGraphs(projectRoot, intentNames) : new Map<string, LocalCommandEffectGraph>();

	const requirements = plans.map((plan): ExplainVerificationRequirement => {
		const candidates = plan.candidates.map((candidate): ExplainVerificationCandidate => {
			const command = candidate.intent ? explainCommandIntent(contract, candidate.intent).intent : null;

			return {
				intent: candidate.intent.length > 0 ? candidate.intent : null,
				status: candidate.status,
				skipReason: candidate.reason,
				detail: candidate.detail,
				requiredAfter: command?.requiredAfter ?? [],
				command,
				effectGraph: candidate.intent ? graphsByIntent.get(candidate.intent) ?? null : null,
			};
		});
		const matchingIntents = candidates
			.map((candidate) => candidate.intent)
			.filter((intent): intent is string => intent !== null)
			.sort((left, right) => left.localeCompare(right));
		const hasRunnableCandidate = candidates.some((candidate) => candidate.status === 'runnable');

		return {
			reason: plan.reason,
			matchingIntents,
			candidates,
			gap: hasRunnableCandidate ? null : `No runnable command intents cover required_after = "${plan.reason}".`,
		};
	});
	const allCandidates = requirements.flatMap((requirement) => requirement.candidates);
	const runnableCount = allCandidates.filter((candidate) => candidate.status === 'runnable').length;
	const skippedCount = allCandidates.filter((candidate) => candidate.status === 'skipped').length;
	const reasonLabel = reasons.join(', ');

	return {
		schema_version: schemaVersion,
		command: 'explain',
		topic: 'verify',
		mustflow_root: projectRoot,
		decision: {
			kind: 'verify',
			input: {
				reason: inputReason,
				planSource,
			},
			decision:
				runnableCount > 0
					? `verification reason "${reasonLabel}" has ${runnableCount} runnable candidate(s)`
					: `verification reason "${reasonLabel}" has no runnable candidates`,
			reason:
				'verify explanations reuse required_after matching and the same command eligibility rules used by mf run and mf verify.',
			effectiveAction:
				runnableCount > 0
					? 'Use mf verify when you need execution receipts; this explanation only shows the selected verification candidates.'
					: 'Do not guess a command; report the skipped candidate reasons or add a configured command intent.',
			countsAsMustflowVerification: false,
			sourceFiles: [
				'.mustflow/config/commands.toml',
				'.mustflow/docs/agent-workflow.md',
				'src/core/verification-plan.ts',
				'src/core/command-intent-eligibility.ts',
			],
			verification: {
				planSource,
				reasons,
				candidateCount: allCandidates.length,
				runnableCount,
				skippedCount,
				requirements,
				decisionGraph,
			},
		},
	};
}

export function renderVerifyExplainDecision(decision: ExplainVerificationDecision, lang: CliLang): string[] {
	const verification = decision.verification;
	const lines = [
		'',
		'Verification explanation',
		`- plan_source: ${verification.planSource ?? t(lang, 'value.none')}`,
		`- reasons: ${verification.reasons.join(', ') || t(lang, 'value.none')}`,
		`- candidates: ${verification.candidateCount}`,
		`- runnable: ${verification.runnableCount}`,
		`- skipped: ${verification.skippedCount}`,
		`- decision_graph_nodes: ${verification.decisionGraph.summary.nodeCount}`,
		`- decision_graph_gaps: ${verification.decisionGraph.summary.gapCount}`,
	];

	for (const requirement of verification.requirements) {
		lines.push(`- required_after: ${requirement.reason}`);
		if (requirement.matchingIntents.length > 0) {
			lines.push(`  matching_intents: ${requirement.matchingIntents.join(', ')}`);
		}

		if (requirement.gap) {
			lines.push(`  gap: ${requirement.gap}`);
		}

		for (const candidate of requirement.candidates) {
			const intent = candidate.intent ?? t(lang, 'value.none');
			const reason = candidate.skipReason ? ` (${candidate.skipReason})` : '';
			lines.push(`  - ${intent}: ${candidate.status}${reason}`);

			if (candidate.detail) {
				lines.push(`    detail: ${candidate.detail}`);
			}

			if (candidate.requiredAfter.length > 0) {
				lines.push(`    required_after: ${candidate.requiredAfter.join(', ')}`);
			}

			if (candidate.effectGraph) {
				lines.push(
					`    effect_graph: ${candidate.effectGraph.status}`,
					`    index_fresh: ${candidate.effectGraph.indexFresh ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
				);

				if (candidate.effectGraph.refreshHint) {
					lines.push(`    refresh_hint: ${candidate.effectGraph.refreshHint}`);
				}
			}
		}
	}

	return lines;
}
