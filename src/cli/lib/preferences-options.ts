export const COMMIT_MESSAGE_STYLES = ['conventional', 'descriptive', 'gitmoji'] as const;
export const TEST_AUTHORING_POLICIES = ['evidence_required', 'manual_approval', 'broad'] as const;

export type CommitMessageStyle = (typeof COMMIT_MESSAGE_STYLES)[number];
export type TestAuthoringPolicy = (typeof TEST_AUTHORING_POLICIES)[number];

export function isCommitMessageStyle(value: string): value is CommitMessageStyle {
	return COMMIT_MESSAGE_STYLES.includes(value as CommitMessageStyle);
}

export function isTestAuthoringPolicy(value: string): value is TestAuthoringPolicy {
	return TEST_AUTHORING_POLICIES.includes(value as TestAuthoringPolicy);
}
