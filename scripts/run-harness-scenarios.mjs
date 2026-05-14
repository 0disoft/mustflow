#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCHEMA_VERSION = '1';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultFixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'harness-scenarios');
const FORBIDDEN_SCENARIO_REQUIREMENTS = [
	['network_access', 'network access'],
	['live_ai_calls', 'live AI calls'],
	['personal_credentials', 'personal credentials'],
	['running_server', 'a running server'],
];

function parseArgs(args) {
	let fixturesRoot = defaultFixturesRoot;
	let json = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--json') {
			json = true;
			continue;
		}

		if (arg === '--fixtures') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, fixturesRoot, error: '--fixtures requires a path' };
			}

			fixturesRoot = path.resolve(value);
			index += 1;
			continue;
		}

		if (arg.startsWith('--fixtures=')) {
			const value = arg.slice('--fixtures='.length);
			if (!value) {
				return { json, fixturesRoot, error: '--fixtures requires a path' };
			}

			fixturesRoot = path.resolve(value);
			continue;
		}

		return { json, fixturesRoot, error: `Unknown option: ${arg}` };
	}

	return { json, fixturesRoot };
}

function uniqueSorted(values) {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function arraysEqual(left, right) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

function jsonEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeStringArray(value) {
	return Array.isArray(value) ? uniqueSorted(value.filter((item) => typeof item === 'string')) : [];
}

function createMeasurements({
	selectedIntents = [],
	blockedUnsafeActions = [],
	missingNarrowIntents = [],
	explanationComplete = true,
} = {}) {
	return {
		selected_intents: normalizeStringArray(selectedIntents),
		blocked_unsafe_actions: normalizeStringArray(blockedUnsafeActions),
		missing_narrow_intents: normalizeStringArray(missingNarrowIntents),
		explanation_complete: explanationComplete === true,
	};
}

function normalizeMeasurements(value) {
	const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

	return createMeasurements({
		selectedIntents: record.selected_intents,
		blockedUnsafeActions: record.blocked_unsafe_actions,
		missingNarrowIntents: record.missing_narrow_intents,
		explanationComplete: record.explanation_complete,
	});
}

function isPlainRecord(value) {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isStringOrNull(value) {
	return typeof value === 'string' || value === null;
}

function validateStringArrayField(record, key, errors, prefix, { required = true } = {}) {
	if (!Object.prototype.hasOwnProperty.call(record, key)) {
		if (required) {
			errors.push(`${prefix}.${key} must be an array of strings.`);
		}
		return;
	}

	if (!Array.isArray(record[key]) || record[key].some((item) => typeof item !== 'string')) {
		errors.push(`${prefix}.${key} must be an array of strings.`);
	}
}

function validateBooleanField(record, key, errors, prefix) {
	if (typeof record[key] !== 'boolean') {
		errors.push(`${prefix}.${key} must be a boolean.`);
	}
}

function validateNumberField(record, key, errors, prefix) {
	if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
		errors.push(`${prefix}.${key} must be a finite number.`);
	}
}

function validateExpectedMeasurementsShape(expected, errors) {
	if (!Object.prototype.hasOwnProperty.call(expected, 'measurements')) {
		return;
	}

	if (!isPlainRecord(expected.measurements)) {
		errors.push('expect.measurements must be an object when present.');
		return;
	}

	validateStringArrayField(expected.measurements, 'selected_intents', errors, 'expect.measurements');
	validateStringArrayField(expected.measurements, 'blocked_unsafe_actions', errors, 'expect.measurements');
	validateStringArrayField(expected.measurements, 'missing_narrow_intents', errors, 'expect.measurements');
	validateBooleanField(expected.measurements, 'explanation_complete', errors, 'expect.measurements');
}

function validateCandidateStatusShape(candidate, index, errors) {
	const prefix = `expect.candidate_statuses[${index}]`;

	if (!isPlainRecord(candidate)) {
		errors.push(`${prefix} must be an object.`);
		return;
	}

	if (!isStringOrNull(candidate.reason)) {
		errors.push(`${prefix}.reason must be a string or null.`);
	}

	if (!isStringOrNull(candidate.intent)) {
		errors.push(`${prefix}.intent must be a string or null.`);
	}

	if (typeof candidate.status !== 'string') {
		errors.push(`${prefix}.status must be a string.`);
	}

	if (!isStringOrNull(candidate.skip_reason)) {
		errors.push(`${prefix}.skip_reason must be a string or null.`);
	}
}

function validateSelectionExplanationShape(explanation, index, errors) {
	const prefix = `expect.selection_explanations[${index}]`;

	if (!isPlainRecord(explanation)) {
		errors.push(`${prefix} must be an object.`);
		return;
	}

	for (const key of ['reason', 'selected_intent', 'preferred_intent', 'selected_status', 'preferred_status', 'preferred_skip_reason', 'explanation_status']) {
		if (!isStringOrNull(explanation[key])) {
			errors.push(`${prefix}.${key} must be a string or null.`);
		}
	}

	if (typeof explanation.detail_present !== 'boolean') {
		errors.push(`${prefix}.detail_present must be a boolean.`);
	}
}

function validateUpdateItemShape(item, index, errors) {
	const prefix = `expect.item_actions[${index}]`;

	if (!isPlainRecord(item)) {
		errors.push(`${prefix} must be an object.`);
		return;
	}

	for (const key of ['relativePath', 'action', 'reason']) {
		if (typeof item[key] !== 'string') {
			errors.push(`${prefix}.${key} must be a string.`);
		}
	}
}

function validateClaimStatusShape(status, index, errors) {
	const prefix = `expect.claim_statuses[${index}]`;

	if (!isPlainRecord(status)) {
		errors.push(`${prefix} must be an object.`);
		return;
	}

	for (const key of ['intent', 'claim_kind', 'status']) {
		if (typeof status[key] !== 'string') {
			errors.push(`${prefix}.${key} must be a string.`);
		}
	}

	for (const key of ['reason', 'plan_node_id', 'receipt_id']) {
		if (!isStringOrNull(status[key])) {
			errors.push(`${prefix}.${key} must be a string or null.`);
		}
	}
}

function validateRecordArrayField(record, key, errors, prefix, validateEntry) {
	if (!Array.isArray(record[key])) {
		errors.push(`${prefix}.${key} must be an array.`);
		return;
	}

	record[key].forEach((item, index) => validateEntry(item, index, errors));
}

function validateVerificationExpectShape(expected, errors) {
	validateStringArrayField(expected, 'validation_reasons', errors, 'expect');
	validateStringArrayField(expected, 'runnable_intents', errors, 'expect');
	validateStringArrayField(expected, 'gap_reasons', errors, 'expect');
	validateRecordArrayField(expected, 'candidate_statuses', errors, 'expect', validateCandidateStatusShape);
	validateStringArrayField(expected, 'broad_selection_failures', errors, 'expect', { required: false });

	if (Object.prototype.hasOwnProperty.call(expected, 'selection_explanations')) {
		validateRecordArrayField(expected, 'selection_explanations', errors, 'expect', validateSelectionExplanationShape);
	}

	validateExpectedMeasurementsShape(expected, errors);
}

function validateUpdatePlanExpectShape(expected, errors) {
	validateNumberField(expected, 'exit_status', errors, 'expect');
	validateBooleanField(expected, 'ok', errors, 'expect');
	validateBooleanField(expected, 'wrote_files', errors, 'expect');

	if (!isPlainRecord(expected.summary)) {
		errors.push('expect.summary must be an object.');
	} else {
		for (const key of ['blockedLocalChanges', 'manualReview', 'wouldUpdate', 'wouldCreate']) {
			validateNumberField(expected.summary, key, errors, 'expect.summary');
		}
	}

	validateRecordArrayField(expected, 'item_actions', errors, 'expect', validateUpdateItemShape);
	validateExpectedMeasurementsShape(expected, errors);
}

function validateReportClaimsExpectShape(expected, errors) {
	validateRecordArrayField(expected, 'claim_statuses', errors, 'expect', validateClaimStatusShape);
	validateStringArrayField(expected, 'failed_claim_intents', errors, 'expect');
	validateStringArrayField(expected, 'passed_claim_intents', errors, 'expect');
	validateNumberField(expected, 'unsupported_claim_count', errors, 'expect');
	validateExpectedMeasurementsShape(expected, errors);
}

function readJsonFile(filePath) {
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listScenarioFiles(fixturesRoot) {
	if (!existsSync(fixturesRoot)) {
		throw new Error(`Harness scenario fixture directory does not exist: ${fixturesRoot}`);
	}

	return readdirSync(fixturesRoot)
		.filter((name) => name.endsWith('.json'))
		.map((name) => path.join(fixturesRoot, name))
		.filter((filePath) => statSync(filePath).isFile())
		.sort((left, right) => left.localeCompare(right));
}

function validateScenarioShape(scenario, filePath) {
	const errors = [];

	if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
		return [`${filePath} must contain a JSON object.`];
	}

	if (scenario.schema_version !== SCHEMA_VERSION) {
		errors.push('schema_version must be "1".');
	}

	if (typeof scenario.name !== 'string' || scenario.name.length === 0) {
		errors.push('name must be a non-empty string.');
	}

	if (!scenario.expect || typeof scenario.expect !== 'object' || Array.isArray(scenario.expect)) {
		errors.push('expect must be an object.');
	}

	if (scenario.requires !== undefined && (!scenario.requires || typeof scenario.requires !== 'object' || Array.isArray(scenario.requires))) {
		errors.push('requires must be an object when present.');
	}

	if (scenario.requires && typeof scenario.requires === 'object' && !Array.isArray(scenario.requires)) {
		for (const [key, label] of FORBIDDEN_SCENARIO_REQUIREMENTS) {
			if (scenario.requires[key] === true) {
				errors.push(`requires.${key} must not be true; harness scenarios must not require ${label}.`);
			}
		}
	}

	const kind = scenario.kind ?? 'verification';

	if (kind === 'verification') {
		if (!Array.isArray(scenario.files) || scenario.files.some((item) => typeof item !== 'string')) {
			errors.push('files must be an array of strings.');
		}

		if (!scenario.command_contract || typeof scenario.command_contract !== 'object' || Array.isArray(scenario.command_contract)) {
			errors.push('command_contract must be an object.');
		}

		if (scenario.selection_claims !== undefined && !Array.isArray(scenario.selection_claims)) {
			errors.push('selection_claims must be an array when present.');
		}

		if (isPlainRecord(scenario.expect)) {
			validateVerificationExpectShape(scenario.expect, errors);
		}
	} else if (kind === 'update_plan') {
		if (!scenario.project || typeof scenario.project !== 'object' || Array.isArray(scenario.project)) {
			errors.push('project must be an object.');
		}

		if (isPlainRecord(scenario.expect)) {
			validateUpdatePlanExpectShape(scenario.expect, errors);
		}
	} else if (kind === 'report_claims') {
		if (!scenario.plan || typeof scenario.plan !== 'object' || Array.isArray(scenario.plan)) {
			errors.push('plan must be an object.');
		}

		if (!Array.isArray(scenario.receipts)) {
			errors.push('receipts must be an array.');
		}

		if (!Array.isArray(scenario.claims)) {
			errors.push('claims must be an array.');
		}

		if (isPlainRecord(scenario.expect)) {
			validateReportClaimsExpectShape(scenario.expect, errors);
		}
	} else {
		errors.push(`kind must be "verification", "update_plan", or "report_claims", got ${JSON.stringify(kind)}.`);
	}

	return errors;
}

function normalizeCommandContract(value) {
	const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	const intents = record.intents && typeof record.intents === 'object' && !Array.isArray(record.intents) ? record.intents : {};
	const defaults =
		record.defaults && typeof record.defaults === 'object' && !Array.isArray(record.defaults) ? record.defaults : {};
	const resources =
		record.resources && typeof record.resources === 'object' && !Array.isArray(record.resources) ? record.resources : {};

	return { defaults, intents, resources };
}

function normalizeCandidate(candidate) {
	return {
		reason: candidate.reason,
		intent: candidate.intent,
		status: candidate.status,
		skip_reason: candidate.skipReason,
	};
}

function normalizeCandidateStatuses(candidates) {
	return candidates.map(normalizeCandidate).sort((left, right) => expectedCandidateKey(left).localeCompare(expectedCandidateKey(right)));
}

function expectedCandidateKey(candidate) {
	return [
		candidate.reason ?? '',
		candidate.intent ?? '',
		candidate.status ?? '',
		candidate.skip_reason ?? '',
	].join('\u0000');
}

function addExactArrayCheck(checks, name, actual, expected) {
	checks.push({
		name,
		status: arraysEqual(actual, expected) ? 'passed' : 'failed',
		expected,
		actual,
	});
}

function addCandidateChecks(checks, actualCandidates, expectedCandidates) {
	const actual = normalizeCandidateStatuses(actualCandidates);
	const expected = Array.isArray(expectedCandidates)
		? expectedCandidates
				.map((candidate) => ({
					reason: typeof candidate.reason === 'string' ? candidate.reason : null,
					intent: typeof candidate.intent === 'string' ? candidate.intent : null,
					status: typeof candidate.status === 'string' ? candidate.status : null,
					skip_reason:
						typeof candidate.skip_reason === 'string'
							? candidate.skip_reason
							: candidate.skip_reason === null
								? null
								: undefined,
				}))
				.sort((left, right) => expectedCandidateKey(left).localeCompare(expectedCandidateKey(right)))
		: [];

	checks.push({
		name: 'candidate_statuses',
		status: JSON.stringify(actual) === JSON.stringify(expected) ? 'passed' : 'failed',
		expected,
		actual,
	});
}

function normalizeSelectionClaims(value) {
	return (Array.isArray(value) ? value : [])
		.filter((claim) => claim && typeof claim === 'object' && !Array.isArray(claim))
		.flatMap((claim) => {
			const reason = typeof claim.reason === 'string' ? claim.reason : null;
			const selectedIntent = typeof claim.selected_intent === 'string' ? claim.selected_intent : null;
			const preferredIntents = normalizeStringArray(claim.preferred_narrow_intents);

			if (!reason || !selectedIntent || preferredIntents.length === 0) {
				return [];
			}

			return preferredIntents.map((preferredIntent) => ({
				reason,
				selected_intent: selectedIntent,
				preferred_intent: preferredIntent,
			}));
		})
		.sort((left, right) =>
			`${left.reason}\u0000${left.selected_intent}\u0000${left.preferred_intent}`.localeCompare(
				`${right.reason}\u0000${right.selected_intent}\u0000${right.preferred_intent}`,
			),
		);
}

function normalizeSelectionExplanations(value) {
	return (Array.isArray(value) ? value : [])
		.map((explanation) => ({
			reason: typeof explanation.reason === 'string' ? explanation.reason : null,
			selected_intent: typeof explanation.selected_intent === 'string' ? explanation.selected_intent : null,
			preferred_intent: typeof explanation.preferred_intent === 'string' ? explanation.preferred_intent : null,
			selected_status: typeof explanation.selected_status === 'string' ? explanation.selected_status : null,
			preferred_status: typeof explanation.preferred_status === 'string' ? explanation.preferred_status : null,
			preferred_skip_reason:
				typeof explanation.preferred_skip_reason === 'string'
					? explanation.preferred_skip_reason
					: explanation.preferred_skip_reason === null
						? null
						: undefined,
			detail_present: explanation.detail_present === true,
			explanation_status: typeof explanation.explanation_status === 'string' ? explanation.explanation_status : null,
		}))
		.sort((left, right) =>
			`${left.reason}\u0000${left.selected_intent}\u0000${left.preferred_intent}`.localeCompare(
				`${right.reason}\u0000${right.selected_intent}\u0000${right.preferred_intent}`,
			),
		);
}

function explainSelectionClaims(candidates, selectionClaims) {
	return normalizeSelectionExplanations(
		normalizeSelectionClaims(selectionClaims).map((claim) => {
			const selected = candidates.find(
				(candidate) => candidate.reason === claim.reason && candidate.intent === claim.selected_intent,
			);
			const preferred = candidates.find(
				(candidate) => candidate.reason === claim.reason && candidate.intent === claim.preferred_intent,
			);
			let explanationStatus = 'explained';

			if (!selected || selected.status !== 'runnable') {
				explanationStatus = 'selected_not_runnable';
			} else if (!preferred) {
				explanationStatus = 'missing_candidate';
			} else if (preferred.status === 'runnable') {
				explanationStatus = 'preferred_intent_runnable';
			} else if (!preferred.skipReason || !preferred.detail) {
				explanationStatus = 'missing_unavailable_explanation';
			}

			return {
				reason: claim.reason,
				selected_intent: claim.selected_intent,
				preferred_intent: claim.preferred_intent,
				selected_status: selected?.status ?? null,
				preferred_status: preferred?.status ?? null,
				preferred_skip_reason: preferred?.skipReason ?? null,
				detail_present: typeof preferred?.detail === 'string' && preferred.detail.length > 0,
				explanation_status: explanationStatus,
			};
		}),
	);
}

function addJsonCheck(checks, name, actual, expected) {
	checks.push({
		name,
		status: jsonEqual(actual, expected) ? 'passed' : 'failed',
		expected,
		actual,
	});
}

function addExpectedMeasurementsCheck(checks, measurements, expected) {
	if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
		return;
	}

	if (!Object.prototype.hasOwnProperty.call(expected, 'measurements')) {
		return;
	}

	addJsonCheck(checks, 'measurements', measurements, normalizeMeasurements(expected.measurements));
}

