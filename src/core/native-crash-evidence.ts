export const NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION = '1';
export const MAX_NATIVE_CRASH_EVIDENCE_BYTES = 4 * 1024 * 1024;

const MAX_ARRAY_ITEMS = 4_096;
const MAX_FRAMES_PER_THREAD = 2_048;
const MAX_STRING_LENGTH = 8_192;
const HEX_ADDRESS_PATTERN = /^0x[0-9a-f]+$/iu;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

const SOURCE_KINDS = new Set([
	'windows_minidump',
	'linux_core',
	'macos_crash_report',
	'sanitizer_report',
	'live_debugger',
]);
const PLATFORMS = new Set(['windows', 'linux', 'macos', 'other']);
const ARCHITECTURES = new Set(['x86', 'x86_64', 'arm', 'arm64', 'other']);
const IDENTITY_SCHEMES = new Set(['pe_guid_age', 'elf_build_id', 'macho_uuid', 'sha256', 'unknown']);
const SYMBOL_STATUSES = new Set(['matched', 'partial', 'missing', 'mismatched', 'not_requested']);
const AVAILABILITY_STATUSES = new Set(['available', 'partial', 'unavailable']);
const EXCEPTION_KINDS = new Set(['exception', 'signal', 'sanitizer', 'abort', 'unknown']);
const SANITIZER_KINDS = new Set([
	'address',
	'thread',
	'memory',
	'undefined_behavior',
	'leak',
	'other',
]);

const TOP_LEVEL_KEYS = new Set([
	'schema_version',
	'kind',
	'captured_at',
	'source',
	'target',
	'binary',
	'candidate_binary',
	'symbols',
	'exception',
	'registers',
	'modules',
	'threads',
	'sanitizer',
	'redaction',
]);
const SOURCE_KEYS = new Set(['kind', 'artifact', 'tool']);
const ARTIFACT_KEYS = new Set(['sha256', 'size_bytes', 'original_name']);
const TOOL_KEYS = new Set(['name', 'version', 'command_fingerprint']);
const TARGET_KEYS = new Set(['platform', 'architecture', 'process_id', 'crashed_thread_id']);
const IDENTITY_KEYS = new Set(['scheme', 'value', 'verified']);
const BINARY_KEYS = new Set(['module_id', 'name', 'path', 'identity']);
const CANDIDATE_BINARY_KEYS = new Set(['name', 'sha256', 'binding_status']);
const SYMBOL_KEYS = new Set(['status', 'expected_identity', 'observed_identity', 'symbol_file_sha256', 'detail']);
const EXCEPTION_KEYS = new Set(['kind', 'code', 'fault_address', 'instruction_address', 'description']);
const REGISTERS_KEYS = new Set(['status', 'values', 'unavailable_reason']);
const MODULE_KEYS = new Set(['id', 'name', 'path', 'base_address', 'end_address', 'identity', 'symbols']);
const THREAD_KEYS = new Set(['id', 'crashed', 'name', 'stack_status', 'frames']);
const FRAME_KEYS = new Set(['index', 'instruction_address', 'module_id', 'symbol', 'source_file', 'source_line', 'inline']);
const SANITIZER_KEYS = new Set(['kind', 'error_class', 'summary', 'access_type', 'access_size', 'fault_address']);
const REDACTION_KEYS = new Set(['applied', 'fields', 'raw_environment_included', 'raw_memory_included']);

export type NativeCrashEvidenceReadiness = 'ready' | 'incomplete' | 'rejected';
export type NativeCrashEvidenceIssueSeverity = 'error' | 'warning';

export interface NativeCrashEvidenceIssue {
	readonly severity: NativeCrashEvidenceIssueSeverity;
	readonly code: string;
	readonly path: string;
	readonly message: string;
}

export interface NativeCrashEvidenceValidationResult {
	readonly schema_version: typeof NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION;
	readonly ok: boolean;
	readonly readiness: NativeCrashEvidenceReadiness;
	readonly issues: readonly NativeCrashEvidenceIssue[];
}

export interface NativeCrashEvidenceSummary {
	readonly module_count: number;
	readonly thread_count: number;
	readonly frame_count: number;
	readonly error_count: number;
	readonly warning_count: number;
}

