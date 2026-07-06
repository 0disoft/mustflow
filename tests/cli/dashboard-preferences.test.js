import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
	browserOpenModuleUrl,
	cliPath,
	dashboardHtmlModuleUrl,
	dashboardPreferencesModuleUrl,
	createTempProject,
	projectRoot,
	removeTempProject,
	runCli,
	runGit,
	sha256Text,
	stopDashboard,
	trySymlink,
	waitForDashboardInfo,
	writeLatestRunReceipt,
} from './dashboard-support.js';

test('dashboard preference update rejects symlinked preferences file', async (t) => {
	const { updateDashboardPreferences } = await import(dashboardPreferencesModuleUrl);
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-dashboard-outside-'));
	const outsidePreferencesPath = path.join(outsideRoot, 'preferences.toml');
	const outsidePreferencesContent = '[git]\nauto_stage = false\n';

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);
		writeFileSync(outsidePreferencesPath, outsidePreferencesContent);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		rmSync(preferencesPath);

		if (!trySymlink(outsidePreferencesPath, preferencesPath, 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		assert.throws(
			() => updateDashboardPreferences(projectPath, [{ id: 'git.auto_stage', value: true }]),
			/symlinks/,
		);
		assert.equal(readFileSync(outsidePreferencesPath, 'utf8'), outsidePreferencesContent);
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});

test('dashboard preference update rejects symlinked manifest lock before writing preferences', async (t) => {
	const { updateDashboardPreferences } = await import(dashboardPreferencesModuleUrl);
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-dashboard-lock-outside-'));
	const outsideLockPath = path.join(outsideRoot, 'manifest.lock.toml');
	const outsideLockContent = 'schema_version = "outside"\n';

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		const preferencesBefore = readFileSync(preferencesPath, 'utf8');
		const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
		writeFileSync(outsideLockPath, outsideLockContent);
		rmSync(lockPath);

		if (!trySymlink(outsideLockPath, lockPath, 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		assert.throws(
			() => updateDashboardPreferences(projectPath, [{ id: 'git.auto_stage', value: true }]),
			/symlinks/,
		);
		assert.equal(readFileSync(preferencesPath, 'utf8'), preferencesBefore);
		assert.equal(readFileSync(outsideLockPath, 'utf8'), outsideLockContent);
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});

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
		assert.match(html, /button:focus-visible,\nselect:focus-visible,\ninput:focus-visible/);
		assert.match(html, /id="open-mustflow"/);
		assert.match(html, /id="status" class="status" role="status" aria-live="polite"/);
		assert.match(html, /id="last-updated" class="last-updated" aria-live="polite"/);
		assert.match(html, /<nav class="tabs" role="tablist" aria-label="Dashboard sections">/);
		assert.match(html, /id="tab-status"/);
		assert.match(html, /id="tab-verification"/);
		assert.match(html, /id="tab-commands"/);
		assert.match(html, /id="tab-release"/);
		assert.match(html, /id="tab-update"/);
		assert.match(html, /id="tab-runs"/);
		assert.match(html, /id="tab-skills"/);
		assert.match(html, /id="tab-settings"/);
		assert.match(html, /id="tab-documents"/);
		assert.match(html, /id="tab-status"[^>]*role="tab"[^>]*aria-controls="panel-status"[^>]*aria-selected="true"[^>]*tabindex="0"/);
		assert.match(html, /id="tab-verification"[^>]*role="tab"[^>]*aria-controls="panel-verification"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
		assert.match(html, /id="panel-status"/);
		assert.match(html, /id="panel-verification"/);
		assert.match(html, /id="panel-commands"/);
		assert.match(html, /id="panel-release"/);
		assert.match(html, /id="panel-update"/);
		assert.match(html, /id="panel-runs"/);
		assert.match(html, /id="panel-skills"/);
		assert.match(html, /id="panel-settings"/);
		assert.match(html, /id="panel-documents"/);
		assert.match(html, /id="panel-status" class="tab-panel" role="tabpanel" aria-labelledby="tab-status"/);
		assert.match(html, /id="panel-documents" class="tab-panel" role="tabpanel" aria-labelledby="tab-documents"/);
		assert.match(html, /tab\.setAttribute\("tabindex", selected \? "0" : "-1"\)/);
		assert.match(html, /tab\.addEventListener\("keydown", handleTabKeydown\)/);
		assert.match(html, /dashboard\.ui\.loading":"불러오는 중/);
		assert.match(html, /dashboard\.ui\.lastUpdated":"마지막 갱신: \{time\}/);
		assert.match(html, /dashboard\.ui\.copied":"복사됨/);
		assert.match(html, /dashboard\.settings\.pendingHeading":"저장 전 설정 \(\{count\}\)/);
		assert.match(html, /dashboard\.settings\.resetChanges":"변경 되돌리기/);
		assert.match(html, /dashboard\.filter\.search":"검색/);
		assert.match(html, /dashboard\.filter\.noMatches":"일치하는 항목이 없습니다/);
		assert.match(html, /dashboard\.actions\.heading":"다음 작업/);
		assert.match(html, /dashboard\.actions\.empty":"처리할 항목 없음/);
		assert.match(html, /dashboard\.a11y\.state\.warn":"확인 필요/);
		assert.match(html, /dashboard\.a11y\.copyCommand":"명령 복사: \{command\}/);
		assert.match(html, /dashboard\.docs\.reviewerState":"현재 검수자: \{kind\} \/ \{id\}/);
		assert.match(html, /dashboard\.docs\.reviewerStateMissing":"검수 작업 버튼을 쓰려면 검수자 ID를 입력하세요/);
		assert.match(html, /dashboard\.docs\.action\.currentStatus":"이미 \{status\} 상태입니다/);
		assert.match(html, /function setLoading\(loading\)/);
		assert.match(html, /document\.body\.setAttribute\("aria-busy", isLoading \? "true" : "false"\)/);
		assert.match(html, /const reload = document\.getElementById\("reload"\)/);
		assert.match(html, /reload\.disabled = isLoading/);
		assert.match(html, /reload\.setAttribute\("aria-disabled", isLoading \? "true" : "false"\)/);
		assert.match(html, /markDataUpdated\(\);/);
		assert.match(html, /const copyFeedbackMs = 1500/);
		assert.match(html, /function deriveDashboardActions\(\)/);
		assert.match(html, /function renderNextActions\(root\)/);
		assert.match(html, /return actions\.slice\(0, 5\)/);
		assert.match(html, /activateTab\(action\.tab, \{ focus: true \}\)/);
		assert.match(html, /id="settings-pending-summary" class="settings-pending" aria-live="polite" hidden/);
		assert.match(html, /function renderSettingsPendingSummary\(\)/);
		assert.match(html, /function resetPendingSettings\(\)/);
		assert.match(html, /messageWithCount\("dashboard\.settings\.pendingHeading", String\(pending\.size\)\)/);
		assert.match(html, /messageFormat\("dashboard\.settings\.pendingItem"/);
		assert.match(html, /reset\.addEventListener\("click", resetPendingSettings\)/);
		assert.match(html, /id="doc-reviewer-state" class="doc-reviewer-state" aria-live="polite"/);
		assert.match(html, /function renderDocumentReviewerState\(\)/);
		assert.match(html, /messageFormat\("dashboard\.docs\.reviewerState"/);
		assert.match(html, /document\.getElementById\("doc-reviewer-kind"\)\.addEventListener\("change"/);
		assert.match(html, /function renderListFilters\(kind, stateOptions, rerender\)/);
		assert.match(html, /const listFilters = \{/);
		assert.match(html, /const searchId = "dashboard-" \+ kind \+ "-filter-search"/);
		assert.match(html, /search\.id = searchId/);
		assert.match(html, /renderListFilters\("verification", \["all", "runnable", "unavailable"\], renderVerificationPanel\)/);
		assert.match(html, /renderListFilters\("commands", \["all", "runnable", "unavailable"\], renderCommandPanel\)/);
		assert.match(html, /renderListFilters\("skills", \["all", "aligned", "mismatch", "missing"\], renderSkillsPanel\)/);
		assert.match(html, /filterTextMatches\(listFilters\.commands\.query/);
		assert.match(html, /filterTextMatches\(listFilters\.skills\.query/);
		assert.match(html, /\.collapsible-details \{/);
		assert.match(html, /function createCollapsibleDetails\(titleKey\)/);
		assert.match(html, /document\.createElement\("details"\)/);
		assert.match(html, /createCollapsibleDetails\("dashboard\.verification\.skipped"\)/);
		assert.match(html, /createCollapsibleDetails\("dashboard\.commands\.effectGraph"\)/);
		assert.match(html, /createCollapsibleDetails\(titleKey\)/);
		assert.match(html, /--row-bg:/);
		assert.match(html, /\.command-row:nth-of-type\(even\)/);
		assert.match(html, /\.verification-row:nth-of-type\(even\)/);
		assert.match(html, /\.doc-row:nth-of-type\(even\)/);
		assert.match(html, /\.command-state\.ok \{/);
		assert.match(html, /\.doc-status\.approved \{/);
		assert.match(html, /status\.className = "doc-status " \+ entry\.status/);
		assert.match(html, /function statusStateLabel\(tone\)/);
		assert.match(html, /\.status-badge \{/);
		assert.match(html, /badge\.className = "status-badge " \+ tone/);
		assert.match(html, /badge\.textContent = statusStateLabel\(tone\)/);
		assert.match(html, /content\.setAttribute\(\s*"aria-label",\s*message\(labelKey\) \+ ": " \+ value \+ " \(" \+ statusStateLabel\(tone\) \+ "\)"/);
		assert.match(html, /function setButtonAccessibleLabel\(button, label\)/);
		assert.match(html, /function showCopyButtonFeedback\(button, restoreLabel\)/);
		assert.match(html, /setButtonAccessibleLabel\(button, message\("dashboard\.ui\.copied"\)\)/);
		assert.match(html, /copyCommandLabel\(recommendation\.command\)/);
		assert.match(html, /showCopyButtonFeedback\(copy, copyLabel\)/);
		assert.match(html, /button\.setAttribute\("aria-disabled", button\.disabled \? "true" : "false"\)/);
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
		assert.match(html, /dashboard\.commands\.effectGraph":"명령 효과/);
		assert.match(html, /dashboard\.commands\.effectGraphUnavailable":"명령 효과 정보를 사용할 수 없습니다/);
		assert.match(html, /dashboard\.release\.overview":"개요/);
		assert.match(html, /dashboard\.release\.versionSources":"버전 소스/);
		assert.match(html, /dashboard\.release\.reason\.versionCheck":"npm에 더 새로운 mustflow 패키지 버전/);
		assert.match(html, /mf version --check/);
		assert.doesNotMatch(html, /mf version --bump/);
		assert.doesNotMatch(html, /\bgit commit\b/);
		assert.doesNotMatch(html, /\bgit tag\b/);
		assert.doesNotMatch(html, /\bgit push\b/);
		assert.doesNotMatch(html, /\/api\/release/);
		assert.doesNotMatch(html, /\/api\/git/);
		assert.match(html, /dashboard\.update\.overview":"개요/);
		assert.match(html, /dashboard\.update\.applyReady":"적용 가능/);
		assert.match(html, /dashboard\.update\.reason\.dryRun":"파일을 쓰지 않고 템플릿 업데이트 계획/);
		assert.match(html, /dashboard\.runs\.heading":"최근 실행/);
		assert.match(html, /dashboard\.runs\.empty":"실행 기록이 없습니다/);
		assert.match(html, /dashboard\.runs\.stdout":"표준 출력/);
		assert.match(html, /dashboard\.skills\.heading":"스킬 라우트/);
		assert.match(html, /dashboard\.skills\.mismatch":"명령 의도 불일치/);
		assert.match(html, /dashboard\.verification\.recommendations":"추천/);
		assert.match(html, /dashboard\.verification\.schedule":"권장 순서/);
		assert.match(html, /dashboard\.verification\.copyPlan":"계획 복사/);
		assert.match(html, /dashboard\.verification\.locks":"잠금/);
		assert.match(html, /dashboard\.verification\.effects":"효과/);
		assert.match(html, /dashboard\.verification\.reason\.docs":"문서가 변경되었습니다/);
		assert.match(html, /dashboard\.verification\.copy":"복사/);
		assert.match(html, /dashboard\.setting\.git\.auto_commit":"요청 시 자동 커밋/);
		assert.match(
			html,
			/dashboard\.setting\.git\.auto_commit\.description":"사용자가 커밋을 명시적으로 요청했을 때/,
		);
		assert.match(html, /function renderVerificationPanel\(\)/);
		assert.match(html, /navigator\.clipboard\.writeText\(command\)/);
		assert.match(html, /async function copyVerificationPlan\(commands\)/);
		assert.match(html, /verification\.schedule\.batches/);
		assert.match(html, /function renderCommandPanel\(\)/);
		assert.match(html, /function appendCommandEffectGraph\(root, intent\)/);
		assert.match(html, /function renderReleasePanel\(\)/);
		assert.match(html, /function renderUpdatePanel\(\)/);
		assert.match(html, /function renderRunsPanel\(\)/);
		assert.match(html, /function renderSkillsPanel\(\)/);
		assert.match(html, /mf version --check/);
		assert.match(html, /mf update --dry-run/);
		assert.match(html, /mf update --apply/);
		assert.match(html, /mf run test_release/);
		assert.doesNotMatch(html, /intentName === "version_check" \? true/u);
		assert.match(html, /const runnable = intent \? intent\.runnable : false;/);
		assert.match(html, /function commandStateKey\(intent\)/);
		assert.match(html, /document\.getElementById\("tab-commands"\)\.textContent/);
		assert.match(html, /dashboard\.tab\.documents":"문서 검수/);
		assert.match(html, /dashboard\.docs\.action\.approve":"승인/);
		assert.match(html, /dashboard\.docs\.action\.approve\.tooltip":"선택한 검수자 기준으로 이 문서를 승인/);
		assert.match(html, /dashboard\.docs\.action\.needsReview":"추가 검수 필요/);
		assert.match(html, /dashboard\.docs\.action\.needsReview\.tooltip":"사람, LLM, 도구 등 다른 검수자/);
		assert.match(html, /id="doc-path-filter"/);
		assert.match(html, /dashboard\.docs\.pathFilter":"파일명/);
		assert.match(html, /dashboard\.docs\.pathFilterPlaceholder":"경로 또는 파일명/);
		assert.match(html, /dashboard\.docs\.noSearchMatches":"일치하는 문서가 없습니다/);
		assert.match(html, /id="doc-review-fields-label"/);
		assert.match(html, /dashboard\.docs\.reviewFields":"검수 기록/);
		assert.match(html, /dashboard\.docs\.summary":"검수 요약/);
		assert.match(html, /dashboard\.docs\.comment":"코멘트/);
		assert.match(html, /Rewrite the introduction\./);
		assert.match(html, /button\.title = actionLabel;/);
		assert.match(html, /button\.setAttribute\("aria-label", actionLabel\);/);
		assert.match(html, /const alreadySelected = entry\.status === nextStatus;/);
		assert.match(html, /button\.disabled = reviewerIdMissing \|\| alreadySelected;/);
		assert.match(html, /function documentMatchesPathFilter\(entry, query\)/);
		assert.match(html, /function currentReviewerId\(\)/);
		assert.match(html, /docReview\.documents\.filter\(\(entry\) => documentMatchesPathFilter\(entry, pathFilter\)\)/);
		assert.match(html, /document\.getElementById\("doc-path-filter"\)\.addEventListener\("input"/);
		assert.match(html, /document\.getElementById\("doc-reviewer-id"\)\.addEventListener\("input"/);
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
			/dashboard\.setting\.git\.commit_message\.gitmoji\.map\.description\.conventional_default":"Map conventional types to Gitmoji prefixes/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.gitmoji\.map\.description\.conventional_default":"conventional 타입을 Gitmoji 접두어/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.body\.template\.description\.summary_validation":"Use a concise body with what changed/,
		);
		assert.match(
			html,
			/dashboard\.setting\.git\.commit_message\.body\.require_validation_line\.description":"커밋 본문 제안에 실행한 검사나 검증 근거/,
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
		assert.match(html, /dashboard\.group\.refactoring":"Refactoring/);
		assert.match(html, /dashboard\.group\.refactoring":"리팩토링/);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.large_file_candidate_kb":"Large file candidate threshold/,
		);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.large_file_candidate_kb":"대형 파일 후보 기준/,
		);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.large_file_candidate_kb\.description":"Treat source files at or above this size in KB as review candidates/,
		);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.large_file_candidate_kb\.description":"이 KB 값 이상인 소스 파일/,
		);
		assert.match(html, /dashboard\.setting\.refactoring\.hotspots\.history_days":"Hotspot history window/);
		assert.match(html, /dashboard\.setting\.refactoring\.hotspots\.history_days":"후보 탐색 이력 기간/);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.primary_candidate_limit":"Primary hotspot candidate limit/,
		);
		assert.match(html, /dashboard\.setting\.refactoring\.hotspots\.primary_candidate_limit":"1차 후보 최대 개수/);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.structure_candidate_limit":"Structure review candidate limit/,
		);
		assert.match(html, /dashboard\.setting\.refactoring\.hotspots\.structure_candidate_limit":"구조 확인 후보 최대 개수/);
		assert.match(
			html,
			/dashboard\.setting\.refactoring\.hotspots\.full_file_candidate_limit":"Full-file review candidate limit/,
		);
		assert.match(html, /dashboard\.setting\.refactoring\.hotspots\.full_file_candidate_limit":"전문 분석 후보 최대 개수/);
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
		for (const endpoint of ['/api/release/bump', '/api/git/commit', '/api/git/tag', '/api/git/push']) {
			const forbiddenMutation = await fetch(new URL(endpoint, info.url), {
				method: 'POST',
				headers: { 'x-mustflow-dashboard-token': token },
			});
			assert.equal(forbiddenMutation.status, 404);
		}
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
				(intent) => intent.name === 'test_related' && intent.runnable === true,
			),
		);
		assert.ok(Array.isArray(status.verification.changed_files));
		assert.ok(Array.isArray(status.verification.surfaces));
		assert.ok(Array.isArray(status.verification.recommendations));
		assert.ok(Array.isArray(status.verification.skipped));
		assert.equal(status.verification.schedule.runner, 'serial_mf_run_receipts');
		assert.ok(Array.isArray(status.verification.schedule.batches));
		assert.ok(Array.isArray(status.verification.schedule.entries));
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
		assert.equal(await invalidDocReviewUpdate.text(), 'Bad request');

		const bulkDocReviewUpdate = await fetch(new URL('/api/docs/review', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({
				path: 'docs/guide.md',
				paths: ['docs/guide.md', 'docs/other.md'],
				status: 'approved',
				reviewerKind: 'llm',
				reviewerId: 'opencode',
			}),
		});
		assert.equal(bulkDocReviewUpdate.status, 400);
		assert.equal(await bulkDocReviewUpdate.text(), 'Bad request');

		const unchangedDocsReview = await fetch(new URL('/api/docs/review', info.url), {
			headers: { 'x-mustflow-dashboard-token': token },
		}).then((response) => response.json());
		assert.equal(unchangedDocsReview.count, 1);
		assert.equal(unchangedDocsReview.documents[0].status, 'pending');

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
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'refactoring.hotspots.large_file_candidate_kb')?.value,
			40,
		);
		assert.equal(preferences.settings.find((setting) => setting.id === 'refactoring.hotspots.history_days')?.value, 90);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'refactoring.hotspots.primary_candidate_limit')?.value,
			50,
		);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'refactoring.hotspots.structure_candidate_limit')?.value,
			10,
		);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'refactoring.hotspots.full_file_candidate_limit')?.value,
			3,
		);
		assert.ok(preferences.settings.some((setting) => setting.id === 'testing.authoring.new_test_policy'));
		assert.ok(preferences.settings.some((setting) => setting.id === 'testing.authoring.prefer_existing_tests'));
		assert.ok(
			preferences.settings
				.find((setting) => setting.id === 'git.commit_message.style')
				?.options.includes('gitmoji'),
		);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'git.commit_message.gitmoji.map')?.value,
			'conventional_default',
		);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'git.commit_message.body.template')?.value,
			'summary_validation',
		);
		assert.equal(
			preferences.settings.find((setting) => setting.id === 'git.commit_message.body.require_validation_line')?.value,
			true,
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
		assert.equal(await locked.text(), 'Bad request');

		const invalidLanguage = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'git.commit_message.language', value: 'not a language' }] }),
		});
		assert.equal(invalidLanguage.status, 400);

		const invalidGitmojiMap = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'git.commit_message.gitmoji.map', value: 'random' }] }),
		});
		assert.equal(invalidGitmojiMap.status, 400);

		const invalidBodyTemplate = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'git.commit_message.body.template', value: 'essay' }] }),
		});
		assert.equal(invalidBodyTemplate.status, 400);

		const invalidValidationLine = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'git.commit_message.body.require_validation_line', value: 'yes' }] }),
		});
		assert.equal(invalidValidationLine.status, 400);

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

		const invalidRefactoringHotspotThreshold = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'refactoring.hotspots.large_file_candidate_kb', value: 0 }] }),
		});
		assert.equal(invalidRefactoringHotspotThreshold.status, 400);

		const invalidRefactoringCandidateLimit = await fetch(new URL('/api/preferences', info.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-mustflow-dashboard-token': token,
			},
			body: JSON.stringify({ updates: [{ id: 'refactoring.hotspots.full_file_candidate_limit', value: 0 }] }),
		});
		assert.equal(invalidRefactoringCandidateLimit.status, 400);

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
					{ id: 'git.commit_message.gitmoji.map', value: 'conventional_default' },
					{ id: 'git.commit_message.body.template', value: 'summary_validation' },
					{ id: 'git.commit_message.body.require_validation_line', value: false },
					{ id: 'verification.selection.strategy', value: 'targeted' },
					{ id: 'verification.selection.skip_low_risk_code_full_test', value: false },
					{ id: 'verification.selection.report_skipped', value: false },
					{ id: 'refactoring.hotspots.large_file_candidate_kb', value: 96 },
					{ id: 'refactoring.hotspots.history_days', value: 45 },
					{ id: 'refactoring.hotspots.primary_candidate_limit', value: 24 },
					{ id: 'refactoring.hotspots.structure_candidate_limit', value: 8 },
					{ id: 'refactoring.hotspots.full_file_candidate_limit', value: 2 },
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
		assert.match(updatedPreferences, /\[git\.commit_message\.gitmoji\]\r?\n(?:.*\r?\n)*?map = "conventional_default"/);
		assert.match(updatedPreferences, /\[git\.commit_message\.body\]\r?\n(?:.*\r?\n)*?template = "summary_validation"/);
		assert.match(updatedPreferences, /\[git\.commit_message\.body\]\r?\n(?:.*\r?\n)*?require_validation_line = false/);
		assert.match(updatedPreferences, /\[verification\.selection\]\r?\n(?:.*\r?\n)*?strategy = "targeted"/);
		assert.match(updatedPreferences, /\[verification\.selection\]\r?\n(?:.*\r?\n)*?skip_low_risk_code_full_test = false/);
		assert.match(updatedPreferences, /\[verification\.selection\]\r?\n(?:.*\r?\n)*?report_skipped = false/);
		assert.match(updatedPreferences, /\[refactoring\.hotspots\]\r?\n(?:.*\r?\n)*?large_file_candidate_kb = 96/);
		assert.match(updatedPreferences, /\[refactoring\.hotspots\]\r?\n(?:.*\r?\n)*?history_days = 45/);
		assert.match(updatedPreferences, /\[refactoring\.hotspots\]\r?\n(?:.*\r?\n)*?primary_candidate_limit = 24/);
		assert.match(updatedPreferences, /\[refactoring\.hotspots\]\r?\n(?:.*\r?\n)*?structure_candidate_limit = 8/);
		assert.match(updatedPreferences, /\[refactoring\.hotspots\]\r?\n(?:.*\r?\n)*?full_file_candidate_limit = 2/);
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
