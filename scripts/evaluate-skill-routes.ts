import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateSkillRouteFixtures } from '../src/core/skill-route-fixtures.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = evaluateSkillRouteFixtures(projectRoot);

console.log(JSON.stringify(report, null, 2));
if (report.issues.length > 0) {
	process.exitCode = 1;
}
