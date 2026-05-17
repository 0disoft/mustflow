import type { TomlTable } from '../command-contract.js';
import type { SKILL_ROUTE_CATEGORY_LABELS } from './constants.js';

export interface CheckIssue {
	readonly message: string;
	readonly severity?: 'error' | 'warning';
}

export interface SkillRouteMetadata {
	readonly skillName: string;
	readonly category?: keyof typeof SKILL_ROUTE_CATEGORY_LABELS;
	readonly routeType?: string;
	readonly priority?: unknown;
	readonly mutuallyExclusiveWith: readonly string[];
}

export interface CheckOptions {
	readonly strict?: boolean;
}

export interface ParsedConfigFiles {
	readonly mustflowToml?: TomlTable;
	readonly commandsToml?: TomlTable;
	readonly preferencesToml?: TomlTable;
	readonly versioningToml?: TomlTable;
}
