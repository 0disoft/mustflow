export type ContractModelId = 'changes' | 'validations' | 'surfaces' | 'artifacts' | 'policy';

export type ContractModelStatus = 'candidate' | 'deferred';

export interface ContractModelDefinition {
	readonly id: ContractModelId;
	readonly filePath: string;
	readonly status: ContractModelStatus;
	readonly installByDefault: boolean;
	readonly purpose: string;
	readonly authority: 'planning' | 'policy';
}

export const CONTRACT_MODEL_DEFINITIONS: readonly ContractModelDefinition[] = [
	{
		id: 'changes',
		filePath: '.mustflow/config/changes.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe changed-file classes that can feed verification and surface planning.',
		authority: 'planning',
	},
	{
		id: 'validations',
		filePath: '.mustflow/config/validations.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe validation reasons and their relationship to configured command intents.',
		authority: 'planning',
	},
	{
		id: 'surfaces',
		filePath: '.mustflow/config/surfaces.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe public and installed surfaces that may need drift checks after changes.',
		authority: 'planning',
	},
	{
		id: 'artifacts',
		filePath: '.mustflow/config/artifacts.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe generated or packaged artifacts that need inclusion and freshness checks.',
		authority: 'planning',
	},
	{
		id: 'policy',
		filePath: '.mustflow/config/policy.toml',
		status: 'deferred',
		installByDefault: false,
		purpose: 'Reserved for future cross-cutting policy once smaller contract files have settled.',
		authority: 'policy',
	},
] as const;

export function getContractModelDefinitions(): readonly ContractModelDefinition[] {
	return CONTRACT_MODEL_DEFINITIONS;
}

export function getCandidateContractModelDefinitions(): readonly ContractModelDefinition[] {
	return CONTRACT_MODEL_DEFINITIONS.filter((model) => model.status === 'candidate');
}

export function getNonInstalledContractConfigPaths(): readonly string[] {
	return CONTRACT_MODEL_DEFINITIONS
		.filter((model) => !model.installByDefault)
		.map((model) => model.filePath);
}
