export const COMMIT_MESSAGE_STYLES = ['conventional', 'descriptive', 'gitmoji'] as const;
export const COMMIT_MESSAGE_GITMOJI_MAPS = ['conventional_default'] as const;
export const COMMIT_MESSAGE_BODY_TEMPLATES = ['summary_validation'] as const;
export const TEST_AUTHORING_POLICIES = ['evidence_required', 'manual_approval', 'broad'] as const;

export type CommitMessageStyle = (typeof COMMIT_MESSAGE_STYLES)[number];
export type CommitMessageGitmojiMap = (typeof COMMIT_MESSAGE_GITMOJI_MAPS)[number];
export type CommitMessageBodyTemplate = (typeof COMMIT_MESSAGE_BODY_TEMPLATES)[number];
export type TestAuthoringPolicy = (typeof TEST_AUTHORING_POLICIES)[number];

export function isCommitMessageStyle(value: string): value is CommitMessageStyle {
	return COMMIT_MESSAGE_STYLES.includes(value as CommitMessageStyle);
}

export function isCommitMessageGitmojiMap(value: string): value is CommitMessageGitmojiMap {
	return COMMIT_MESSAGE_GITMOJI_MAPS.includes(value as CommitMessageGitmojiMap);
}

export function isCommitMessageBodyTemplate(value: string): value is CommitMessageBodyTemplate {
	return COMMIT_MESSAGE_BODY_TEMPLATES.includes(value as CommitMessageBodyTemplate);
}

export function isTestAuthoringPolicy(value: string): value is TestAuthoringPolicy {
	return TEST_AUTHORING_POLICIES.includes(value as TestAuthoringPolicy);
}
