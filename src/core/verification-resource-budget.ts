import { createHash, randomUUID } from 'node:crypto';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { availableParallelism, tmpdir, totalmem, userInfo } from 'node:os';
import path from 'node:path';

import {
	processStartTokensProveMismatch,
	readCurrentProcessStartToken,
	readProcessStartToken,
} from './process-identity.js';

const RESOURCE_BUDGET_SCHEMA_VERSION = '1';
const RESOURCE_BUDGET_ROOT_NAME = 'mustflow-verification-resource-budget-v1';
const RESOURCE_BUDGET_OWNER_FILE = 'owner.json';
const RESOURCE_BUDGET_STALE_GRACE_MS = 30_000;
const DEFAULT_POLL_MS = 40;
const MEMORY_BYTES_PER_SLOT = 2 * 1024 * 1024 * 1024;
const MAX_HOST_DISK_SLOTS = 4;
const DEFAULT_HOST_RESOURCE_SLOTS = 8;
const DEFAULT_REPOSITORY_RESOURCE_SLOTS = 8;
const PROCESS_START_TOKEN_CACHE_MS = 1_000;
const RESOURCE_NAMES = ['cpu', 'memory', 'disk'] as const;
const SCOPES = ['host', 'repository'] as const;

type VerificationResourceName = (typeof RESOURCE_NAMES)[number];
type VerificationResourceScope = (typeof SCOPES)[number];

export interface VerificationResourceWeights {
	readonly cpu: number;
	readonly memory: number;
	readonly disk: number;
}

export interface VerificationResourceCapacities {
	readonly host: VerificationResourceWeights;
	readonly repository: VerificationResourceWeights;
}

export interface ResolveVerificationResourceCapacitiesInput {
	readonly hostMax?: number;
	readonly repositoryMax?: number;
	readonly cpuAvailable?: number | null;
	readonly totalMemoryBytes?: number | null;
}

export interface AcquireVerificationResourceLeaseInput {
	readonly capacities: VerificationResourceCapacities;
	readonly weights: VerificationResourceWeights;
	readonly label?: string;
	readonly registryRoot?: string;
	readonly pollMs?: number;
	readonly signal?: AbortSignal;
}

export interface VerificationResourceLease {
	readonly leaseId: string;
	readonly repositoryId: string;
	readonly capacities: VerificationResourceCapacities;
	readonly weights: VerificationResourceWeights;
	release(): void;
}

interface VerificationResourceSlotOwner {
	readonly schema_version: typeof RESOURCE_BUDGET_SCHEMA_VERSION;
	readonly lease_id: string;
	readonly owner_token: string;
	readonly pid: number;
	readonly process_start_token: string;
	readonly started_at: string;
	readonly label: string | null;
}

interface AcquiredSlot {
	readonly path: string;
	readonly owner: VerificationResourceSlotOwner;
}

interface ResourceRequest {
	readonly scope: VerificationResourceScope;
	readonly resource: VerificationResourceName;
	readonly capacity: number;
	readonly weight: number;
}

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function normalizeIdentityPath(value: string): string {
	const resolved = path.resolve(value);
	return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function safeRealpath(value: string): string {
	try {
		return realpathSync.native(value);
	} catch {
		return path.resolve(value);
	}
}

function readGitDirectoryFromFile(projectRoot: string, gitFile: string): string | null {
	try {
		const content = readFileSync(gitFile, 'utf8').trim();
		const match = /^gitdir:\s*(.+)$/iu.exec(content);
		if (!match?.[1]) {
			return null;
		}
		return path.resolve(projectRoot, match[1]);
	} catch {
		return null;
	}
}

function readCommonGitDirectory(gitDirectory: string): string {
	try {
		const commonDirectory = readFileSync(path.join(gitDirectory, 'commondir'), 'utf8').trim();
		return commonDirectory.length > 0 ? path.resolve(gitDirectory, commonDirectory) : gitDirectory;
	} catch {
		return gitDirectory;
	}
}

function resolveRepositoryIdentityPath(projectRoot: string): string {
	const gitPath = path.join(projectRoot, '.git');

	try {
		const stat = lstatSync(gitPath);
		if (stat.isDirectory()) {
			return safeRealpath(readCommonGitDirectory(gitPath));
		}
		if (stat.isFile()) {
			const gitDirectory = readGitDirectoryFromFile(projectRoot, gitPath);
			if (gitDirectory) {
				return safeRealpath(readCommonGitDirectory(gitDirectory));
			}
		}
	} catch {
		// A non-Git root still receives a deterministic repository-local budget.
	}

	return safeRealpath(projectRoot);
}

export function createVerificationRepositoryId(projectRoot: string): string {
	return sha256(normalizeIdentityPath(resolveRepositoryIdentityPath(projectRoot)));
}

function readUserNamespace(): string {
	try {
		const currentUser = userInfo();
		return sha256(`${currentUser.uid}:${currentUser.username}`).slice(0, 24);
	} catch {
		const fallback = process.env.USER ?? process.env.USERNAME ?? 'unknown-user';
		return sha256(fallback).slice(0, 24);
	}
}

export function getVerificationResourceBudgetRoot(): string {
	return path.join(tmpdir(), `${RESOURCE_BUDGET_ROOT_NAME}-${readUserNamespace()}`);
}

function positiveInteger(value: number, name: string): number {
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`verification_resource_capacity_invalid:${name}`);
	}
	return value;
}