interface ModuleAddressRange {
	readonly start: bigint;
	readonly end: bigint;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushIssue(
	issues: NativeCrashEvidenceIssue[],
	severity: NativeCrashEvidenceIssueSeverity,
	code: string,
	path: string,
	message: string,
): void {
	issues.push({ severity, code, path, message });
}

function validateAllowedKeys(
	issues: NativeCrashEvidenceIssue[],
	value: Record<string, unknown>,
	allowed: ReadonlySet<string>,
	path: string,
): void {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) {
			pushIssue(issues, 'error', 'unknown_field', `${path}.${key}`, 'Field is not part of the native crash evidence contract.');
		}
	}
}

function validateRecord(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
	label: string,
	required = true,
): Record<string, unknown> | null {
	if (value === undefined || value === null) {
		if (required) {
			pushIssue(issues, 'error', 'missing_required_field', path, `${label} is required.`);
		}
		return null;
	}
	if (!isRecord(value)) {
		pushIssue(issues, 'error', 'invalid_object', path, `${label} must be an object.`);
		return null;
	}
	return value;
}

function validateString(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
	label: string,
	options: { required?: boolean; nullable?: boolean; pattern?: RegExp } = {},
): string | null {
	if (value === undefined || value === null) {
		if (value === null && options.nullable) {
			return null;
		}
		if (options.required !== false) {
			pushIssue(issues, 'error', 'missing_required_field', path, `${label} is required.`);
		}
		return null;
	}
	if (typeof value !== 'string') {
		pushIssue(issues, 'error', 'invalid_string', path, `${label} must be a string.`);
		return null;
	}
	if (value.trim().length === 0) {
		pushIssue(issues, 'error', 'empty_string', path, `${label} must not be empty.`);
	}
	if (value.length > MAX_STRING_LENGTH) {
		pushIssue(issues, 'error', 'string_too_long', path, `${label} exceeds the bounded evidence string limit.`);
	}
	if (options.pattern && !options.pattern.test(value)) {
		pushIssue(issues, 'error', 'invalid_string_format', path, `${label} has an invalid format.`);
	}
	return value;
}

function validateBoolean(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
	label: string,
): boolean | null {
	if (typeof value !== 'boolean') {
		pushIssue(issues, value === undefined ? 'error' : 'error', value === undefined ? 'missing_required_field' : 'invalid_boolean', path, `${label} must be a boolean.`);
		return null;
	}
	return value;
}

function validateInteger(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
	label: string,
	options: { required?: boolean; nullable?: boolean; minimum?: number } = {},
): number | null {
	if (value === undefined || value === null) {
		if (value === null && options.nullable) {
			return null;
		}
		if (options.required !== false) {
			pushIssue(issues, 'error', 'missing_required_field', path, `${label} is required.`);
		}
		return null;
	}
	if (!Number.isSafeInteger(value)) {
		pushIssue(issues, 'error', 'invalid_integer', path, `${label} must be a safe integer.`);
		return null;
	}
	if (options.minimum !== undefined && (value as number) < options.minimum) {
		pushIssue(issues, 'error', 'integer_below_minimum', path, `${label} must be at least ${options.minimum}.`);
	}
	return value as number;
}

function validateEnum(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	allowed: ReadonlySet<string>,
	path: string,
	label: string,
): string | null {
	const parsed = validateString(issues, value, path, label);
	if (parsed !== null && !allowed.has(parsed)) {
		pushIssue(issues, 'error', 'invalid_enum_value', path, `${label} has an unsupported value.`);
		return null;
	}
	return parsed;
}

function validateStringArray(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
	label: string,
): readonly string[] {
	if (!Array.isArray(value)) {
		pushIssue(issues, value === undefined ? 'error' : 'error', value === undefined ? 'missing_required_field' : 'invalid_array', path, `${label} must be an array.`);
		return [];
	}
	if (value.length > MAX_ARRAY_ITEMS) {
		pushIssue(issues, 'error', 'array_too_large', path, `${label} exceeds the bounded evidence item limit.`);
	}
	return value.flatMap((entry, index) => {
		const parsed = validateString(issues, entry, `${path}[${index}]`, `${label} item`);
		return parsed === null ? [] : [parsed];
	});
}

