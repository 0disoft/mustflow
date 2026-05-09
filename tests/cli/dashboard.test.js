import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const browserOpenModuleUrl = pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'browser-open.js')).href;

function createTempProject() {
	const projectPath = mkdtempSync(path.join(tmpdir(), 'mustflow-dashboard-'));
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export {};\n');
	return projectPath;
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function sha256Text(text) {
	return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

test('dashboard browser opener uses platform-native commands', async () => {
	const { getBrowserOpenCommand, getFileManagerOpenCommand } = await import(browserOpenModuleUrl);
	const url = 'http://127.0.0.1:4173/';
	const folderPath = path.join(projectRoot, '.mustflow');

	assert.deepEqual(getBrowserOpenCommand(url, 'win32'), {
		bin: 'cmd',
		args: ['/c', 'start', '', url],
	});
	assert.deepEqual(getBrowserOpenCommand(url, 'darwin'), {
		bin: 'open',
		args: [url],
	});
	assert.deepEqual(getBrowserOpenCommand(url, 'linux'), {
		bin: 'xdg-open',
		args: [url],
	});
	assert.equal(getBrowserOpenCommand(url, 'aix'), undefined);

	assert.deepEqual(getFileManagerOpenCommand(folderPath, 'win32'), {
		bin: 'cmd',
		args: ['/c', 'start', '', folderPath],
	});
	assert.deepEqual(getFileManagerOpenCommand(folderPath, 'darwin'), {
		bin: 'open',
		args: [folderPath],
	});
	assert.deepEqual(getFileManagerOpenCommand(folderPath, 'linux'), {
		bin: 'xdg-open',
		args: [folderPath],
	});
	assert.equal(getFileManagerOpenCommand(folderPath, 'aix'), undefined);
});

async function waitForDashboardInfo(child) {
	let stdout = '';

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('Timed out waiting for dashboard URL')), 5_000);

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString('utf8');
			const newlineIndex = stdout.indexOf('\n');

			if (newlineIndex < 0) {
				return;
			}

			clearTimeout(timeout);
			const line = stdout.slice(0, newlineIndex).trim();
			resolve(JSON.parse(line));
		});

		child.stderr.on('data', (chunk) => {
			clearTimeout(timeout);
			reject(new Error(chunk.toString('utf8').trim()));
		});

		child.on('exit', (code) => {
			if (code !== null && code !== 0) {
				clearTimeout(timeout);
				reject(new Error(`Dashboard exited before listening: ${code}`));
			}
		});
	});
}

async function stopDashboard(child) {
	if (child.exitCode !== null) {
		return;
	}

	child.kill();
	await once(child, 'exit');
}

