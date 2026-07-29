import { createHash } from 'node:crypto';

function align4(value) {
	return (value + 3) & ~3;
}

function minidumpString(value) {
	const encoded = Buffer.from(value, 'utf16le');
	const result = Buffer.alloc(4 + encoded.length);
	result.writeUInt32LE(encoded.length, 0);
	encoded.copy(result, 4);
	return result;
}

// Original MIT-0 fixture bytes derived from the public MINIDUMP structure definitions.
export function buildRealisticMinidumpFixture() {
	const headerSize = 32;
	const streamCount = 4;
	const directoryRva = headerSize;
	const directorySize = streamCount * 12;
	const systemRva = directoryRva + directorySize;
	const systemSize = 56;
	const moduleRva = systemRva + systemSize;
	const moduleSize = 4 + 108;
	const exceptionRva = moduleRva + moduleSize;
	const exceptionSize = 168;
	const threadsRva = exceptionRva + exceptionSize;
	const threadsSize = 4 + 2 * 48;
	const moduleName = minidumpString('C:\\fixture\\mustflow-fixture.exe');
	const moduleNameRva = threadsRva + threadsSize;
	const codeViewRva = align4(moduleNameRva + moduleName.length);
	const pdbName = Buffer.from('mustflow-fixture.pdb\0', 'utf8');
	const codeViewSize = 24 + pdbName.length;
	const bytes = Buffer.alloc(align4(codeViewRva + codeViewSize));

	bytes.write('MDMP', 0, 'ascii');
	bytes.writeUInt32LE(0x0000a793, 4);
	bytes.writeUInt32LE(streamCount, 8);
	bytes.writeUInt32LE(directoryRva, 12);
	bytes.writeUInt32LE(0, 16);
	bytes.writeUInt32LE(0x65a0bc00, 20);
	bytes.writeBigUInt64LE(0n, 24);

	const directories = [
		[7, systemSize, systemRva],
		[4, moduleSize, moduleRva],
		[6, exceptionSize, exceptionRva],
		[3, threadsSize, threadsRva],
	];
	for (const [index, [type, size, rva]] of directories.entries()) {
		const offset = directoryRva + index * 12;
		bytes.writeUInt32LE(type, offset);
		bytes.writeUInt32LE(size, offset + 4);
		bytes.writeUInt32LE(rva, offset + 8);
	}

	bytes.writeUInt16LE(9, systemRva); // PROCESSOR_ARCHITECTURE_AMD64
	bytes.writeUInt16LE(6, systemRva + 8);
	bytes.writeUInt16LE(1, systemRva + 10);
	bytes.writeUInt32LE(7601, systemRva + 12);

	bytes.writeUInt32LE(1, moduleRva);
	const module = moduleRva + 4;
	bytes.writeBigUInt64LE(0x140000000n, module);
	bytes.writeUInt32LE(0x10000, module + 8);
	bytes.writeUInt32LE(moduleNameRva, module + 20);
	bytes.writeUInt32LE(codeViewSize, module + 76);
	bytes.writeUInt32LE(codeViewRva, module + 80);

	bytes.writeUInt32LE(7, exceptionRva);
	bytes.writeUInt32LE(0xc0000005, exceptionRva + 8);
	bytes.writeBigUInt64LE(0x140001234n, exceptionRva + 24);
	bytes.writeUInt32LE(2, exceptionRva + 32);
	bytes.writeBigUInt64LE(0n, exceptionRva + 40); // read
	bytes.writeBigUInt64LE(0xdeadbeefn, exceptionRva + 48);

	bytes.writeUInt32LE(2, threadsRva);
	bytes.writeUInt32LE(7, threadsRva + 4);
	bytes.writeUInt32LE(11, threadsRva + 4 + 48);

	moduleName.copy(bytes, moduleNameRva);
	bytes.write('RSDS', codeViewRva, 'ascii');
	bytes.writeUInt32LE(0x11223344, codeViewRva + 4);
	bytes.writeUInt16LE(0x5566, codeViewRva + 8);
	bytes.writeUInt16LE(0x7788, codeViewRva + 10);
	Buffer.from('99aabbccddeeff00', 'hex').copy(bytes, codeViewRva + 12);
	bytes.writeUInt32LE(3, codeViewRva + 20);
	pdbName.copy(bytes, codeViewRva + 24);
	return bytes;
}

function elfNote(type, descriptor) {
	const name = Buffer.from('CORE\0', 'ascii');
	const result = Buffer.alloc(12 + align4(name.length) + align4(descriptor.length));
	result.writeUInt32LE(name.length, 0);
	result.writeUInt32LE(descriptor.length, 4);
	result.writeUInt32LE(type, 8);
	name.copy(result, 12);
	descriptor.copy(result, 12 + align4(name.length));
	return result;
}

