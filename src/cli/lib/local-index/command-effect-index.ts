import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readCommandContract, readString } from '../command-contract.js';
import { normalizeCommandEffects } from '../../../core/command-effects.js';
import type { IndexCommandIntent } from './types.js';

export function collectCommandIntents(projectRoot: string): IndexCommandIntent[] {
	if (!existsSync(path.join(projectRoot, '.mustflow', 'config', 'commands.toml'))) {
		return [];
	}

	const contract = readCommandContract(projectRoot);
	const intents: IndexCommandIntent[] = [];

	for (const [name, intent] of Object.entries(contract.intents).sort(([left], [right]) => left.localeCompare(right))) {
		if (!isRecord(intent)) {
			continue;
		}

		intents.push({
			name,
			status: readString(intent, 'status') ?? 'unknown',
			lifecycle: readString(intent, 'lifecycle') ?? null,
			runPolicy: readString(intent, 'run_policy') ?? null,
			description: readString(intent, 'description') ?? null,
			effects: normalizeCommandEffects(projectRoot, contract, name),
		});
	}

	return intents;
}