function nonNegativeInteger(value: number, name: string): number {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`verification_resource_weight_invalid:${name}`);
	}
	return value;
}

function readAvailableCpu(): number {
	try {
		return positiveInteger(availableParallelism(), 'host.cpu');
	} catch {
		return 1;
	}
}

function readTotalMemoryBytes(): number {
	try {
		const value = totalmem();
		return Number.isSafeInteger(value) && value > 0 ? value : MEMORY_BYTES_PER_SLOT;
	} catch {
		return MEMORY_BYTES_PER_SLOT;
	}
}

export function resolveVerificationResourceCapacities(
	input: ResolveVerificationResourceCapacitiesInput,
): VerificationResourceCapacities {
	const hostMax = positiveInteger(input.hostMax ?? DEFAULT_HOST_RESOURCE_SLOTS, 'host.max');
	const repositoryMax = positiveInteger(input.repositoryMax ?? DEFAULT_REPOSITORY_RESOURCE_SLOTS, 'repository.max');
	const hostCpu = Math.min(hostMax, positiveInteger(input.cpuAvailable ?? readAvailableCpu(), 'host.cpu'));
	const totalMemoryBytes = input.totalMemoryBytes ?? readTotalMemoryBytes();
	const hostMemory = Math.max(
		1,
		Math.min(hostCpu, Math.floor(Math.max(MEMORY_BYTES_PER_SLOT, totalMemoryBytes) / MEMORY_BYTES_PER_SLOT)),
	);
	const hostDisk = Math.max(1, Math.min(hostCpu, MAX_HOST_DISK_SLOTS));

	return {
		host: {
			cpu: hostCpu,
			memory: hostMemory,
			disk: hostDisk,
		},
		repository: {
			cpu: Math.max(1, Math.min(repositoryMax, hostCpu)),
			memory: Math.max(1, Math.min(repositoryMax, hostMemory)),
			disk: Math.max(1, Math.min(repositoryMax, hostDisk)),
		},
	};
}

function ensureDirectory(directory: string): void {
	mkdirSync(directory, { recursive: true, mode: 0o700 });
	const stat = lstatSync(directory);
	if (!stat.isDirectory() || stat.isSymbolicLink()) {
		throw new Error('verification_resource_budget_root_not_directory');
	}
	if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
		throw new Error('verification_resource_budget_root_wrong_owner');
	}
}

function isProcessLive(pid: number): boolean {
	if (!Number.isSafeInteger(pid) || pid <= 0) {
		return false;
	}

	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
		return code === 'EPERM';
	}
}

function parseSlotOwner(value: unknown): VerificationResourceSlotOwner | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const owner = value as Record<string, unknown>;
	if (
		owner.schema_version !== RESOURCE_BUDGET_SCHEMA_VERSION ||
		typeof owner.lease_id !== 'string' ||
		typeof owner.owner_token !== 'string' ||
		!Number.isSafeInteger(owner.pid) ||
		typeof owner.process_start_token !== 'string' ||
		typeof owner.started_at !== 'string' ||
		!(typeof owner.label === 'string' || owner.label === null)
	) {
		return null;
	}

	return {
		schema_version: RESOURCE_BUDGET_SCHEMA_VERSION,
		lease_id: owner.lease_id,
		owner_token: owner.owner_token,
		pid: Number(owner.pid),
		process_start_token: owner.process_start_token,
		started_at: owner.started_at,
		label: owner.label,
	};
}

function readSlotOwner(slotPath: string): VerificationResourceSlotOwner | null {
	try {
		return parseSlotOwner(JSON.parse(readFileSync(path.join(slotPath, RESOURCE_BUDGET_OWNER_FILE), 'utf8')));
	} catch {
		return null;
	}
}

