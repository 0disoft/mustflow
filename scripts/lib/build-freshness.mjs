import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const defaultDistCliRelativePath = 'dist/cli/index.js';
export const defaultBuildFingerprintRelativePath = 'dist/.mustflow-build-fingerprint.json';

export const defaultUnsafeBuildInputRules = [
	/^src\//u,
	/^tsconfig(?:\..*)?\.json$/u,
	/^package\.json$/u,
	/^bun\.lock$/u,
];

export function compiledOutputPathForSource(repoRoot, relativePath) {
	if (!relativePath.startsWith('src/') || !relativePath.endsWith('.ts')) {
		return undefined;
	}
	return path.join(repoRoot, ...relativePath.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js').split('/'));
}

function collectSourceFiles(root, relativePath, output) {
	const directory = path.join(root, ...relativePath.split('/'));
	if (!existsSync(directory)) {
		return;
	}

	for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
		const childRelativePath = `${relativePath}/${entry.name}`;
		if (entry.isDirectory()) {
			collectSourceFiles(root, childRelativePath, output);
		} else if (entry.isFile() && entry.name.endsWith('.ts')) {
			output.push(childRelativePath);
		}
	}
}

export function listBuildFingerprintInputs(repoRoot) {
	const inputs = [];
	collectSourceFiles(repoRoot, 'src', inputs);
	for (const fileName of readdirSync(repoRoot).sort((left, right) => left.localeCompare(right))) {
		if (/^tsconfig(?:\..*)?\.json$/u.test(fileName) || fileName === 'package.json' || fileName === 'bun.lock') {
			inputs.push(fileName);
		}
	}
	return [...new Set(inputs)].sort((left, right) => left.localeCompare(right));
}

export function computeBuildFingerprint(repoRoot) {
	const inputs = listBuildFingerprintInputs(repoRoot);
	const hash = createHash('sha256');
	for (const relativePath of inputs) {
		hash.update(relativePath);
		hash.update('\0');
		hash.update(readFileSync(path.join(repoRoot, ...relativePath.split('/'))));
		hash.update('\0');
	}
	return {
		fingerprint: `sha256:${hash.digest('hex')}`,
		inputs,
	};
}

export function writeBuildFingerprintManifest(repoRoot, options = {}) {
	const manifestPath = options.manifestPath ?? path.join(repoRoot, ...defaultBuildFingerprintRelativePath.split('/'));
	const current = computeBuildFingerprint(repoRoot);
	const manifest = {
		schema_version: '1',
		kind: 'mustflow_build_fingerprint',
		fingerprint: current.fingerprint,
		input_count: current.inputs.length,
		inputs: current.inputs,
		node_version: process.version,
	};
	mkdirSync(path.dirname(manifestPath), { recursive: true });
	const temporaryPath = `${manifestPath}.tmp-${process.pid}`;
	writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
	renameSync(temporaryPath, manifestPath);
	return manifest;
}

function readBuildFingerprintManifest(manifestPath) {
	try {
		const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
		return parsed?.schema_version === '1' && typeof parsed.fingerprint === 'string' ? parsed : undefined;
	} catch {
		return undefined;
	}
}

export function buildFreshnessReport(repoRoot, changedFiles, options = {}) {
	const distCliPath = options.distCliPath ?? path.join(repoRoot, ...defaultDistCliRelativePath.split('/'));
	const manifestPath = options.manifestPath ?? path.join(repoRoot, ...defaultBuildFingerprintRelativePath.split('/'));
	const unsafeRules = options.unsafeRules ?? defaultUnsafeBuildInputRules;
	const unsafeFiles = changedFiles.filter((file) => unsafeRules.some((rule) => rule.test(file)));

	if (!existsSync(distCliPath)) {
		return { fresh: false, reason: 'missing_dist', distCliPath, manifestPath, unsafeFiles, staleFiles: [] };
	}

	const manifest = readBuildFingerprintManifest(manifestPath);
	if (!manifest) {
		return { fresh: false, reason: 'missing_fingerprint', distCliPath, manifestPath, unsafeFiles, staleFiles: unsafeFiles };
	}

	const current = computeBuildFingerprint(repoRoot);
	const deletedStaleFiles = unsafeFiles.filter((relativePath) => {
		const sourcePath = path.join(repoRoot, ...relativePath.split('/'));
		const compiledPath = compiledOutputPathForSource(repoRoot, relativePath);
		return !existsSync(sourcePath) && compiledPath !== undefined && existsSync(compiledPath);
	});
	const fresh = current.fingerprint === manifest.fingerprint && deletedStaleFiles.length === 0;
	return {
		fresh,
		reason: fresh ? 'fresh' : 'fingerprint_mismatch',
		distCliPath,
		manifestPath,
		unsafeFiles,
		staleFiles: fresh ? [] : deletedStaleFiles.length > 0 ? deletedStaleFiles : unsafeFiles.length > 0 ? unsafeFiles : current.inputs,
		fingerprint: current.fingerprint,
		recordedFingerprint: manifest.fingerprint,
	};
}
