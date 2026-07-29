export const DETERMINISTIC_RACE_SCENARIO_SCHEMA_VERSION = '1';

export type RaceOperationAction =
	| 'allocate'
	| 'publish'
	| 'acquire'
	| 'release'
	| 'read'
	| 'write'
	| 'retire'
	| 'free'
	| 'checkpoint';

export interface RaceOperation {
	readonly id: string;
	readonly action: RaceOperationAction;
	readonly resource: string;
	readonly generation?: number;
}

export interface RaceActor {
	readonly id: string;
	readonly operations: readonly RaceOperation[];
}

export interface RaceScheduleEntry {
	readonly actor: string;
	readonly operation: string;
}

export interface DeterministicRaceScenario {
	readonly schema_version: '1';
	readonly kind: 'deterministic_race_scenario';
	readonly reuse_addresses: boolean;
	readonly fail_at: number | null;
	readonly actors: readonly RaceActor[];
	readonly schedule: readonly RaceScheduleEntry[];
}

export interface RaceFinding {
	readonly code: string;
	readonly severity: 'error' | 'warning';
	readonly actor: string | null;
	readonly operation: string | null;
	readonly resource: string | null;
	readonly message: string;
}

export interface RaceTraceEntry {
	readonly ordinal: number;
	readonly actor: string;
	readonly operation: string;
	readonly action: RaceOperationAction;
	readonly resource: string;
	readonly generation: number | null;
	readonly outcome: 'executed' | 'injected_failure' | 'rejected';
}

export interface DeterministicRaceReport {
	readonly schema_version: '1';
	readonly command: 'crash_evidence_race';
	readonly ok: boolean;
	readonly status: 'passed' | 'failed' | 'rejected';
	readonly deterministic: true;
	readonly executed_operations: number;
	readonly findings: readonly RaceFinding[];
	readonly trace: readonly RaceTraceEntry[];
}

interface ResourceState {
	generation: number;
	alive: boolean;
	published: boolean;
	readers: Set<string>;
}

const ACTIONS = new Set<RaceOperationAction>([
	'allocate', 'publish', 'acquire', 'release', 'read', 'write', 'retire', 'free', 'checkpoint',
]);
const MAX_ACTORS = 128;
const MAX_OPERATIONS = 16_384;

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
	const keys = new Set(allowed);
	return Object.keys(value).every((key) => keys.has(key));
}

function rejected(findings: readonly RaceFinding[]): DeterministicRaceReport {
	return {
		schema_version: '1', command: 'crash_evidence_race', ok: false, status: 'rejected', deterministic: true,
		executed_operations: 0, findings, trace: [],
	};
}

function invalid(message: string): DeterministicRaceReport {
	return rejected([{ code: 'invalid_scenario', severity: 'error', actor: null, operation: null, resource: null, message }]);
}

function parseScenario(value: unknown): DeterministicRaceScenario | DeterministicRaceReport {
	if (!isRecord(value)) return invalid('Scenario must be an object.');
	if (!hasOnlyKeys(value, ['schema_version', 'kind', 'reuse_addresses', 'fail_at', 'actors', 'schedule'])) return invalid('Scenario contains an unknown field.');
	if (value.schema_version !== '1' || value.kind !== 'deterministic_race_scenario') return invalid('Scenario version or kind is unsupported.');
	if (typeof value.reuse_addresses !== 'boolean') return invalid('reuse_addresses must be a boolean.');
	if (value.fail_at !== null && (!Number.isSafeInteger(value.fail_at) || (value.fail_at as number) < 0)) return invalid('fail_at must be null or a non-negative integer.');
	if (!Array.isArray(value.actors) || value.actors.length === 0 || value.actors.length > MAX_ACTORS) return invalid('actors must contain 1 to 128 entries.');
	if (!Array.isArray(value.schedule) || value.schedule.length > MAX_OPERATIONS) return invalid('schedule exceeds the bounded operation limit.');
	if (value.fail_at !== null && (value.fail_at as number) >= value.schedule.length) return invalid('fail_at must reference an existing schedule ordinal.');
	const actorIds = new Set<string>();
	let operationCount = 0;
	for (const actor of value.actors) {
		if (!isRecord(actor) || !hasOnlyKeys(actor, ['id', 'operations']) || typeof actor.id !== 'string' || actor.id.length === 0 || !Array.isArray(actor.operations)) return invalid('Each actor requires only an id and operations array.');
		if (actorIds.has(actor.id)) return invalid(`Duplicate actor id: ${actor.id}`);
		actorIds.add(actor.id);
		const operationIds = new Set<string>();
		for (const operation of actor.operations) {
			operationCount += 1;
			if (operationCount > MAX_OPERATIONS) return invalid('Actor operations exceed the bounded operation limit.');
			if (!isRecord(operation) || !hasOnlyKeys(operation, ['id', 'action', 'resource', 'generation']) || typeof operation.id !== 'string' || operation.id.length === 0 || typeof operation.resource !== 'string' || operation.resource.length === 0 || typeof operation.action !== 'string' || !ACTIONS.has(operation.action as RaceOperationAction)) return invalid(`Actor ${actor.id} contains an invalid operation.`);
			if (operationIds.has(operation.id)) return invalid(`Duplicate operation id ${operation.id} for actor ${actor.id}.`);
			operationIds.add(operation.id);
			if (operation.generation !== undefined && (!Number.isSafeInteger(operation.generation) || (operation.generation as number) < 1)) return invalid(`Operation ${actor.id}/${operation.id} has an invalid generation.`);
		}
	}
	for (const entry of value.schedule) {
		if (!isRecord(entry) || !hasOnlyKeys(entry, ['actor', 'operation']) || typeof entry.actor !== 'string' || typeof entry.operation !== 'string') return invalid('Each schedule entry requires only actor and operation strings.');
	}
	return value as unknown as DeterministicRaceScenario;
}