function sameSlotOwner(left: VerificationResourceSlotOwner, right: VerificationResourceSlotOwner | null): boolean {
	return right !== null &&
		left.lease_id === right.lease_id &&
		left.owner_token === right.owner_token &&
		left.pid === right.pid &&
		left.process_start_token === right.process_start_token &&
		left.started_at === right.started_at;
}

const processStartTokenCache = new Map<number, { readonly readAt: number; readonly token: string | null }>();

function readCachedProcessStartToken(pid: number): string | null {
	const cached = processStartTokenCache.get(pid);
	if (cached && Date.now() - cached.readAt <= PROCESS_START_TOKEN_CACHE_MS) {
		return cached.token;
	}
	const token = readProcessStartToken(pid);
	processStartTokenCache.set(pid, { readAt: Date.now(), token });
	return token;
}

function slotOwnerIsStale(owner: VerificationResourceSlotOwner): boolean {
	if (!isProcessLive(owner.pid)) {
		return true;
	}

	return processStartTokensProveMismatch(owner.process_start_token, readCachedProcessStartToken(owner.pid));
}

function beginSlotRecovery(slotPath: string): (() => void) | null {
	const recoveryPath = `${slotPath}.recovery`;
	try {
		mkdirSync(recoveryPath);
		return () => rmSync(recoveryPath, { recursive: true, force: true });
	} catch (error) {
		if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST') {
			throw error;
		}
		try {
			if (Date.now() - statSync(recoveryPath).mtimeMs > RESOURCE_BUDGET_STALE_GRACE_MS) {
				rmSync(recoveryPath, { recursive: true, force: true });
			}
		} catch {
			// Another process may have completed recovery.
		}
		return null;
	}
}

function ownerlessSlotIsAged(slotPath: string): boolean {
	try {
		return Date.now() - statSync(slotPath).mtimeMs > RESOURCE_BUDGET_STALE_GRACE_MS;
	} catch {
		return true;
	}
}

function recoverStaleSlot(slotPath: string): boolean {
	const initialOwner = readSlotOwner(slotPath);
	if (initialOwner ? !slotOwnerIsStale(initialOwner) : !ownerlessSlotIsAged(slotPath)) {
		return false;
	}

	const releaseRecovery = beginSlotRecovery(slotPath);
	if (!releaseRecovery) {
		return false;
	}

	try {
		const owner = readSlotOwner(slotPath);
		if (owner) {
			if (initialOwner === null || !sameSlotOwner(initialOwner, owner) || !slotOwnerIsStale(owner)) {
				return false;
			}
		} else if (!ownerlessSlotIsAged(slotPath)) {
			return false;
		}

		const stalePath = `${slotPath}.stale-${randomUUID()}`;
		try {
			renameSync(slotPath, stalePath);
		} catch {
			return false;
		}
		rmSync(stalePath, { recursive: true, force: true });
		return true;
	} finally {
		releaseRecovery();
	}
}

function createSlotOwner(leaseId: string, label: string | null): VerificationResourceSlotOwner {
	return {
		schema_version: RESOURCE_BUDGET_SCHEMA_VERSION,
		lease_id: leaseId,
		owner_token: randomUUID(),
		pid: process.pid,
		process_start_token: readCurrentProcessStartToken(),
		started_at: new Date().toISOString(),
		label,
	};
}

function tryAcquireSlot(slotPath: string, owner: VerificationResourceSlotOwner): AcquiredSlot | null {
	try {
		mkdirSync(slotPath);
	} catch (error) {
		if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST') {
			throw error;
		}
		if (!recoverStaleSlot(slotPath)) {
			return null;
		}
		try {
			mkdirSync(slotPath);
		} catch (retryError) {
			if (retryError && typeof retryError === 'object' && 'code' in retryError && retryError.code === 'EEXIST') {
				return null;
			}
			throw retryError;
		}
	}

	try {
		writeFileSync(
			path.join(slotPath, RESOURCE_BUDGET_OWNER_FILE),
			`${JSON.stringify(owner, null, 2)}\n`,
			{ encoding: 'utf8', flag: 'wx', mode: 0o600 },
		);
		return { path: slotPath, owner };
	} catch (error) {
		rmSync(slotPath, { recursive: true, force: true });
		throw error;
	}
}

function releaseSlot(slot: AcquiredSlot): void {
	try {
		if (!sameSlotOwner(slot.owner, readSlotOwner(slot.path))) {
			return;
		}
		const releasedPath = `${slot.path}.released-${slot.owner.owner_token}`;
		renameSync(slot.path, releasedPath);
		rmSync(releasedPath, { recursive: true, force: true });
	} catch {
		// A missing or replaced slot is no longer owned by this lease.
	}
}

