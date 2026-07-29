import { createHash } from 'node:crypto';
import path from 'node:path';

export type NativeCrashCollectorAdapter = 'windows-minidump' | 'linux-core' | 'sanitizer';

export interface NativeCrashCollectorOptions {
	readonly adapter: NativeCrashCollectorAdapter;
	readonly originalName: string;
	readonly capturedAt: string;
	readonly binaryName?: string;
	readonly binaryPath?: string;
	readonly binaryBytes?: Uint8Array;
}

export interface NativeCrashCollectionResult {
	readonly evidence: Record<string, unknown>;
	readonly warnings: readonly string[];
}

interface ParsedModule {
	readonly id: string;
	readonly name: string;
	readonly path: string | null;
	readonly base: bigint | null;
	readonly end: bigint | null;
	readonly identity: Record<string, unknown>;
}

const UNKNOWN_IDENTITY = Object.freeze({ scheme: 'unknown', value: null, verified: false });
const MAX_MODULES = 4096;
const MAX_THREADS = 4096;

function sha256(bytes: Uint8Array): string {
	return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function address(value: bigint | null): string | null {
	return value === null ? null : `0x${value.toString(16)}`;
}

function ensureRange(bytes: Uint8Array, offset: number, length: number, label: string): void {
	if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > bytes.byteLength) {
		throw new Error(`${label} points outside the bounded artifact`);
	}
}

function unknownSymbols(identity: Record<string, unknown> = UNKNOWN_IDENTITY): Record<string, unknown> {
	return {
		status: 'not_requested',
		expected_identity: identity,
		observed_identity: UNKNOWN_IDENTITY,
		symbol_file_sha256: null,
		detail: 'Offline collection did not load external symbol files.',
	};
}

function moduleRecord(module: ParsedModule): Record<string, unknown> {
	return {
		id: module.id,
		name: module.name,
		path: module.path,
		base_address: address(module.base),
		end_address: address(module.end),
		identity: module.identity,
		symbols: unknownSymbols(module.identity),
	};
}

function baseEvidence(
	bytes: Uint8Array,
	options: NativeCrashCollectorOptions,
	sourceKind: string,
	platform: string,
	architecture: string,
	modules: readonly ParsedModule[],
	threads: readonly Record<string, unknown>[],
	crashedThreadId: string,
	exception: Record<string, unknown>,
	sanitizer: Record<string, unknown> | null,
	redactedFields: readonly string[] = [],
): Record<string, unknown> {
	const binary = modules[0] ?? {
		id: 'main',
		name: options.binaryName ?? path.basename(options.originalName),
		path: options.binaryPath ?? null,
		base: null,
		end: null,
		identity: UNKNOWN_IDENTITY,
	};
	return {
		schema_version: '1',
		kind: 'native_crash_evidence',
		captured_at: options.capturedAt,
		source: {
			kind: sourceKind,
			artifact: { sha256: sha256(bytes), size_bytes: bytes.byteLength, original_name: options.originalName },
			tool: { name: 'mustflow-offline-collector', version: null, command_fingerprint: null },
		},
		target: { platform, architecture, process_id: null, crashed_thread_id: crashedThreadId },
		binary: { module_id: binary.id, name: binary.name, path: binary.path, identity: binary.identity },
		candidate_binary: options.binaryBytes ? { name: options.binaryName ?? 'candidate-binary', sha256: sha256(options.binaryBytes), binding_status: 'candidate_only' } : null,
		symbols: unknownSymbols(binary.identity),
		exception,
		registers: { status: 'unavailable', values: {}, unavailable_reason: 'Offline collector did not decode a complete register context.' },
		modules: (modules.length > 0 ? modules : [binary]).map(moduleRecord),
		threads,
		sanitizer,
		redaction: { applied: redactedFields.length > 0, fields: redactedFields, raw_environment_included: false, raw_memory_included: false },
	};
}

function readMinidumpString(bytes: Uint8Array, view: DataView, rva: number): string | null {
	if (rva === 0 || rva + 4 > bytes.byteLength) return null;
	const byteLength = view.getUint32(rva, true);
	if (byteLength % 2 !== 0) throw new Error('Minidump UTF-16 string has an odd byte length');
	ensureRange(bytes, rva + 4, byteLength, 'minidump string');
	return Buffer.from(bytes.buffer, bytes.byteOffset + rva + 4, byteLength).toString('utf16le').replace(/\0+$/u, '');
}