test('dashboard serves and updates safe preferences', async () => {
	const projectPath = createTempProject();
	let dashboard;

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);
		mkdirSync(path.join(projectPath, 'docs'), { recursive: true });
		writeFileSync(path.join(projectPath, 'docs', 'guide.md'), '# Guide\n\nDraft prose.\n');
		const addReview = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
			'--comment',
			'Rewrite the introduction.',
		]);
		assert.equal(addReview.status, 0, addReview.stderr || addReview.stdout);

		dashboard = spawn(process.execPath, [cliPath, 'dashboard', '--json'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const info = await waitForDashboardInfo(dashboard);
		assert.equal(info.status, 'listening');
		assert.match(info.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);

		const html = await fetch(info.url).then((response) => response.text());
		assert.match(html, /mustflow dashboard/);
		assert.match(html, /font-size: 17px;/);
		assert.match(html, /id="open-mustflow"/);
		assert.match(html, /id="tab-status"/);
		assert.match(html, /id="tab-verification"/);
		assert.match(html, /id="tab-commands"/);
		assert.match(html, /id="tab-release"/);
		assert.match(html, /id="tab-update"/);
		assert.match(html, /id="tab-runs"/);
		assert.match(html, /id="tab-skills"/);
		assert.match(html, /id="tab-settings"/);
		assert.match(html, /id="tab-documents"/);
		assert.match(html, /id="panel-status"/);
		assert.match(html, /id="panel-verification"/);
		assert.match(html, /id="panel-commands"/);
		assert.match(html, /id="panel-release"/);
		assert.match(html, /id="panel-update"/);
		assert.match(html, /id="panel-runs"/);
		assert.match(html, /id="panel-skills"/);
		assert.match(html, /id="panel-settings"/);
		assert.match(html, /id="panel-documents"/);
		assert.match(html, /fetch\("\/api\/status"/);
		assert.match(html, /fetch\("\/api\/docs\/review"/);
		assert.match(html, /const initialStatusSnapshot = \{"schema_version":"1","command":"dashboard status"/);
		assert.match(
			html,
			/const initialDocReview = \{"schema_version":"1","command":"docs review list","ledger_path":"\.mustflow\/review\/docs\.toml","count":1,/,
		);
		assert.match(html, /dashboard\.tab\.status":"상태/);
		assert.match(html, /dashboard\.tab\.verification":"검증 추천/);
		assert.match(html, /dashboard\.tab\.commands":"명령/);
		assert.match(html, /dashboard\.tab\.release":"릴리스/);
		assert.match(html, /dashboard\.tab\.update":"업데이트/);
		assert.match(html, /dashboard\.tab\.runs":"실행 기록/);
		assert.match(html, /dashboard\.tab\.skills":"스킬/);
		assert.match(html, /dashboard\.status\.overview":"개요/);
		assert.match(html, /dashboard\.status\.latestRunMissing":"실행 기록 없음/);
		assert.match(html, /dashboard\.commands\.heading":"명령 의도/);
		assert.match(html, /dashboard\.commands\.manualOnly":"사용자 요청 필요/);
		assert.match(html, /dashboard\.commands\.unavailable":"설정 안 됨/);
		assert.match(html, /dashboard\.release\.overview":"개요/);
		assert.match(html, /dashboard\.release\.versionSources":"버전 소스/);
		assert.match(html, /dashboard\.release\.reason\.versionCheck":"npm에 더 새로운 mustflow 패키지 버전/);
		assert.match(html, /dashboard\.update\.overview":"개요/);
		assert.match(html, /dashboard\.update\.applyReady":"적용 가능/);
		assert.match(html, /dashboard\.update\.reason\.dryRun":"파일을 쓰지 않고 템플릿 업데이트 계획/);
		assert.match(html, /dashboard\.runs\.heading":"최근 실행/);
		assert.match(html, /dashboard\.runs\.empty":"실행 기록이 없습니다/);
		assert.match(html, /dashboard\.runs\.stdout":"표준 출력/);
		assert.match(html, /dashboard\.skills\.heading":"스킬 라우트/);
		assert.match(html, /dashboard\.skills\.mismatch":"명령 의도 불일치/);
		assert.match(html, /dashboard\.verification\.recommendations":"추천/);
		assert.match(html, /dashboard\.verification\.reason\.docs":"문서가 변경되었습니다/);
		assert.match(html, /dashboard\.verification\.copy":"복사/);
		assert.match(html, /dashboard\.setting\.git\.auto_commit":"요청 시 자동 커밋/);
		assert.match(
			html,
			/dashboard\.setting\.git\.auto_commit\.description":"사용자가 커밋을 명시적으로 요청했을 때/,
		);
		assert.match(html, /function renderVerificationPanel\(\)/);
		assert.match(html, /navigator\.clipboard\.writeText\(command\)/);
		assert.match(html, /function renderCommandPanel\(\)/);
		assert.match(html, /function renderReleasePanel\(\)/);
		assert.match(html, /function renderUpdatePanel\(\)/);
		assert.match(html, /function renderRunsPanel\(\)/);
		assert.match(html, /function renderSkillsPanel\(\)/);
		assert.match(html, /mf version --check/);
		assert.match(html, /mf update --dry-run/);
		assert.match(html, /mf update --apply/);
		assert.match(html, /mf run test_release/);
		assert.match(html, /function commandStateKey\(intent\)/);
		assert.match(html, /document\.getElementById\("tab-commands"\)\.textContent/);
		assert.match(html, /dashboard\.tab\.documents":"문서 검수/);
		assert.match(html, /dashboard\.docs\.action\.approve":"승인/);
		assert.match(html, /dashboard\.docs\.action\.approve\.tooltip":"선택한 검수자 기준으로 이 문서를 승인/);
		assert.match(html, /dashboard\.docs\.action\.needsReview":"추가 검수 필요/);
		assert.match(html, /dashboard\.docs\.action\.needsReview\.tooltip":"사람, LLM, 도구 등 다른 검수자/);
		assert.match(html, /dashboard\.docs\.comment":"코멘트/);
		assert.match(html, /Rewrite the introduction\./);
		assert.match(html, /button\.title = message\(tooltipKey\);/);
		assert.match(html, /button\.setAttribute\("aria-label", message\(tooltipKey\)\);/);
		assert.match(html, /dashboard\.ui\.openMustflow":"\.mustflow 폴더 열기/);
		assert.match(html, /fetch\("\/api\/open-mustflow"/);
		assert.match(html, /background-position:\s*calc\(100% - 22px\) 50%,\s*calc\(100% - 16px\) 50%;/);
		assert.match(html, /padding-right: 44px;/);
		assert.match(html, /id="dashboard-language"/);
		assert.match(html, /\.language-picker \{\s*align-items: center;\s*display: inline-flex;\s*flex-shrink: 0;/);
		assert.match(html, /\.language-picker span \{[^}]*white-space: nowrap;/);
		assert.match(html, /const availableLocales = \["en","ko","zh","es","fr","hi"\];/);
		assert.match(
			html,
			/document\.getElementById\("dashboard-language"\)\.addEventListener\("change"[\s\S]*?renderStatusPanel\(\);\s*renderVerificationPanel\(\);\s*renderCommandPanel\(\);\s*renderReleasePanel\(\);\s*renderUpdatePanel\(\);\s*renderRunsPanel\(\);\s*renderSkillsPanel\(\);\s*render\(\);\s*renderDocuments\(\);/,
		);
		assert.match(html, /한국어/);
		assert.match(html, /中文/);
		assert.match(html, /Español/);
		assert.match(html, /Français/);
		assert.match(html, /हिन्दी/);
		assert.match(html, /저장/);
		assert.match(html, /Guardar/);
		assert.match(html, /Enregistrer/);
		assert.match(html, /保存/);
		assert.match(html, /सहेजें/);
		assert.match(html, /dashboard\.setting\.reporting\.commit_suggestion\.enabled":"Commit message suggestions/);
		assert.match(html, /dashboard\.setting\.reporting\.commit_suggestion\.enabled":"커밋 메시지 제안/);
		assert.match(html, /dashboard\.setting\.reporting\.commit_suggestion\.enabled":"提交消息建议/);
		assert.match(html, /dashboard\.setting\.reporting\.commit_suggestion\.enabled":"Sugerencias de mensaje de commit/);
		assert.match(html, /dashboard\.setting\.reporting\.commit_suggestion\.enabled":"Suggestions de message de commit/);
		assert.match(html, /dashboard\.setting\.reporting\.commit_suggestion\.enabled":"Commit संदेश सुझाव/);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.style\.description\.conventional":"Use type-prefixed messages such as feat:/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.style\.description\.gitmoji":"Prefix messages with a Gitmoji emoji/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.style\.description\.conventional":"feat: 또는 fix: 같은 유형 접두어/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.style\.description\.gitmoji":"Gitmoji 이모지를 앞에 붙이고/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.language\.description\.preserve_existing":"Follow the repository's existing commit message language/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.language\.description\.agent_response":"Use the same language as the agent response/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.include_body\.description\.never":"Never include a commit message body/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.include_body\.description\.when_non_trivial":"Include a body only when the change needs more context/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.include_body\.description\.always":"Always include a commit message body/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.include_body\.description\.never":"커밋 메시지 본문을 넣지 않습니다/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.include_body\.description\.when_non_trivial":"변경 내용을 제목만으로 설명하기 어려울 때만/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.include_body\.description\.always":"항상 커밋 메시지 본문을 넣습니다/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.avoid_sensitive_details\.description":"Avoid secrets, credentials, personal data, and private incident details/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.avoid_sensitive_details\.description":"비밀값, 인증 정보, 개인정보, 비공개 장애 세부사항/,
		);
		assert.match(html, /dashboard\.group\.verification":"Verification/);
		assert.match(html, /dashboard\.group\.verification":"검증/);
		assert.match(html, /dashboard\.setting\.verification\.selection\.strategy":"Verification strategy/);
		assert.match(
			html,
			/dashboard\.setting\.verification\.selection\.strategy\.description\.risk_based":"Balance verification scope against change risk/,
		);
		assert.match(
			html,
			/dashboard\.setting\.verification\.selection\.strategy\.description\.risk_based":"변경 위험에 따라/,
		);
		assert.match(html, /dashboard\.setting\.verification\.selection\.skip_docs_only_full_test":"문서만 바뀐 경우 전체 테스트 생략/);
		assert.match(html, /dashboard\.setting\.verification\.selection\.skip_low_risk_code_full_test":"낮은 위험 코드 변경이면 전체 테스트 생략/);
		assert.match(
			html,
			/dashboard\.setting\.verification\.selection\.skip_low_risk_code_full_test\.description":"공개 동작, 설정, 스키마, 보안, 마이그레이션/,
		);
		assert.match(html, /dashboard\.group\.testAuthoring":"Test authoring/);
		assert.match(html, /dashboard\.group\.testAuthoring":"테스트 작성/);
		assert.match(html, /dashboard\.setting\.testing\.authoring\.new_test_policy":"New test policy/);
		assert.match(
			html,
			/dashboard\.setting\.testing\.authoring\.new_test_policy\.description\.evidence_required":"Add new tests only when behavior-contract evidence/,
		);
		assert.match(
			html,
			/dashboard\.setting\.testing\.authoring\.new_test_policy\.description\.evidence_required":"동작 계약을 검증해야 한다는 근거/,
		);
		assert.match(html, /dashboard\.setting\.release\.versioning\.impact_check\.description":"Check whether the change should affect a package or template version/);
		assert.match(html, /dashboard\.setting\.release\.versioning\.impact_check\.description":"변경사항이 패키지나 템플릿 버전에 영향을 주는지 확인합니다/);
		assert.match(html, /dashboard\.setting\.release\.versioning\.require_user_confirmation\.description":"Ask before applying or accepting a version change/);
		assert.match(html, /dashboard\.setting\.release\.versioning\.sync_tests\.description":"Keep version-sensitive tests and fixtures aligned/);
		assert.match(html, /function settingDescriptionKey\(setting\)/);
		assert.match(html, /className = "value-description"/);
		assert.match(html, /updateSettingDescription\(id\)/);
		assert.match(html, /dashboard\.locked\.git\.auto_push":"Remote pushes require an explicit request/);
		assert.match(html, /dashboard\.locked\.git\.auto_push":"원격 저장소 변경은 명시적 요청이 필요합니다/);
		assert.match(html, /input\.id = inputId;/);
		assert.match(html, /input\.name = setting\.id;/);
		assert.match(html, /select\.id = inputId;/);
		assert.match(html, /select\.name = setting\.id;/);
		assert.match(html, /setting\.acceptsLocaleTag/);
		assert.doesNotMatch(html, /document\.createElement\("datalist"\)/);
		assert.match(html, /customLocaleOptionValue = "__mustflow_custom_locale__"/);
		assert.match(html, /dashboard\.ui\.customLocale":"Custom language tag/);
		assert.match(html, /dashboard\.ui\.customLocale":"직접 입력/);
		const token = /const dashboardToken = "([^"]+)";/u.exec(html)?.[1];
		assert.ok(token);

		const unauthorized = await fetch(new URL('/api/preferences', info.url));
		assert.equal(unauthorized.status, 403);

		const unauthorizedOpen = await fetch(new URL('/api/open-mustflow', info.url), { method: 'POST' });
		assert.equal(unauthorizedOpen.status, 403);

		const unauthorizedStatus = await fetch(new URL('/api/status', info.url));
		assert.equal(unauthorizedStatus.status, 403);

		const unauthorizedDocs = await fetch(new URL('/api/docs/review', info.url));
		assert.equal(unauthorizedDocs.status, 403);

		const status = await fetch(new URL('/api/status', info.url), {
			headers: { 'x-mustflow-dashboard-token': token },
		}).then((response) => response.json());
		assert.equal(status.command, 'dashboard status');
		assert.equal(status.installed, true);
		assert.equal(status.manifest_lock, 'present');
		assert.equal(status.active_review_documents, 1);
		assert.equal(status.release.package_name, 'mustflow');
		assert.match(status.release.package_version, /^\d+\.\d+\.\d+$/);
		assert.ok(status.release.version_sources.some((source) => source.path === '.mustflow/config/manifest.lock.toml'));
		assert.ok(Array.isArray(status.release.release_sensitive_changed_files));
		assert.equal(status.update.command, 'update');
		assert.equal(status.update.mode, 'dry-run');
		assert.equal(status.update.dry_run_command, 'mf update --dry-run');
		assert.equal(status.update.apply_command, 'mf update --apply');
		assert.equal(typeof status.update.ok, 'boolean');
		assert.equal(typeof status.update.apply_ready, 'boolean');
		assert.equal(typeof status.update.summary.unchanged, 'number');
		assert.ok(Array.isArray(status.update.blockers));
		assert.ok(Array.isArray(status.update.changes));
		assert.equal(status.run_history.path, '.mustflow/state/runs/latest.json');
		assert.equal(typeof status.run_history.exists, 'boolean');
		assert.equal(status.skills.index_path, '.mustflow/skills/INDEX.md');
		assert.equal(status.skills.exists, true);
		assert.ok(status.skills.count > 0);
		assert.ok(status.skills.routes.some((route) => route.skill === 'docs-update' && route.exists === true));
		assert.ok(status.tracked_files > 0);
		assert.ok(Array.isArray(status.runnable_intents));
		assert.equal(status.command_contract.path, '.mustflow/config/commands.toml');
		assert.equal(status.command_contract.exists, true);
		assert.ok(status.command_contract.intents.some((intent) => intent.name === 'mustflow_check' && intent.runnable === true));
		assert.ok(
			status.command_contract.intents.some(
				(intent) => intent.name === 'test_related' && intent.runnable === false && intent.reason.includes('related-test command'),
			),
		);
		assert.ok(Array.isArray(status.verification.changed_files));
		assert.ok(Array.isArray(status.verification.surfaces));
		assert.ok(Array.isArray(status.verification.recommendations));
		assert.ok(Array.isArray(status.verification.skipped));
		assert.equal(status.latest_run.path, '.mustflow/state/runs/latest.json');

		const docsReview = await fetch(new URL('/api/docs/review', info.url), {
			headers: { 'x-mustflow-dashboard-token': token },
		}).then((response) => response.json());
		assert.equal(docsReview.command, 'docs review list');
		assert.equal(docsReview.count, 1);
		assert.equal(docsReview.documents[0].path, 'docs/guide.md');
		assert.equal(docsReview.documents[0].status, 'pending');
		assert.equal(docsReview.documents[0].review_comment, 'Rewrite the introduction.');

		const invalidDocReviewUpdate = await fetch(new URL('/api/docs/review', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ path: 'docs/guide.md', status: 'approved', reviewerKind: 'claude-code', reviewerId: 'claude-code' }),
		});
		assert.equal(invalidDocReviewUpdate.status, 400);

		const approvedDocReview = await fetch(new URL('/api/docs/review', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({
				path: 'docs/guide.md',
				status: 'approved',
				reviewerKind: 'llm',
				reviewerId: 'opencode',
				summary: 'Reviewed in dashboard.',
			}),
		}).then((response) => response.json());
		assert.equal(approvedDocReview.count, 0);

		const allDocsReview = await fetch(new URL('/api/docs/review?all=1', info.url), {
			headers: { 'x-mustflow-dashboard-token': token },
		}).then((response) => response.json());
		assert.equal(allDocsReview.count, 1);
		assert.equal(allDocsReview.documents[0].status, 'approved');
		assert.equal(allDocsReview.documents[0].reviewer_kind, 'llm');
		assert.equal(allDocsReview.documents[0].reviewer_id, 'opencode');
		assert.match(allDocsReview.documents[0].review_summary, /dashboard/);

		const preferences = await fetch(new URL('/api/preferences', info.url), {
			headers: { 'x-mustflow-dashboard-token': token },
		}).then((response) => response.json());
		assert.ok(preferences.settings.some((setting) => setting.id === 'git.auto_commit'));
		assert.ok(preferences.settings.some((setting) => setting.id === 'verification.selection.strategy'));
		assert.ok(preferences.settings.some((setting) => setting.id === 'verification.selection.skip_low_risk_code_full_test'));
		assert.ok(preferences.settings.some((setting) => setting.id === 'testing.authoring.new_test_policy'));
		assert.ok(preferences.settings.some((setting) => setting.id === 'testing.authoring.prefer_existing_tests'));
		assert.ok(
			preferences.settings
				.find((setting) => setting.id === 'git.commit_message.style')
				?.options.includes('gitmoji'),
		);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'git.auto_push')?.lockedReason,
			'dashboard.locked.git.auto_push',
		);

		const locked = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'git.auto_push', value: true }] }),
		});
		assert.equal(locked.status, 400);

		const invalidLanguage = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'git.commit_message.language', value: 'not a language' }] }),
		});
		assert.equal(invalidLanguage.status, 400);

		const invalidVerificationStrategy = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'verification.selection.strategy', value: 'always_full' }] }),
		});
		assert.equal(invalidVerificationStrategy.status, 400);

		const invalidTestAuthoringPolicy = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'testing.authoring.new_test_policy', value: 'always' }] }),
		});
		assert.equal(invalidTestAuthoringPolicy.status, 400);

		const saved = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({
				updates: [
					{ id: 'git.auto_commit', value: true },
					{ id: 'git.commit_message.style', value: 'gitmoji' },
					{ id: 'git.commit_message.language', value: 'pt-BR' },
					{ id: 'git.commit_message.max_suggestions', value: 3 },
					{ id: 'verification.selection.strategy', value: 'targeted' },
					{ id: 'verification.selection.skip_low_risk_code_full_test', value: false },
					{ id: 'verification.selection.report_skipped', value: false },
					{ id: 'testing.authoring.new_test_policy', value: 'manual_approval' },
					{ id: 'testing.authoring.require_new_test_rationale', value: false },
				],
			}),
		});
		assert.equal(saved.status, 200);

		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		assert.ok(existsSync(preferencesPath));
		const updatedPreferences = readFileSync(preferencesPath, 'utf8');
		assert.match(updatedPreferences, /auto_commit = true/);
		assert.match(updatedPreferences, /style = "gitmoji"/);
		assert.match(updatedPreferences, /language = "pt-BR"/);
		assert.match(updatedPreferences, /max_suggestions = 3/);
		assert.match(updatedPreferences, /\[verification\.selection\]\r?\n(?:.*\r?\n)*?strategy = "targeted"/);
		assert.match(updatedPreferences, /\[verification\.selection\]\r?\n(?:.*\r?\n)*?skip_low_risk_code_full_test = false/);
		assert.match(updatedPreferences, /\[verification\.selection\]\r?\n(?:.*\r?\n)*?report_skipped = false/);
		assert.match(updatedPreferences, /\[testing\.authoring\]\r?\n(?:.*\r?\n)*?new_test_policy = "manual_approval"/);
		assert.match(updatedPreferences, /\[testing\.authoring\]\r?\n(?:.*\r?\n)*?require_new_test_rationale = false/);

		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(
			lock,
			new RegExp(
				`\\[files\\."\\.mustflow/config/preferences\\.toml"\\]\\r?\\nsource = "template_common"\\r?\\nlast_action = "customized"\\r?\\ncontent_hash = "${sha256Text(updatedPreferences)}"`,
			),
		);

		const check = runCli(projectPath, ['check', '--strict']);
		assert.equal(check.status, 0, check.stderr || check.stdout);
	} finally {
		if (dashboard) {
			await stopDashboard(dashboard);
		}
		removeTempProject(projectPath);
	}
});

test('dashboard rejects non-local host binding', () => {
	const projectPath = createTempProject();

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);

		const result = runCli(projectPath, ['dashboard', '--host', '0.0.0.0']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Refused dashboard host 0\.0\.0\.0/);
	} finally {
		removeTempProject(projectPath);
	}
});
