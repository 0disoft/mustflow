import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

export const defaultDistCliRelativePath = 'dist/cli/index.js';

export const defaultUnsafeBuildInputRules = [
	/^src\//u,
	/^tsconfig(?:\..*)?\.json$/u,
];

export function compiledOutputPathForSource(repoRoot, relativePath) {
	if (!relativePath.startsWith('src/') || !relativePath.endsWith('.ts')) {
		return undefined;
	}

	return path.join(repoRoot, ...relativePath.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js').split('/'));
}

export function buildFreshnessReport(repoRoot, changedFiles, options = {}) {
	const distCliPath = options.distCliPath ?? path.join(repoRoot, ...defaultDistCliRelativePath.split('/'));
	const unsafeRules = options.unsafeRules ?? defaultUnsafeBuildInputRules;
	const unsafeFiles = changedFiles.filter((file) => unsafeRules.some((rule) => rule.test(file)));

	if (!existsSync(distCliPath)) {
		return {
			fresh: false,
			reason: 'missing_dist',
			distCliPath,
			unsafeFiles,
			staleFiles: [],
		};
	}

	const distMtimeMs = statSync(distCliPath).mtimeMs;
	const staleFiles = unsafeFiles.filter((file) => {
		const fullPath = path.join(repoRoot, ...file.split('/'));
		if (!existsSync(fullPath)) {
			const compiledOutputPath = compiledOutputPathForSource(repoRoot, file);
			return !compiledOutputPath || existsSync(compiledOutputPath);
		}

		return statSync(fullPath).mtimeMs > distMtimeMs;
	});

	return {
		fresh: staleFiles.length === 0,
		reason: staleFiles.length === 0 ? 'fresh' : 'stale_inputs',
		distCliPath,
		unsafeFiles,
		staleFiles,
		distMtimeMs,
	};
}