function pickExpectedKeys(actual, expected) {
	if (!actual || !expected || typeof actual !== 'object' || typeof expected !== 'object' || Array.isArray(actual) || Array.isArray(expected)) {
		return actual;
	}

	return Object.fromEntries(Object.keys(expected).map((key) => [key, actual[key]]));
}

async function loadCoreModules() {
	const classificationModulePath = path.join(repoRoot, 'dist', 'core', 'change-classification.js');
	const verificationModulePath = path.join(repoRoot, 'dist', 'core', 'change-verification.js');
	const initModulePath = path.join(repoRoot, 'dist', 'cli', 'commands', 'init.js');
	const updateModulePath = path.join(repoRoot, 'dist', 'cli', 'commands', 'update.js');

	if (!existsSync(classificationModulePath) || !existsSync(verificationModulePath) || !existsSync(initModulePath) || !existsSync(updateModulePath)) {
		throw new Error('Built core modules are missing. Run the configured build or test intent before harness scenarios.');
	}

	const [{ createChangeClassificationReport }, { createChangeVerificationReport }, { runInit }, { planUpdate, summarizePlan }] = await Promise.all([
		import(pathToFileURL(classificationModulePath).href),
		import(pathToFileURL(verificationModulePath).href),
		import(pathToFileURL(initModulePath).href),
		import(pathToFileURL(updateModulePath).href),
	]);

	return { createChangeClassificationReport, createChangeVerificationReport, runInit, planUpdate, summarizePlan };
}

