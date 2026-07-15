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

function readGitSubcommand(argv: readonly string[]): string | null {
	if ((argv[0] ?? '').split(/[\\/]/u).at(-1)?.replace(/\.(?:cmd|exe|ps1)$/iu, '').toLowerCase() !== 'git') {
		return null;
	}

	const optionsWithSeparateValue = new Set(['-C', '-c', '--exec-path', '--git-dir', '--work-tree', '--namespace']);
	for (let index = 1; index < argv.length; index += 1) {
		const argument = argv[index] ?? '';
		if (optionsWithSeparateValue.has(argument)) {
			index += 1;
			continue;
		}
		if (argument.startsWith('-')) {
			continue;
		}
		return argument;
	}

	return null;
}

export function inferCommandApprovalActions(argv: readonly string[]): readonly ApprovalActionType[] {
	const gitSubcommand = readGitSubcommand(argv);
	if (gitSubcommand === 'add' || gitSubcommand === 'commit') {
		return ['git_commit'];
	}
	if (gitSubcommand === 'push') {
		return ['git_push'];
	}

	return [];
}
