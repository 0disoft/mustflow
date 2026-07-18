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

test('parser engineering review keeps source, recovery, incremental, Unicode, and hostile-input contracts explicit', () => {
	const localSkill = readText('.mustflow/skills/parser-engineering-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/parser-engineering-review/SKILL.md');
	const localLexerChecklist = readText(
		'.mustflow/skills/parser-engineering-review/references/lexer-tokenization-checklist.md',
	);
	const templateLexerChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/parser-engineering-review/references/lexer-tokenization-checklist.md',
	);
	const localCstAstChecklist = readText(
		'.mustflow/skills/parser-engineering-review/references/cst-ast-lowering-checklist.md',
	);
	const templateCstAstChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/parser-engineering-review/references/cst-ast-lowering-checklist.md',
	);
	const localTraversalChecklist = readText(
		'.mustflow/skills/parser-engineering-review/references/tree-traversal-rewrite-checklist.md',
	);
	const templateTraversalChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/parser-engineering-review/references/tree-traversal-rewrite-checklist.md',
	);
	const localSerializationChecklist = readText(
		'.mustflow/skills/parser-engineering-review/references/tree-serialization-compatibility-checklist.md',
	);
	const templateSerializationChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/parser-engineering-review/references/tree-serialization-compatibility-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localLexerChecklist, templateLexerChecklist);
	assert.equal(localCstAstChecklist, templateCstAstChecklist);
	assert.equal(localTraversalChecklist, templateTraversalChecklist);
	assert.equal(localSerializationChecklist, templateSerializationChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /^revision: 4$/mu);
	for (const signal of [
		'lossless CST',
		'UTF-16 offset',
		'left binding power',
		'right associativity',
		'fixed character radius is not a',
		'ParseBudget',
		'wireBytes',
		'workUnits',
		'same immutable parse result',
		'do not reset counters at transformation or subgrammar boundaries',
		'One-shot input versus multiple chunk partitions',
		'Full-parse versus incremental-parse differential tests',
		'phenomenon while shrinking failures',
		'CST-to-AST loss ledger',
		'surface AST distinct from HIR or core trees',
		'phase-specific verifier',
		'tree-traversal-rewrite-checklist.md',
		'tree-serialization-compatibility-checklist.md',
	]) {
		assert.ok(localSkill.includes(signal), `parser skill should include ${signal}`);
	}
	assert.match(localSkill, /reach EOF, consume at least one input unit, or emit a bounded/u);
	assert.match(localSkill, /last accepting checkpoint, not the first accepting state/u);
	assert.match(localSkill, /references\/lexer-tokenization-checklist\.md/u);
	assert.match(localSkill, /references\/cst-ast-lowering-checklist\.md/u);
	assert.match(localSkill, /apply `fuzz-harness-review` as the campaign\s+owner/u);
	assert.match(localSkill, /unvalidated second parse is not sufficient/u);
	for (const signal of [
		'[startByte, endByte)',
		'comparisonEnd',
		'contextual keywords',
		'XID_Start',
		'position encoding',
		'one `insideString` boolean',
		'`1..2`',
		'one bounded malformed token',
		'a fixed character radius',
		'`NeedMoreInput`',
		'`faultOffset`',
		'`recoverySpan`',
		'`relexedBytesPerEdit`',
		'`ResourceLimitExceeded(kind, offset, observed, limit)`',
		'`(canonicalKind, rawStart, rawEnd, flags)`',
		'Checkpoint serialize/deserialize',
		'Treat NUL as input data',
	]) {
		assert.ok(localLexerChecklist.includes(signal), `lexer checklist should include ${signal}`);
	}
	for (const signal of [
		'Layer contract ledger',
		'Lossless CST invariants',
		'Surface AST boundary',
		'AST schema and local invariants',
		'Absence, recovery, and synthetic states',
		'CST-to-AST loss ledger',
		'Evaluation order, scope, and reference semantics',
		'Keep `NodeId`, source span, and structural hash distinct',
		'generation-aware side tables',
		'Tree verification',
		'Compare incremental CST, AST, origin maps, and side-table invalidation',
		'recovery never forges a',
	]) {
		assert.ok(localCstAstChecklist.includes(signal), `CST and AST checklist should include ${signal}`);
	}
	for (const signal of [
		'Responsibility split',
		'Visitor | One immutable snapshot',
		'Transformation result algebra',
		'`Keep` for unchanged identity and structure',
		'Edit collection and conflict resolution',
		'Handles and identity across snapshots',
		'`Alive`, `Replaced`, `Deleted`, `Ambiguous`, `WrongDocument`, or `OutOfDate`',
		'Default unproven analyses to invalid',
		'Rewrite termination',
		'Tree and graph traversal',
		'Publish the new root and compatible analysis',
		'rewrite idempotence',
	]) {
		assert.ok(localTraversalChecklist.includes(signal), `tree traversal checklist should include ${signal}`);
	}
	for (const signal of [
		'Artifact lifetime contract',
		'Memory model and wire schema',
		'Header and early rejection',
		'Schema evolution and presence',
		'Bounded decoding',
		'Two-phase graph reconstruction',
		'Validation layers',
		'Deterministic encoding',
		'Cross-version and migration matrix',
		'Do not serialize raw snapshot-local IDs',
		'Fuzz targets and oracles',
		'oracles, not campaign authority',
	]) {
		assert.ok(localSerializationChecklist.includes(signal), `tree serialization checklist should include ${signal}`);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/parser-engineering-review\/SKILL\.md/u);
	assert.match(routes, /\[routes\."parser-engineering-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 79/u);
	assert.deepEqual(routeReasons(routes, 'parser-engineering-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'data_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/parser-engineering-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/parser-engineering-review\/references\/lexer-tokenization-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/parser-engineering-review\/references\/cst-ast-lowering-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/parser-engineering-review\/references\/tree-traversal-rewrite-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/parser-engineering-review\/references\/tree-serialization-compatibility-checklist\.md"/u,
	);
	assert.match(manifest, /"parser-engineering-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'parser-engineering-review', 4);
});

test('compiler engineering review localizes semantics and owns test, differential, generator, IR, ABI, and linker oracles', () => {
	const localSkill = readText('.mustflow/skills/compiler-engineering-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/SKILL.md',
	);
	const localIrChecklist = readText(
		'.mustflow/skills/compiler-engineering-review/references/miscompile-reduction-ir-checklist.md',
	);
	const templateIrChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/references/miscompile-reduction-ir-checklist.md',
	);
	const localIrDesignChecklist = readText(
		'.mustflow/skills/compiler-engineering-review/references/ir-design-ssa-pass-pipeline-checklist.md',
	);
	const templateIrDesignChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/references/ir-design-ssa-pass-pipeline-checklist.md',
	);
	const localBoundaryChecklist = readText(
		'.mustflow/skills/compiler-engineering-review/references/compiler-diagnostics-abi-linker-checklist.md',
	);
	const templateBoundaryChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/references/compiler-diagnostics-abi-linker-checklist.md',
	);
	const localDebugChecklist = readText(
		'.mustflow/skills/compiler-engineering-review/references/debug-symbol-symbolication-checklist.md',
	);
	const templateDebugChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/references/debug-symbol-symbolication-checklist.md',
	);
	const localTestStrategyChecklist = readText(
		'.mustflow/skills/compiler-engineering-review/references/compiler-test-strategy-differential-checklist.md',
	);
	const templateTestStrategyChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/references/compiler-test-strategy-differential-checklist.md',
	);
	const localGeneratorChecklist = readText(
		'.mustflow/skills/compiler-engineering-review/references/compiler-generators-properties-checklist.md',
	);
	const templateGeneratorChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/compiler-engineering-review/references/compiler-generators-properties-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localIrChecklist, templateIrChecklist);
	assert.equal(localIrDesignChecklist, templateIrDesignChecklist);
	assert.equal(localBoundaryChecklist, templateBoundaryChecklist);
	assert.equal(localDebugChecklist, templateDebugChecklist);
	assert.equal(localTestStrategyChecklist, templateTestStrategyChecklist);
	assert.equal(localGeneratorChecklist, templateGeneratorChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /^revision: 6$/mu);
	for (const signal of [
		'stage-local semantic contracts',
		'semantic-distance and oracle-cost',
		'Freeze the reproduction universe',
		'Prove the input has defined meaning',
		'Build an interestingness predicate for the original defect',
		'Separate acceptance, structured',
		'Find the first divergence by execution position',
		'Reduce one axis at a time, then alternate axes',
		'Assign artifacts separately',
		'Record transformation or rewrite identity',
		'Compare incremental analysis updates with independent full recomputation',
		'Treat diagnostics as structured outputs',
		'Test ABI across independent producers and consumers',
		'Differentially execute defined inputs across independent compiler lineages',
		'Model linker resolution as a small graph',
		'Treat the final link as selection, reachability, relocation, and loader preparation',
		'Perturb hash seed, worker count, schedule',
		'Define executable properties and metamorphic relations at each stage',
		'as a relation graph',
		'Apply `fuzz-harness-review` when campaign determinism',
		'Define each IR layer as a semantic contract',
		'Review the pass pipeline as a contract graph',
		'Track compiler facts as proof-carrying state with explicit lifetimes',
		'Treat debug and crash artifacts as an immutable derivative graph',
	]) {
		assert.ok(localSkill.includes(signal), `compiler skill should include ${signal}`);
	}
	for (const signal of [
		'Reproduction universe',
		'Definedness gate',
		'Interestingness predicate',
		'First-divergence localization',
		'Translation validation',
		'Reduction matrix',
		'CFG and SSA matrix',
		'Incremental analysis differential',
		'Poison and deferred choice',
		'Borrow and dataflow checking',
		'earliest failing stage or pass instance',
	]) {
		assert.ok(localIrChecklist.includes(signal), `compiler IR checklist should include ${signal}`);
	}
	for (const signal of [
		'IR semantic contract',
		'Layer decision ledger',
		'Source AST HIR MIR and LIR boundaries',
		'Lowering information budget',
		'Mixed-level legality',
		'Effects and speculation',
		'Semantic storage ABI and machine types',
		'Explicit conversion values',
		'Ownership capability tokens',
		'Ownership ABI and borrow flow',
		'Lifetime allocation view and provenance',
		'Fact provenance scope and generation',
		'Effect capture and speculation axes',
		'Memory model and SSA limits',
		'Exceptional suspension and deoptimization control',
		'Value symbol and source identity',
		'Verifier ownership',
		'IR mutation transaction',
		'Canonical-form windows',
		'Text form replay and version boundary',
		'Phi edge semantics',
		'Phi placement and sealed construction',
		'Phi select and speculation',
		'Critical duplicate and exceptional edges',
		'CFG mutation and SSA repair',
		'Loop closure and irreducible control',
		'SSA destruction',
		'Pass contracts',
		'Information-aware pass ordering',
		'Normalization and cleanup budgets',
		'Inlining promotion and scalarization',
		'Propagation CFG simplification and deletion',
		'Loop transformation pipeline',
		'Target-lowering boundary',
		'Instrumentation profile and debug placement',
		'Pipeline interaction evidence',
	]) {
		assert.ok(
			localIrDesignChecklist.includes(signal),
			`compiler IR design checklist should include ${signal}`,
		);
	}
	for (const signal of [
		'Structured diagnostics',
		'Source coordinates',
		'Macro, include, and generated provenance',
		'Recovery and fix-its',
		'ABI producer-consumer matrix',
		'Layout and calling-convention probes',
		'Object metadata',
		'Machine-code pipeline',
		'Link resolution graph',
		'Object-format and symbol-namespace matrix',
		'Linux ELF with GNU `ld`',
		'`.symtab`',
		'`.dynsym`',
		'Archive extraction and section reachability',
		'ordinary GNU `ld` static-archive baseline',
		'Relocation contract',
		'Static and dynamic resolution',
		'Visibility, export, and import boundaries',
		'Language linkage and complete ABI identity',
		'Stable C and plugin boundaries',
		'Dynamic loading and plugin lifecycle',
		'Dependency retention and binding time',
		'Interposition and exported data',
		'Loader scopes and namespaces',
		'Runtime symbol lookup',
		'Activation and retirement',
		'Relaxation and boundary generation',
		'Cross-target evidence',
	]) {
		assert.ok(localBoundaryChecklist.includes(signal), `compiler boundary checklist should include ${signal}`);
	}
	for (const signal of [
		'Symbol asset taxonomy',
		'Binary identity and matching keys',
		'Artifact lineage',
		'ELF separated debug information',
		'PE and PDB artifacts',
		'Mach-O and dSYM artifacts',
		'Public private and source assets',
		'Crash capture boundary',
		'Address and frame semantics',
		'Immutable symbol store',
		'Stripping policy',
		'Elimination pipeline',
		'Reachability roots',
		'Identical-code folding',
		'LTO identity and ABI',
		'Optimized debug limits',
		'Cross-platform artifact matrix',
		'Symbolication canary',
	]) {
		assert.ok(localDebugChecklist.includes(signal), `compiler debug checklist should include ${signal}`);
	}
	for (const signal of [
		'Semantic-distance and oracle-cost ladder',
		'Stage boundary contracts',
		'Oracle separation',
		'Feature-interaction grid',
		'Execution lanes',
		'Corpus classes',
		'Transformation activation coverage',
		'Oracle sensitivity checks',
		'Determinism perturbation',
		'Cadence and failure budgets',
		'Implementation lineage map',
		'Option and execution-tier lattice',
		'Canonical execution outcome',
		'Runtime input vectors',
		'Definedness and permitted variation',
		'First-divergence evidence',
	]) {
		assert.ok(
			localTestStrategyChecklist.includes(signal),
			`compiler test strategy checklist should include ${signal}`,
		);
	}
	for (const signal of [
		'Generator contract',
		'Valid and invalid lanes',
		'Stage-specific harness matrix',
		'Lexer generation',
		'Parser generation and edit sequences',
		'Type and semantic generation',
		'Constraint-solver properties',
		'Source-level optimizer generation',
		'IR generation and mutation',
		'Pass-transition graphs',
		'Stage-local property ledger',
		'Round-trip laws',
		'Alpha-renaming and binding laws',
		'Dead-code relations',
		'Independent reorder relations',
		'Extraction and inlining relations',
		'Algebraic and refinement relations',
		'Relation graphs',
		'Structure-aware shrinking',
		'Semantic coverage',
	]) {
		assert.ok(localGeneratorChecklist.includes(signal), `compiler generator checklist should include ${signal}`);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/compiler-engineering-review\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."compiler-engineering-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 81/u,
	);
	assert.deepEqual(routeReasons(routes, 'compiler-engineering-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'data_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/compiler-engineering-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/compiler-engineering-review\/references\/miscompile-reduction-ir-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/compiler-engineering-review\/references\/ir-design-ssa-pass-pipeline-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/compiler-engineering-review\/references\/compiler-diagnostics-abi-linker-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/compiler-engineering-review\/references\/debug-symbol-symbolication-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/compiler-engineering-review\/references\/compiler-test-strategy-differential-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/compiler-engineering-review\/references\/compiler-generators-properties-checklist\.md"/u,
	);
	assert.match(manifest, /"compiler-engineering-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'compiler-engineering-review', 6);
});

