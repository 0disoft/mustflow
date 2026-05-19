import { getDashboardLocaleBundle } from '../dashboard-locale.js';
import { safeJsonForInlineScript } from '../html-json.js';

export interface DashboardLocaleBootstrap {
	readonly serializedLocaleBundle: string;
	readonly serializedAvailableLocales: string;
}

export function createDashboardLocaleBootstrap(): DashboardLocaleBootstrap {
	const localeBundle = getDashboardLocaleBundle();

	return {
		serializedLocaleBundle: safeJsonForInlineScript(localeBundle),
		serializedAvailableLocales: safeJsonForInlineScript(localeBundle.locales),
	};
}