function peGuidAge(bytes: Uint8Array, view: DataView, rva: number, size: number): Record<string, unknown> {
	if (size < 24 || rva <= 0 || rva + size > bytes.byteLength) return UNKNOWN_IDENTITY;
	if (Buffer.from(bytes.buffer, bytes.byteOffset + rva, 4).toString('ascii') !== 'RSDS') return UNKNOWN_IDENTITY;
	const d1 = view.getUint32(rva + 4, true).toString(16).padStart(8, '0');
	const d2 = view.getUint16(rva + 8, true).toString(16).padStart(4, '0');
	const d3 = view.getUint16(rva + 10, true).toString(16).padStart(4, '0');
	const tail = Buffer.from(bytes.buffer, bytes.byteOffset + rva + 12, 8).toString('hex');
	const guid = `${d1}-${d2}-${d3}-${tail.slice(0, 4)}-${tail.slice(4)}`;
	const age = view.getUint32(rva + 20, true);
	return { scheme: 'pe_guid_age', value: `${guid}:${age}`.toUpperCase(), verified: true };
}

function collectMinidump(bytes: Uint8Array, options: NativeCrashCollectorOptions): NativeCrashCollectionResult {
	ensureRange(bytes, 0, 32, 'minidump header');
	if (Buffer.from(bytes.buffer, bytes.byteOffset, 4).toString('ascii') !== 'MDMP') throw new Error('Artifact is not a Windows minidump');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if ((view.getUint32(4, true) & 0xffff) !== 0xa793) throw new Error('Minidump version signature is unsupported');
	const streamCount = view.getUint32(8, true);
	if (streamCount > 1024) throw new Error('Minidump stream count exceeds the bounded collector limit');
	const directoryRva = view.getUint32(12, true);
	ensureRange(bytes, directoryRva, streamCount * 12, 'minidump stream directory');
	const streams = new Map<number, { size: number; rva: number }>();
	for (let index = 0; index < streamCount; index += 1) {
		const offset = directoryRva + index * 12;
		const type = view.getUint32(offset, true);
		const size = view.getUint32(offset + 4, true);
		const rva = view.getUint32(offset + 8, true);
		ensureRange(bytes, rva, size, `minidump stream ${type}`);
		if (streams.has(type)) throw new Error(`Minidump contains duplicate stream type ${type}`);
		streams.set(type, { size, rva });
	}
	let architecture = 'other';
	const system = streams.get(7);
	if (system && system.size >= 2) architecture = ({ 0: 'x86', 5: 'arm', 9: 'x86_64', 12: 'arm64' } as Record<number, string>)[view.getUint16(system.rva, true)] ?? 'other';
	const modules: ParsedModule[] = [];
	const redactedFields: string[] = [];
	const moduleStream = streams.get(4);
	if (moduleStream && moduleStream.size >= 4) {
		const count = view.getUint32(moduleStream.rva, true);
		if (count > MAX_MODULES) throw new Error('Minidump module count exceeds the bounded collector limit');
		ensureRange(bytes, moduleStream.rva + 4, count * 108, 'minidump module list');
		for (let index = 0; index < count; index += 1) {
			const offset = moduleStream.rva + 4 + index * 108;
			const base = view.getBigUint64(offset, true);
			const size = BigInt(view.getUint32(offset + 8, true));
			const modulePath = readMinidumpString(bytes, view, view.getUint32(offset + 20, true));
			const cvSize = view.getUint32(offset + 76, true);
			const cvRva = view.getUint32(offset + 80, true);
			if (modulePath) redactedFields.push(`modules[${index}].path`);
			modules.push({ id: `module-${index}`, name: modulePath ? path.win32.basename(modulePath) : `module-${index}`, path: null, base, end: base + size, identity: peGuidAge(bytes, view, cvRva, cvSize) });
		}
	}
	let crashedThreadId = 'unknown';
	let code = 'MINIDUMP_EXCEPTION';
	let instructionAddress: bigint | null = null;
	let faultAddress: bigint | null = null;
	const exceptionStream = streams.get(6);
	if (exceptionStream && exceptionStream.size >= 32) {
		crashedThreadId = String(view.getUint32(exceptionStream.rva, true));
		code = `0x${view.getUint32(exceptionStream.rva + 8, true).toString(16)}`;
		instructionAddress = view.getBigUint64(exceptionStream.rva + 24, true);
		const parameterCount = exceptionStream.size >= 40 ? view.getUint32(exceptionStream.rva + 32, true) : 0;
		if (code.toLowerCase() === '0xc0000005' && parameterCount >= 2 && exceptionStream.size >= 56) {
			faultAddress = view.getBigUint64(exceptionStream.rva + 48, true);
		}
	}
	const threadIds: string[] = [];
	const threadStream = streams.get(3);
	if (threadStream && threadStream.size >= 4) {
		const count = view.getUint32(threadStream.rva, true);
		if (count > MAX_THREADS) throw new Error('Minidump thread count exceeds the bounded collector limit');
		ensureRange(bytes, threadStream.rva + 4, count * 48, 'minidump thread list');
		for (let index = 0; index < count; index += 1) threadIds.push(String(view.getUint32(threadStream.rva + 4 + index * 48, true)));
	}
	if (!threadIds.includes(crashedThreadId)) threadIds.unshift(crashedThreadId);
	const threads = threadIds.map((id) => ({ id, crashed: id === crashedThreadId, name: null, stack_status: 'unavailable', frames: [] }));
	const evidence = baseEvidence(bytes, options, 'windows_minidump', 'windows', architecture, modules, threads, crashedThreadId, {
		kind: 'exception', code, fault_address: address(faultAddress), instruction_address: address(instructionAddress), description: 'Collected from MINIDUMP_EXCEPTION_STREAM.',
	}, null, redactedFields);
	return { evidence, warnings: ['Stack unwind and registers require an exact external debugger and symbols.', ...(redactedFields.length > 0 ? ['Absolute module paths were removed from portable evidence.'] : [])] };
}

