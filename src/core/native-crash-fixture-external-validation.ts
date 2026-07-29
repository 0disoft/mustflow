export const NATIVE_CRASH_FIXTURE_EXTERNAL_VALIDATION_SCHEMA =
	'mustflow.native-crash-fixture-external-validation/v1' as const;

export type NativeCrashExternalValidationStatus = 'passed' | 'partial' | 'skipped' | 'failed';

export interface NativeCrashExternalValidationLane {
	fixture: 'windows-minidump' | 'elf64-core' | 'elf32-core';
	capability: 'format-recognition' | 'semantic-structure';
	tool: string | null;
	tool_path: string | null;
	status: NativeCrashExternalValidationStatus;
	reason: string;
	expected: string | null;
	observed: string | null;
}

export interface NativeCrashExternalValidationReport {
	schema_version: typeof NATIVE_CRASH_FIXTURE_EXTERNAL_VALIDATION_SCHEMA;
	command: 'native_crash_fixture_external_validation';
	ok: boolean;
	complete: boolean;
	overall_status: NativeCrashExternalValidationStatus;
	lanes: NativeCrashExternalValidationLane[];
}

export interface FormatRecognitionProbe {
	fixture: NativeCrashExternalValidationLane['fixture'];
	tool: string;
	toolPath: string;
	expected: string;
	observed: string;
	exitCode: number;
}

export interface SemanticStructureProbe {
	fixture: NativeCrashExternalValidationLane['fixture'];
	tool: string;
	toolPath: string;
	expected: unknown;
	observed: string;
	exitCode: number;
}

function normalizedJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(normalizedJson).join(',')}]`;
	if (value !== null && typeof value === 'object') {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => `${JSON.stringify(key)}:${normalizedJson(child)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

export function classifyFormatRecognitionProbe(
	probe: FormatRecognitionProbe,
): NativeCrashExternalValidationLane {
	const observed = probe.observed.trim();
	if (probe.exitCode !== 0) {
		return {
			fixture: probe.fixture,
			capability: 'format-recognition',
			tool: probe.tool,
			tool_path: probe.toolPath,
			status: 'failed',
			reason: `tool_exit_${probe.exitCode}`,
			expected: probe.expected,
			observed,
		};
	}
	if (observed !== probe.expected) {
		return {
			fixture: probe.fixture,
			capability: 'format-recognition',
			tool: probe.tool,
			tool_path: probe.toolPath,
			status: 'failed',
			reason: 'format_output_mismatch',
			expected: probe.expected,
			observed,
		};
	}
	return {
		fixture: probe.fixture,
		capability: 'format-recognition',
		tool: probe.tool,
		tool_path: probe.toolPath,
		status: 'partial',
		reason: 'format_recognition_only',
		expected: probe.expected,
		observed,
	};
}

export function classifySemanticStructureProbe(
	probe: SemanticStructureProbe,
): NativeCrashExternalValidationLane {
	const observedText = probe.observed.trim();
	if (probe.exitCode !== 0) {
		return {
			fixture: probe.fixture,
			capability: 'semantic-structure',
			tool: probe.tool,
			tool_path: probe.toolPath,
			status: 'failed',
			reason: `tool_exit_${probe.exitCode}`,
			expected: JSON.stringify(probe.expected),
			observed: observedText,
		};
	}
	let observed: unknown;
	try {
		observed = JSON.parse(observedText);
	} catch {
		return {
			fixture: probe.fixture,
			capability: 'semantic-structure',
			tool: probe.tool,
			tool_path: probe.toolPath,
			status: 'failed',
			reason: 'semantic_output_not_json',
			expected: JSON.stringify(probe.expected),
			observed: observedText,
		};
	}
	if (normalizedJson(observed) !== normalizedJson(probe.expected)) {
		return {
			fixture: probe.fixture,
			capability: 'semantic-structure',
			tool: probe.tool,
			tool_path: probe.toolPath,
			status: 'failed',
			reason: 'semantic_output_mismatch',
			expected: JSON.stringify(probe.expected),
			observed: JSON.stringify(observed),
		};
	}
	return {
		fixture: probe.fixture,
		capability: 'semantic-structure',
		tool: probe.tool,
		tool_path: probe.toolPath,
		status: 'passed',
		reason: 'independent_semantic_parser_match',
		expected: JSON.stringify(probe.expected),
		observed: JSON.stringify(observed),
	};
}

export function skippedExternalValidationLane(
	fixture: NativeCrashExternalValidationLane['fixture'],
	capability: NativeCrashExternalValidationLane['capability'],
	reason: string,
): NativeCrashExternalValidationLane {
	return {
		fixture,
		capability,
		tool: null,
		tool_path: null,
		status: 'skipped',
		reason,
		expected: null,
		observed: null,
	};
}

export function buildNativeCrashExternalValidationReport(
	lanes: NativeCrashExternalValidationLane[],
): NativeCrashExternalValidationReport {
	let overallStatus: NativeCrashExternalValidationStatus;
	const semanticLanes = lanes.filter((lane) => lane.capability === 'semantic-structure');
	if (lanes.some((lane) => lane.status === 'failed')) {
		overallStatus = 'failed';
	} else if (semanticLanes.length > 0 && semanticLanes.every((lane) => lane.status === 'passed')) {
		overallStatus = 'passed';
	} else if (lanes.some((lane) => lane.status === 'partial')) {
		overallStatus = 'partial';
	} else {
		overallStatus = 'skipped';
	}
	return {
		schema_version: NATIVE_CRASH_FIXTURE_EXTERNAL_VALIDATION_SCHEMA,
		command: 'native_crash_fixture_external_validation',
		ok: overallStatus !== 'failed',
		complete: overallStatus === 'passed',
		overall_status: overallStatus,
		lanes,
	};
}

export function nativeCrashExternalValidationExitCode(
	report: NativeCrashExternalValidationReport,
): 0 | 1 | 2 {
	if (report.overall_status === 'failed') return 1;
	if (report.overall_status === 'passed') return 0;
	return 2;
}