function validateIdentity(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
): Record<string, unknown> | null {
	const record = validateRecord(issues, value, path, 'module identity');
	if (!record) {
		return null;
	}
	validateAllowedKeys(issues, record, IDENTITY_KEYS, path);
	const scheme = validateEnum(issues, record.scheme, IDENTITY_SCHEMES, `${path}.scheme`, 'identity scheme');
	const identityValue = validateString(issues, record.value, `${path}.value`, 'identity value', {
		nullable: true,
	});
	const verified = validateBoolean(issues, record.verified, `${path}.verified`, 'identity verified');
	if (scheme === 'unknown' && (identityValue !== null || verified === true)) {
		pushIssue(issues, 'error', 'unknown_identity_has_value', path, 'Unknown identities must use value null and verified false.');
	}
	if (scheme !== null && scheme !== 'unknown' && identityValue === null) {
		pushIssue(issues, 'error', 'known_identity_missing_value', `${path}.value`, 'Known identity schemes require a value.');
	}
	return record;
}

function identityKey(value: unknown): string | null {
	if (!isRecord(value) || typeof value.scheme !== 'string' || typeof value.value !== 'string') {
		return null;
	}
	return `${value.scheme}:${value.value.toLowerCase()}`;
}

function parseHexAddress(value: unknown): bigint | null {
	if (typeof value !== 'string' || !HEX_ADDRESS_PATTERN.test(value)) {
		return null;
	}
	try {
		return BigInt(value);
	} catch {
		return null;
	}
}

function validateSymbols(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	path: string,
): Record<string, unknown> | null {
	const record = validateRecord(issues, value, path, 'symbol resolution');
	if (!record) {
		return null;
	}
	validateAllowedKeys(issues, record, SYMBOL_KEYS, path);
	const status = validateEnum(issues, record.status, SYMBOL_STATUSES, `${path}.status`, 'symbol status');
	const expected = validateIdentity(issues, record.expected_identity, `${path}.expected_identity`);
	const observed = validateIdentity(issues, record.observed_identity, `${path}.observed_identity`);
	validateString(issues, record.symbol_file_sha256, `${path}.symbol_file_sha256`, 'symbol file SHA-256', {
		required: false,
		nullable: true,
		pattern: SHA256_PATTERN,
	});
	validateString(issues, record.detail, `${path}.detail`, 'symbol detail', { required: false, nullable: true });
	const expectedKey = identityKey(expected);
	const observedKey = identityKey(observed);
	if (status === 'matched' && (expectedKey === null || observedKey === null || expectedKey !== observedKey)) {
		pushIssue(issues, 'error', 'false_symbol_match', path, 'Matched symbols require equal known expected and observed identities.');
	} else if (
		status === 'matched' &&
		(expected?.verified !== true || observed?.verified !== true)
	) {
		pushIssue(issues, 'warning', 'symbol_identity_unverified', path, 'Matched symbol identities must also be independently verified for analysis readiness.');
	}
	if (status === 'mismatched') {
		pushIssue(issues, 'error', 'symbol_identity_mismatch', path, 'Mismatched symbols make crash attribution unsafe.');
	} else if (status !== null && status !== 'matched') {
		pushIssue(issues, 'warning', 'symbol_resolution_incomplete', path, 'Incomplete symbol resolution limits source and frame attribution.');
	}
	return record;
}

function validateSource(issues: NativeCrashEvidenceIssue[], value: unknown): string | null {
	const record = validateRecord(issues, value, '$.source', 'source');
	if (!record) {
		return null;
	}
	validateAllowedKeys(issues, record, SOURCE_KEYS, '$.source');
	const kind = validateEnum(issues, record.kind, SOURCE_KINDS, '$.source.kind', 'source kind');
	const artifact = validateRecord(issues, record.artifact, '$.source.artifact', 'source artifact');
	if (artifact) {
		validateAllowedKeys(issues, artifact, ARTIFACT_KEYS, '$.source.artifact');
		validateString(issues, artifact.sha256, '$.source.artifact.sha256', 'artifact SHA-256', { pattern: SHA256_PATTERN });
		validateInteger(issues, artifact.size_bytes, '$.source.artifact.size_bytes', 'artifact size', { minimum: 0 });
		validateString(issues, artifact.original_name, '$.source.artifact.original_name', 'artifact original name', { required: false, nullable: true });
	}
	const tool = validateRecord(issues, record.tool, '$.source.tool', 'capture tool');
	if (tool) {
		validateAllowedKeys(issues, tool, TOOL_KEYS, '$.source.tool');
		validateString(issues, tool.name, '$.source.tool.name', 'capture tool name');
		validateString(issues, tool.version, '$.source.tool.version', 'capture tool version', { required: false, nullable: true });
		validateString(issues, tool.command_fingerprint, '$.source.tool.command_fingerprint', 'command fingerprint', {
			required: false,
			nullable: true,
			pattern: SHA256_PATTERN,
		});
	}
	return kind;
}

