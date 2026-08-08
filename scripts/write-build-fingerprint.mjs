import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeBuildFingerprintManifest } from './lib/build-freshness.mjs';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
writeBuildFingerprintManifest(repoRoot);
