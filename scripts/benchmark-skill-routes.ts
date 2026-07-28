import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSkillRoutes } from '../src/core/skill-route-resolution.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(projectRoot, '.mustflow', 'skills', 'catalog.v2.json');
const routesPath = path.join(projectRoot, '.mustflow', 'skills', 'routes.toml');
const skillRoot = path.join(projectRoot, '.mustflow', 'skills');
const iterations = 100;
const input = {
	taskText: 'Change a TypeScript type contract and authorization permission boundary for public consumers',
	paths: ['src/core/public-types.ts'],
	reasons: ['public_api_change', 'security_change'],
	maxCandidates: 10,
} as const;

const skillDocumentBytes = readdirSync(skillRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => path.join(skillRoot, entry.name, 'SKILL.md'))
	.filter((skillPath) => {
		try {
			return statSync(skillPath).isFile();
		} catch {
			return false;
		}
	})
	.reduce((total, skillPath) => total + statSync(skillPath).size, 0);
const catalogBytes = statSync(catalogPath).size;
const routesBytes = statSync(routesPath).size;
const sourceBytes = skillDocumentBytes + routesBytes;
const firstStartedAt = performance.now();
const firstReport = resolveSkillRoutes(projectRoot, input);
const firstDuration = performance.now() - firstStartedAt;
const durations: number[] = [firstDuration];

for (let index = 1; index < iterations; index += 1) {
	const startedAt = performance.now();
	resolveSkillRoutes(projectRoot, input);
	durations.push(performance.now() - startedAt);
}
durations.sort((left, right) => left - right);

function percentile(values: readonly number[], fraction: number): number {
	const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1));
	return Number(values[index].toFixed(3));
}

const catalogRatio = Number((catalogBytes / sourceBytes).toFixed(6));
const report = {
	schema_version: '1',
	kind: 'skill_route_benchmark',
	iterations,
	latency_ms: {
		first: Number(firstDuration.toFixed(3)),
		p50: percentile(durations, 0.5),
		p95: percentile(durations, 0.95),
		max: Number(durations.at(-1)?.toFixed(3) ?? 0),
	},
	payload: {
		catalog_bytes: catalogBytes,
		routes_bytes: routesBytes,
		skill_document_bytes: skillDocumentBytes,
		canonical_source_bytes: sourceBytes,
		catalog_to_source_ratio: catalogRatio,
		payload_reduction_rate: Number((1 - catalogRatio).toFixed(6)),
	},
	normal_route_sources: firstReport.source_files,
	checks: {
		catalog_at_most_15_percent_of_sources: catalogRatio <= 0.15,
		normal_route_uses_catalog_only: firstReport.source_files.length === 1 &&
			firstReport.source_files[0] === '.mustflow/skills/catalog.v2.json',
	},
};

console.log(JSON.stringify(report, null, 2));
if (!Object.values(report.checks).every(Boolean)) {
	process.exitCode = 1;
}
