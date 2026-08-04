import assert from 'node:assert/strict';
import test from 'node:test';

import { assertI18nSkillDocument, assertSkillsIndexRevision, readText } from './helpers/skill-contracts.js';

test('crash consistency recovery keeps durable publication and restart evidence template-synced', () => {
	const skillName = 'crash-consistency-recovery-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Define safety and liveness separately/u);
	assert.match(localSkill, /complete previous generation or a\s+complete new generation/u);
	assert.match(localSkill, /function return, memory mutation, buffered write/u);
	assert.match(localSkill, /Record intent before non-transactional mutation/u);
	assert.match(localSkill, /same-directory temporary file on the same volume/u);
	assert.match(localSkill, /parent-directory persistence/u);
	assert.match(localSkill, /Publish related files as one generation/u);
	assert.match(localSkill, /fencing token/u);
	assert.match(localSkill, /Make startup recovery a first-class phase/u);
	assert.match(localSkill, /Resume from authoritative server state/u);
	assert.match(localSkill, /Pin the download source\s+version/u);
	assert.match(localSkill, /Make finalize idempotent/u);
	assert.match(localSkill, /multipart\s+provider ETags as universal content hashes/u);
	assert.match(localSkill, /Crash recovery itself repeatedly/u);
	assert.match(localSkill, /independent oracle/u);
	assert.match(localSkill, /A restarted process or green health endpoint\s+is not a recovery proof/u);
	assert.match(skillIndex, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(skillIndex, /remaining crash-consistency risk/u);
	assert.match(
		routes,
		/\[routes\."crash-consistency-recovery-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "adjunct"\r?\npriority = 82/u,
	);
	assert.doesNotMatch(routes, /multi_participant_workflow/u);
	assert.match(routes, /independent_commit_split/u);
	assert.match(routes, /malicious_file_surface/u);
	assert.match(manifest, /"\.mustflow\/skills\/crash-consistency-recovery-review\/SKILL\.md"/u);
	for (const profile of ['oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"crash-consistency-recovery-review"/u);
	}
	for (const profile of ['minimal', 'patterns']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.doesNotMatch(profileMatch[1], /"crash-consistency-recovery-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('neighbor skills keep crash durability, workflow, security, and false-success ownership distinct', () => {
	const filesystem = readText('.mustflow/skills/cross-platform-filesystem-safety/SKILL.md');
	const uploadSecurity = readText('.mustflow/skills/file-upload-security-review/SKILL.md');
	const workflow = readText('.mustflow/skills/durable-workflow-orchestration/SKILL.md');
	const failure = readText('.mustflow/skills/failure-integrity-review/SKILL.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.match(filesystem, /crash-consistency-recovery-review/u);
	assert.match(uploadSecurity, /crash-consistency-recovery-review/u);
	assert.match(workflow, /write-ahead intent/u);
	assert.match(workflow, /reserve,\s+confirm, and release/u);
	assert.match(workflow, /Reconcile durable workflow claims periodically/u);
	assert.match(failure, /durable evidence required for success/u);
	assert.match(failure, /HTTP 200, exit code 0/u);
	assert.match(failure, /forbids `SUCCEEDED`\s+without its required result or receipt/u);
	assert.match(failure, /independently owned verifier or reconciliation/u);
	assertI18nSkillDocument(i18n, 'cross-platform-filesystem-safety', 10);
	assertI18nSkillDocument(i18n, 'file-upload-security-review', 4);
	assertI18nSkillDocument(i18n, 'durable-workflow-orchestration', 3);
	assertI18nSkillDocument(i18n, 'failure-integrity-review', 3);
});