async function runInitInProject(projectRoot, args, core) {
	const originalCwd = process.cwd();
	const stdout = [];
	const stderr = [];

	process.chdir(projectRoot);
	try {
		const status = await core.runInit(args, {
			stdout: (message) => stdout.push(message),
			stderr: (message) => stderr.push(message),
		});

		return { status, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
	} finally {
		process.chdir(originalCwd);
	}
}

function safeScenarioPath(root, relativePath) {
	const targetPath = path.resolve(root, relativePath);

	if (targetPath !== root && !targetPath.startsWith(`${root}${path.sep}`)) {
		throw new Error(`Scenario path escapes project root: ${relativePath}`);
	}

	return targetPath;
}

function normalizeLocalChanges(project) {
	const changes = project && Array.isArray(project.local_changes) ? project.local_changes : [];

	return changes.map((change) => {
		if (!change || typeof change !== 'object' || Array.isArray(change)) {
			throw new Error('project.local_changes entries must be objects.');
		}

		if (typeof change.path !== 'string' || typeof change.content !== 'string') {
			throw new Error('project.local_changes entries require string path and content.');
		}

		return change;
	});
}

function writeLocalChanges(projectRoot, project) {
	for (const change of normalizeLocalChanges(project)) {
		const targetPath = safeScenarioPath(projectRoot, change.path);

		mkdirSync(path.dirname(targetPath), { recursive: true });
		writeFileSync(targetPath, change.content);
	}
}

function localChangesPreserved(projectRoot, project) {
	return normalizeLocalChanges(project).every((change) => {
		const targetPath = safeScenarioPath(projectRoot, change.path);

		return existsSync(targetPath) && readFileSync(targetPath, 'utf8') === change.content;
	});
}

function normalizeUpdateItems(items) {
	return (Array.isArray(items) ? items : [])
		.filter((item) => item.action !== 'unchanged')
		.map((item) => ({
			relativePath: item.relativePath,
			action: item.action,
			reason: item.reason,
		}))
		.sort((left, right) => `${left.relativePath}\u0000${left.action}`.localeCompare(`${right.relativePath}\u0000${right.action}`));
}

function normalizeExpectedUpdateItems(items) {
	return (Array.isArray(items) ? items : [])
		.map((item) => ({
			relativePath: typeof item.relativePath === 'string' ? item.relativePath : null,
			action: typeof item.action === 'string' ? item.action : null,
			reason: typeof item.reason === 'string' ? item.reason : null,
		}))
		.sort((left, right) => `${left.relativePath}\u0000${left.action}`.localeCompare(`${right.relativePath}\u0000${right.action}`));
}

function normalizePlanNodes(plan) {
	const nodes = plan && Array.isArray(plan.nodes) ? plan.nodes : [];

	return nodes
		.filter((node) => node && typeof node === 'object' && !Array.isArray(node))
		.filter((node) => node.kind === 'command_candidate' && typeof node.intent === 'string')
		.map((node) => ({
			id: typeof node.id === 'string' ? node.id : null,
			intent: node.intent,
			status: typeof node.status === 'string' ? node.status : null,
		}))
		.sort((left, right) => left.intent.localeCompare(right.intent));
}

function normalizeReceipts(receipts) {
	return (Array.isArray(receipts) ? receipts : [])
		.filter((receipt) => receipt && typeof receipt === 'object' && !Array.isArray(receipt))
		.filter((receipt) => typeof receipt.intent === 'string')
		.map((receipt) => ({
			intent: receipt.intent,
			status: typeof receipt.status === 'string' ? receipt.status : null,
			receipt_id:
				typeof receipt.receipt_id === 'string'
					? receipt.receipt_id
					: typeof receipt.id === 'string'
						? receipt.id
						: null,
		}))
		.sort((left, right) => left.intent.localeCompare(right.intent));
}

function normalizeClaimStatuses(statuses) {
	return (Array.isArray(statuses) ? statuses : [])
		.map((status) => ({
			intent: typeof status.intent === 'string' ? status.intent : null,
			claim_kind: typeof status.claim_kind === 'string' ? status.claim_kind : null,
			status: typeof status.status === 'string' ? status.status : null,
			reason: typeof status.reason === 'string' ? status.reason : status.reason === null ? null : undefined,
			plan_node_id: typeof status.plan_node_id === 'string' ? status.plan_node_id : status.plan_node_id === null ? null : undefined,
			receipt_id: typeof status.receipt_id === 'string' ? status.receipt_id : status.receipt_id === null ? null : undefined,
		}))
		.sort((left, right) => `${left.intent}\u0000${left.claim_kind}`.localeCompare(`${right.intent}\u0000${right.claim_kind}`));
}

function evaluateReportClaimsScenario(scenario) {
	const shapeErrors = validateScenarioShape(scenario, scenario.name ?? '<unknown>');
	if (shapeErrors.length > 0) {
		return invalidScenarioResult(scenario, shapeErrors);
	}

	const planNodesByIntent = new Map(normalizePlanNodes(scenario.plan).map((node) => [node.intent, node]));
	const receiptsByIntent = new Map(
		normalizeReceipts(scenario.receipts)
			.filter((receipt) => receipt.status === 'passed')
			.map((receipt) => [receipt.intent, receipt]),
	);
	const supportedClaims = scenario.claims.filter(
		(claim) => claim && typeof claim === 'object' && !Array.isArray(claim) && claim.kind === 'check_passed' && typeof claim.intent === 'string',
	);
	const unsupportedClaimCount = scenario.claims.length - supportedClaims.length;
	const claimStatuses = normalizeClaimStatuses(
		supportedClaims.map((claim) => {
			const planNode = planNodesByIntent.get(claim.intent);
			const receipt = receiptsByIntent.get(claim.intent);
			let status = 'passed';
			let reason = null;

			if (!planNode) {
				status = 'failed';
				reason = 'missing_plan_node';
			} else if (!receipt) {
				status = 'failed';
				reason = 'missing_receipt';
			}

			return {
				intent: claim.intent,
				claim_kind: claim.kind,
				status,
				reason,
				plan_node_id: planNode?.id ?? null,
				receipt_id: receipt?.receipt_id ?? null,
			};
		}),
	);
	const failedClaimIntents = uniqueSorted(claimStatuses.filter((status) => status.status === 'failed').map((status) => status.intent));
	const passedClaimIntents = uniqueSorted(claimStatuses.filter((status) => status.status === 'passed').map((status) => status.intent));
	const measurements = createMeasurements({
		explanationComplete: failedClaimIntents.length === 0 && unsupportedClaimCount === 0,
	});
	const checks = [];
	const expected = scenario.expect;

	addJsonCheck(checks, 'claim_statuses', claimStatuses, normalizeClaimStatuses(expected.claim_statuses));
	addExactArrayCheck(checks, 'failed_claim_intents', failedClaimIntents, normalizeStringArray(expected.failed_claim_intents));
	addExactArrayCheck(checks, 'passed_claim_intents', passedClaimIntents, normalizeStringArray(expected.passed_claim_intents));
	addJsonCheck(checks, 'unsupported_claim_count', unsupportedClaimCount, expected.unsupported_claim_count);
	addExpectedMeasurementsCheck(checks, measurements, expected);

	return {
		name: scenario.name,
		kind: 'report_claims',
		status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
		claim_statuses: claimStatuses,
		failed_claim_intents: failedClaimIntents,
		passed_claim_intents: passedClaimIntents,
		unsupported_claim_count: unsupportedClaimCount,
		measurements,
		checks,
	};
}

async function evaluateUpdatePlanScenario(scenario, core) {
	const shapeErrors = validateScenarioShape(scenario, scenario.name ?? '<unknown>');
	if (shapeErrors.length > 0) {
		return invalidScenarioResult(scenario, shapeErrors);
	}

	const projectRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-harness-update-'));

	try {
		const project = scenario.project;
		const initArgs = Array.isArray(project.init_args) ? project.init_args.filter((item) => typeof item === 'string') : ['--yes'];
		const initResult = await runInitInProject(projectRoot, initArgs, core);
		const checks = [];

		addJsonCheck(checks, 'init_exit_status', initResult.status, 0);

		if (initResult.status !== 0) {
			return {
				name: scenario.name,
				kind: 'update_plan',
				status: 'failed',
				exit_status: initResult.status,
				checks,
			};
		}

		writeLocalChanges(projectRoot, project);
		const updatePlan = core.planUpdate(projectRoot);
		const summary = core.summarizePlan(updatePlan.items);
		const dryRunOk = !updatePlan.error && summary.blockedLocalChanges === 0 && summary.manualReview === 0;
		const exitStatus = dryRunOk ? 0 : 1;
		const expected = scenario.expect;
		const itemActions = normalizeUpdateItems(updatePlan.items);
		const measurements = createMeasurements({
			blockedUnsafeActions: itemActions
				.filter((item) => item.action.startsWith('blocked') || item.action === 'manual-review')
				.map((item) => item.relativePath),
		});

		addJsonCheck(checks, 'exit_status', exitStatus, expected.exit_status);
		addJsonCheck(checks, 'ok', dryRunOk, expected.ok);
		addJsonCheck(checks, 'wrote_files', false, expected.wrote_files);
		addJsonCheck(checks, 'summary', pickExpectedKeys(summary, expected.summary), expected.summary);
		addJsonCheck(checks, 'item_actions', itemActions, normalizeExpectedUpdateItems(expected.item_actions));
		addJsonCheck(checks, 'local_changes_preserved', localChangesPreserved(projectRoot, project), true);
		addExpectedMeasurementsCheck(checks, measurements, expected);

		return {
			name: scenario.name,
			kind: 'update_plan',
			status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
			exit_status: exitStatus,
			ok: dryRunOk,
			wrote_files: false,
			summary,
			item_actions: itemActions,
			measurements,
			checks,
		};
	} catch (error) {
		return {
			name: scenario.name,
			kind: 'update_plan',
			status: 'failed',
			checks: [
				{
					name: 'scenario_execution',
					status: 'failed',
					expected: 'scenario evaluates without throwing',
					actual: error instanceof Error ? error.message : String(error),
				},
			],
		};
	} finally {
		rmSync(projectRoot, { recursive: true, force: true });
	}
}

function invalidScenarioResult(scenario, shapeErrors) {
	return {
		name: typeof scenario?.name === 'string' ? scenario.name : '<invalid>',
		status: 'failed',
		files: [],
		checks: shapeErrors.map((message) => ({
			name: 'schema',
			status: 'failed',
			expected: 'valid scenario shape',
			actual: message,
		})),
	};
}

function evaluateVerificationScenario(scenario, core) {
	const shapeErrors = validateScenarioShape(scenario, scenario.name ?? '<unknown>');
	if (shapeErrors.length > 0) {
		return invalidScenarioResult(scenario, shapeErrors);
	}

	const commandContract = normalizeCommandContract(scenario.command_contract);
	const classificationReport = core.createChangeClassificationReport('paths', scenario.files);
	const verificationReport = core.createChangeVerificationReport(classificationReport, commandContract, repoRoot);
	const checks = [];
	const expected = scenario.expect;
	const runnableIntents = uniqueSorted(
		verificationReport.candidates
			.filter((candidate) => candidate.status === 'runnable' && candidate.intent)
			.map((candidate) => candidate.intent),
	);

	addExactArrayCheck(
		checks,
		'validation_reasons',
		normalizeStringArray(classificationReport.summary.validationReasons),
		normalizeStringArray(expected.validation_reasons),
	);
	addExactArrayCheck(
		checks,
		'runnable_intents',
		runnableIntents,
		normalizeStringArray(expected.runnable_intents),
	);
	addExactArrayCheck(
		checks,
		'gap_reasons',
		uniqueSorted(verificationReport.gaps.map((gap) => gap.reason)),
		normalizeStringArray(expected.gap_reasons),
	);
	addCandidateChecks(checks, verificationReport.candidates, expected.candidate_statuses);
	const selectionExplanations = explainSelectionClaims(verificationReport.candidates, scenario.selection_claims);
	const broadSelectionFailures = uniqueSorted(
		selectionExplanations
			.filter((explanation) => explanation.explanation_status !== 'explained')
			.map((explanation) => `${explanation.reason}:${explanation.selected_intent}:${explanation.preferred_intent}`),
	);
	const measurements = createMeasurements({
		selectedIntents: runnableIntents,
		missingNarrowIntents: selectionExplanations
			.filter((explanation) => explanation.explanation_status === 'missing_candidate')
			.map((explanation) => explanation.preferred_intent),
		explanationComplete: broadSelectionFailures.length === 0,
	});

	addJsonCheck(checks, 'selection_explanations', selectionExplanations, normalizeSelectionExplanations(expected.selection_explanations));
	addExactArrayCheck(checks, 'broad_selection_failures', broadSelectionFailures, normalizeStringArray(expected.broad_selection_failures));
	addExpectedMeasurementsCheck(checks, measurements, expected);

	return {
		name: scenario.name,
		status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
		files: classificationReport.files,
		validation_reasons: classificationReport.summary.validationReasons,
		runnable_intents: runnableIntents,
		gap_reasons: uniqueSorted(verificationReport.gaps.map((gap) => gap.reason)),
		candidate_statuses: normalizeCandidateStatuses(verificationReport.candidates),
		selection_explanations: selectionExplanations,
		broad_selection_failures: broadSelectionFailures,
		measurements,
		checks,
	};
}

async function evaluateScenario(scenario, core) {
	const kind = scenario.kind ?? 'verification';

	if (kind === 'update_plan') {
		return evaluateUpdatePlanScenario(scenario, core);
	}

	if (kind === 'report_claims') {
		return evaluateReportClaimsScenario(scenario);
	}

	return evaluateVerificationScenario(scenario, core);
}

function renderText(report) {
	const lines = [
		`harness scenarios: ${report.summary.passed}/${report.summary.total} passed`,
		...report.scenarios.map((scenario) => `- ${scenario.name}: ${scenario.status}`),
	];

	if (!report.ok) {
		for (const scenario of report.scenarios.filter((item) => item.status === 'failed')) {
			for (const check of scenario.checks.filter((item) => item.status === 'failed')) {
				lines.push(`  ${scenario.name}.${check.name}: expected ${JSON.stringify(check.expected)}, got ${JSON.stringify(check.actual)}`);
			}
		}
	}

	return `${lines.join('\n')}\n`;
}

async function main() {
	const parsed = parseArgs(process.argv.slice(2));

	if (parsed.error) {
		const report = {
			schema_version: SCHEMA_VERSION,
			command: 'harness_scenarios',
			ok: false,
			error: parsed.error,
			summary: { total: 0, passed: 0, failed: 1 },
			scenarios: [],
		};
		process.stdout.write(parsed.json ? `${JSON.stringify(report, null, 2)}\n` : `${parsed.error}\n`);
		process.exitCode = 1;
		return;
	}

	const core = await loadCoreModules();
	const scenarioFiles = listScenarioFiles(parsed.fixturesRoot);
	const scenarios = [];

	for (const filePath of scenarioFiles) {
		scenarios.push(await evaluateScenario(readJsonFile(filePath), core));
	}
	const passed = scenarios.filter((scenario) => scenario.status === 'passed').length;
	const report = {
		schema_version: SCHEMA_VERSION,
		command: 'harness_scenarios',
		ok: passed === scenarios.length,
		fixtures_root: path.relative(process.cwd(), parsed.fixturesRoot).replaceAll('\\', '/') || '.',
		summary: {
			total: scenarios.length,
			passed,
			failed: scenarios.length - passed,
		},
		scenarios,
	};

	process.stdout.write(parsed.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
	process.exitCode = report.ok ? 0 : 1;
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
});
