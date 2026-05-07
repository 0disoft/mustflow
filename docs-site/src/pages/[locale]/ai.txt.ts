import { routedLanguageCodes } from '../../config/locales.mjs';
import { buildAiText, createTextResponse } from '../../lib/machine-readable.mjs';

export function getStaticPaths() {
	return routedLanguageCodes.map((locale) => ({ params: { locale } }));
}

export function GET() {
	return createTextResponse(buildAiText());
}
