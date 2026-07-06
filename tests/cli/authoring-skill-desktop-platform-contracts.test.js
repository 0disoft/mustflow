import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readSkillDirectoryNames,
	readText,
	routeReasons,
} from './helpers/skill-contracts.js';

test('mobile energy efficiency review catches phone wakeups and battery drains', () => {
	const localSkill = readText('.mustflow/skills/mobile-energy-efficiency-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/mobile-energy-efficiency-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /wakeup, radio, sensor, location, rendering, timer, and I\/O pressure/u);
	assert.match(localSkill, /Android Vitals/u);
	assert.match(localSkill, /Power Profiler/u);
	assert.match(localSkill, /Macrobenchmark power metric/u);
	assert.match(localSkill, /Xcode Organizer/u);
	assert.match(localSkill, /MetricKit/u);
	assert.match(localSkill, /Instruments Power Profiler/u);
	assert.match(localSkill, /Energy evidence ledger/u);
	assert.match(localSkill, /User-value ledger/u);
	assert.match(localSkill, /Background work ledger/u);
	assert.match(localSkill, /Wakeup and radio ledger/u);
	assert.match(localSkill, /Location, sensor, and Bluetooth ledger/u);
	assert.match(localSkill, /Rendering and UI ledger/u);
	assert.match(localSkill, /Timer and storage ledger/u);
	assert.match(localSkill, /Platform power-mode ledger/u);
	assert.match(localSkill, /Doze/u);
	assert.match(localSkill, /App Standby/u);
	assert.match(localSkill, /WorkManager/u);
	assert.match(localSkill, /JobScheduler/u);
	assert.match(localSkill, /BackgroundTasks/u);
	assert.match(localSkill, /`beginBackgroundTask`/u);
	assert.match(localSkill, /unbounded Android background services/u);
	assert.match(localSkill, /exact alarms/u);
	assert.match(localSkill, /wake lock/u);
	assert.match(localSkill, /timeout, shortest possible scope, `try\/finally`/u);
	assert.match(localSkill, /high-priority push/u);
	assert.match(localSkill, /WebSocket/u);
	assert.match(localSkill, /polling/u);
	assert.match(localSkill, /Batch network work/u);
	assert.match(localSkill, /cellular/u);
	assert.match(localSkill, /constrained network/u);
	assert.match(localSkill, /connectivity callbacks/u);
	assert.match(localSkill, /Lower location accuracy first/u);
	assert.match(localSkill, /one-time location APIs/u);
	assert.match(localSkill, /background location/u);
	assert.match(localSkill, /geofences/u);
	assert.match(localSkill, /Stop sensors and BLE when done/u);
	assert.match(localSkill, /Stop invisible UI work/u);
	assert.match(localSkill, /overdraw/u);
	assert.match(localSkill, /blur, shadows/u);
	assert.match(localSkill, /Lower frame rate/u);
	assert.match(localSkill, /infinite loader/u);
	assert.match(localSkill, /Stable models/u);
	assert.match(localSkill, /Give timers slack/u);
	assert.match(localSkill, /Batch disk I\/O/u);
	assert.match(localSkill, /Low Power Mode and Battery Saver/u);
	assert.match(skillIndex, /\.mustflow\/skills\/mobile-energy-efficiency-review\/SKILL\.md/u);
	assert.match(skillIndex, /energy-efficiency triage/u);
	assert.match(skillIndex, /wake the phone, radio, GPS, sensors, GPU, CPU, or storage/u);
	assert.match(routes, /\[routes\."mobile-energy-efficiency-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 78/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'ui_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/mobile-energy-efficiency-review\/SKILL\.md"/u);
	assert.match(manifest, /"mobile-energy-efficiency-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.mobile-energy-efficiency-review"\][\s\S]*?revision = 1/u);
});

test('app startup performance review separates first frame from usable launch', () => {
	const localSkill = readText('.mustflow/skills/app-startup-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/app-startup-performance-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /icon tap or process start to first frame/u);
	assert.match(localSkill, /fully usable state/u);
	assert.match(localSkill, /cold start/u);
	assert.match(localSkill, /warm start/u);
	assert.match(localSkill, /hot start/u);
	assert.match(localSkill, /release or profile builds on a low-end physical device/u);
	assert.match(localSkill, /Android Vitals/u);
	assert.match(localSkill, /TTID/u);
	assert.match(localSkill, /TTFD/u);
	assert.match(localSkill, /`reportFullyDrawn\(\)`/u);
	assert.match(localSkill, /Macrobenchmark/u);
	assert.match(localSkill, /Perfetto/u);
	assert.match(localSkill, /Startup Profile/u);
	assert.match(localSkill, /Baseline Profile/u);
	assert.match(localSkill, /Xcode Organizer/u);
	assert.match(localSkill, /Instruments App Launch/u);
	assert.match(localSkill, /Time Profiler/u);
	assert.match(localSkill, /`Application\.onCreate\(\)`/u);
	assert.match(localSkill, /`AppDelegate`/u);
	assert.match(localSkill, /ContentProvider auto-init/u);
	assert.match(localSkill, /AndroidX App Startup/u);
	assert.match(localSkill, /dependency injection/u);
	assert.match(localSkill, /SDK initialization/u);
	assert.match(localSkill, /Kotlin `object`/u);
	assert.match(localSkill, /companion object/u);
	assert.match(localSkill, /Java static blocks/u);
	assert.match(localSkill, /Objective-C `\+load`/u);
	assert.match(localSkill, /C\+\+ static constructors/u);
	assert.match(localSkill, /SharedPreferences/u);
	assert.match(localSkill, /DataStore/u);
	assert.match(localSkill, /UserDefaults/u);
	assert.match(localSkill, /Keychain/u);
	assert.match(localSkill, /SQLite/u);
	assert.match(localSkill, /JSON files/u);
	assert.match(localSkill, /small cache snapshot/u);
	assert.match(localSkill, /local token/u);
	assert.match(localSkill, /remote config/u);
	assert.match(localSkill, /kill switch/u);
	assert.match(localSkill, /database migrations/u);
	assert.match(localSkill, /cache cleanup/u);
	assert.match(localSkill, /thumbnail regeneration/u);
	assert.match(localSkill, /log compression/u);
	assert.match(localSkill, /custom charts/u);
	assert.match(localSkill, /maps/u);
	assert.match(localSkill, /video/u);
	assert.match(localSkill, /Lottie/u);
	assert.match(localSkill, /shadows/u);
	assert.match(localSkill, /blur/u);
	assert.match(localSkill, /SVG-heavy/u);
	assert.match(localSkill, /custom font/u);
	assert.match(localSkill, /R8/u);
	assert.match(localSkill, /Hermes/u);
	assert.match(localSkill, /inline require/u);
	assert.match(localSkill, /deferred components/u);
	assert.match(localSkill, /shader warmup/u);
	assert.match(localSkill, /on-demand modules/u);
	assert.match(localSkill, /splash-screen masking/u);
	assert.match(skillIndex, /\.mustflow\/skills\/app-startup-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /icon tap or process launch to first frame/u);
	assert.match(skillIndex, /fully usable state/u);
	assert.match(skillIndex, /splash masking/u);
	assert.match(routes, /\[routes\."app-startup-performance-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'ui_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/app-startup-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"app-startup-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.app-startup-performance-review"\][\s\S]*?revision = 1/u);
});

test('desktop background process stability review treats process death as normal', () => {
	const localSkill = readText('.mustflow/skills/desktop-background-process-stability-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/desktop-background-process-stability-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /recoverable local systems/u);
	assert.match(localSkill, /Windows services/u);
	assert.match(localSkill, /SCM failure actions/u);
	assert.match(localSkill, /preshutdown/u);
	assert.match(localSkill, /service SIDs/u);
	assert.match(localSkill, /Session 0 boundaries/u);
	assert.match(localSkill, /LaunchDaemons/u);
	assert.match(localSkill, /LaunchAgents/u);
	assert.match(localSkill, /launchd restart behavior/u);
	assert.match(localSkill, /systemd user units/u);
	assert.match(localSkill, /start-rate limits/u);
	assert.match(localSkill, /Electron main or utility processes/u);
	assert.match(localSkill, /WebView helpers/u);
	assert.match(localSkill, /tray apps/u);
	assert.match(localSkill, /sync workers/u);
	assert.match(localSkill, /durable checkpoints/u);
	assert.match(localSkill, /startup recovery/u);
	assert.match(localSkill, /stale-lock cleanup/u);
	assert.match(localSkill, /single-instance locks/u);
	assert.match(localSkill, /data-directory locks/u);
	assert.match(localSkill, /`pending`, `leased`, `done`, and `failed`/u);
	assert.match(localSkill, /`job_id`, `dedupe_key`, `attempt`, `lease_until`, `completed_at`/u);
	assert.match(localSkill, /write-temp,\s+flush, fsync, and atomic rename/u);
	assert.match(localSkill, /shutdown hooks[\s\S]*?best-effort\s+cleanup/u);
	assert.match(localSkill, /backoff, max attempts, failure classification, and safe mode/u);
	assert.match(localSkill, /live PID only proves a process exists/u);
	assert.match(localSkill, /`last_seen_at` alone/u);
	assert.match(localSkill, /progress evidence/u);
	assert.match(localSkill, /user-session process through authorized IPC/u);
	assert.match(localSkill, /do\s+not daemonize under launchd/u);
	assert.match(localSkill, /sleep and resume/u);
	assert.match(localSkill, /monotonic clock/u);
	assert.match(localSkill, /localhost ports, named pipes, Unix sockets/u);
	assert.match(localSkill, /ACLs, caller tokens, origin checks/u);
	assert.match(localSkill, /absolute executable paths/u);
	assert.match(localSkill, /least privilege/u);
	assert.match(localSkill, /crash reporting/u);
	assert.match(localSkill, /drain or shorten leases/u);
	assert.match(localSkill, /safe mode/u);
	assert.match(skillIndex, /\.mustflow\/skills\/desktop-background-process-stability-review\/SKILL\.md/u);
	assert.match(skillIndex, /OS-supervisor restart policy/u);
	assert.match(skillIndex, /deterministic environment/u);
	assert.match(skillIndex, /immortal-process fantasy/u);
	assert.match(routes, /\[routes\."desktop-background-process-stability-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 81/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'ui_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/desktop-background-process-stability-review\/SKILL\.md"/u);
	assert.match(manifest, /"desktop-background-process-stability-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.desktop-background-process-stability-review"\][\s\S]*?revision = 1/u);
});

test('desktop auto update safety review treats updater feeds as remote code execution', () => {
	const localSkill = readText('.mustflow/skills/desktop-auto-update-safety-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/desktop-auto-update-safety-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /remote code-execution supply chain/u);
	assert.match(localSkill, /Electron `autoUpdater`/u);
	assert.match(localSkill, /electron-builder update feeds/u);
	assert.match(localSkill, /Squirrel\.Windows/u);
	assert.match(localSkill, /Sparkle/u);
	assert.match(localSkill, /Tauri updater/u);
	assert.match(localSkill, /`latest\.yml`, `latest\.json`, appcast XML/u);
	assert.match(localSkill, /staged rollout/u);
	assert.match(localSkill, /deterministic canary buckets/u);
	assert.match(localSkill, /alpha\/beta\/stable channel/u);
	assert.match(localSkill, /signing-key custody/u);
	assert.match(localSkill, /key rotation/u);
	assert.match(localSkill, /certificate expiry/u);
	assert.match(localSkill, /single-flight update checks/u);
	assert.match(localSkill, /quit-and-install timing/u);
	assert.match(localSkill, /old-version upgrade tests/u);
	assert.match(localSkill, /post-relaunch heartbeat/u);
	assert.match(localSkill, /artifact-before-metadata ordering/u);
	assert.match(localSkill, /Keep signing private keys off the release server/u);
	assert.match(localSkill, /stable clients cannot accidentally consume beta or alpha metadata/u);
	assert.match(localSkill, /single-flight or mutex path/u);
	assert.match(localSkill, /Squirrel\.Windows first-run/u);
	assert.match(localSkill, /development mode/u);
	assert.match(localSkill, /higher version/u);
	assert.match(localSkill, /download completion as incomplete/u);
	assert.match(skillIndex, /\.mustflow\/skills\/desktop-auto-update-safety-review\/SKILL\.md/u);
	assert.match(skillIndex, /metadata pointer order/u);
	assert.match(skillIndex, /duplicate `checkForUpdates\(\)` downloads/u);
	assert.match(skillIndex, /same-version hotfix fantasy/u);
	assert.match(routes, /\[routes\."desktop-auto-update-safety-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 82/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'ui_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/desktop-auto-update-safety-review\/SKILL\.md"/u);
	assert.match(manifest, /"desktop-auto-update-safety-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.desktop-auto-update-safety-review"\][\s\S]*?revision = 1/u);
});

test('low-end device support review turns device constraints into budgets', () => {
	const localSkill = readText('.mustflow/skills/low-end-device-support-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/low-end-device-support-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /capability budget across CPU, GPU, RAM, storage, network/u);
	assert.match(localSkill, /Android Go/u);
	assert.match(localSkill, /low-RAM Android/u);
	assert.match(localSkill, /older iOS/u);
	assert.match(localSkill, /`isLowRamDevice\(\)`/u);
	assert.match(localSkill, /`getMemoryClass\(\)`/u);
	assert.match(localSkill, /bottom 10% devices/u);
	assert.match(localSkill, /home first frame p90/u);
	assert.match(localSkill, /fully usable p90/u);
	assert.match(localSkill, /cold-start frequency/u);
	assert.match(localSkill, /TTID/u);
	assert.match(localSkill, /TTFD/u);
	assert.match(localSkill, /ContentProvider auto-init/u);
	assert.match(localSkill, /AndroidX App Startup/u);
	assert.match(localSkill, /Baseline Profile/u);
	assert.match(localSkill, /Startup Profile/u);
	assert.match(localSkill, /R8/u);
	assert.match(localSkill, /local defaults/u);
	assert.match(localSkill, /remote config/u);
	assert.match(localSkill, /main thread/u);
	assert.match(localSkill, /frozen frames over 700ms/u);
	assert.match(localSkill, /16ms frame budget/u);
	assert.match(localSkill, /transform, opacity, and rotation/u);
	assert.match(localSkill, /blur, shadow, gradient, glass/u);
	assert.match(localSkill, /peak memory/u);
	assert.match(localSkill, /LMK/u);
	assert.match(localSkill, /zRAM/u);
	assert.match(localSkill, /dirty memory/u);
	assert.match(localSkill, /`onTrimMemory\(\)`/u);
	assert.match(localSkill, /iOS memory warning/u);
	assert.match(localSkill, /Cap concurrency by screen/u);
	assert.match(localSkill, /image decode, JSON parsing, DB queries/u);
	assert.match(localSkill, /4048x3036 image can be about 48MB/u);
	assert.match(localSkill, /`ARGB_8888`/u);
	assert.match(localSkill, /GIF/u);
	assert.match(localSkill, /Lottie/u);
	assert.match(localSkill, /stable keys/u);
	assert.match(localSkill, /lazy layout or virtualization/u);
	assert.match(localSkill, /`remember`/u);
	assert.match(localSkill, /`derivedStateOf`/u);
	assert.match(localSkill, /SwiftUI/u);
	assert.match(localSkill, /`body`/u);
	assert.match(localSkill, /LRU/u);
	assert.match(localSkill, /SQLite WAL/u);
	assert.match(localSkill, /transactions/u);
	assert.match(localSkill, /large JSON, plist, or XML/u);
	assert.match(localSkill, /Batch disk writes/u);
	assert.match(localSkill, /first-screen API fan-out/u);
	assert.match(localSkill, /WorkManager/u);
	assert.match(localSkill, /wake locks/u);
	assert.match(localSkill, /polling/u);
	assert.match(localSkill, /coarse location/u);
	assert.match(localSkill, /sensors/u);
	assert.match(localSkill, /first-run essential, after-first-screen, or feature-entry/u);
	assert.match(localSkill, /auto screen tracking/u);
	assert.match(skillIndex, /\.mustflow\/skills\/low-end-device-support-review\/SKILL\.md/u);
	assert.match(skillIndex, /low-end capability budgets/u);
	assert.match(skillIndex, /bottom-percentile device\s+evidence/u);
	assert.match(routes, /\[routes\."low-end-device-support-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 80/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'ui_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/low-end-device-support-review\/SKILL\.md"/u);
	assert.match(manifest, /"low-end-device-support-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.low-end-device-support-review"\][\s\S]*?revision = 1/u);
});