export function buildRealisticElf64CoreFixture() {
	const prstatus = Buffer.alloc(144);
	prstatus.writeUInt32LE(11, 12); // SIGSEGV
	prstatus.writeUInt32LE(4242, 32);
	const siginfo = Buffer.alloc(128);
	siginfo.writeInt32LE(11, 0);
	siginfo.writeInt32LE(1, 8); // SEGV_MAPERR
	siginfo.writeBigUInt64LE(0xdeadbeefn, 16);
	const fileName = Buffer.from('/fixture/mustflow-fixture\0', 'utf8');
	const ntFile = Buffer.alloc(16 + 24 + fileName.length);
	ntFile.writeBigUInt64LE(1n, 0);
	ntFile.writeBigUInt64LE(4096n, 8);
	ntFile.writeBigUInt64LE(0x400000n, 16);
	ntFile.writeBigUInt64LE(0x401000n, 24);
	ntFile.writeBigUInt64LE(0n, 32);
	fileName.copy(ntFile, 40);
	const notes = Buffer.concat([
		elfNote(1, prstatus),
		elfNote(0x53494749, siginfo),
		elfNote(0x46494c45, ntFile),
	]);
	const phoff = 64;
	const phentsize = 56;
	const noteOffset = phoff + 2 * phentsize;
	const bytes = Buffer.alloc(noteOffset + notes.length);
	bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0);
	bytes.writeUInt16LE(4, 16);
	bytes.writeUInt16LE(62, 18);
	bytes.writeUInt32LE(1, 20);
	bytes.writeBigUInt64LE(BigInt(phoff), 32);
	bytes.writeUInt16LE(64, 52);
	bytes.writeUInt16LE(phentsize, 54);
	bytes.writeUInt16LE(2, 56);

	bytes.writeUInt32LE(4, phoff); // PT_NOTE
	bytes.writeBigUInt64LE(BigInt(noteOffset), phoff + 8);
	bytes.writeBigUInt64LE(BigInt(notes.length), phoff + 32);
	bytes.writeBigUInt64LE(BigInt(notes.length), phoff + 40);
	bytes.writeBigUInt64LE(4n, phoff + 48);
	const load = phoff + phentsize;
	bytes.writeUInt32LE(1, load);
	bytes.writeUInt32LE(5, load + 4);
	bytes.writeBigUInt64LE(0x400000n, load + 16);
	bytes.writeBigUInt64LE(0x400000n, load + 24);
	bytes.writeBigUInt64LE(0n, load + 32);
	bytes.writeBigUInt64LE(0x1000n, load + 40);
	bytes.writeBigUInt64LE(0x1000n, load + 48);
	notes.copy(bytes, noteOffset);
	return bytes;
}

export function buildRealisticElf32CoreFixture() {
	const phoff = 52;
	const phentsize = 32;
	const bytes = Buffer.alloc(phoff + phentsize);
	bytes.set([0x7f, 0x45, 0x4c, 0x46, 1, 1, 1], 0);
	bytes.writeUInt16LE(4, 16);
	bytes.writeUInt16LE(3, 18);
	bytes.writeUInt32LE(1, 20);
	bytes.writeUInt32LE(phoff, 28);
	bytes.writeUInt16LE(52, 40);
	bytes.writeUInt16LE(phentsize, 42);
	bytes.writeUInt16LE(1, 44);
	bytes.writeUInt32LE(1, phoff);
	bytes.writeUInt32LE(0x8048000, phoff + 8);
	bytes.writeUInt32LE(0x8048000, phoff + 12);
	bytes.writeUInt32LE(0, phoff + 16);
	bytes.writeUInt32LE(0x1000, phoff + 20);
	bytes.writeUInt32LE(5, phoff + 24);
	bytes.writeUInt32LE(0x1000, phoff + 28);
	return bytes;
}

export const SANITIZER_CORPUS = Object.freeze({
	asan: '==1==ERROR: AddressSanitizer: heap-use-after-free on address 0XDEADBEEF\r\nREAD of size 4\r\n    #0 0X140001234 in crash C:\\Users\\fixture\\project\\crash.cc:42\r\nSUMMARY: AddressSanitizer: heap-use-after-free C:\\Users\\fixture\\project\\crash.cc:42 in crash\r\n',
	tsan: 'WARNING: ThreadSanitizer: data race\n    #0 0x401000 in write_value /fixture/project/race.cc:7\nSUMMARY: ThreadSanitizer: data race /fixture/project/race.cc:7 in write_value\n',
	msan: '\u001b[31mWARNING: MemorySanitizer: use-of-uninitialized-value\u001b[0m\n    #0 0x402000 in consume /fixture/project/memory.cc:9\nSUMMARY: MemorySanitizer: use-of-uninitialized-value /fixture/project/memory.cc:9\n',
	ubsan: '/fixture/project/math.cc:5:3: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type int\n    #0 0x403000 in add /fixture/project/math.cc:5\n',
	lsan: 'ERROR: LeakSanitizer: detected memory leaks\n    #0 0x404000 in allocate /fixture/project/leak.cc:11\nSUMMARY: LeakSanitizer: 64 byte(s) leaked in 1 allocation(s).\n',
});

export function sha256Hex(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}