test('name resolution integrity review traces DNS, language, module, package, loader, and cache identity', () => {
	const localSkill = readText('.mustflow/skills/name-resolution-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/name-resolution-integrity-review/SKILL.md',
	);
	const localDnsChecklist = readText(
		'.mustflow/skills/name-resolution-integrity-review/references/dns-network-resolution-checklist.md',
	);
	const templateDnsChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/name-resolution-integrity-review/references/dns-network-resolution-checklist.md',
	);
	const localLanguageChecklist = readText(
		'.mustflow/skills/name-resolution-integrity-review/references/language-symbol-resolution-checklist.md',
	);
	const templateLanguageChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/name-resolution-integrity-review/references/language-symbol-resolution-checklist.md',
	);
	const localModuleChecklist = readText(
		'.mustflow/skills/name-resolution-integrity-review/references/module-package-loader-resolution-checklist.md',
	);
	const templateModuleChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/name-resolution-integrity-review/references/module-package-loader-resolution-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localDnsChecklist, templateDnsChecklist);
	assert.equal(localLanguageChecklist, templateLanguageChecklist);
	assert.equal(localModuleChecklist, templateModuleChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /^revision: 2$/mu);
	for (const signal of [
		'Diagnose name-resolution defects as disagreements about the resolver',
		'requester -> execution space -> input form',
		'textual identity',
		'resolved identity',
		'loaded identity',
		'behavioral identity',
		'Build a resolution ledger',
		'Enumerate candidates before choosing a fix',
		'Treat cache as part of semantics',
		'Compare like with like',
		'actual resolver API',
		'Continue one boundary beyond resolution',
		'Convert the defect into a differential fixture',
	]) {
		assert.ok(localSkill.includes(signal), `name resolution skill should include ${signal}`);
	}
	assert.match(localSkill, /whether a prior\s+connection or pool entry bypassed fresh lookup/u);
	for (const signal of [
		'Execution-space capsule',
		'Resolver API and runtime behavior',
		'Resolver stack',
		'Query transformation',
		'Split DNS and route selection',
		'Recursive, authoritative, and delegation boundaries',
		'Proxy and application resolution ownership',
		'Local name sources',
		'Cache and freshness ledger',
		'Response taxonomy',
		'Transport and message size',
		'DNSSEC and validation',
		'CDN and resolver location',
		'Alias and service records',
		'Container and cluster name scopes',
		'Address selection, connection reuse, and routing',
		'Evidence matrix',
		'direct DNS protocol probe proves one server',
		'name-service switch is a state machine',
		'per-entry upper freshness bound',
		'Compare all authoritative servers',
		'DNS TTL expiry does not close',
	]) {
		assert.ok(localDnsChecklist.includes(signal), `DNS resolution checklist should include ${signal}`);
	}
	for (const signal of [
		'Resolution contract',
		'Binding and initialization',
		'Namespaces and syntactic position',
		'Candidate collection and selection',
		'Delayed and multi-phase lookup',
		'Generated-code and macro hygiene',
		'Language-specific traps',
		'Runtime identity after lookup',
		'Resolution diagnostics',
		'Test matrix',
	]) {
		assert.ok(
			localLanguageChecklist.includes(signal),
			`language resolution checklist should include ${signal}`,
		);
	}
	for (const signal of [
		'Resolution capsule',
		'Coordinate, artifact, and instance identity',
		'Search roots and mappings',
		'Conditions, variants, and features',
		'Loader and cache identity',
		'Node and package exports',
		'Peer-context and strict-layout packages',
		'Python import paths and namespace packages',
		'JVM class loaders',
		'Go module ownership',
		'Cargo feature resolution',
		'Maven conflict mediation',
		'Gradle variant selection',
		'CMake package discovery',
		'Bazel repository mapping',
		'Build, test, deploy, and release graph parity',
	]) {
		assert.ok(
			localModuleChecklist.includes(signal),
			`module resolution checklist should include ${signal}`,
		);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/name-resolution-integrity-review\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."name-resolution-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 82/u,
	);
	assert.deepEqual(routeReasons(routes, 'name-resolution-integrity-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/name-resolution-integrity-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/name-resolution-integrity-review\/references\/dns-network-resolution-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/name-resolution-integrity-review\/references\/language-symbol-resolution-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/name-resolution-integrity-review\/references\/module-package-loader-resolution-checklist\.md"/u,
	);
	assert.match(manifest, /"name-resolution-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'name-resolution-integrity-review', 2);
});

