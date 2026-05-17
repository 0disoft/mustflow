import { getDashboardLocaleBundle } from '../dashboard-locale.js';

export interface DashboardLocaleBootstrap {
	readonly serializedLocaleBundle: string;
	readonly serializedAvailableLocales: string;
}

export function createDashboardLocaleBootstrap(): DashboardLocaleBootstrap {
	const localeBundle = getDashboardLocaleBundle();

	return {
		serializedLocaleBundle: JSON.stringify(localeBundle),
		serializedAvailableLocales: JSON.stringify(localeBundle.locales),
	};
}