function validateTarget(issues: NativeCrashEvidenceIssue[], value: unknown): string | null {
	const record = validateRecord(issues, value, '$.target', 'target');
	if (!record) {
		return null;
	}
	validateAllowedKeys(issues, record, TARGET_KEYS, '$.target');
	validateEnum(issues, record.platform, PLATFORMS, '$.target.platform', 'target platform');
	validateEnum(issues, record.architecture, ARCHITECTURES, '$.target.architecture', 'target architecture');
	validateInteger(issues, record.process_id, '$.target.process_id', 'process id', { nullable: true, minimum: 0 });
	return validateString(issues, record.crashed_thread_id, '$.target.crashed_thread_id', 'crashed thread id');
}

function validateBinary(issues: NativeCrashEvidenceIssue[], value: unknown): Record<string, unknown> | null {
	const record = validateRecord(issues, value, '$.binary', 'main binary');
	if (!record) {
		return null;
	}
	validateAllowedKeys(issues, record, BINARY_KEYS, '$.binary');
	validateString(issues, record.module_id, '$.binary.module_id', 'binary module id');
	validateString(issues, record.name, '$.binary.name', 'binary name');
	validateString(issues, record.path, '$.binary.path', 'binary path', { nullable: true });
	const identity = validateIdentity(issues, record.identity, '$.binary.identity');
	if (!identity || identity.scheme === 'unknown' || identity.verified !== true) {
		pushIssue(issues, 'warning', 'binary_identity_unverified', '$.binary.identity', 'Exact main-binary identity is required before attribution is analysis-ready.');
	}
	return record;
}

function validateCandidateBinary(issues: NativeCrashEvidenceIssue[], value: unknown): void {
	if (value === undefined || value === null) return;
	const record = validateRecord(issues, value, '$.candidate_binary', 'candidate binary');
	if (!record) return;
	validateAllowedKeys(issues, record, CANDIDATE_BINARY_KEYS, '$.candidate_binary');
	validateString(issues, record.name, '$.candidate_binary.name', 'candidate binary name');
	validateString(issues, record.sha256, '$.candidate_binary.sha256', 'candidate binary SHA-256', { pattern: SHA256_PATTERN });
	if (record.binding_status !== 'candidate_only') {
		pushIssue(issues, 'error', 'invalid_candidate_binding_status', '$.candidate_binary.binding_status', 'Offline candidate binaries must use candidate_only binding status.');
	}
	pushIssue(issues, 'warning', 'candidate_binary_not_matched', '$.candidate_binary', 'The supplied binary file is hashed but has not been proven to match the captured module.');
}

function validateException(issues: NativeCrashEvidenceIssue[], value: unknown): void {
	const record = validateRecord(issues, value, '$.exception', 'exception');
	if (!record) {
		return;
	}
	validateAllowedKeys(issues, record, EXCEPTION_KEYS, '$.exception');
	validateEnum(issues, record.kind, EXCEPTION_KINDS, '$.exception.kind', 'exception kind');
	validateString(issues, record.code, '$.exception.code', 'exception code');
	validateString(issues, record.fault_address, '$.exception.fault_address', 'fault address', { nullable: true, pattern: HEX_ADDRESS_PATTERN });
	validateString(issues, record.instruction_address, '$.exception.instruction_address', 'instruction address', { nullable: true, pattern: HEX_ADDRESS_PATTERN });
	validateString(issues, record.description, '$.exception.description', 'exception description', { required: false, nullable: true });
}