function releaseSlots(slots: readonly AcquiredSlot[]): void {
	for (let index = slots.length - 1; index >= 0; index -= 1) {
		const slot = slots[index];
		if (slot) {
			releaseSlot(slot);
		}
	}
}

function buildRequests(
	registryRoot: string,
	repositoryId: string,
	capacities: VerificationResourceCapacities,
	weights: VerificationResourceWeights,
): readonly (ResourceRequest & { readonly root: string })[] {
	const requests: Array<ResourceRequest & { readonly root: string }> = [];
	for (const scope of SCOPES) {
		const scopeRoot = scope === 'host'
			? path.join(registryRoot, 'host')
			: path.join(registryRoot, 'repositories', repositoryId);
		for (const resource of RESOURCE_NAMES) {
			const capacity = positiveInteger(capacities[scope][resource], `${scope}.${resource}`);
			const weight = nonNegativeInteger(weights[resource], resource);
			if (weight > capacity) {
				throw new Error(`verification_resource_weight_exceeds_capacity:${scope}.${resource}`);
			}
			if (weight > 0) {
				requests.push({ scope, resource, capacity, weight, root: scopeRoot });
			}
		}
	}
	return requests;
}

function tryAcquireRequest(
	request: ResourceRequest & { readonly root: string },
	leaseId: string,
	label: string | null,
): AcquiredSlot[] | null {
	const resourceRoot = path.join(request.root, request.resource);
	ensureDirectory(resourceRoot);
	const acquired: AcquiredSlot[] = [];

	for (let slotIndex = 0; slotIndex < request.capacity && acquired.length < request.weight; slotIndex += 1) {
		const owner = createSlotOwner(leaseId, label);
		const slot = tryAcquireSlot(path.join(resourceRoot, `slot-${String(slotIndex + 1).padStart(4, '0')}`), owner);
		if (slot) {
			acquired.push(slot);
		}
	}

	if (acquired.length === request.weight) {
		return acquired;
	}

	releaseSlots(acquired);
	return null;
}

function tryAcquireAll(
	requests: readonly (ResourceRequest & { readonly root: string })[],
	leaseId: string,
	label: string | null,
): AcquiredSlot[] | null {
	const acquired: AcquiredSlot[] = [];
	for (const request of requests) {
		const requestSlots = tryAcquireRequest(request, leaseId, label);
		if (!requestSlots) {
			releaseSlots(acquired);
			return null;
		}
		acquired.push(...requestSlots);
	}
	return acquired;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.reject(new Error('verification_resource_budget_aborted'));
	}
	return new Promise((resolve, reject) => {
		const onAbort = (): void => {
			clearTimeout(timeout);
			reject(new Error('verification_resource_budget_aborted'));
		};
		const timeout = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, milliseconds);
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

/**
 * mf:anchor core.verification.resource-budget
 * purpose: Bound verification CPU, memory, and disk concurrency across processes and repositories on one host.
 * search: verification resource budget, shared tokens, process lease, host concurrency, repository concurrency
 * invariant: A lease owns every slot it releases, partial acquisitions never wait while holding slots, and stale slots require process-death evidence or an aged ownerless directory.
 * risk: concurrency, filesystem, performance
 */
export async function acquireVerificationResourceLease(
	projectRoot: string,
	input: AcquireVerificationResourceLeaseInput,
): Promise<VerificationResourceLease> {
	const repositoryId = createVerificationRepositoryId(projectRoot);
	const registryRoot = path.resolve(input.registryRoot ?? getVerificationResourceBudgetRoot());
	ensureDirectory(registryRoot);
	const requests = buildRequests(registryRoot, repositoryId, input.capacities, input.weights);
	const leaseId = randomUUID();
	const label = input.label?.trim() || null;
	const pollMs = positiveInteger(input.pollMs ?? DEFAULT_POLL_MS, 'poll_ms');
	let released = false;

	while (true) {
		if (input.signal?.aborted) {
			throw new Error('verification_resource_budget_aborted');
		}
		const slots = tryAcquireAll(requests, leaseId, label);
		if (slots) {
			return {
				leaseId,
				repositoryId,
				capacities: input.capacities,
				weights: input.weights,
				release() {
					if (released) {
						return;
					}
					released = true;
					releaseSlots(slots);
				},
			};
		}
		const jitter = Math.floor(Math.random() * Math.max(1, pollMs));
		await delay(pollMs + jitter, input.signal);
	}
}

export async function withVerificationResourceLease<T>(
	projectRoot: string,
	input: AcquireVerificationResourceLeaseInput,
	callback: () => Promise<T> | T,
): Promise<T> {
	const lease = await acquireVerificationResourceLease(projectRoot, input);
	try {
		return await callback();
	} finally {
		lease.release();
	}
}
