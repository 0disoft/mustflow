import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProcessStartTokenCache } from '../../dist/core/process-start-token-cache.js';

for (const age of [999, 1000, 1001]) {
	test(`PID reuse refreshes a mismatched cached token at ${age}ms`, () => {
		let now = 0;
		let token = 'token-A';
		let reads = 0;
		const cache = new ProcessStartTokenCache(() => { reads++; return token; }, () => now);
		assert.equal(cache.readForOwner(123, 'token-A'), 'token-A');
		now = age;
		token = 'token-B';
		assert.equal(cache.readForOwner(123, 'token-B'), 'token-B');
		assert.equal(reads, 2);
	});
	test(`matching process token cache expires after ${age}ms`, () => {
		let now = 0;
		let reads = 0;
		const cache = new ProcessStartTokenCache(() => { reads++; return 'token-A'; }, () => now);
		cache.readForOwner(123, 'token-A');
		now = age;
		cache.readForOwner(123, 'token-A');
		assert.equal(reads, age > 1000 ? 2 : 1);
	});
}

test('a failed fresh observation cannot prove that a reused PID is stale', () => {
	let token = 'token-A';
	const cache = new ProcessStartTokenCache(() => token, () => 0);
	cache.readForOwner(123, 'token-A');
	token = null;
	assert.equal(cache.readForOwner(123, 'token-B'), null);
});
