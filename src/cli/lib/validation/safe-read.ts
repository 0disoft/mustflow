import { toPosixPath } from '../filesystem.js';
import { readMustflowTextFileResult } from '../mustflow-read.js';
import { pushStrictIssue } from './primitives.js';
import type { CheckIssue } from './types.js';

export function readStrictMustflowText(
	projectRoot: string,
	relativePath: string,
	issues: CheckIssue[],
	options: { readonly maxBytes?: number } = {},
): string | undefined {
	const result = readMustflowTextFileResult(projectRoot, relativePath, options);
	if (result.ok) {
		return result.content;
	}

	if (result.exists && result.error) {
		pushStrictIssue(issues, `${toPosixPath(relativePath)} could not be read safely: ${result.error}`);
	}

	return undefined;
}
