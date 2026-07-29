import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { NativeCrashExternalValidationLane } from '../src/core/native-crash-fixture-external-validation.ts';
import {
	buildNativeCrashExternalValidationReport,
	classifyFormatRecognitionProbe,
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

const minidumpSemanticTool = findTool(['dumpchk', 'cdb', 'windbg', 'WinDbgX']);
lanes.push(skippedExternalValidationLane(
	'windows-minidump',
	'semantic-structure',
	minidumpSemanticTool ? 'semantic_adapter_not_configured' : 'semantic_parser_not_installed',
));
const elfSemanticTool = findTool(['llvm-readobj', 'readelf', 'eu-readelf']);
for (const fixture of ['elf64-core', 'elf32-core'] as const) {
	lanes.push(skippedExternalValidationLane(
		fixture,
		'semantic-structure',
		elfSemanticTool ? 'semantic_adapter_not_configured' : 'semantic_parser_not_installed',
	));
}

const report = buildNativeCrashExternalValidationReport(lanes);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = nativeCrashExternalValidationExitCode(report);
