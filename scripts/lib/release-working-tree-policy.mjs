export function evaluateReleaseWorkingTree(porcelainStatus) {
	if (typeof porcelainStatus !== 'string') {
		throw new TypeError('Git porcelain status must be a string.');
	}

	return {
		hasChanges: porcelainStatus.length > 0,
		releaseSource: 'committed-head',
	};
}