function validateRegisters(issues: NativeCrashEvidenceIssue[], value: unknown): void {
	const record = validateRecord(issues, value, '$.registers', 'register state');
	if (!record) {
		return;
	}
	validateAllowedKeys(issues, record, REGISTERS_KEYS, '$.registers');
	const status = validateEnum(issues, record.status, AVAILABILITY_STATUSES, '$.registers.status', 'register status');
	const values = validateRecord(issues, record.values, '$.registers.values', 'register values');
	if (values) {
		for (const [name, registerValue] of Object.entries(values)) {
			if (!/^[a-z][a-z0-9_]*$/iu.test(name)) {
				pushIssue(issues, 'error', 'invalid_register_name', `$.registers.values.${name}`, 'Register names must be stable alphanumeric keys.');
			}
			validateString(issues, registerValue, `$.registers.values.${name}`, 'register value', { pattern: HEX_ADDRESS_PATTERN });
		}
	}
	const reason = validateString(issues, record.unavailable_reason, '$.registers.unavailable_reason', 'register unavailable reason', { required: false, nullable: true });
	if (status === 'available' && (!values || Object.keys(values).length === 0)) {
		pushIssue(issues, 'error', 'available_registers_empty', '$.registers.values', 'Available register state must contain values.');
	}
	if (status === 'unavailable' && reason === null) {
		pushIssue(issues, 'warning', 'registers_unavailable_without_reason', '$.registers.unavailable_reason', 'Unavailable register state should explain why it is missing.');
	}
	if (status !== 'available') {
		pushIssue(issues, 'warning', 'register_state_incomplete', '$.registers', 'Incomplete register state limits exact machine-state reconstruction.');
	}
}

function validateModules(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	binary: Record<string, unknown> | null,
): ReadonlyMap<string, ModuleAddressRange | null> {
	if (!Array.isArray(value)) {
		pushIssue(issues, value === undefined ? 'error' : 'error', value === undefined ? 'missing_required_field' : 'invalid_array', '$.modules', 'modules must be an array.');
		return new Map();
	}
	if (value.length === 0) {
		pushIssue(issues, 'error', 'empty_modules', '$.modules', 'At least the main binary module is required.');
	}
	if (value.length > MAX_ARRAY_ITEMS) {
		pushIssue(issues, 'error', 'array_too_large', '$.modules', 'modules exceeds the bounded evidence item limit.');
	}
	const ranges = new Map<string, ModuleAddressRange | null>();
	let binaryModuleFound = false;
	value.forEach((entry, index) => {
		const path = `$.modules[${index}]`;
		const record = validateRecord(issues, entry, path, 'module');
		if (!record) {
			return;
		}
		validateAllowedKeys(issues, record, MODULE_KEYS, path);
		const id = validateString(issues, record.id, `${path}.id`, 'module id');
		const name = validateString(issues, record.name, `${path}.name`, 'module name');
		const modulePath = validateString(issues, record.path, `${path}.path`, 'module path', { nullable: true });
		const baseAddress = validateString(issues, record.base_address, `${path}.base_address`, 'module base address', { nullable: true, pattern: HEX_ADDRESS_PATTERN });
		const endAddress = validateString(issues, record.end_address, `${path}.end_address`, 'module end address', { nullable: true, pattern: HEX_ADDRESS_PATTERN });
		const identity = validateIdentity(issues, record.identity, `${path}.identity`);
		const moduleSymbols = validateSymbols(issues, record.symbols, `${path}.symbols`);
		if (id !== null) {
			if (ranges.has(id)) {
				pushIssue(issues, 'error', 'duplicate_module_id', `${path}.id`, 'Module ids must be unique in one evidence record.');
			}
			ranges.set(id, null);
			const start = parseHexAddress(baseAddress);
			const end = parseHexAddress(endAddress);
			if ((start === null) !== (end === null)) {
				pushIssue(issues, 'error', 'partial_module_address_range', path, 'Module base_address and end_address must both be known or both be null.');
			}
			if (start !== null && end !== null) {
				if (start >= end) {
					pushIssue(issues, 'error', 'invalid_module_address_range', path, 'Module base_address must be lower than end_address.');
				} else {
					ranges.set(id, { start, end });
				}
			} else if (baseAddress === null && endAddress === null) {
				pushIssue(issues, 'warning', 'module_address_range_unavailable', path, 'Unknown module address range limits frame attribution.');
			}
		}
		if (binary && id === binary.module_id) {
			binaryModuleFound = true;
			if (name !== null && name !== binary.name) {
				pushIssue(issues, 'error', 'binary_module_name_mismatch', `${path}.name`, 'Main binary and loaded module names disagree.');
			}
			if (modulePath !== null && typeof binary.path === 'string' && modulePath !== binary.path) {
				pushIssue(issues, 'error', 'binary_module_path_mismatch', `${path}.path`, 'Main binary and loaded module paths disagree.');
			}
			const binaryIdentity = identityKey(binary.identity);
			const moduleIdentity = identityKey(identity);
			if (binaryIdentity !== null && moduleIdentity !== null && binaryIdentity !== moduleIdentity) {
				pushIssue(issues, 'error', 'binary_module_identity_mismatch', `${path}.identity`, 'Main binary and loaded module identities disagree.');
			}
		}
		const moduleIdentity = identityKey(identity);
		if (moduleIdentity !== null) {
			for (const [field, candidate] of [
				['expected_identity', moduleSymbols?.expected_identity],
				['observed_identity', moduleSymbols?.observed_identity],
			] as const) {
				const candidateIdentity = identityKey(candidate);
				if (candidateIdentity !== null && candidateIdentity !== moduleIdentity) {
					pushIssue(issues, 'error', 'module_symbol_identity_mismatch', `${path}.symbols.${field}`, 'Module symbol identity must match the captured loaded-module identity.');
				}
			}
		}
		if (!identity || identity.scheme === 'unknown' || identity.verified !== true) {
			pushIssue(issues, 'warning', 'module_identity_unverified', `${path}.identity`, 'Unverified module identity limits symbol and frame attribution.');
		}
	});
	if (!binaryModuleFound) {
		pushIssue(issues, 'error', 'binary_module_missing', '$.modules', 'The loaded module list must include the main binary by name.');
	}
	return ranges;
}

