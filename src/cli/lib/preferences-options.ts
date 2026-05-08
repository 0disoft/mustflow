export const COMMIT_MESSAGE_STYLES = ['conventional', 'descriptive', 'gitmoji'] as const;

export type CommitMessageStyle = (typeof COMMIT_MESSAGE_STYLES)[number];

export function isCommitMessageStyle(value: string): value is CommitMessageStyle {
	return COMMIT_MESSAGE_STYLES.includes(value as CommitMessageStyle);
}
