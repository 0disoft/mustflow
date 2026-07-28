import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeSkillRouteCatalogs } from '../src/core/skill-route-resolution.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writtenPaths = writeSkillRouteCatalogs(projectRoot);

for (const relativePath of writtenPaths) {
	console.log(`Wrote: ${relativePath}`);
}
