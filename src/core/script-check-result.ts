export type ScriptCheckStatus = 'passed' | 'failed' | 'error';
export type ScriptCheckFindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ScriptCheckMetric {
	readonly name: string;
	readonly value: number;
	readonly unit: string;
	readonly path?: string;
	readonly json_pointer?: string | null;
	readonly content_sha256?: string;
}

export interface ScriptCheckFinding {
	readonly code: string;
	readonly severity: ScriptCheckFindingSeverity;
	readonly message: string;
	readonly path?: string;
	readonly json_pointer?: string | null;
	readonly metric?: string | null;
	readonly actual?: number | null;
	readonly expected?: number | null;
}

export interface ScriptCheckArtifact {
	readonly path: string;
	readonly kind: string;
	readonly sha256?: string;
}
