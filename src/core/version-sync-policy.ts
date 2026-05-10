export type VersionSyncIssueSeverity = 'error' | 'warning';
export type VersionSyncIssueCode =
	| 'template_version_ahead'
	| 'template_version_mismatch'
	| 'template_version_intentionally_unchanged';

export interface VersionSyncPolicyInput {
	readonly packageVersion: string | undefined;
	readonly templateVersion: string | undefined;
	readonly syncTemplateVersion: boolean;
	readonly changedPaths?: readonly string[];
}

export interface VersionSyncPolicyIssue {
	readonly severity: VersionSyncIssueSeverity;
	readonly code: VersionSyncIssueCode;
	readonly message: string;
}

export interface VersionSyncPolicyEvaluation {
	readonly issues: readonly VersionSyncPolicyIssue[];
	readonly installedTemplateSurfaceChanged: boolean | null;
}

export const INSTALLED_TEMPLATE_SURFACE_PATHS = [
	'templates/default/manifest.toml',
	'templates/default/i18n.toml',
	'templates/default/common/',
	'templates/default/locales/',
] as const;

function normalizePath(value: string): string {
	return value.replace(/\\/g, '/').replace(/^\.\//u, '');
}

function parseSemverCore(version: string): [number, number, number] | null {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u.exec(version.trim());

	if (!match) {
		return null;
	}

	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(left: string, right: string): number | null {
	const leftVersion = parseSemverCore(left);
	const rightVersion = parseSemverCore(right);

	if (!leftVersion || !rightVersion) {
		return null;
	}

	for (let index = 0; index < leftVersion.length; index += 1) {
		const difference = leftVersion[index] - rightVersion[index];

		if (difference !== 0) {
			return difference;
		}
	}

	return 0;
}

export function pathTouchesInstalledTemplateSurface(path: string): boolean {
	const normalized = normalizePath(path);

	return INSTALLED_TEMPLATE_SURFACE_PATHS.some((surfacePath) =>
		surfacePath.endsWith('/') ? normalized.startsWith(surfacePath) : normalized === surfacePath,
	);
}

function installedTemplateSurfaceChanged(changedPaths: readonly string[] | undefined): boolean | null {
	if (!changedPaths) {
		return null;
	}

	return changedPaths.some(pathTouchesInstalledTemplateSurface);
}

export function evaluateVersionSync(input: VersionSyncPolicyInput): VersionSyncPolicyEvaluation {
	const { packageVersion, templateVersion, syncTemplateVersion } = input;
	const surfaceChanged = installedTemplateSurfaceChanged(input.changedPaths);

	if (!packageVersion || !templateVersion || packageVersion === templateVersion) {
		return {
			issues: [],
			installedTemplateSurfaceChanged: surfaceChanged,
		};
	}

	const comparison = compareSemver(templateVersion, packageVersion);

	if (comparison !== null && comparison > 0) {
		return {
			issues: [
				{
					severity: 'error',
					code: 'template_version_ahead',
					message: `templates/default/manifest.toml version "${templateVersion}" must not be ahead of package.json version "${packageVersion}"`,
				},
			],
			installedTemplateSurfaceChanged: surfaceChanged,
		};
	}

	if (syncTemplateVersion && surfaceChanged !== false) {
		return {
			issues: [
				{
					severity: 'error',
					code: 'template_version_mismatch',
					message: `templates/default/manifest.toml version "${templateVersion}" must match package.json version "${packageVersion}" when [release.versioning].sync_template_version is true`,
				},
			],
			installedTemplateSurfaceChanged: surfaceChanged,
		};
	}

	return {
		issues: [
			{
				severity: 'warning',
				code: 'template_version_intentionally_unchanged',
				message: `templates/default/manifest.toml version "${templateVersion}" is older than package.json version "${packageVersion}"; this is allowed only when the installed template surface is unchanged`,
			},
		],
		installedTemplateSurfaceChanged: surfaceChanged,
	};
}
