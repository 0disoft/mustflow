import { buildRobotsText, createTextResponse } from '../lib/machine-readable.mjs';

export function GET() {
	return createTextResponse(buildRobotsText());
}