test('interpreter engineering review keeps semantics, diagnostics, GC, oracles, and execution explicit', () => {
	const localSkill = readText('.mustflow/skills/interpreter-engineering-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/interpreter-engineering-review/SKILL.md',
	);
	const localSemanticsChecklist = readText(
		'.mustflow/skills/interpreter-engineering-review/references/interpreter-semantics-runtime-checklist.md',
	);
	const templateSemanticsChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/interpreter-engineering-review/references/interpreter-semantics-runtime-checklist.md',
	);
	const localExecutionChecklist = readText(
		'.mustflow/skills/interpreter-engineering-review/references/interpreter-execution-closure-performance-checklist.md',
	);
	const templateExecutionChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/interpreter-engineering-review/references/interpreter-execution-closure-performance-checklist.md',
	);
	const localDiagnosticsChecklist = readText(
		'.mustflow/skills/interpreter-engineering-review/references/interpreter-diagnostics-recovery-checklist.md',
	);
	const templateDiagnosticsChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/interpreter-engineering-review/references/interpreter-diagnostics-recovery-checklist.md',
	);
	const localGcChecklist = readText(
		'.mustflow/skills/interpreter-engineering-review/references/interpreter-gc-verification-checklist.md',
	);
	const templateGcChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/interpreter-engineering-review/references/interpreter-gc-verification-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localSemanticsChecklist, templateSemanticsChecklist);
	assert.equal(localExecutionChecklist, templateExecutionChecklist);
	assert.equal(localDiagnosticsChecklist, templateDiagnosticsChecklist);
	assert.equal(localGcChecklist, templateGcChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /^revision: 2$/mu);
	for (const signal of [
		'explicit language-semantics and runtime system',
		'Freeze semantics before implementation mechanics',
		'Separate semantic type, runtime kind, and storage tag',
		'purpose-specific directed conversions',
		'`Handled`, `Declined`, and `Thrown`',
		'Resolve compound assignment targets once as a `Place`',
		'Resolve names before hot execution',
		'Keep lexical scope distinct from the call stack',
		'Unify nonlocal completion',
		'Build diagnostics as structured data and separate fault domains',
		'Diagnostic rendering must not call guest conversion',
		'Harden the native boundary',
		'Inject deterministic host services',
		'Enforce multi-dimensional budgets',
		'If both engines exist, keep one semantic test corpus',
		'Make object liveness and movement explicit',
		'Define weak, finalization, reference-count, and external-resource semantics',
		'Build a semantic oracle matrix',
		'preserve the exact failure fingerprint',
		'Apply `fuzz-harness-review` when harness determinism',
	]) {
		assert.ok(localSkill.includes(signal), `interpreter skill should include ${signal}`);
	}
	for (const signal of [
		'Semantic matrix',
		'Runtime value model',
		'Conversion and operator dispatch',
		'semantic type',
		'`Handled(value)`, `Declined`, and `Thrown(error)`',
		'Evaluation order',
		'Completion and cleanup',
		'Native boundary',
		'Deterministic services',
		'Resource budgets',
		'Semantic differential tests',
	]) {
		assert.ok(
			localSemanticsChecklist.includes(signal),
			`interpreter semantics checklist should include ${signal}`,
		);
	}
	for (const signal of [
		'Structured diagnostic envelope',
		'Source snapshot and range contract',
		'Recovered-input provenance',
		'Cause graph and suppression',
		'Safe runtime value rendering',
		'Logical guest stacks',
		'Dynamic dispatch evidence',
		'Stable codes and fingerprints',
		'Fix validation',
		'Diagnostic contract tests',
	]) {
		assert.ok(
			localDiagnosticsChecklist.includes(signal),
			`interpreter diagnostics checklist should include ${signal}`,
		);
	}
	for (const signal of [
		'Runtime root API',
		'Safepoints and temporary values',
		'Object construction and publication',
		'Write barriers',
		'Moving objects and handles',
		'Generations and remembered sets',
		'Weak containers and ephemerons',
		'Finalization and resurrection',
		'Reference-count reentrancy',
		'Heap verifier and stress modes',
		'Canonical outcomes and independent oracles',
		'Definedness and metamorphic relations',
		'Executable semantic properties',
		'Structure-aware reduction',
		'Semantic coverage and replay',
	]) {
		assert.ok(localGcChecklist.includes(signal), `interpreter GC checklist should include ${signal}`);
	}
	for (const signal of [
		'Engine selection',
		'Bytecode contract',
		'Name resolution',
		'Frame and slot layout',
		'Closures and upvalues',
		'Compiled-code caches',
		'Performance measurement',
		'Dispatch and specialization',
		'Memory and GC retention',
	]) {
		assert.ok(
			localExecutionChecklist.includes(signal),
			`interpreter execution checklist should include ${signal}`,
		);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/interpreter-engineering-review\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."interpreter-engineering-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 80/u,
	);
	assert.deepEqual(routeReasons(routes, 'interpreter-engineering-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/interpreter-engineering-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/interpreter-engineering-review\/references\/interpreter-semantics-runtime-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/interpreter-engineering-review\/references\/interpreter-execution-closure-performance-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/interpreter-engineering-review\/references\/interpreter-diagnostics-recovery-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/interpreter-engineering-review\/references\/interpreter-gc-verification-checklist\.md"/u,
	);
	assert.match(manifest, /"interpreter-engineering-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'interpreter-engineering-review', 2);
});

test('formal verification review keeps claims, assumptions, bounds, trust, and proof CI explicit', () => {
	const localSkill = readText('.mustflow/skills/formal-verification-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/formal-verification-review/SKILL.md',
	);
	const localContractsChecklist = readText(
		'.mustflow/skills/formal-verification-review/references/formal-contracts-modeling-checklist.md',
	);
	const templateContractsChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/formal-verification-review/references/formal-contracts-modeling-checklist.md',
	);
	const localBoundsChecklist = readText(
		'.mustflow/skills/formal-verification-review/references/formal-memory-bounds-ci-checklist.md',
	);
	const templateBoundsChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/formal-verification-review/references/formal-memory-bounds-ci-checklist.md',
	);
	const localConcurrencyChecklist = readText(
		'.mustflow/skills/formal-verification-review/references/formal-concurrency-model-checking-smt-checklist.md',
	);
	const templateConcurrencyChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/formal-verification-review/references/formal-concurrency-model-checking-smt-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localContractsChecklist, templateContractsChecklist);
	assert.equal(localBoundsChecklist, templateBoundsChecklist);
	assert.equal(localConcurrencyChecklist, templateConcurrencyChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /^revision: 2$/mu);
	for (const signal of [
		'scoped claim about an explicit model',
		'State the theorem or counterexample claim precisely',
		'Map the model to reality',
		'Select a verification family by property',
		'Separate state, action, and trace properties',
		'Prove safety through a genuinely inductive strengthening',
		'Define the abstraction direction',
		'Model nondeterminism as an adversarial choice',
		'Justify every atomic action and state-space reduction',
		'Define preconditions as caller obligations',
		'Derive obligations backward from the postcondition',
		'Build loop and recursion proofs with three separate duties',
		'Write frame conditions',
		'Separate safety, progress, termination, and liveness',
		'Make boundedness visible',
		'Test reachability and vacuity',
		'Classify every tool outcome',
		'Encode SMT obligations with the executable semantics',
		'Treat solver evidence as an artifact to validate',
		'Record the trusted computing base',
		'Replay counterexamples against the real implementation',
		'Maintain an executable refinement map',
		'Derive model-based tests from the same transition and observation vocabulary',
		'Pin the verification environment',
		'Keep one assumption manifest',
		'Check logical contract compatibility',
		'Ratchet verification debt',
	]) {
		assert.ok(localSkill.includes(signal), `formal verification skill should include ${signal}`);
	}
	for (const signal of [
		'Claim envelope',
		'Precondition ownership',
		'Weakest-precondition reasoning',
		'Loop and recursion obligations',
		'Processed-region invariants',
		'Partial and total correctness',
		'Ghost and old state',
		'Frame conditions',
		'Aliasing and memory regions',
		'Object invariants and reentrancy',
		'Abnormal outcomes',
		'Machine and mathematical values',
		'Vacuity and reachability',
		'Verification-family selection',
		'Safety, progress, and liveness',
		'Fairness assumptions',
		'Scope and bounded search',
		'Result taxonomy',
		'Trusted computing base',
	]) {
		assert.ok(
			localContractsChecklist.includes(signal),
			`formal contracts checklist should include ${signal}`,
		);
	}
	for (const signal of [
		'Target arithmetic semantics',
		'Pre-operation overflow obligations',
		'Casts and shifts',
		'Index construction',
		'Pointer validity',
		'Range overlap',
		'Allocation lifetime state machine',
		'Boundary partitions',
		'Bounded-check completeness',
		'Nondeterministic unsafe and FFI harnesses',
		'Counterexample replay',
		'Verification lanes',
		'Toolchain and solver pinning',
		'CI result mapping',
		'Proof cost telemetry',
		'Vacuity and sensitivity jobs',
		'Assumption manifest',
		'Contract compatibility',
		'Verification-debt ratchet',
		'Executable refinement map',
		'Proof brittleness',
	]) {
		assert.ok(localBoundsChecklist.includes(signal), `formal bounds checklist should include ${signal}`);
	}
	for (const signal of [
		'Property layers',
		'Inductive safety obligations',
		'Trace histories and linearizability',
		'Refinement and stuttering',
		'Abstraction direction',
		'Adversarial nondeterminism',
		'Atomicity claims',
		'Deadlock livelock and starvation',
		'Weak-memory boundary',
		'Network and epoch behavior',
		'Crash and recovery state',
		'Duplicate effects and result replay',
		'Property-directed slicing',
		'Identity symmetry and role abstraction',
		'Partial-order and stateless exploration',
		'Reduction soundness',
		'Bound ladders and lossy search',
		'Abstraction refinement and inductive strengthening',
		'Compositional proof and cutoff claims',
		'Model-based test bridge',
		'SMT result question',
		'Theory and representation selection',
		'SSA paths loops and memory',
		'Datatypes and uninterpreted functions',
		'Quantifiers triggers and incremental contexts',
		'Unsat evidence and replay',
	]) {
		assert.ok(
			localConcurrencyChecklist.includes(signal),
			`formal concurrency checklist should include ${signal}`,
		);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/formal-verification-review\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."formal-verification-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 83/u,
	);
	assert.deepEqual(routeReasons(routes, 'formal-verification-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/formal-verification-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/formal-verification-review\/references\/formal-contracts-modeling-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/formal-verification-review\/references\/formal-memory-bounds-ci-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/formal-verification-review\/references\/formal-concurrency-model-checking-smt-checklist\.md"/u,
	);
	assert.match(manifest, /"formal-verification-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'formal-verification-review', 2);
});

