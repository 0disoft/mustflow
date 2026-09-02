import {
	assert,
	ciWorkflow,
	cliPath,
	cliTestOrdering,
	cliTestRunner,
	cliTestSelection,
	packageJson,
	pathToFileURL,
	projectRoot,
	publishNpmWorkflow,
	readProjectText,
	readPublicJsonContracts,
	readTemplateSkillProfile,
	readTomlStringArrayBlock,
	releaseVersionCheckScript,
	sourceCommandContract,
	spawnSync,
	startNpmReleaseScript,
	supportedTemplateLocales,
	templateCommandContract,
	templateCreates,
	templateManifest,
	templateSkillCreates,
	test,
} from './helpers/package-contracts.js';

const expandedProfiles = ['patterns', 'oss', 'team', 'product', 'library'];

function assertExpandedProfileSkill(skill) {
	assert.equal(readTemplateSkillProfile('minimal').includes(skill), false);
	for (const profile of expandedProfiles) {
		assert.ok(readTemplateSkillProfile(profile).includes(skill), `${profile} profile should include ${skill}`);
	}
}

test('default minimal profile stays lean while retaining critical integrity routes', () => {
	const minimal = readTemplateSkillProfile('minimal');

	assert.ok(minimal.length <= 70, `minimal profile should stay within 70 skills, got ${minimal.length}`);
	for (const skill of [
		'auth-permission-change',
		'payment-integrity-review',
		'credit-ledger-integrity-review',
		'file-upload-security-review',
		'database-migration-change',
		'deletion-lifecycle-review',
		'idempotency-integrity-review',
		'secret-exposure-response',
		'delivery-verification-budget',
	]) {
		assert.ok(minimal.includes(skill), `minimal profile missing critical route ${skill}`);
	}
	for (const skill of [
		'api-failure-triage',
		'ci-pipeline-triage',
		'rag-pipeline-triage',
		'third-party-api-integration-review',
		'abstraction-boundary-review',
		'website-task-friction-review',
		'auth-flow-triage',
		'docker-runtime-triage',
		'search-index-integrity-review',
		'vector-search-integrity-review',
		'babylon-code-change',
		'c-code-change',
		'frontend-component-library-review',
		'ai-product-readiness-review',
		'notification-delivery-integrity-review',
		'admin-control-plane-safety-review',
		'small-service-platform-architecture-review',
		'browser-automation-reliability-review',
		'formal-verification-review',
		'test-suite-performance-review',
		'test-suite-value-pruning-review',
		'fuzz-harness-review',
		'vertical-slice-tdd',
		'jurisdictional-product-compliance-review',
		'container-platform-security-review',
		'infrastructure-access-review',
		'multi-tenant-isolation-review',
		'cryptographic-storage-review',
	]) {
		assert.equal(minimal.includes(skill), false, `minimal profile should not install specialist ${skill}`);
	}
});

test('default template installs the API failure triage skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/api-failure-triage/SKILL.md'));

	for (const skill of ['api-failure-triage', 'ci-pipeline-triage', 'rag-pipeline-triage']) {
		assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

		assertExpandedProfileSkill(skill);
	}
});

test('default template installs the third-party API integration skill across profiles', () => {
	const skill = 'third-party-api-integration-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the abstraction boundary review skill across profiles', () => {
	const skill = 'abstraction-boundary-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the website task friction skill across profiles', () => {
	const skill = 'website-task-friction-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the auth, Docker, and search triage skills across profiles', () => {
	for (const skill of [
		'auth-flow-triage',
		'docker-runtime-triage',
		'search-index-integrity-review',
		'vector-search-integrity-review',
	]) {
		assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

		assertExpandedProfileSkill(skill);
	}
});

test('default template installs the React code change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/react-code-change/SKILL.md'));

	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(
			readTemplateSkillProfile(profile).includes('react-code-change'),
			`${profile} profile should include react-code-change`,
		);
	}
});

test('default template installs the Vue code change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/vue-code-change/SKILL.md'));

	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(
			readTemplateSkillProfile(profile).includes('vue-code-change'),
			`${profile} profile should include vue-code-change`,
		);
	}
});

test('default template installs the Vite code change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/vite-code-change/SKILL.md'));

	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(
			readTemplateSkillProfile(profile).includes('vite-code-change'),
			`${profile} profile should include vite-code-change`,
		);
	}
});

test('default template installs the Babylon code change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/babylon-code-change/SKILL.md'));

	assertExpandedProfileSkill('babylon-code-change');
});

test('default template installs the C code change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/c-code-change/SKILL.md'));

	assertExpandedProfileSkill('c-code-change');
});

test('default template installs the shell code change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/shell-code-change/SKILL.md'));

	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(
			readTemplateSkillProfile(profile).includes('shell-code-change'),
			`${profile} profile should include shell-code-change`,
		);
	}
});

test('default template installs the structured config change skill across profiles', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/structured-config-change/SKILL.md'));

	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(
			readTemplateSkillProfile(profile).includes('structured-config-change'),
			`${profile} profile should include structured-config-change`,
		);
	}
});

test('default template installs the frontend component library review skill across profiles', () => {
	const skill = 'frontend-component-library-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the AI product readiness skill across profiles', () => {
	const skill = 'ai-product-readiness-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the notification delivery integrity skill across profiles', () => {
	const skill = 'notification-delivery-integrity-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the admin control plane safety skill across profiles', () => {
	const skill = 'admin-control-plane-safety-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the small service platform architecture skill across profiles', () => {
	const skill = 'small-service-platform-architecture-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs the browser automation reliability skill across profiles', () => {
	const skill = 'browser-automation-reliability-review';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	assertExpandedProfileSkill(skill);
});

test('default template installs complex decision analysis only for team decision workflows', () => {
	assert.ok(templateCreates.includes('.mustflow/skills/complex-decision-analysis/SKILL.md'));

	assert.equal(readTemplateSkillProfile('minimal').includes('complex-decision-analysis'), false);
	assert.equal(readTemplateSkillProfile('patterns').includes('complex-decision-analysis'), false);
	assert.equal(readTemplateSkillProfile('oss').includes('complex-decision-analysis'), false);
	assert.equal(readTemplateSkillProfile('library').includes('complex-decision-analysis'), false);
	assert.ok(readTemplateSkillProfile('team').includes('complex-decision-analysis'));
	assert.ok(readTemplateSkillProfile('product').includes('complex-decision-analysis'));
});

test('default template installs technology stack selection across profiles', () => {
	const skill = 'technology-stack-selection';

	assert.ok(templateCreates.includes(`.mustflow/skills/${skill}/SKILL.md`));

	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(
			readTemplateSkillProfile(profile).includes(skill),
			`${profile} profile should include ${skill}`,
		);
	}
});
