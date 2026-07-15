export const APPROVAL_ACTION_TYPES = [
	'git_commit',
	'git_push',
	'dependency_install',
	'dependency_upgrade',
	'network_access',
	'database_migration',
	'destructive_command',
	'secret_access',
	'release',
	'cross_repository_change',
] as const;

export type ApprovalActionType = (typeof APPROVAL_ACTION_TYPES)[number];

export const APPROVAL_ACTION_TYPE_SET: ReadonlySet<string> = new Set(APPROVAL_ACTION_TYPES);
