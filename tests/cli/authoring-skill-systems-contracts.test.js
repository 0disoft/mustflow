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

test('connection lifecycle integrity skill keeps transport, request, body, and shutdown ownership separate', () => {
	const skillName = 'connection-lifecycle-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const localReference = readText(
		`.mustflow/skills/${skillName}/references/node-stream-transport-lifecycle-checklist.md`,
	);
	const templateReference = readText(
		`templates/default/locales/en/.mustflow/skills/${skillName}/references/node-stream-transport-lifecycle-checklist.md`,
	);
	const localFaultReference = readText(
		`.mustflow/skills/${skillName}/references/connection-fault-injection-resource-lifetime-validation.md`,
	);
	const templateFaultReference = readText(
		`templates/default/locales/en/.mustflow/skills/${skillName}/references/connection-fault-injection-resource-lifetime-validation.md`,
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const profileBlock = (profile) => {
		const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(match, `missing ${profile} profile`);
		return match[1];
	};

	assert.equal(localSkill, templateSkill);
	assert.equal(localReference, templateReference);
	assert.equal(localFaultReference, templateFaultReference);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /physical connections, transport read and write sides, logical requests/u);
	assert.match(localSkill, /every owned connection record is finalized exactly once/u);
	assert.match(localSkill, /abortive destroy or reset action is accepted at most once/u);
	assert.match(localSkill, /Replace a single closing enum with orthogonal dimensions/u);
	assert.match(localSkill, /Finalize and remove a physical connection record once, after physical close/u);
	assert.match(localSkill, /Apply cancellation and reuse at HTTP\/2 stream scope/u);
	assert.match(localSkill, /Settle cancellation separately from releasing a reader lock/u);
	assert.match(localSkill, /do not mistake a high-water mark for a global hard limit/u);
	assert.match(localSkill, /Do not use `unref`, garbage collection, finalization registries, or process exit/u);
	assert.match(localSkill, /child-process natural-exit test without `process\.exit`/u);
	assert.match(localSkill, /closed cohorts and uncontaminated resource evidence/u);
	assert.match(localSkill, /full application, a library-only reproducer/u);
	assert.match(localSkill, /fix candidate, mitigation, symptom suppression, and permanent resolution/u);

	assert.match(localReference, /TransportState = CONNECTING \| OPEN \| ABORTING \| CLOSED/u);
	assert.match(localReference, /Graceful FIN, either side first/u);
	assert.match(localReference, /parserAtMessageBoundary == true/u);
	assert.match(localReference, /`reader\.cancel\(\)` completion and `reader\.releaseLock\(\)` are separate facts/u);
	assert.match(localReference, /Every accepted write settles once as success or failure/u);
	assert.match(localReference, /B_owned = B_node_readable/u);
	assert.match(localReference, /global dispatcher -> origin pool -> client -> socket/u);
	assert.match(localReference, /duplicate_finalize_total == 0/u);
	assert.match(localFaultReference, /Do not count `TIME_WAIT` as an open application socket/u);
	assert.match(localFaultReference, /started = succeeded \+ expected_faulted \+ unexpected_failed/u);
	assert.match(localFaultReference, /`CLOSE_WAIT` \| Any additional connection persists for at least 60 seconds/u);
	assert.match(localFaultReference, /TCP RST from HTTP\/2 `RST_STREAM\(CANCEL\)`/u);
	assert.match(localFaultReference, /No enqueue after backpressure without drain/u);
	assert.match(localFaultReference, /full application;\n2\. minimal program using the candidate library/u);
	assert.match(localFaultReference, /fails 20 of 20 runs before the fix/u);
	assert.match(localFaultReference, /mixed profile passes 24 hours/u);

	assert.match(skillIndex, /Use `connection-lifecycle-integrity-review` as an adjunct/u);
	assert.match(skillIndex, /single closing enum, destroy-everywhere cleanup, duplicate finalize/u);
	assert.match(
		routes,
		/\[routes\."connection-lifecycle-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 83/u,
	);
	for (const reason of [
		'unknown_change',
		'behavior_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'docs_change',
		'release_risk',
	]) {
		assert.ok(routeReasons(routes, skillName).includes(reason), `missing route reason ${reason}`);
	}
	assert.match(routes, /positive_terms = \[[^\]]*"fault-injection"[^\]]*"half-close"[^\]]*"soak-test"/u);
	assert.match(routes, /negative_terms = \[[^\]]*"domain-lifecycle-only"/u);

	assert.match(manifest, /"\.mustflow\/skills\/connection-lifecycle-integrity-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/connection-lifecycle-integrity-review\/references\/connection-fault-injection-resource-lifetime-validation\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/connection-lifecycle-integrity-review\/references\/node-stream-transport-lifecycle-checklist\.md"/u,
	);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.match(profileBlock(profile), /"connection-lifecycle-integrity-review"/u);
	}
	assertI18nSkillDocument(i18n, skillName, 2);
	assertSkillsIndexRevision(i18n);
});

