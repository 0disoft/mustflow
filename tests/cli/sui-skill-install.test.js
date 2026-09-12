import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCliInProcess } from './helpers/cli-harness.js';
import { resolveSkillRoutes } from '../../dist/core/skill-route-resolution.js';

const names = ["sui-wallet-signing-review","sui-ptb-composition-review","sui-gas-concurrency-review","sui-execution-recovery-review","sui-data-access-review","sui-rpc-resilience-review","sui-sdk-migration-review"];

const moveNames = ["sui-move-resource-review","sui-move-object-design","sui-move-module-design","sui-move-authorization-review","sui-move-upgrade-review","sui-move-adversarial-testing","sui-move-storage-optimization","move-chain-selection"];

test('Sui SDK and Move procedures install and route in library but stay out of minimal', async () => {
	for (const profile of ['minimal', 'library']) {
		const root = mkdtempSync(path.join(tmpdir(), 'mustflow-sui-install-'));
		try {
			const result = await runCliInProcess(root, ['init', '--yes', '--profile', profile]);
			assert.equal(result.status, 0, result.stderr);
			const catalog = JSON.parse(readFileSync(path.join(root, '.mustflow/skills/catalog.v2.json'), 'utf8'));
			for (const name of [...names, ...moveNames]) {
				assert.equal(existsSync(path.join(root, '.mustflow/skills', name, 'SKILL.md')), profile === 'library', name);
				assert.equal(catalog.entries.some(entry => entry.skill === name), profile === 'library', name);
			}
			const report = resolveSkillRoutes(root, {
				taskText: 'Sui 지갑 서명에서 로그인 챌린지 재사용과 가스 후원자의 자산 사용을 검토해줘.',
				paths: ['src/sui/wallet.ts'], reasons: ['code_change'], maxCandidates: 5,
			});
			assert.equal(report.candidates.some(candidate => candidate.skill === 'sui-wallet-signing-review'), profile === 'library');
			const moveReport = resolveSkillRoutes(root, {
				taskText: 'Sui Move 권한 증서의 대상 연결과 보상 재사용을 검토해줘',
				paths: ['contracts/sources/vault.move'], reasons: ['code_change'], maxCandidates: 5,
			});
			assert.equal(moveReport.candidates.some(candidate => candidate.skill === 'sui-move-authorization-review'), profile === 'library');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}
});
