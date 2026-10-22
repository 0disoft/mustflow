import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUniqueSymbolCandidateLookup } from '../../dist/core/source-anchor-candidates.js';
import { createVerificationDecisionGraph } from '../../dist/core/verification-decision-graph.js';

function snapshot(id, signatureHash, bodyHash, name = 'target', kind = 'function') {
	return { id, fingerprint: { symbol: { kind, name, signatureHash, bodyHash } } };
}

test('indexed symbol lookup preserves missing-hash wildcards and ambiguous matches', () => {
	const hashes = [null, '', 'one', 'two'];
	const variants = hashes.flatMap((signature) => hashes.map((body) => snapshot(`${signature}:${body}`, signature, body)));
	for (const previous of [...variants, snapshot('unknown', null, null, 'target', 'unknown'), snapshot('unnamed', null, null, null)]) {
		for (const records of [[], ...variants.map((variant) => [variant]), ...variants.map((variant) => [variant, variant]), variants]) {
			const symbol = previous.fingerprint.symbol;
			const matches = records.filter(({ fingerprint: { symbol: current } }) =>
				current.kind === symbol.kind && current.name !== null && current.name === symbol.name &&
				!(current.signatureHash && symbol.signatureHash && current.signatureHash !== symbol.signatureHash) &&
				!(current.bodyHash && symbol.bodyHash && current.bodyHash !== symbol.bodyHash));
			const expected = symbol.kind !== 'unknown' && symbol.name !== null && matches.length === 1 ? matches[0] : null;
			assert.equal(createUniqueSymbolCandidateLookup(records)(previous), expected);
		}
	}
});

test('decision graph keeps distinct candidates, deduplicates edges and preserves final sorting', () => {
	const requirement = { reason: 'source', surfaces: ['source', 'source'], files: [], affectedContracts: [], driftChecks: [], updatePolicies: [], source: 'change_classification' };
	const candidates = ['check', 'other', 'check'].map((intent) => ({ reason: 'source', intent, status: 'runnable', skipReason: null, detail: null }));
	const entries = ['check', 'other'].map((intent) => ({ intent, effects: [{ lock: 'shared' }] }));
	const graph = createVerificationDecisionGraph({ intents: {} }, [requirement, requirement], candidates, [], { entries: [...entries, entries[0]] });
	assert.equal(graph.nodes.filter((node) => node.kind === 'command_candidate').length, 3);
	assert.equal(graph.edges.filter((edge) => edge.kind === 'supports').length, 1);
	assert.equal(graph.edges.filter((edge) => edge.kind === 'has_effect').length, 3);
	assert.equal(graph.edges.length, new Set(graph.edges.map((edge) => JSON.stringify([edge.from, edge.to, edge.kind]))).size);
	assert.deepEqual(graph.edges, [...graph.edges].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind)));
	for (const edge of graph.edges.filter((edge) => edge.kind === 'has_effect')) {
		const candidate = graph.nodes.find((node) => node.id === edge.from);
		const effect = graph.nodes.find((node) => node.id === edge.to);
		assert.equal(candidate.intent, effect.intent);
	}
});