test('fuzz harness review keeps reachability, oracles, corpus, feedback, and reproduction explicit', () => {
	const localSkill = readText('.mustflow/skills/fuzz-harness-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/fuzz-harness-review/SKILL.md');
	const localChecklist = readText(
		'.mustflow/skills/fuzz-harness-review/references/fuzz-harness-campaign-checklist.md',
	);
	const templateChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/fuzz-harness-review/references/fuzz-harness-campaign-checklist.md',
	);
	const localOracleChecklist = readText(
		'.mustflow/skills/fuzz-harness-review/references/fuzz-oracle-triage-ci-checklist.md',
	);
	const templateOracleChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/fuzz-harness-review/references/fuzz-oracle-triage-ci-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localChecklist, templateChecklist);
	assert.equal(localOracleChecklist, templateOracleChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	for (const signal of [
		'Coverage is a search signal, not the oracle',
		'Build a target matrix',
		'Make one iteration deterministic and isolated',
		'Turn bad outcomes into explicit oracles',
		'Design complementary input lanes',
		'Verify instrumentation and feedback reach the target',
		'Maintain corpus and dictionary as source artifacts',
		'Fuzz state, failures, and environment',
		'Diagnose a coverage plateau',
		'Make artifacts independently reproducible',
		'Split sanitizer and assertion lanes by purpose',
		'artifact bytes its only entropy',
		'stable semantic result envelope',
		'exact normalized failure predicate',
		'Do not invent replay counts',
		'Keep campaigns and CI assets from rotting',
		'Do not launch a watcher, server, background fuzzer',
	]) {
		assert.ok(localSkill.includes(signal), `fuzz harness skill should include ${signal}`);
	}
	for (const signal of [
		'Property-based entropy and abstract inputs',
		'Semantic result envelopes',
		'Differential and metamorphic oracle ledger',
		'Stable property and crash identities',
		'Reproduction capsule and flaky classification',
		'Exact minimization and shrinking',
		'Trigger, detection, and root cause',
		'Sanitizer and assertion lanes',
		'CI cadence and asset classes',
		'Regression promotion and negative controls',
	]) {
		assert.ok(localOracleChecklist.includes(signal), `fuzz oracle checklist should include ${signal}`);
	}
	for (const signal of [
		'Raw lane',
		'Structured lane',
		'Repair, mismatch, and overflow lanes',
		'collision or cardinality risk',
		'minimal seed basis',
		'N-th allocation',
		'operation or message sequence',
		'last meaningful frontier',
		'clean process',
		'long-running local or external campaign state',
	]) {
		assert.ok(localChecklist.includes(signal), `fuzz harness checklist should include ${signal}`);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/fuzz-harness-review\/SKILL\.md/u);
	assert.match(routes, /\[routes\."fuzz-harness-review"\]\r?\ncategory = "tests"\r?\nroute_type = "adjunct"\r?\npriority = 82/u);
	assert.deepEqual(routeReasons(routes, 'fuzz-harness-review'), [
		'test_change',
		'behavior_change',
		'performance_change',
		'security_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/fuzz-harness-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/fuzz-harness-review\/references\/fuzz-harness-campaign-checklist\.md"/u,
	);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/fuzz-harness-review\/references\/fuzz-oracle-triage-ci-checklist\.md"/u,
	);
	assert.match(manifest, /"fuzz-harness-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'fuzz-harness-review', 2);
});