function validateThreads(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	crashedThreadId: string | null,
	moduleRanges: ReadonlyMap<string, ModuleAddressRange | null>,
): void {
	if (!Array.isArray(value)) {
		pushIssue(issues, value === undefined ? 'error' : 'error', value === undefined ? 'missing_required_field' : 'invalid_array', '$.threads', 'threads must be an array.');
		return;
	}
	if (value.length === 0) {
		pushIssue(issues, 'error', 'empty_threads', '$.threads', 'At least the crashed thread is required.');
	}
	if (value.length > MAX_ARRAY_ITEMS) {
		pushIssue(issues, 'error', 'array_too_large', '$.threads', 'threads exceeds the bounded evidence item limit.');
	}
	const ids = new Set<string>();
	const crashedIds: string[] = [];
	value.forEach((entry, threadIndex) => {
		const path = `$.threads[${threadIndex}]`;
		const record = validateRecord(issues, entry, path, 'thread');
		if (!record) {
			return;
		}
		validateAllowedKeys(issues, record, THREAD_KEYS, path);
		const id = validateString(issues, record.id, `${path}.id`, 'thread id');
		const crashed = validateBoolean(issues, record.crashed, `${path}.crashed`, 'thread crashed');
		validateString(issues, record.name, `${path}.name`, 'thread name', { required: false, nullable: true });
		const stackStatus = validateEnum(issues, record.stack_status, AVAILABILITY_STATUSES, `${path}.stack_status`, 'stack status');
		if (id !== null) {
			if (ids.has(id)) {
				pushIssue(issues, 'error', 'duplicate_thread_id', `${path}.id`, 'Thread ids must be unique.');
			}
			ids.add(id);
			if (crashed === true) {
				crashedIds.push(id);
			}
		}
		if (!Array.isArray(record.frames)) {
			pushIssue(issues, record.frames === undefined ? 'error' : 'error', record.frames === undefined ? 'missing_required_field' : 'invalid_array', `${path}.frames`, 'frames must be an array.');
			return;
		}
		if (record.frames.length > MAX_FRAMES_PER_THREAD) {
			pushIssue(issues, 'error', 'too_many_frames', `${path}.frames`, 'Thread frames exceed the bounded evidence limit.');
		}
		if (crashed === true && (stackStatus !== 'available' || record.frames.length === 0)) {
			pushIssue(issues, 'warning', 'crashed_stack_incomplete', `${path}.frames`, 'The crashed thread needs an available non-empty stack for analysis readiness.');
		}
		record.frames.forEach((frame, frameIndex) => {
			const framePath = `${path}.frames[${frameIndex}]`;
			const frameRecord = validateRecord(issues, frame, framePath, 'stack frame');
			if (!frameRecord) {
				return;
			}
			validateAllowedKeys(issues, frameRecord, FRAME_KEYS, framePath);
			const index = validateInteger(issues, frameRecord.index, `${framePath}.index`, 'frame index', { minimum: 0 });
			if (index !== null && index !== frameIndex) {
				pushIssue(issues, 'error', 'non_contiguous_frame_index', `${framePath}.index`, 'Frame indexes must be zero-based and contiguous.');
			}
			const instructionAddress = validateString(issues, frameRecord.instruction_address, `${framePath}.instruction_address`, 'frame instruction address', { pattern: HEX_ADDRESS_PATTERN });
			const moduleId = validateString(issues, frameRecord.module_id, `${framePath}.module_id`, 'frame module id', { nullable: true });
			if (moduleId !== null && !moduleRanges.has(moduleId)) {
				pushIssue(issues, 'error', 'unknown_frame_module', `${framePath}.module_id`, 'Frame module_id must reference an entry in modules.');
			} else if (moduleId !== null) {
				const range = moduleRanges.get(moduleId);
				const address = parseHexAddress(instructionAddress);
				if (range && address !== null && (address < range.start || address >= range.end)) {
					pushIssue(issues, 'error', 'frame_address_outside_module', `${framePath}.instruction_address`, 'Frame instruction address must fall inside its referenced module range.');
				}
			}
			validateString(issues, frameRecord.symbol, `${framePath}.symbol`, 'frame symbol', { nullable: true });
			validateString(issues, frameRecord.source_file, `${framePath}.source_file`, 'frame source file', { nullable: true });
			validateInteger(issues, frameRecord.source_line, `${framePath}.source_line`, 'frame source line', { nullable: true, minimum: 1 });
			validateBoolean(issues, frameRecord.inline, `${framePath}.inline`, 'frame inline');
		});
	});
	if (crashedIds.length !== 1) {
		pushIssue(issues, 'error', 'invalid_crashed_thread_count', '$.threads', 'Exactly one thread must be marked crashed.');
	} else if (crashedThreadId !== null && crashedIds[0] !== crashedThreadId) {
		pushIssue(issues, 'error', 'crashed_thread_id_mismatch', '$.target.crashed_thread_id', 'target.crashed_thread_id must match the thread marked crashed.');
	}
}