export function runDeterministicRaceScenario(value: unknown): DeterministicRaceReport {
	const parsed = parseScenario(value);
	if ('command' in parsed) return parsed;
	const operations = new Map<string, RaceOperation>();
	for (const actor of parsed.actors) for (const operation of actor.operations) operations.set(`${actor.id}\0${operation.id}`, operation);
	const resources = new Map<string, ResourceState>();
	const lastGeneration = new Map<string, number>();
	const consumed = new Set<string>();
	const findings: RaceFinding[] = [];
	const trace: RaceTraceEntry[] = [];
	const addFinding = (code: string, actor: string | null, operation: string | null, resource: string | null, message: string, severity: 'error' | 'warning' = 'error') => findings.push({ code, severity, actor, operation, resource, message });

	for (const [ordinal, entry] of parsed.schedule.entries()) {
		const key = `${entry.actor}\0${entry.operation}`;
		const operation = operations.get(key);
		if (!operation) {
			addFinding('unknown_scheduled_operation', entry.actor, entry.operation, null, 'Schedule references an operation that does not exist.');
			continue;
		}
		if (consumed.has(key)) {
			addFinding('duplicate_schedule_entry', entry.actor, entry.operation, operation.resource, 'An operation may be scheduled exactly once.');
			trace.push({ ordinal, actor: entry.actor, operation: entry.operation, action: operation.action, resource: operation.resource, generation: null, outcome: 'rejected' });
			continue;
		}
		consumed.add(key);
		if (parsed.fail_at === ordinal) {
			trace.push({ ordinal, actor: entry.actor, operation: entry.operation, action: operation.action, resource: operation.resource, generation: null, outcome: 'injected_failure' });
			continue;
		}
		let state = resources.get(operation.resource);
		let generation = state?.generation ?? null;
		const stale = operation.generation !== undefined && state !== undefined && operation.generation !== state.generation;
		if (stale) addFinding('stale_generation_access', entry.actor, entry.operation, operation.resource, `Expected generation ${operation.generation}, observed ${state?.generation}.`);

		switch (operation.action) {
			case 'allocate': {
				if (state?.alive) addFinding('double_allocate', entry.actor, entry.operation, operation.resource, 'Resource is already live.');
				const next = (lastGeneration.get(operation.resource) ?? 0) + 1;
				state = { generation: next, alive: true, published: false, readers: new Set() };
				resources.set(operation.resource, state);
				lastGeneration.set(operation.resource, next);
				generation = next;
				break;
			}
			case 'publish':
				if (!state?.alive) addFinding('publish_after_free', entry.actor, entry.operation, operation.resource, 'Cannot publish a non-live resource.');
				else state.published = true;
				break;
			case 'acquire':
				if (!state?.alive) addFinding('acquire_after_free', entry.actor, entry.operation, operation.resource, 'Cannot acquire a non-live resource.');
				else state.readers.add(entry.actor);
				break;
			case 'release':
				if (!state?.readers.has(entry.actor)) addFinding('release_without_acquire', entry.actor, entry.operation, operation.resource, 'Actor does not hold the resource.');
				else state.readers.delete(entry.actor);
				break;
			case 'read':
			case 'write':
				if (!state?.alive) addFinding('use_after_free', entry.actor, entry.operation, operation.resource, `${operation.action} touches a freed or unallocated resource.`);
				else if (!state.readers.has(entry.actor)) addFinding('access_without_acquire', entry.actor, entry.operation, operation.resource, `${operation.action} occurs without an acquire.`, 'warning');
				break;
			case 'retire':
				if (!state?.alive) addFinding('retire_after_free', entry.actor, entry.operation, operation.resource, 'Cannot retire a non-live resource.');
				else state.published = false;
				break;
			case 'free':
				if (!state?.alive) addFinding('double_free', entry.actor, entry.operation, operation.resource, 'Resource is already freed or was never allocated.');
				else {
					if (state.readers.size > 0) addFinding('free_while_acquired', entry.actor, entry.operation, operation.resource, 'Resource was freed while one or more actors still held it.');
					state.alive = false;
					state.published = false;
					if (!parsed.reuse_addresses) resources.delete(operation.resource);
				}
				break;
			case 'checkpoint':
				break;
		}
		trace.push({ ordinal, actor: entry.actor, operation: entry.operation, action: operation.action, resource: operation.resource, generation, outcome: 'executed' });
	}
	for (const [key, operation] of operations) {
		if (!consumed.has(key)) {
			const [actor, operationId] = key.split('\0');
			addFinding('unscheduled_operation', actor, operationId, operation.resource, 'Every declared operation must appear exactly once in the schedule.');
		}
	}
	const hasErrors = findings.some((finding) => finding.severity === 'error');
	return {
		schema_version: '1', command: 'crash_evidence_race', ok: !hasErrors, status: hasErrors ? 'failed' : 'passed', deterministic: true,
		executed_operations: trace.filter((entry) => entry.outcome === 'executed').length, findings, trace,
	};
}