function collectElfCore(bytes: Uint8Array, options: NativeCrashCollectorOptions): NativeCrashCollectionResult {
	ensureRange(bytes, 0, 16, 'ELF identification');
	if (bytes[0] !== 0x7f || bytes[1] !== 0x45 || bytes[2] !== 0x4c || bytes[3] !== 0x46) throw new Error('Artifact is not an ELF core');
	const elfClass = bytes[4];
	const little = bytes[5] === 1;
	if ((elfClass !== 1 && elfClass !== 2) || (!little && bytes[5] !== 2)) throw new Error('Unsupported ELF class or byte order');
	ensureRange(bytes, 0, elfClass === 2 ? 64 : 52, 'ELF header');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const u16 = (offset: number) => view.getUint16(offset, little);
	const u32 = (offset: number) => view.getUint32(offset, little);
	const word = (offset: number) => elfClass === 2 ? view.getBigUint64(offset, little) : BigInt(u32(offset));
	if (u16(16) !== 4) throw new Error('ELF artifact is not ET_CORE');
	const machine = u16(18);
	const architecture = ({ 3: 'x86', 40: 'arm', 62: 'x86_64', 183: 'arm64' } as Record<number, string>)[machine] ?? 'other';
	const phoff = Number(elfClass === 2 ? view.getBigUint64(32, little) : BigInt(u32(28)));
	const phentsize = u16(elfClass === 2 ? 54 : 42);
	const phnum = u16(elfClass === 2 ? 56 : 44);
	if (phnum > 4096) throw new Error('ELF program-header count exceeds the bounded collector limit');
	if (phnum > 0 && phentsize < (elfClass === 2 ? 56 : 32)) throw new Error('ELF program-header entry is smaller than the class minimum');
	ensureRange(bytes, phoff, phentsize * phnum, 'ELF program headers');
	const executableLoads: Array<{ start: bigint; end: bigint }> = [];
	for (let index = 0; index < phnum; index += 1) {
		const offset = phoff + index * phentsize;
		const type = u32(offset);
		const flags = elfClass === 2 ? u32(offset + 4) : u32(offset + 24);
		if (type !== 1 || (flags & 1) === 0) continue;
		const start = word(offset + (elfClass === 2 ? 16 : 8));
		const size = word(offset + (elfClass === 2 ? 40 : 20));
		executableLoads.push({ start, end: start + size });
	}
	const primary = executableLoads[0] ?? null;
	const binaryName = options.binaryName ?? path.basename(options.binaryPath ?? options.originalName);
	const modules: ParsedModule[] = [{ id: 'main', name: binaryName, path: null, base: primary?.start ?? null, end: primary?.end ?? null, identity: UNKNOWN_IDENTITY }];
	const crashedThreadId = 'unknown';
	const evidence = baseEvidence(bytes, options, 'linux_core', 'linux', architecture, modules, [{ id: crashedThreadId, crashed: true, name: null, stack_status: 'unavailable', frames: [] }], crashedThreadId, {
		kind: 'signal', code: 'ELF_CORE', fault_address: null, instruction_address: null, description: 'ELF core header and executable load segments collected offline.',
	}, null);
	return { evidence, warnings: ['NT_PRSTATUS register decoding, NT_FILE module mapping, and unwind require an architecture-specific follow-up.'] };
}

