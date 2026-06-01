import path from 'node:path';

import { DEFAULT_DATABASE_RELATIVE_PATH } from './constants.js';

export function getLocalIndexDatabasePath(projectRoot: string): string {
	return path.join(projectRoot, ...DEFAULT_DATABASE_RELATIVE_PATH.split('/'));
}
