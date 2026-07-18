const ALLOWED_UNSTAGED_RELEASE_STATUS = new Set([
	' M .mustflow/review/docs.toml',
]);

export function findBlockingReleaseStatusEntries(porcelainStatus) {
	return porcelainStatus
		.split('\0')
		.filter(Boolean)
		.filter((entry) => !ALLOWED_UNSTAGED_RELEASE_STATUS.has(entry));
}

export function findAllowedReleaseStatusEntries(porcelainStatus) {
	return porcelainStatus
		.split('\0')
		.filter(Boolean)
		.filter((entry) => ALLOWED_UNSTAGED_RELEASE_STATUS.has(entry));
}