function validateSanitizer(
	issues: NativeCrashEvidenceIssue[],
	value: unknown,
	sourceKind: string | null,
): void {
	if (value === null) {
		if (sourceKind === 'sanitizer_report') {
			pushIssue(issues, 'error', 'sanitizer_payload_missing', '$.sanitizer', 'Sanitizer report sources require sanitizer evidence.');
		}
		return;
	}
	const record = validateRecord(issues, value, '$.sanitizer', 'sanitizer evidence');
	if (!record) {
		return;
	}
	validateAllowedKeys(issues, record, SANITIZER_KEYS, '$.sanitizer');
	validateEnum(issues, record.kind, SANITIZER_KINDS, '$.sanitizer.kind', 'sanitizer kind');
	validateString(issues, record.error_class, '$.sanitizer.error_class', 'sanitizer error class');
	validateString(issues, record.summary, '$.sanitizer.summary', 'sanitizer summary');
	validateString(issues, record.access_type, '$.sanitizer.access_type', 'sanitizer access type', { required: false, nullable: true });
	validateInteger(issues, record.access_size, '$.sanitizer.access_size', 'sanitizer access size', { required: false, nullable: true, minimum: 1 });
	validateString(issues, record.fault_address, '$.sanitizer.fault_address', 'sanitizer fault address', { required: false, nullable: true, pattern: HEX_ADDRESS_PATTERN });
}

function validateRedaction(issues: NativeCrashEvidenceIssue[], value: unknown): void {
	const record = validateRecord(issues, value, '$.redaction', 'redaction metadata');
	if (!record) {
		return;
	}
	validateAllowedKeys(issues, record, REDACTION_KEYS, '$.redaction');
	const applied = validateBoolean(issues, record.applied, '$.redaction.applied', 'redaction applied');
	const fields = validateStringArray(issues, record.fields, '$.redaction.fields', 'redacted fields');
	const rawEnvironmentIncluded = validateBoolean(issues, record.raw_environment_included, '$.redaction.raw_environment_included', 'raw environment included');
	const rawMemoryIncluded = validateBoolean(issues, record.raw_memory_included, '$.redaction.raw_memory_included', 'raw memory included');
	if (rawEnvironmentIncluded === true || rawMemoryIncluded === true) {
		pushIssue(issues, 'error', 'unsafe_raw_data_included', '$.redaction', 'Portable crash evidence must not include raw environment values or raw process memory.');
	}
	if (applied === false && fields.length > 0) {
		pushIssue(issues, 'error', 'redaction_state_mismatch', '$.redaction.fields', 'redaction.fields must be empty when redaction.applied is false.');
	}
}

