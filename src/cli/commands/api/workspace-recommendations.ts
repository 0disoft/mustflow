export interface WorkspaceSummaryRecommendationInput {
	readonly installed: boolean;
	readonly check: {
		readonly ok: boolean;
	};
	readonly git_state: {
		readonly status: 'available' | 'unavailable';
		readonly changed_file_count: number | null;
	};
}

export function createRecommendedNextCommands(output: WorkspaceSummaryRecommendationInput): readonly string[] {
	if (!output.installed) {
		return ['mf init --dry-run', 'mf init --yes'];
	}

	if (!output.check.ok) {
		return ['mf check', 'mf status --json', 'mf update --dry-run'];
	}

	const commands = ['mf context --json', 'mf doctor --json', 'mf check --strict'];

	if (output.git_state.status === 'available' && output.git_state.changed_file_count !== null && output.git_state.changed_file_count > 0) {
		commands.push('mf classify --changed --json', 'mf verify --changed --plan-only --json');
	}

	return commands;
}
