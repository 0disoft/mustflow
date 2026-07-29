import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { NativeCrashExternalValidationLane } from '../src/core/native-crash-fixture-external-validation.ts';
import {
	buildNativeCrashExternalValidationReport,
	classifyFormatRecognitionProbe,
	classifySemanticStructureProbe,
	nativeCrashExternalValidationExitCode,
	skippedExternalValidationLane,
} from '../src/core/native-crash-fixture-external-validation.ts';
import {
	buildRealisticElf32CoreFixture,
	buildRealisticElf64CoreFixture,
	buildRealisticMinidumpFixture,
} from '../tests/cli/helpers/native-crash-fixtures.js';

const FILE_EXPECTATIONS = [
	{
		fixture: 'windows-minidump' as const,
		bytes: buildRealisticMinidumpFixture(),
		expected: 'Mini DuMP crash report, 4 streams, Fri Jan 12 04:11:44 2024, 0 type',
	},
	{
		fixture: 'elf64-core' as const,
		bytes: buildRealisticElf64CoreFixture(),
		expected: 'ELF 64-bit LSB core file, x86-64, version 1 (SYSV), SVR4-style',
	},
	{
		fixture: 'elf32-core' as const,
		bytes: buildRealisticElf32CoreFixture(),
		expected: 'ELF 32-bit LSB core file, Intel i386, version 1 (SYSV)',
	},
];

const SEMANTIC_EXPECTATIONS = [
	{
		fixture: 'windows-minidump' as const,
		mode: 'minidump',
		bytes: buildRealisticMinidumpFixture(),
		expected: {
			format: 'minidump',
			stream_count: 4,
			processor_architecture: 9,
			module_count: 1,
			thread_ids: [7, 11],
			exception_thread_id: 7,
			exception_code: 3221225477,
			exception_address: '0x140001234',
			exception_parameter_count: 2,
			access_kind: 0,
			fault_address: '0xdeadbeef',
		},
	},
	{
		fixture: 'elf64-core' as const,
		mode: 'elf',
		bytes: buildRealisticElf64CoreFixture(),
		expected: {
			format: 'elf-core',
			class_bits: 64,
			little_endian: true,
			elf_type: 4,
			machine: 62,
			program_header_count: 2,
			load_segment_count: 1,
			executable_load_segment_count: 1,
			note_segment_count: 1,
			note_types: [1, 1397311305, 1179208773],
		},
	},
	{
		fixture: 'elf32-core' as const,
		mode: 'elf',
		bytes: buildRealisticElf32CoreFixture(),
		expected: {
			format: 'elf-core',
			class_bits: 32,
			little_endian: true,
			elf_type: 4,
			machine: 3,
			program_header_count: 1,
			load_segment_count: 1,
			executable_load_segment_count: 1,
			note_segment_count: 0,
			note_types: [],
		},
	},
];

function findTool(names: string[]): string | null {
	for (const name of names) {
		const resolved = Bun.which(name);
		if (resolved) return resolved;
	}
	return null;
}

function findFileTool(): string | null {
	const fromPath = findTool(['file']);
	if (fromPath) return fromPath;
	if (process.platform !== 'win32') return null;
	for (const programFiles of [
		process.env.ProgramFiles,
		process.env['ProgramFiles(x86)'],
		'C:\\Program Files',
		'C:\\Program Files (x86)',
	]) {
		if (!programFiles) continue;
		const candidate = join(programFiles, 'Git', 'usr', 'bin', 'file.exe');
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

function findSemanticParser(): string | null {
	const executable = process.platform === 'win32'
		? 'mustflow-native-crash-fixture-parser.exe'
		: 'mustflow-native-crash-fixture-parser';
	const candidate = join(
		process.cwd(),
		'tools',
		'native-crash-fixture-parser',
		'target',
		'debug',
		executable,
	);
	return existsSync(candidate) ? candidate : null;
}

const lanes: NativeCrashExternalValidationLane[] = [];
const filePath = findFileTool();
if (filePath) {
	for (const fixture of FILE_EXPECTATIONS) {
		const result = Bun.spawnSync({
			cmd: [filePath, '--brief', '-'],
			stdin: fixture.bytes,
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const stdout = result.stdout.toString('utf8');
		const stderr = result.stderr.toString('utf8').trim();
		lanes.push(classifyFormatRecognitionProbe({
			fixture: fixture.fixture,
			tool: 'file',
			toolPath: filePath,
			expected: fixture.expected,
			observed: stderr.length > 0 && result.exitCode !== 0 ? stderr : stdout,
			exitCode: result.exitCode,
		}));
	}
} else {
	for (const fixture of FILE_EXPECTATIONS) {
		lanes.push(skippedExternalValidationLane(fixture.fixture, 'format-recognition', 'file_not_installed'));
	}
}

const semanticParserPath = findSemanticParser();
if (semanticParserPath) {
	for (const fixture of SEMANTIC_EXPECTATIONS) {
		const result = Bun.spawnSync({
			cmd: [semanticParserPath, fixture.mode],
			stdin: fixture.bytes,
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const stdout = result.stdout.toString('utf8');
		const stderr = result.stderr.toString('utf8').trim();
		lanes.push(classifySemanticStructureProbe({
			fixture: fixture.fixture,
			tool: 'rust-minidump+goblin',
			toolPath: relative(process.cwd(), semanticParserPath).replaceAll('\\', '/'),
			expected: fixture.expected,
			observed: stderr.length > 0 && result.exitCode !== 0 ? stderr : stdout,
			exitCode: result.exitCode,
		}));
	}
} else {
	for (const fixture of SEMANTIC_EXPECTATIONS) {
		lanes.push(skippedExternalValidationLane(
			fixture.fixture,
			'semantic-structure',
			'semantic_parser_not_built',
		));
	}
}

const report = buildNativeCrashExternalValidationReport(lanes);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = nativeCrashExternalValidationExitCode(report);