export function validateNativeCrashEvidence(value: unknown): NativeCrashEvidenceValidationResult {
	const issues: NativeCrashEvidenceIssue[] = [];
	if (!isRecord(value)) {
		pushIssue(issues, 'error', 'invalid_record', '$', 'Native crash evidence must be a JSON object.');
		return { schema_version: NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION, ok: false, readiness: 'rejected', issues };
	}

	validateAllowedKeys(issues, value, TOP_LEVEL_KEYS, '$');
	if (value.schema_version !== NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION) {
		pushIssue(issues, 'error', 'invalid_schema_version', '$.schema_version', 'schema_version must be "1".');
	}
	if (value.kind !== 'native_crash_evidence') {
		pushIssue(issues, 'error', 'invalid_kind', '$.kind', 'kind must be native_crash_evidence.');
	}
	const capturedAt = validateString(issues, value.captured_at, '$.captured_at', 'captured_at', { pattern: ISO_DATE_TIME_PATTERN });
	if (capturedAt !== null && Number.isNaN(Date.parse(capturedAt))) {
		pushIssue(issues, 'error', 'invalid_date_time', '$.captured_at', 'captured_at must be a real ISO 8601 date-time.');
	}
	const sourceKind = validateSource(issues, value.source);
	const crashedThreadId = validateTarget(issues, value.target);
	const binary = validateBinary(issues, value.binary);
	validateCandidateBinary(issues, value.candidate_binary);
	const binarySymbols = validateSymbols(issues, value.symbols, '$.symbols');
	const binaryIdentity = identityKey(binary?.identity);
	if (binaryIdentity !== null) {
		for (const [field, candidate] of [
			['expected_identity', binarySymbols?.expected_identity],
			['observed_identity', binarySymbols?.observed_identity],
		] as const) {
			const candidateIdentity = identityKey(candidate);
			if (candidateIdentity !== null && candidateIdentity !== binaryIdentity) {
				pushIssue(issues, 'error', 'binary_symbol_identity_mismatch', `$.symbols.${field}`, 'Binary symbol identity must match the captured main binary identity.');
			}
		}
	}
	validateException(issues, value.exception);
	validateRegisters(issues, value.registers);
	const moduleRanges = validateModules(issues, value.modules, binary);
	validateThreads(issues, value.threads, crashedThreadId, moduleRanges);
	validateSanitizer(issues, value.sanitizer, sourceKind);
	validateRedaction(issues, value.redaction);

	const hasErrors = issues.some((issue) => issue.severity === 'error');
	const hasWarnings = issues.some((issue) => issue.severity === 'warning');
	return {
		schema_version: NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION,
		ok: !hasErrors,
		readiness: hasErrors ? 'rejected' : hasWarnings ? 'incomplete' : 'ready',
		issues,
	};
}

export function validateNativeCrashEvidenceJson(content: string): NativeCrashEvidenceValidationResult {
	if (Buffer.byteLength(content, 'utf8') > MAX_NATIVE_CRASH_EVIDENCE_BYTES) {
		return {
			schema_version: NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION,
			ok: false,
			readiness: 'rejected',
			issues: [{
				severity: 'error',
				code: 'evidence_too_large',
				path: '$',
				message: 'Native crash evidence exceeds the 4 MiB validation limit.',
			}],
		};
	}
	try {
		return validateNativeCrashEvidence(JSON.parse(content));
	} catch (error) {
		return {
			schema_version: NATIVE_CRASH_EVIDENCE_SCHEMA_VERSION,
			ok: false,
			readiness: 'rejected',
			issues: [{
				severity: 'error',
				code: 'invalid_json',
				path: '$',
				message: `Native crash evidence must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
			}],
		};
	}
}

export function summarizeNativeCrashEvidence(
	value: unknown,
	issues: readonly NativeCrashEvidenceIssue[],
): NativeCrashEvidenceSummary {
	const modules = isRecord(value) && Array.isArray(value.modules) ? value.modules : [];
	const threads = isRecord(value) && Array.isArray(value.threads) ? value.threads : [];
	const frameCount = threads.reduce((count, thread) => (
		count + (isRecord(thread) && Array.isArray(thread.frames) ? thread.frames.length : 0)
	), 0);
	return {
		module_count: modules.length,
		thread_count: threads.length,
		frame_count: frameCount,
		error_count: issues.filter((issue) => issue.severity === 'error').length,
		warning_count: issues.filter((issue) => issue.severity === 'warning').length,
	};
}
