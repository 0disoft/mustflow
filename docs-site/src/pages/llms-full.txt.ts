import { buildLlmsFullText, createTextResponse } from '../lib/machine-readable.mjs';

export function GET() {
	return createTextResponse(buildLlmsFullText());
}
