import type { SourceAnchorSnapshot } from './source-anchor-status.js';

interface CandidateSummary {
	count: number;
	readonly first: SourceAnchorSnapshot;
}

function candidateKey(record: SourceAnchorSnapshot, signature: string | null | undefined, body: string | null | undefined): string {
	const symbol = record.fingerprint.symbol;
	// Empty selectors mean any hash; [null] means a missing hash only.
	return JSON.stringify([symbol.kind, symbol.name, signature === undefined ? [] : [signature], body === undefined ? [] : [body]]);
}

export function createUniqueSymbolCandidateLookup(
	records: readonly SourceAnchorSnapshot[],
): (previous: SourceAnchorSnapshot) => SourceAnchorSnapshot | null {
	const summaries = new Map<string, CandidateSummary>();
	for (const record of records) {
		const symbol = record.fingerprint.symbol;
		for (const signature of [undefined, symbol.signatureHash || null]) {
			for (const body of [undefined, symbol.bodyHash || null]) {
				const key = candidateKey(record, signature, body);
				const summary = summaries.get(key);
				if (summary) summary.count += 1;
				else summaries.set(key, { count: 1, first: record });
			}
		}
	}

	return (previous) => {
		const symbol = previous.fingerprint.symbol;
		if (symbol.kind === 'unknown' || symbol.name === null) return null;
		let count = 0;
		let candidate: SourceAnchorSnapshot | null = null;
		// Missing hashes are wildcards on either side of the original comparison.
		const signatures = symbol.signatureHash ? [symbol.signatureHash, null] : [undefined];
		const bodies = symbol.bodyHash ? [symbol.bodyHash, null] : [undefined];
		for (const signature of signatures) {
			for (const body of bodies) {
				const summary = summaries.get(candidateKey(previous, signature, body));
				if (!summary) continue;
				count += summary.count;
				if (count > 1) return null;
				candidate = summary.first;
			}
		}
		return candidate;
	};
}