test('input boundary validation keeps representation, identity, parser, sink, and budget contracts explicit', () => {
	const localSkill = readText('.mustflow/skills/input-boundary-validation-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/input-boundary-validation-review/SKILL.md',
	);
	const localChecklist = readText(
		'.mustflow/skills/input-boundary-validation-review/references/input-boundary-security-checklist.md',
	);
	const templateChecklist = readText(
		'templates/default/locales/en/.mustflow/skills/input-boundary-validation-review/references/input-boundary-security-checklist.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localChecklist, templateChecklist);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	for (const signal of [
		'Build a representation ledger',
		'Decode each protocol layer exactly once',
		'Define canonicalization per field',
		'Parse one complete value under one policy',
		'Separate syntax, semantics, and authority',
		'Keep data out of executable grammar',
		'Budget hostile structure before materialization',
		'Delay side effects until acceptance',
		'validating one string and reparsing another is a split boundary',
		'A valid UUID, tenant id, path, or enum is not permission',
		'does not make untrusted template source safe',
	]) {
		assert.ok(localSkill.includes(signal), `input boundary skill should include ${signal}`);
	}
	for (const signal of [
		'Representation ledger',
		'Field identity policy',
		'Confusable skeletons are collision or review signals',
		'gateway validates the first duplicate',
		'option parsing for operands',
		'CSV quoting is not formula',
		'bounded child views across transformations',
		'Gateway-versus-application',
		'earliest stable rejection stage',
	]) {
		assert.ok(localChecklist.includes(signal), `input boundary checklist should include ${signal}`);
	}
	assert.match(skillIndex, /\.mustflow\/skills\/input-boundary-validation-review\/SKILL\.md/u);
	assert.match(routes, /\[routes\."input-boundary-validation-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "adjunct"\r?\npriority = 83/u);
	assert.deepEqual(routeReasons(routes, 'input-boundary-validation-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'test_change',
		'performance_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/input-boundary-validation-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/input-boundary-validation-review\/references\/input-boundary-security-checklist\.md"/u,
	);
	assert.match(manifest, /"input-boundary-validation-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'input-boundary-validation-review', 1);
});

test('performance measurement integrity keeps event semantics, comparison, and privacy explicit', () => {
	const localSkill = readText('.mustflow/skills/performance-measurement-integrity-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/performance-measurement-integrity-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /An atomic increment prevents lost updates; it does not make several independently read totals/u);
	assert.match(localSkill, /operation or trace context, not an assumed worker thread/u);
	assert.match(localSkill, /closed-loop client would hide coordinated omission/u);
	assert.match(localSkill, /request, key, and byte hit rates/u);
	assert.match(localSkill, /item-weighted and batch-weighted distributions distinct/u);
	assert.match(localSkill, /cancellation API returning success does not prove execution or side effects stopped/u);
	assert.match(localSkill, /predeclared practical effect threshold and uncertainty rule/u);
	assert.match(localSkill, /never rerun until a desired result appears/u);
	assert.match(localSkill, /Treat raw CPU, heap, allocation, JFR, pprof, trace, benchmark, and compressed artifacts as\s+sensitive/u);
	assert.match(localSkill, /Disambiguate CPU IPC, meaning retired instructions per CPU cycle, from inter-process\s+communication/u);
	assert.match(localSkill, /If limited hardware counters were multiplexed/u);
	assert.match(localSkill, /start cohort through terminal or deadline/u);
	assert.match(localSkill, /client outcome, server execution outcome, and delivery outcome/u);
	assert.match(localSkill, /conservation checks such as admitted equals terminal plus in-flight/u);
	assert.match(localSkill, /Do not directly subtract browser, process, or host\s+monotonic clocks/u);
	assert.match(localSkill, /Never add layer p99 values/u);
	assert.match(skillIndex, /\.mustflow\/skills\/performance-measurement-integrity-review\/SKILL\.md/u);
	assert.match(routes, /\[routes\."performance-measurement-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 79/u);
	for (const reason of ['code_change', 'test_change', 'performance_change', 'security_change', 'privacy_change', 'data_change', 'docs_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'performance-measurement-integrity-review').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/performance-measurement-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"performance-measurement-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'performance-measurement-integrity-review', 2);
});

test('cpp code change keeps target identity and compatibility risk explicit', () => {
	const localSkill = readText('.mustflow/skills/cpp-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/cpp-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /owning build target/u);
	assert.match(localSkill, /compilation identity/u);
	assert.match(localSkill, /Local compile success alone does not prove/u);
	assert.match(localSkill, /source_api/u);
	assert.match(localSkill, /binary_abi/u);
	assert.match(localSkill, /static_link_contract/u);
	assert.match(localSkill, /generated_binding/u);
	assert.match(localSkill, /ffi_boundary/u);
	assert.match(localSkill, /undefined-behavior/u);
	assert.match(localSkill, /std::string_view/u);
	assert.match(localSkill, /std::span/u);
	assert.match(localSkill, /noexcept/u);
	assert.match(localSkill, /modern, shorter, or cleaner-looking/u);
	assert.match(localSkill, /Do not invent native build/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cpp-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /C\+\+ source, headers, modules/u);
	assert.match(routes, /\[routes\."cpp-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'code_change',
		'public_api_change',
		'test_change',
		'package_metadata_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/cpp-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"cpp-code-change"/u);
});

test('Ada code change separates language checks, runtime checks, SPARK proof, and tasking semantics', () => {
	const localSkill = readText('.mustflow/skills/ada-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/ada-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /ISO\/IEC 8652:2023/u);
	assert.match(localSkill, /GNAT Ada 2022 mode and GNAT extension mode are not equivalent/u);
	assert.match(localSkill, /Do not infer absence of runtime errors from Ada compilation alone/u);
	assert.match(localSkill, /Use a new `type` when values have different meaning/u);
	assert.match(localSkill, /A predicate is not a continuous\s+watcher/u);
	assert.match(localSkill, /Iterate arrays with their actual ranges/u);
	assert.match(localSkill, /absence-of-runtime-error\s+proof does not by itself exclude `Storage_Error`/u);
	assert.match(localSkill, /Atomic variables and\s+separate protected calls do not make a multi-step invariant atomic/u);
	assert.match(localSkill, /timed entry calls as admission deadlines/u);
	assert.match(localSkill, /A profile restriction is not a schedulability/u);
	assert.match(localSkill, /An access type carries reachability and accessibility rules, not ownership/u);
	assert.match(localSkill, /`Storage_Size` is not automatically an\s+exact process-wide quota/u);
	assert.match(localSkill, /Drive periodic work from absolute releases/u);
	assert.match(localSkill, /dynamic calls, recursion,\s+unknown external frames, and measured watermarks are not static upper bounds/u);
	assert.match(localSkill, /generated bindings as a draft/u);
	assert.match(localSkill, /If foreign code owns `main`, initialize the Ada runtime/u);
	assert.match(localSkill, /Do not call a partially analyzed project fully proved/u);
	assert.match(localSkill, /Treat every assumption and `SPARK_Mode => Off` path as trust debt/u);
	assert.match(skillIndex, /\.mustflow\/skills\/ada-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining Ada or SPARK risk/u);
	assert.match(routes, /\[routes\."ada-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u);
	for (const reason of ['code_change', 'behavior_change', 'public_api_change', 'test_change', 'data_change', 'performance_change', 'security_change', 'package_metadata_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'ada-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/ada-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"ada-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'ada-code-change', 2);
});

test('Pascal code change separates Delphi and FPC tracks, managed lifetimes, threading, and ABI', () => {
	const localSkill = readText('.mustflow/skills/pascal-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/pascal-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Delphi or RAD Studio 13\.1, Lazarus 4\.8, and Free Pascal 3\.2\.2/u);
	assert.match(localSkill, /Similar syntax does not establish\s+equivalent threading, memory-manager, exception, ABI/u);
	assert.match(localSkill, /Distinguish aliases from new ordinal types/u);
	assert.match(localSkill, /Never persist `Ord`, raw set bytes/u);
	assert.match(localSkill, /A custom managed record is not automatic unique ownership/u);
	assert.match(localSkill, /Treat queue APIs as potentially immediate/u);
	assert.match(localSkill, /`FreeOnTerminate` as a no-external-reference policy/u);
	assert.match(localSkill, /A pulse, condition, or event is not durable work/u);
	assert.match(localSkill, /worker stack does not propagate an exception/u);
	assert.match(localSkill, /Put C\+\+ classes, STL, templates, overloads/u);
	assert.match(localSkill, /Initialize COM per thread/u);
	assert.match(localSkill, /Do not use raw move, fill, or byte comparison on records containing strings/u);
	assert.match(localSkill, /pointer derived from a temporary string or array/u);
	assert.match(localSkill, /Dynamic-array assignment aliases one backing store/u);
	assert.match(localSkill, /open array as a call-scoped zero-based view/u);
	assert.match(localSkill, /Treat interface `uses` as public dependency and initialization-graph change/u);
	assert.match(localSkill, /Before unloading a package, stop new calls/u);
	assert.match(localSkill, /ordinary `const` as an optimization opportunity, not a guaranteed/u);
	assert.match(localSkill, /Resolve RTTI metadata once per type/u);
	assert.match(skillIndex, /\.mustflow\/skills\/pascal-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining Pascal risk/u);
	assert.match(routes, /\[routes\."pascal-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u);
	for (const reason of ['code_change', 'behavior_change', 'public_api_change', 'test_change', 'data_change', 'performance_change', 'security_change', 'package_metadata_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'pascal-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/pascal-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"pascal-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'pascal-code-change', 2);
});

test('Node, Bun, Docker, and JavaScript code change skills keep runtime and toolchain ownership explicit', () => {
	const nodeSkill = readText('.mustflow/skills/node-code-change/SKILL.md');
	const templateNodeSkill = readText('templates/default/locales/en/.mustflow/skills/node-code-change/SKILL.md');
	const jsSkill = readText('.mustflow/skills/javascript-code-change/SKILL.md');
	const templateJsSkill = readText('templates/default/locales/en/.mustflow/skills/javascript-code-change/SKILL.md');
	const bunSkill = readText('.mustflow/skills/bun-code-change/SKILL.md');
	const templateBunSkill = readText('templates/default/locales/en/.mustflow/skills/bun-code-change/SKILL.md');
	const dockerSkill = readText('.mustflow/skills/docker-code-change/SKILL.md');
	const templateDockerSkill = readText('templates/default/locales/en/.mustflow/skills/docker-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(nodeSkill, templateNodeSkill);
	assert.equal(jsSkill, templateJsSkill);
	assert.equal(bunSkill, templateBunSkill);
	assert.equal(dockerSkill, templateDockerSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(nodeSkill, /deployment runtime as the hard constraint/u);
	assert.match(nodeSkill, /CI runtime as the verified constraint/u);
	assert.match(nodeSkill, /package manager ownership/u);
	assert.match(nodeSkill, /ESM-only package with `"type": "module"`/u);
	assert.match(nodeSkill, /Do not rename every file to `\.mjs` just to mean ESM/u);
	assert.match(nodeSkill, /fully specified relative and absolute import specifiers/u);
	assert.match(nodeSkill, /Adding `exports` can block deep imports/u);
	assert.match(nodeSkill, /dual package hazards/u);
	assert.match(nodeSkill, /Node native TypeScript execution is limited type stripping/u);
	assert.match(nodeSkill, /does not typecheck, read `tsconfig`, resolve path aliases, emit declarations/u);
	assert.match(nodeSkill, /Do not migrate Jest, Vitest, Playwright, or another runner to `node:test`/u);
	assert.match(nodeSkill, /permission model as a trusted-code seatbelt/u);
	assert.match(nodeSkill, /server performance behavior/u);
	assert.match(nodeSkill, /event-loop utilization/u);
	assert.match(nodeSkill, /event-loop delay histograms/u);
	assert.match(nodeSkill, /CPU profile or flame graph/u);
	assert.match(nodeSkill, /Event-loop utilization is not CPU percent/u);
	assert.match(nodeSkill, /CPU profiles or flame graphs over timing logs/u);
	assert.match(nodeSkill, /p95 and p99 delay/u);
	assert.match(nodeSkill, /large `JSON\.parse` or `JSON\.stringify`/u);
	assert.match(nodeSkill, /catastrophic regex/u);
	assert.match(nodeSkill, /expensive sort comparators/u);
	assert.match(nodeSkill, /repeated `Intl` or `Date` formatter construction/u);
	assert.match(nodeSkill, /Use worker threads for CPU-bound/u);
	assert.match(nodeSkill, /libuv worker pool as shared/u);
	assert.match(nodeSkill, /`UV_THREADPOOL_SIZE` is a startup environment decision/u);
	assert.match(nodeSkill, /Preserve stream backpressure/u);
	assert.match(nodeSkill, /Avoid `process\.nextTick\(\)` starvation/u);
	assert.match(nodeSkill, /GC and allocation/u);

	assert.match(jsSkill, /prefer ESM-only with package `"type": "module"`/u);
	assert.match(jsSkill, /Use `\.mjs` and `\.cjs` as explicit override markers/u);
	assert.match(jsSkill, /Extensionless imports and automatic directory `index\.js` lookup/u);
	assert.match(jsSkill, /`async`, `await`, or Promise syntax as a thread or CPU offload boundary/u);
	assert.match(jsSkill, /CPU-heavy parsing, sorting, diffing, compression/u);
	assert.match(jsSkill, /V8 evidence from Chrome or Node/u);
	assert.match(jsSkill, /Safari or Firefox behavior/u);
	assert.match(jsSkill, /`Map`, `Set`, `WeakMap`, or `WeakSet` are guaranteed O\(1\)/u);
	assert.match(jsSkill, /average sublinear keyed collections/u);
	assert.match(jsSkill, /Use `Map` for dynamic, user-controlled, object-identity/u);
	assert.match(jsSkill, /Keep hot object shapes stable/u);
	assert.match(jsSkill, /late property addition and inconsistent field order/u);
	assert.match(jsSkill, /Keep arrays dense and type-stable/u);
	assert.match(jsSkill, /small integers, doubles, objects, holes/u);
	assert.match(jsSkill, /head-index queue/u);
	assert.match(jsSkill, /swap-with-last plus `pop\(\)`/u);
	assert.match(jsSkill, /decorate-sort-undecorate/u);
	assert.match(jsSkill, /precompute `Date`, locale, normalized string, JSON, path, or score keys/u);
	assert.match(jsSkill, /Use `WeakMap` or `WeakSet` for metadata tied to object lifetime/u);
	assert.match(jsSkill, /Prefer rest parameters over `arguments`/u);
	assert.match(jsSkill, /`NodeList`, `HTMLCollection`, and other array-like objects/u);
	assert.match(jsSkill, /Avoid accidental serial waits over independent work/u);
	assert.match(jsSkill, /Choose Promise aggregation by failure policy/u);
	assert.match(jsSkill, /`Promise\.all` fails fast but does not cancel remaining work by itself/u);
	assert.match(jsSkill, /`await fetch\(\)` and `response\.json\(\)` as two different costs/u);
	assert.match(jsSkill, /NDJSON, streaming parsers, worker parsing/u);
	assert.match(jsSkill, /Cache `Intl\.NumberFormat`, `Intl\.DateTimeFormat`/u);

	assert.match(bunSkill, /Classify every Bun signal by role/u);
	assert.match(bunSkill, /package manager signals/u);
	assert.match(bunSkill, /runtime signals/u);
	assert.match(bunSkill, /test runner signals/u);
	assert.match(bunSkill, /bundler or compiler signals/u);
	assert.match(bunSkill, /If `bun.lock` exists, treat Bun as the dependency owner/u);
	assert.match(bunSkill, /Treat `trustedDependencies` as install-time code execution policy/u);
	assert.match(bunSkill, /Do not claim Bun runs TypeScript as typecheck/u);
	assert.match(bunSkill, /Bun build output proves bundling for the selected target and format/u);
	assert.match(bunSkill, /Bun server changes, check idle timeout/u);
	assert.match(bunSkill, /WebSocket changes, review `idleTimeout`, `maxPayloadLength`, `backpressureLimit`/u);
	assert.match(bunSkill, /`SO_REUSEPORT` and same-port multi-process assumptions/u);
	assert.match(bunSkill, /Do not assume bundling eliminates `node_modules`/u);
	assert.match(bunSkill, /Treat minification as an observability decision/u);
	assert.match(bunSkill, /`PORT` environment binding/u);
	assert.match(bunSkill, /A CLI with `#!\/usr\/bin\/env node` may execute under Node/u);

	assert.match(dockerSkill, /Prevent container image accidents/u);
	assert.match(dockerSkill, /This skill is not a Docker syntax guide/u);
	assert.match(dockerSkill, /runtime-source app/u);
	assert.match(dockerSkill, /compiled artifact app/u);
	assert.match(dockerSkill, /Use Debian slim as a conservative default/u);
	assert.match(dockerSkill, /Alpine\s+only after libc and native package behavior are verified/u);
	assert.match(dockerSkill, /distroless or `scratch` only/u);
	assert.match(dockerSkill, /Preserve build cache boundaries/u);
	assert.match(dockerSkill, /Check `.dockerignore` whenever build context changes/u);
	assert.match(dockerSkill, /Do not put tokens, passwords, SSH keys/u);
	assert.match(dockerSkill, /Treat `USER` as a runtime proof obligation/u);
	assert.match(dockerSkill, /Keep Compose scoped/u);
	assert.match(dockerSkill, /PR and fork events should not push images/u);
	assert.match(dockerSkill, /missing Docker-specific verification/u);

	assert.match(skillIndex, /\.mustflow\/skills\/node-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/bun-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/docker-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining Node\.js risk/u);
	assert.match(skillIndex, /remaining Bun risk/u);
	assert.match(skillIndex, /remaining Docker risk/u);
	assert.match(routes, /\[routes\."node-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /\[routes\."bun-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /\[routes\."docker-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/node-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/javascript-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/bun-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/docker-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"node-code-change"/u);
	assert.match(manifest, /"javascript-code-change"/u);
	assert.match(manifest, /"bun-code-change"/u);
	assert.match(manifest, /"docker-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.node-code-change"\][\s\S]*?revision = 5/u);
	assert.match(i18n, /\[documents\."skill\.javascript-code-change"\][\s\S]*?revision = 6/u);
	assert.match(i18n, /\[documents\."skill\.bun-code-change"\][\s\S]*?revision = 2/u);
	assert.match(i18n, /\[documents\."skill\.docker-code-change"\]/u);
});

test('Deno code change skill keeps runtime, permission, package, Worker, and Deploy boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/deno-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/deno-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /2026-07-11 source material\s+as a snapshot/u);
	assert.match(localSkill, /Deno can execute TypeScript without proving the full type contract/u);
	assert.match(localSkill, /Permission denial alone does not prove the initial module graph/u);
	assert.match(localSkill, /permissions are not per-package isolation/u);
	assert.match(localSkill, /Worker permissions as inherited/u);
	assert.match(localSkill, /Promise timeout only stops waiting/u);
	assert.match(localSkill, /parallel server isolates as independent memory/u);
	assert.match(localSkill, /Identify Classic versus the current Deploy platform/u);
	assert.match(localSkill, /publication as immutable/u);
	assert.match(localSkill, /`nodeModulesDir` and the node-modules linker as installation architecture/u);
	assert.match(localSkill, /Native addons can require a local `node_modules`/u);
	assert.match(localSkill, /conditional `exports` and actual selected entries/u);
	assert.match(localSkill, /configuration owner from the command working directory/u);
	assert.match(localSkill, /Deno lockfile as additive resolution history/u);
	assert.match(localSkill, /sanitizers were no longer safe to assume enabled by default/u);
	assert.match(localSkill, /Per-test permission configuration can only narrow/u);
	assert.match(localSkill, /Preserve stream backpressure end to end/u);
	assert.match(skillIndex, /\.mustflow\/skills\/deno-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining Deno risk/u);
	assert.match(
		routes,
		/\[routes\."deno-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['code_change', 'test_change', 'docs_change', 'performance_change', 'security_change', 'migration_change']) {
		assert.ok(routeReasons(routes, 'deno-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/deno-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"deno-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.deno-code-change"\][\s\S]*?revision = 2/u);
});

test('PHP code change skill keeps request lifetime, ORM, security, FPM, and worker boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/php-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/php-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /PHP-FPM's request reset hide stateful design/u);
	assert.match(localSkill, /Confine container access and service location to composition roots/u);
	assert.match(localSkill, /Do not use Eloquent models or Doctrine entities as universal/u);
	assert.match(localSkill, /Do not replace N\+1 with an unbounded eager-loaded graph/u);
	assert.match(localSkill, /transactional outbox and idempotent consumers/u);
	assert.match(localSkill, /Avoid loose comparison for authentication/u);
	assert.match(localSkill, /Do not `unserialize\(\)` untrusted data/u);
	assert.match(localSkill, /Treat SameSite as defense in depth/u);
	assert.match(localSkill, /Bound FPM concurrency by the smallest/u);
	assert.match(localSkill, /For long-lived runtimes, reset application state/u);
	assert.match(localSkill, /identified PHP 8\.5\.8 as stable and PHP 8\.6\.0 Alpha 1 as prerelease/u);
	assert.match(localSkill, /Do not assume a dependency's `repositories` configuration propagates/u);
	assert.match(localSkill, /Avoid repeated `array_merge\(\)` accumulation/u);
	assert.match(localSkill, /Release a file-backed session lock/u);
	assert.match(localSkill, /scalar argument coercion follows the calling file/u);
	assert.match(localSkill, /Keep\s+prerelease-only features out of production code/u);
	assert.match(skillIndex, /\.mustflow\/skills\/php-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining PHP risk/u);
	assert.match(
		routes,
		/\[routes\."php-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['code_change', 'test_change', 'docs_change', 'data_change', 'performance_change', 'security_change']) {
		assert.ok(routeReasons(routes, 'php-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/php-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"php-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.php-code-change"\][\s\S]*?revision = 2/u);
});

test('Tauri code change skill covers CSP bootstrap and IPC WebView traps', () => {
	const tauriSkill = readText('.mustflow/skills/tauri-code-change/SKILL.md');
	const templateTauriSkill = readText('templates/default/locales/en/.mustflow/skills/tauri-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(tauriSkill, templateTauriSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(tauriSkill, /CSP, WebView bootstrap HTML/u);
	assert.match(tauriSkill, /blank or black WebView/u);
	assert.match(tauriSkill, /Content Security Policy blocking the frontend bootstrap/u);
	assert.match(tauriSkill, /generated entry HTML/u);
	assert.match(tauriSkill, /SvelteKit may inject inline bootstrap scripts/u);
	assert.match(tauriSkill, /`script-src 'self'` can block the app before JavaScript starts/u);
	assert.match(tauriSkill, /nonce, hash, or externalized bootstrap/u);
	assert.match(tauriSkill, /`script-src 'self' 'unsafe-inline'` may be an explicit compatibility tradeoff/u);
	assert.match(tauriSkill, /does not also allow remote script origins, `unsafe-eval`, or wildcard script sources/u);
	assert.match(tauriSkill, /make `connect-src` explicit for the required IPC scheme or local origin/u);
	assert.match(tauriSkill, /Do not replace a specific IPC allowance with `connect-src \*`/u);
	assert.match(tauriSkill, /registered only with `invoke_handler` as reachable from every window and webview by default/u);
	assert.match(tauriSkill, /`tauri_build::AppManifest::commands`/u);
	assert.match(tauriSkill, /explicit app-command permissions/u);
	assert.match(tauriSkill, /packaged WebView smoke, CSP violation/u);
	assert.match(skillIndex, /\.mustflow\/skills\/tauri-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /WebView\/native boundary drift/u);
	assert.match(routes, /\[routes\."tauri-code-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/tauri-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"tauri-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.tauri-code-change"\][\s\S]*?revision = 5/u);
});

test('Wails code change skill covers v3 app, bridge, WebView, and packaging traps', () => {
	const wailsSkill = readText('.mustflow/skills/wails-code-change/SKILL.md');
	const templateWailsSkill = readText('templates/default/locales/en/.mustflow/skills/wails-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(wailsSkill, templateWailsSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(wailsSkill, /Treat Wails as a native shell around OS WebViews plus a Go-to-frontend bridge/u);
	assert.match(wailsSkill, /application\.New/u);
	assert.match(wailsSkill, /generated bindings, Go binary, frontend runtime package, lockfiles, and Wails CLI version as one compatibility set/u);
	assert.match(wailsSkill, /Build a bridge map for every frontend-to-Go call/u);
	assert.match(wailsSkill, /Wails bridge calls can run simultaneously/u);
	assert.match(wailsSkill, /wait for the target window runtime-ready event/u);
	assert.match(wailsSkill, /Windows uses WebView2/u);
	assert.match(wailsSkill, /macOS uses WKWebView/u);
	assert.match(wailsSkill, /Linux uses WebKitGTK/u);
	assert.match(wailsSkill, /Do not design Wails v3 as Electron/u);
	assert.match(wailsSkill, /generated binding drift/u);
	assert.match(skillIndex, /\.mustflow\/skills\/wails-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /Electron or Wails v2 migration drift/u);
	assert.match(routes, /\[routes\."wails-code-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/wails-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"wails-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.wails-code-change"\][\s\S]*?revision = 2/u);
});

test('WebView2 code change skill covers runtime, profile, bridge, lifecycle, and deployment traps', () => {
	const webview2Skill = readText('.mustflow/skills/webview2-code-change/SKILL.md');
	const templateWebview2Skill = readText(
		'templates/default/locales/en/.mustflow/skills/webview2-code-change/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(webview2Skill, templateWebview2Skill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(webview2Skill, /Chromium process group, a persistent browser profile, and a native RPC boundary/u);
	assert.match(webview2Skill, /Do not let XAML or\s+constructor `Source` start an implicit default initialization first/u);
	assert.match(webview2Skill, /Do not infer Runtime capability from the NuGet version alone/u);
	assert.match(webview2Skill, /parse and compare exact normalized scheme, host, and effective port/u);
	assert.match(webview2Skill, /acquire\s+its deferral, enter `try`, and complete exactly once in `finally`/u);
	assert.match(webview2Skill, /Prefer Evergreen unless exact binary reproducibility/u);
	assert.match(webview2Skill, /Do not delete a UDF because initialization threw an unclassified exception/u);
	assert.match(webview2Skill, /Recreating one window while another shares the UDF/u);
	assert.match(webview2Skill, /distinguish `DownloadStarting\.Handled` from `Cancel`/u);
	assert.match(webview2Skill, /Diagnose memory by ownership/u);
	assert.match(webview2Skill, /Correlate page performance marks/u);
	assert.match(skillIndex, /\.mustflow\/skills\/webview2-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /implicit `Source` initialization/u);
	assert.match(
		routes,
		/\[routes\."webview2-code-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/webview2-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"webview2-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.webview2-code-change"\][\s\S]*?revision = 2/u);
});

test('Go code change skill gates runtime, concurrency, JSON, HTTP, and toolchain traps by Go version', () => {
	const goSkill = readText('.mustflow/skills/go-code-change/SKILL.md');
	const templateGoSkill = readText('templates/default/locales/en/.mustflow/skills/go-code-change/SKILL.md');
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(goSkill, templateGoSkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(goSkill, /go` directive as a language and module compatibility switch/u);
	assert.match(goSkill, /`new\(expr\)`/u);
	assert.match(goSkill, /`errors\.AsType`/u);
	assert.match(goSkill, /`sync\.WaitGroup\.Go` only for tasks that do not return errors and must not panic/u);
	assert.match(goSkill, /errgroup-style boundary/u);
	assert.match(goSkill, /cancellation causes/u);
	assert.match(goSkill, /`context\.WithoutCancel` only for short bounded cleanup/u);
	assert.match(goSkill, /`context\.AfterFunc`/u);
	assert.match(goSkill, /module as a release, version, and distribution boundary/u);
	assert.match(goSkill, /`go\.work` as a local multi-module development surface/u);
	assert.match(goSkill, /prefer `internal` for server implementation packages/u);
	assert.match(goSkill, /manual `WaitGroup\.Add` before starting the goroutine/u);
	assert.match(goSkill, /`context\.Value` as dependency injection/u);
	assert.match(goSkill, /buffered channels are not durable queues/u);
	assert.match(goSkill, /explicit `http\.Server` for production-facing servers/u);
	assert.match(goSkill, /`ReadHeaderTimeout`/u);
	assert.match(goSkill, /do not use `ResponseWriter` or request bodies after `ServeHTTP` returns/u);
	assert.match(goSkill, /design graceful shutdown as a state transition/u);
	assert.match(goSkill, /reverse-proxy rewrite hooks/u);
	assert.match(goSkill, /Gin engines, router groups, middleware chains, request binding, validation/u);
	assert.match(goSkill, /`gin\.Default\(\)` as a demo convenience/u);
	assert.match(goSkill, /`group\.Use\(\)` and parent middleware added after route or child-group creation/u);
	assert.match(goSkill, /middleware order around `c\.Next\(\)`/u);
	assert.match(goSkill, /do not pass the original `\*gin\.Context` into goroutines/u);
	assert.match(goSkill, /`c\.Copy\(\)` as a shallow request-context snapshot/u);
	assert.match(goSkill, /centralize error response, access log, and metrics ownership/u);
	assert.match(goSkill, /Do not return `err\.Error\(\)` to clients/u);
	assert.match(goSkill, /one final responder should map typed errors to status, code, safe message/u);
	assert.match(goSkill, /custom recovery when production needs panic id/u);
	assert.match(goSkill, /Recovery middleware does not catch panics in goroutines/u);
	assert.match(goSkill, /Use `c\.FullPath\(\)` or an equivalent route pattern/u);
	assert.match(goSkill, /4xx, validation, auth denial, not found, timeout, client cancellation, 5xx/u);
	assert.match(goSkill, /configure trusted proxies before relying on `ClientIP\(\)`/u);
	assert.match(goSkill, /trusted platform headers/u);
	assert.match(goSkill, /CORS as browser response exposure, not API authentication/u);
	assert.match(goSkill, /origin reflection with credentials/u);
	assert.match(goSkill, /missing `Vary: Origin`/u);
	assert.match(goSkill, /Do not derive cookie `Secure` from `c\.Request\.TLS`/u);
	assert.match(goSkill, /logger query-string handling as a privacy boundary/u);
	assert.match(goSkill, /use `ShouldBind` variants instead of `Bind` or `MustBind`/u);
	assert.match(goSkill, /`binding` validator tags/u);
	assert.match(goSkill, /unknown JSON fields, duplicate keys, large numeric identifiers/u);
	assert.match(goSkill, /`ShouldBindBodyWith` as whole-body memory retention/u);
	assert.match(goSkill, /`MaxMultipartMemory` as a memory buffering threshold/u);
	assert.match(goSkill, /open `\*sql\.DB` once at process or application startup/u);
	assert.match(goSkill, /`SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxLifetime`/u);
	assert.match(goSkill, /`QueryContext`, `QueryRowContext`, `ExecContext`, `BeginTx`/u);
	assert.match(goSkill, /close `Rows`, check `rows\.Err\(\)`/u);
	assert.match(goSkill, /pool pressure through `DBStats`/u);
	assert.match(goSkill, /`omitempty` versus `omitzero`/u);
	assert.match(goSkill, /`encoding\/json\/v2` and `jsontext` as experimental/u);
	assert.match(goSkill, /traversal-resistant root APIs/u);
	assert.match(goSkill, /`net\/netip`/u);
	assert.match(goSkill, /`net\.JoinHostPort`/u);
	assert.match(goSkill, /`GOMEMLIMIT` or `debug\.SetMemoryLimit`/u);
	assert.match(goSkill, /manual `GOMAXPROCS` pins in containers/u);
	assert.match(goSkill, /goroutine leak profiling/u);
	assert.match(goSkill, /profile or benchmark evidence before accepting a more complex hot-path change/u);
	assert.match(goSkill, /`sync\.Pool` only for disposable temporary objects/u);
	assert.match(goSkill, /`-race` only finds races on executed paths/u);
	assert.match(goSkill, /`testing\/synctest`/u);
	assert.match(goSkill, /`testing\.B\.Loop`/u);
	assert.match(goSkill, /`tool` directive over `tools\.go`/u);
	assert.match(goSkill, /`go fix` modernizers/u);

	assert.match(freshnessSkill, /Go release, toolchain, standard-library, runtime, experiment, framework, or dependency references such as Gin/u);
	assert.match(freshnessSkill, /official Go release notes or package documentation/u);
	assert.match(freshnessSkill, /For Gin, prefer official Gin release notes, pkg\.go\.dev module metadata/u);
	assert.match(freshnessSkill, /framework minor can still require a Go toolchain, CI image, Docker base, middleware, route, or binding migration/u);
	assert.match(freshnessSkill, /expression operands to `new`/u);
	assert.match(freshnessSkill, /goroutine leak profiles/u);
	assert.match(freshnessSkill, /`GOEXPERIMENT` APIs/u);
	assert.match(skillIndex, /\.mustflow\/skills\/go-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /HTTP clients or servers, Gin engines, router groups, middleware chains/u);
	assert.match(skillIndex, /Gin context reuse bug, unsafe middleware order, trusted-proxy drift, binding or validation bypass/u);
	assert.match(skillIndex, /unsupported Go feature/u);
	assert.match(routes, /\[routes\."go-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.deepEqual(routeReasons(routes, 'go-code-change'), [
		'code_change',
		'behavior_change',
		'public_api_change',
		'test_change',
		'docs_change',
		'data_change',
		'performance_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/go-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"go-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.go-code-change"\][\s\S]*?revision = 7/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 11/u);
});

test('Java code change skill gates JDK tracks, JVM tuning, virtual threads, and reflection traps', () => {
	const javaSkill = readText('.mustflow/skills/java-code-change/SKILL.md');
	const templateJavaSkill = readText('templates/default/locales/en/.mustflow/skills/java-code-change/SKILL.md');
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(javaSkill, templateJavaSkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(javaSkill, /current GA, latest LTS, and vendor-support track/u);
	assert.match(javaSkill, /latest GA is not automatically the production baseline/u);
	assert.match(javaSkill, /not loaded, not found, forbidden/u);
	assert.match(javaSkill, /reject `null` elements inside collections/u);
	assert.match(javaSkill, /use `Optional` mainly as a return protocol/u);
	assert.match(javaSkill, /value-based class: avoid identity equality/u);
	assert.match(javaSkill, /eager `orElse\(expensive\(\)\)`/u);
	assert.match(javaSkill, /records are shallowly immutable/u);
	assert.match(javaSkill, /array record components use reference equality/u);
	assert.match(javaSkill, /sealed classes control inheritance, not plugin extension/u);
	assert.match(javaSkill, /use `--release` or the build tool equivalent/u);
	assert.match(javaSkill, /preview and incubator APIs as migration-sensitive/u);
	assert.match(javaSkill, /do not expose structured concurrency preview types in public APIs/u);
	assert.match(javaSkill, /adding a method to an interface can break implementers/u);
	assert.match(javaSkill, /already compiled consumers/u);
	assert.match(javaSkill, /ServiceLoader, `META-INF\/services`/u);
	assert.match(javaSkill, /Surefire, Failsafe, JUnit Platform/u);
	assert.match(javaSkill, /golden serialized payloads/u);
	assert.match(javaSkill, /mutates `final` fields reflectively/u);
	assert.match(javaSkill, /`java\.applet`/u);
	assert.match(javaSkill, /use virtual threads for high-concurrency blocking I\/O paths/u);
	assert.match(javaSkill, /do not pool virtual threads/u);
	assert.match(javaSkill, /fixed thread pools can hide overload behind unbounded queues/u);
	assert.match(javaSkill, /`CompletableFuture` default async methods/u);
	assert.match(javaSkill, /rejection policy/u);
	assert.match(javaSkill, /treat `ThreadLocal` as a memory and lifecycle risk/u);
	assert.match(javaSkill, /use `ScopedValue` for immutable request/u);
	assert.match(javaSkill, /Java `HttpClient` HTTP\/3 support as client-side and opt-in/u);
	assert.match(javaSkill, /`@Transactional` is reached through the proxy/u);
	assert.match(javaSkill, /checked exceptions/u);
	assert.match(javaSkill, /`REQUIRES_NEW` as a connection-pool/u);
	assert.match(javaSkill, /`@TransactionalEventListener\(AFTER_COMMIT\)`/u);
	assert.match(javaSkill, /OSIV or lazy loading/u);
	assert.match(javaSkill, /bind external requests to DTOs/u);
	assert.match(javaSkill, /Spring Security filter-chain matchers/u);
	assert.match(javaSkill, /Separate AOT cache from native image/u);
	assert.match(javaSkill, /G1 pause targets are goals, not SLAs/u);
	assert.match(javaSkill, /ZGC and Shenandoah trade CPU and headroom/u);
	assert.match(javaSkill, /Generational Shenandoah, Compact Object Headers/u);
	assert.match(javaSkill, /optimize allocation rate, live set, peak memory/u);
	assert.match(javaSkill, /new-TLAB, outside-TLAB/u);
	assert.match(javaSkill, /pooling ordinary short-lived DTOs/u);
	assert.match(javaSkill, /G1 humongous-object risks/u);
	assert.match(javaSkill, /heap is only part of RSS/u);
	assert.match(javaSkill, /`MaxRAMPercentage`, `InitialRAMPercentage`, `MaxDirectMemorySize`/u);
	assert.match(javaSkill, /`ActiveProcessorCount`/u);
	assert.match(javaSkill, /use JMH for microbenchmarks/u);
	assert.match(javaSkill, /JFR, GC logs, native memory tracking/u);
	assert.match(javaSkill, /Jackson, Gson, Kryo, protobuf, Avro, Hibernate/u);
	assert.match(javaSkill, /Maven compiler plugin, Gradle toolchains/u);
	assert.match(javaSkill, /Maven parent inheritance separate from aggregator reactor membership/u);
	assert.match(javaSkill, /Gradle `api` only for public types/u);
	assert.match(javaSkill, /Maven `dependencyManagement` manages versions but does not add dependencies/u);
	assert.match(javaSkill, /version catalog as a BOM/u);
	assert.match(javaSkill, /Gradle variant-aware resolution versus Maven POM publication metadata/u);

	assert.match(freshnessSkill, /Java or JDK release, GA, LTS, support, JEP, JVM flag, GC/u);
	assert.match(freshnessSkill, /Oracle\/OpenJDK\/vendor support tracks/u);
	assert.match(freshnessSkill, /official Java, OpenJDK, vendor, Maven, or Gradle sources/u);
	assert.match(freshnessSkill, /Do not collapse latest GA, latest LTS, repository runtime/u);
	assert.match(freshnessSkill, /JVM AOT cache as startup or warmup optimization, not Native Image/u);
	assert.match(freshnessSkill, /G1 pause targets as goals rather than SLAs/u);
	assert.match(freshnessSkill, /container memory claims separate across heap, direct buffers, metaspace/u);

	assert.match(skillIndex, /\.mustflow\/skills\/java-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /Java\/JDK version-gated features are created or changed/u);
	assert.match(skillIndex, /GA\/LTS confusion/u);
	assert.match(skillIndex, /Spring transaction leak/u);
	assert.match(skillIndex, /binary compatibility break/u);
	assert.match(skillIndex, /executor backpressure gap/u);
	assert.match(skillIndex, /allocation folklore/u);
	assert.match(skillIndex, /virtual-thread misuse/u);
	assert.match(skillIndex, /container OOM/u);
	assert.match(skillIndex, /Java latest-GA\/LTS\/runtime\/JEP\/preview\/incubator confusion/u);
	assert.match(routes, /\[routes\."java-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.deepEqual(routeReasons(routes, 'java-code-change'), [
		'code_change',
		'behavior_change',
		'public_api_change',
		'test_change',
		'docs_change',
		'data_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/java-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"java-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.java-code-change"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 11/u);
});

test('Rust code change skill gates MSRV, ownership, Cargo, unsafe, and release-profile traps by Rust version', () => {
	const rustSkill = readText('.mustflow/skills/rust-code-change/SKILL.md');
	const templateRustSkill = readText('templates/default/locales/en/.mustflow/skills/rust-code-change/SKILL.md');
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(rustSkill, templateRustSkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(rustSkill, /`rust-version`, edition, `rust-toolchain\.toml`/u);
	assert.match(rustSkill, /API-specific MSRV ledger/u);
	assert.match(rustSkill, /`cfg_select!`, match `if let` guards, `core::range` items, `Vec::push_mut`/u);
	assert.match(rustSkill, /`assert_matches!`, and `debug_assert_matches!`/u);
	assert.match(rustSkill, /guard patterns do not satisfy match exhaustiveness/u);
	assert.match(rustSkill, /Import it explicitly from `std` or `core`/u);
	assert.match(rustSkill, /`Arc::make_mut`/u);
	assert.match(rustSkill, /`LazyLock` for no-argument static lazy values/u);
	assert.match(rustSkill, /`OnceLock` when boot-time or test-time code supplies the value/u);
	assert.match(rustSkill, /`Cow<'_, str>`/u);
	assert.match(rustSkill, /query `HashMap<String, V>` with `&str`/u);
	assert.match(rustSkill, /`Option::take`, `take_if`, or `as_slice`/u);
	assert.match(rustSkill, /`ControlFlow`, `try_for_each`, or `try_fold`/u);
	assert.match(rustSkill, /`spare_capacity_mut`/u);
	for (const signal of [
		'ownership ledger before reshaping modules',
		'derived `Clone` that hides shared mutable state',
		'`Rc<RefCell<_>>` object graphs',
		'Use zero-copy only when the lifetime cost is lower than the copy cost',
		'shape error variants around caller action',
		'Keep `anyhow` mostly at application, CLI, worker, migration, or top-level '
			+ 'orchestration boundaries',
		"Track every spawned task's owner, join/abort policy, panic handling, "
			+ 'cancellation signal, and shutdown wait point',
		'prefer bounded channels unless unbounded memory growth is explicitly acceptable',
	]) {
		assert.ok(rustSkill.includes(signal), `Rust skill should include ${signal}`);
	}
	assert.match(rustSkill, /avoid repeated `String::insert`/u);
	assert.match(rustSkill, /argument-position `impl Trait` removes caller turbofish control/u);
	assert.match(rustSkill, /implement `Deref` only for pointer-like wrappers/u);
	assert.match(rustSkill, /use GATs for borrowing iterator\/view traits/u);
	assert.match(rustSkill, /`workspace\.package`, `workspace\.dependencies`, `workspace\.lints`/u);
	assert.match(rustSkill, /`resolver = "2"`/u);
	assert.match(rustSkill, /Rust 2024 or when `unsafe_op_in_unsafe_fn` is enabled/u);
	assert.match(rustSkill, /`opt-level`, LTO, `panic`, `codegen-units`, and `strip`/u);

	assert.match(freshnessSkill, /Rust release, toolchain, standard-library, Cargo, edition, MSRV, lint, or target references/u);
	assert.match(freshnessSkill, /official Rust release notes, standard-library docs, the Cargo Book, Rust Reference, or rustc book/u);
	assert.match(freshnessSkill, /let chains, match `if let` guards, `cfg_select!`, `assert_matches!`, `core::range`, `Vec::push_mut`/u);
	assert.match(freshnessSkill, /Rust 2024 `unsafe_op_in_unsafe_fn`/u);
	assert.match(freshnessSkill, /Use an API-by-API MSRV ledger/u);

	assert.match(skillIndex, /\.mustflow\/skills\/rust-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /shared-state aliasing/u);
	assert.match(skillIndex, /task or channel leak/u);
	assert.match(skillIndex, /allocation folklore/u);
	assert.match(skillIndex, /unsupported Rust feature/u);
	assert.match(skillIndex, /Rust stable\/nightly\/MSRV confusion/u);
	assert.match(routes, /\[routes\."rust-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.deepEqual(routeReasons(routes, 'rust-code-change'), [
		'code_change',
		'behavior_change',
		'public_api_change',
		'test_change',
		'docs_change',
		'data_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/rust-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"rust-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.rust-code-change"\][\s\S]*?revision = 7/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 11/u);
});
