import { parseTomlText, readTomlFile, stringifyToml } from '../../core/toml.js';

import { MUSTFLOW_TOML_MAX_BYTES, readMustflowTextFile } from './mustflow-read.js';

export { parseTomlText, readTomlFile, stringifyToml };

export function readMustflowTomlFile(projectRoot: string, relativePath: string): unknown {
	return parseTomlText(readMustflowTextFile(projectRoot, relativePath, { maxBytes: MUSTFLOW_TOML_MAX_BYTES }));
}