function collectSanitizer(bytes: Uint8Array, options: NativeCrashCollectorOptions): NativeCrashCollectionResult {
	let text: string;
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new Error('Sanitizer artifact must be valid UTF-8');
	}
	text = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/gu, '');
	const explicitDetector = /(AddressSanitizer|ThreadSanitizer|MemorySanitizer|UndefinedBehaviorSanitizer|LeakSanitizer)/u.exec(text)?.[1];
	const detector = explicitDetector ?? (/\bruntime error:/iu.test(text) ? 'UndefinedBehaviorSanitizer' : undefined);
	if (!detector) throw new Error('Artifact does not contain a supported sanitizer signature');
	const kind = detector === 'AddressSanitizer' ? 'address' : detector === 'ThreadSanitizer' ? 'thread' : detector === 'MemorySanitizer' ? 'memory' : detector === 'UndefinedBehaviorSanitizer' ? 'undefined_behavior' : 'leak';
	const errorClass = new RegExp(`(?:ERROR|WARNING): ${detector}: ([^\\s]+)`, 'u').exec(text)?.[1] ?? (detector === 'UndefinedBehaviorSanitizer' && /\bruntime error:/iu.test(text) ? 'runtime-error' : detector);
	const rawSummary = new RegExp(`SUMMARY: ${detector}: ([^\\r\\n]+)`, 'u').exec(text)?.[1] ?? (/\bruntime error:\s*([^\r\n]+)/iu.exec(text)?.[1] ?? errorClass);
	const pathPattern = /(?:[A-Za-z]:[\\/]|\/)(?:[^\s:\r\n]+[\\/])*[^\s:\r\n]+(?=:\d+|\s|$)/gu;
	const summary = rawSummary.replace(pathPattern, '<redacted-path>');
	const fault = /(?:on address|address) (0x[0-9a-f]+)/iu.exec(text)?.[1]?.toLowerCase() ?? null;
	const access = /(READ|WRITE) of size (\d+)/iu.exec(text);
	const framePattern = /^\s*#\d+\s+(0x[0-9a-f]+)\s+(?:in\s+)?([^\r\n]+)$/gimu;
	const frames: Record<string, unknown>[] = [];
	let pathsRedacted = summary !== rawSummary;
	let framesTruncated = false;
	for (let match = framePattern.exec(text); match; match = framePattern.exec(text)) {
		if (frames.length >= 2048) { framesTruncated = true; break; }
		const rawTail = match[2].trim();
		const safeTail = rawTail.replace(pathPattern, '<redacted-path>');
		pathsRedacted ||= safeTail !== rawTail;
		const symbol = /^(?:in\s+)?([^\s]+)(?:\s|$)/u.exec(safeTail)?.[1] ?? null;
		frames.push({ index: frames.length, instruction_address: match[1].toLowerCase(), module_id: null, symbol, source_file: null, source_line: null, inline: false });
	}
	const binaryName = options.binaryName ?? path.basename(options.binaryPath ?? 'sanitizer-target');
	const modules: ParsedModule[] = [{ id: 'main', name: binaryName, path: null, base: null, end: null, identity: UNKNOWN_IDENTITY }];
	const crashedThreadId = 'sanitizer';
	const evidence = baseEvidence(bytes, options, 'sanitizer_report', 'other', 'other', modules, [{ id: crashedThreadId, crashed: true, name: null, stack_status: frames.length > 0 ? 'partial' : 'unavailable', frames }], crashedThreadId, {
		kind: 'sanitizer', code: detector, fault_address: fault, instruction_address: frames[0]?.instruction_address ?? fault, description: summary,
	}, { kind, error_class: errorClass, summary, access_type: access?.[1]?.toLowerCase() ?? null, access_size: access ? Number(access[2]) : null, fault_address: fault }, pathsRedacted ? ['sanitizer.summary', 'threads[*].frames[*].symbol'] : []);
	return { evidence, warnings: [
		...(options.binaryBytes ? [] : ['Binary identity was not supplied; attribution remains incomplete.']),
		...(pathsRedacted ? ['Absolute paths were removed from portable sanitizer evidence.'] : []),
		...(framesTruncated ? ['Sanitizer frames were truncated at the bounded 2048-frame limit.'] : []),
	] };
}

export function collectNativeCrashEvidence(bytes: Uint8Array, options: NativeCrashCollectorOptions): NativeCrashCollectionResult {
	if (bytes.byteLength === 0) throw new Error('Crash artifact is empty');
	if (options.adapter === 'windows-minidump') return collectMinidump(bytes, options);
	if (options.adapter === 'linux-core') return collectElfCore(bytes, options);
	return collectSanitizer(bytes, options);
}
