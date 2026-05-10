import { collectSourceAnchorSummaries, type SourceAnchorSummary } from './source-anchors.js';

export type SourceAnchorDecisionKind = 'found' | 'missing';

export interface SourceAnchorDecision {
	readonly kind: SourceAnchorDecisionKind;
	readonly inputAnchor: string;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly anchor: SourceAnchorSummary | null;
}

const SOURCE_FILES = [
	'ROADMAP.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
];

export function explainSourceAnchor(projectRoot: string, anchorId: string): SourceAnchorDecision {
	const anchors = collectSourceAnchorSummaries(projectRoot);
	const anchor = anchors.find((candidate) => candidate.id === anchorId) ?? null;

	if (!anchor) {
		return {
			kind: 'missing',
			inputAnchor: anchorId,
			decision: `source anchor "${anchorId}" is not indexed by direct source inspection`,
			reason:
				'mustflow found no structured inline anchor with that id in inspectable source files. Source anchors are optional and disabled for automatic source modification.',
			effectiveAction:
				'Use normal code search or add a short structured source anchor only when a human-approved code change calls for one.',
			countsAsMustflowVerification: false,
			sourceFiles: SOURCE_FILES,
			anchor: null,
		};
	}

	return {
		kind: 'found',
		inputAnchor: anchorId,
		decision: `source anchor "${anchorId}" is a navigation-only code coordinate`,
		reason:
			'structured source anchors help agents find important code locations, but they cannot define workflow rules, command permission, or verification authority.',
		effectiveAction:
			'Use this anchor to navigate to the source location, then trust the current code, tests, AGENTS.md, and commands.toml over the anchor text.',
		countsAsMustflowVerification: false,
		sourceFiles: SOURCE_FILES,
		anchor,
	};
}
