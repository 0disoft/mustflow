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
	if (lanes.some((lane) => lane.status === 'failed')) {
		overallStatus = 'failed';
	} else if (lanes.length > 0 && lanes.every((lane) => lane.status === 'passed')) {
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