test('Godot code change skill keeps scene, resource, save, rendering, and export risks explicit', () => {
	const localSkill = readText('.mustflow/skills/godot-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/godot-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /Godot projects, scenes, nodes, GDScript/u);
	assert.match(localSkill, /Version Gate/u);
	assert.match(localSkill, /Do not mix stable docs for one branch, latest docs for another branch/u);
	assert.match(localSkill, /check obsolete 3\.x habits such as `yield`/u);
	assert.match(localSkill, /Build a scene and ownership ledger/u);
	assert.match(localSkill, /reject distant relative paths, `\/root\/Main` reach-through/u);
	assert.match(localSkill, /do not assume a new scene is immediately ready after `change_scene_to_\*`/u);
	assert.match(localSkill, /`queue_free\(\)` is deferred deletion, `remove_child\(\)` is detachment/u);
	assert.match(localSkill, /use signals for events, not hidden remote commands/u);
	assert.match(localSkill, /`call_group` and `set_group` as broad broadcasts/u);
	assert.match(localSkill, /Keep Autoloads limited to true process-wide services/u);
	assert.match(localSkill, /path-loaded Resources are cached shared references/u);
	assert.match(localSkill, /never mutate authoring Resources as per-instance runtime state/u);
	assert.match(localSkill, /avoid per-frame `find_child`, `find_children`, and `find_parent`/u);
	assert.match(localSkill, /write user data to `user:\/\/`/u);
	assert.match(localSkill, /avoid object deserialization from untrusted files/u);
	assert.match(localSkill, /do not touch active SceneTree nodes directly from background threads/u);
	assert.match(localSkill, /require profiler or frame-time evidence before accepting performance claims/u);
	assert.match(localSkill, /export presets, export templates, platform architectures, signing/u);

	assert.match(skillIndex, /Use `godot-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/godot-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /Godot projects, scenes, nodes, GDScript, C# scripts, Resources/u);
	assert.match(
		routes,
		/\[routes\."godot-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['behavior_change', 'docs_change', 'performance_change', 'privacy_change', 'data_change', 'ui_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'godot-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/godot-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"godot-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.godot-code-change"\][\s\S]*?revision = 1/u);
});

test('C code change skill keeps C23, pointer, memory, and performance contracts explicit', () => {
	const localSkill = readText('.mustflow/skills/c-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/c-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /C23, officially ISO\/IEC 9899:2024/u);
	assert.match(localSkill, /`__STDC_VERSION__` value is `202311L`/u);
	assert.match(localSkill, /C2y is draft work, not a finalized\s+standard/u);
	assert.match(localSkill, /Do not introduce C23-only features/u);
	assert.match(localSkill, /`bool`, `true`, `false`, `static_assert`, `thread_local`/u);
	assert.match(localSkill, /`nullptr`, `nullptr_t`, `_BitInt`/u);
	assert.match(localSkill, /`typeof`, `typeof_unqual`, `constexpr`, empty initializer `\{\}`/u);
	assert.match(localSkill, /`#embed`, `__has_include`, `#elifdef`, `#warning`,\s+`__VA_OPT__`/u);
	assert.match(localSkill, /`<stdckdint\.h>`, `<stdbit\.h>`/u);
	assert.match(localSkill, /K&R function definitions are not valid modern C/u);
	assert.match(localSkill, /keep `void f\(void\)` for no-argument functions/u);
	assert.match(localSkill, /Two's-complement signed representation does not make signed overflow\s+defined/u);
	assert.match(localSkill, /pointer as only an integer address/u);
	assert.match(localSkill, /lifetime,\s+provenance, bounds, and alignment/u);
	assert.match(localSkill, /same array object or one-past boundary/u);
	assert.match(localSkill, /integer-pointer round trip is not proof/u);
	assert.match(localSkill, /effective type and aliasing legal/u);
	assert.match(localSkill, /type-pun by casting and dereferencing incompatible pointer types/u);
	assert.match(localSkill, /Use `memcpy` for representation moves/u);
	assert.match(localSkill, /Treat `restrict` as an aliasing contract/u);
	assert.match(localSkill, /Use `malloc\(n \* sizeof \*p\)` style only with checked multiplication/u);
	assert.match(localSkill, /Do not assign `realloc` directly/u);
	assert.match(localSkill, /`realloc\(p, 0\)` as unsafe and, in C23, undefined behavior/u);
	assert.match(localSkill, /pointer\+length or begin\/end pairs/u);
	assert.match(localSkill, /Do not recover array\s+length from a function parameter with `sizeof`/u);
	assert.match(localSkill, /Treat `strncpy` as fixed-width record padding/u);
	assert.match(localSkill, /Cast to `unsigned char` before passing plain byte values to `ctype\.h`/u);
	assert.match(localSkill, /Store `getchar` and similar EOF-capable results in `int`/u);
	assert.match(localSkill, /Use `memmove` when source and destination may overlap/u);
	assert.match(localSkill, /Use unsigned types for masks, shifts, and wraparound semantics/u);
	assert.match(localSkill, /volatile` only for the narrow cases/u);
	assert.match(localSkill, /It is not thread synchronization/u);
	assert.match(localSkill, /warning set, sanitizer set, optimization level/u);
	assert.match(localSkill, /Do not use `-Ofast` or\s+`-march=native` for portable release builds/u);
	assert.match(localSkill, /LTO, PGO, visibility, `-march`, `-mtune`/u);
	assert.match(localSkill, /cross-compiler,\s+cross-libc, cross-architecture, and benchmark verification/u);

	assert.match(skillIndex, /Use `c-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/c-code-change\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."c-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['code_change', 'behavior_change', 'performance_change', 'security_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'c-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/c-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"c-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.c-code-change"\][\s\S]*?revision = 1/u);
});

test('PowerShell code change skill keeps quoting, parser layers, and native argv explicit', () => {
	const localSkill = readText('.mustflow/skills/powershell-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/powershell-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /parser layering/u);
	assert.match(localSkill, /PowerShell expression or argument mode/u);
	assert.match(localSkill, /native program parser/u);
	assert.match(localSkill, /single-quoted strings for literal values/u);
	assert.match(localSkill, /double-quoted strings only when variable or subexpression expansion is required/u);
	assert.match(localSkill, /subexpressions for member access/u);
	assert.match(localSkill, /`\$\{name\}`/u);
	assert.match(localSkill, /single-quoted here-strings/u);
	assert.match(localSkill, /Avoid line-ending backticks/u);
	assert.match(localSkill, /splatting/u);
	assert.match(localSkill, /Use `--` only/u);
	assert.match(localSkill, /Use `--%` only as a narrow Windows-native stop-parsing fallback/u);
	assert.match(localSkill, /outer quotation marks are normally consumed/u);
	assert.match(localSkill, /Build native command arguments as arrays/u);
	assert.match(localSkill, /call operator/u);
	assert.match(localSkill, /\$PSNativeCommandArgumentPassing/u);
	assert.match(localSkill, /Prefer direct native invocation over `Start-Process`/u);
	assert.match(localSkill, /Do not use `Invoke-Expression`/u);
	assert.match(localSkill, /regex, wildcard, and replacement operations/u);
	assert.match(localSkill, /mechanical repository file rewrites/u);
	assert.match(localSkill, /count expected matches before writing/u);
	assert.match(localSkill, /explicit encoding/u);
	assert.match(localSkill, /UTF-8 without BOM/u);
	assert.match(localSkill, /Normalize CRLF and lone CR to LF/u);
	assert.match(localSkill, /Windows PowerShell 5\.1 and PowerShell 6\+/u);
	assert.match(localSkill, /do not assume the last read command caused them/u);
	assert.match(localSkill, /Prefer `-File`, stdin, or an encoded command/u);
	assert.match(localSkill, /command-injection risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/powershell-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /parser-layer confusion, quote loss/u);
	assert.match(routes, /\[routes\."powershell-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'code_change',
		'test_change',
		'docs_change',
		'package_metadata_change',
		'workflow_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/powershell-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"powershell-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.powershell-code-change"\][\s\S]*?revision = 2/u);
});

test('shell code change skill keeps dialect, expansion, CI, and filename boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/shell-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/shell-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Treat `#!\/bin\/sh` as POSIX sh, not as a restrained Bash mode/u);
	assert.match(localSkill, /GitHub Actions `run` block as generated script text/u);
	assert.match(localSkill, /workflow expression interpolation from shell expansion/u);
	assert.match(localSkill, /Bash-only syntax such as arrays/u);
	assert.match(localSkill, /POSIX portability and Bash convenience conflict/u);
	assert.match(localSkill, /`set -e`, `errexit`, `ERR` traps, `nounset`, and `pipefail` as partial tools/u);
	assert.match(localSkill, /`pipefail` is not portable to older POSIX sh targets/u);
	assert.match(localSkill, /Quote parameter expansions by default/u);
	assert.match(localSkill, /Do not parse human-oriented command output/u);
	assert.match(localSkill, /filenames as path values, not newline-delimited text/u);
	assert.match(localSkill, /Prefer `find -exec \.\.\. \{\} \+`/u);
	assert.match(localSkill, /default `xargs` for arbitrary\s+filenames/u);
	assert.match(localSkill, /distinguish no match from error/u);
	assert.match(localSkill, /avoid assuming in-place editing syntax is portable/u);
	assert.match(localSkill, /pass dynamic values as data variables/u);
	assert.match(localSkill, /GNU, BSD\/macOS, BusyBox, or\s+POSIX/u);
	assert.match(localSkill, /locale-sensitive behavior/u);
	assert.match(localSkill, /command substitution as scalar capture/u);
	assert.match(localSkill, /subshell boundaries/u);
	assert.match(localSkill, /destructive operations/u);
	assert.match(localSkill, /untrusted GitHub context values/u);
	assert.match(localSkill, /Keep secrets out of trace output/u);
	assert.match(localSkill, /`eval`, dynamic `source`/u);
	assert.match(localSkill, /line-ending verification/u);
	assert.match(localSkill, /do not stop at "non-empty" validation/u);
	assert.match(localSkill, /action output-path/u);
	assert.match(skillIndex, /Use `shell-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/shell-code-change\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."shell-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['code_change', 'workflow_change', 'security_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'shell-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/shell-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"shell-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.shell-code-change"\][\s\S]*?revision = 2/u);
});

test('structured config change skill keeps YAML, TOML, workflow, and schema contracts explicit', () => {
	const localSkill = readText('.mustflow/skills/structured-config-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/structured-config-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	const profileBlock = (profile) => {
		const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(match, `missing ${profile} profile`);
		return match[1];
	};

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /YAML 1\.1-like versus YAML 1\.2-like implicit typing/u);
	assert.match(localSkill, /TOML 1\.0 versus TOML 1\.1 syntax/u);
	assert.match(localSkill, /GitHub Actions workflow structure changes outside shell code/u);
	assert.match(localSkill, /text parse;\s+- parsed data model;\s+- schema validation;\s+- semantic or provider validation/u);
	assert.match(localSkill, /quote human-word strings, country codes, identifiers, versions/u);
	assert.match(localSkill, /missing, `null`, and empty string distinct/u);
	assert.match(localSkill, /reject duplicate keys and avoid relying on mapping order/u);
	assert.match(localSkill, /Avoid YAML merge key `<<` unless/u);
	assert.match(localSkill, /strings need quotes, booleans are lowercase, keys are case-sensitive/u);
	assert.match(localSkill, /Dotted keys create nested tables/u);
	assert.match(localSkill, /inline tables, treat them as sealed value objects/u);
	assert.match(localSkill, /arrays of tables, keep each array element and its child tables together/u);
	assert.match(localSkill, /quote glob patterns that begin with `\*`, `\[`, or `!`/u);
	assert.match(localSkill, /setting any explicit permission makes unspecified permissions `none`/u);
	assert.match(localSkill, /Treat JSON Schema `default` as metadata/u);
	assert.match(localSkill, /Negative fixtures should cover duplicate keys, ambiguous scalar typing/u);
	assert.match(localSkill, /Do not infer raw validator, provider, package-manager, CI, or formatter commands/u);
	assert.match(skillIndex, /Use `structured-config-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/structured-config-change\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."structured-config-change"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 84/u,
	);
	for (const reason of ['workflow_change', 'mustflow_config_change', 'package_metadata_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'structured-config-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/structured-config-change\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(profileBlock(profile).includes('"structured-config-change"'), `${profile} profile missing skill`);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.structured-config-change"\][\s\S]*?revision = 1/u);
});
