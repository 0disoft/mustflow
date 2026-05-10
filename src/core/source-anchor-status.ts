import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
	listSourceAnchorFiles,
	parseSourceAnchorsInContent,
	splitSourceAnchorList,
	type SourceAnchorSummary,
} from './source-anchors.js';
import {
	extractSourceAnchorSymbol,
	type SourceAnchorSymbol,
	type SourceAnchorSymbolKind,
} from './source-anchor-symbols.js';

export type { SourceAnchorSymbol, SourceAnchorSymbolKind } from './source-anchor-symbols.js';

export type SourceAnchorStatus = 'valid' | 'moved' | 'changed' | 'review' | 'stale';

export interface SourceAnchorFingerprint {
	readonly anchorMetadataHash: string;
	readonly anchorTextHash: string;
	readonly contextHash: string;
	readonly searchTermsHash: string | null;
	readonly invariantHash: string | null;
	readonly riskHash: string;
	readonly symbol: SourceAnchorSymbol;
}

export interface SourceAnchorStatusSignals {
	readonly identity: string;
	readonly location: string;
	readonly symbol: string;
	readonly body: string;
	readonly metadata: string;
	readonly semantic: string;
	readonly risk: string;
}

export interface SourceAnchorIndexRecord extends SourceAnchorSummary {
	readonly fingerprint: SourceAnchorFingerprint;
	readonly status: SourceAnchorStatus;
	readonly confidence: number;
	readonly signals: SourceAnchorStatusSignals;
}

export interface SourceAnchorSnapshot extends SourceAnchorSummary {
	readonly fingerprint: SourceAnchorFingerprint;
}

const HIGH_RISK_SOURCE_ANCHOR_TAGS = new Set([
	'authn',
	'authz',
	'authorization',
	'data_loss',
	'file_upload',
	'injection',
	'migration',
	'payment',
	'pii',
	'privacy',
	'secrets',
	'security',
	'ssrf',
	'xss',
]);

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function hashStringList(values: readonly string[]): string | null {
	return values.length > 0 ? sha256(values.join('\n')) : null;
}

function contextForAnchor(content: string, lineStart: number): string {
	const lines = content.split(/\r?\n/u);
	const anchorIndex = Math.max(0, lineStart - 1);
	const from = Math.max(0, anchorIndex - 3);
	const to = Math.min(lines.length, anchorIndex + 4);

	return lines.slice(from, to).join('\n');
}

function createFingerprint(
	content: string,
	anchor: {
		readonly rawText: string;
		readonly lineStart: number;
		readonly fields: ReadonlyMap<string, string>;
	},
	search: readonly string[],
	risk: readonly string[],
): SourceAnchorFingerprint {
	const invariant = anchor.fields.get('invariant') ?? null;
	const metadata = {
		purpose: anchor.fields.get('purpose') ?? null,
		search,
		invariant,
		risk,
	};

	return {
		anchorMetadataHash: sha256(JSON.stringify(metadata)),
		anchorTextHash: sha256(anchor.rawText),
		contextHash: sha256(contextForAnchor(content, anchor.lineStart)),
		searchTermsHash: hashStringList(search),
		invariantHash: invariant ? sha256(invariant) : null,
		riskHash: sha256(risk.join('\n')),
		symbol: extractSourceAnchorSymbol(content, anchor.lineStart),
	};
}

function currentAnchorSignals(risk: readonly string[]): SourceAnchorStatusSignals {
	return {
		identity: 'current_anchor_id_valid',
		location: 'current_file_and_line_indexed',
		symbol: 'current_symbol_fingerprinted',
		body: 'current_body_fingerprinted',
		metadata: 'current_anchor_metadata_fingerprinted',
		semantic: 'search_terms_and_invariant_fingerprinted',
		risk: risk.length > 0 ? 'risk_tags_fingerprinted' : 'no_risk_tags',
	};
}

function hasHighRisk(risk: readonly string[]): boolean {
	return risk.some((tag) => HIGH_RISK_SOURCE_ANCHOR_TAGS.has(tag));
}

function sameSymbolIdentity(left: SourceAnchorSymbol, right: SourceAnchorSymbol): boolean {
	return left.kind === right.kind && left.name !== null && left.name === right.name;
}

function sameSymbolTarget(left: SourceAnchorSymbol, right: SourceAnchorSymbol): boolean {
	if (!sameSymbolIdentity(left, right)) {
		return false;
	}

	if (left.signatureHash && right.signatureHash && left.signatureHash !== right.signatureHash) {
		return false;
	}

	if (left.bodyHash && right.bodyHash && left.bodyHash !== right.bodyHash) {
		return false;
	}

	return true;
}

function sourceAnchorSignals(current: SourceAnchorSnapshot, previous: SourceAnchorSnapshot | null): SourceAnchorStatusSignals {
	if (!previous) {
		return currentAnchorSignals(current.risk);
	}

	return {
		identity: current.id === previous.id ? 'anchor_id_matched_previous_snapshot' : 'anchor_id_from_previous_snapshot',
		location:
			current.path === previous.path && current.lineStart === previous.lineStart
				? 'same_path_and_line'
				: current.path === previous.path
					? 'same_path_line_changed'
					: 'path_changed',
		symbol:
			current.fingerprint.symbol.kind === 'unknown'
				? 'current_symbol_unknown'
				: sameSymbolIdentity(current.fingerprint.symbol, previous.fingerprint.symbol)
					? 'symbol_identity_matched'
					: 'symbol_identity_changed',
		body:
			current.fingerprint.symbol.bodyHash && current.fingerprint.symbol.bodyHash === previous.fingerprint.symbol.bodyHash
				? 'symbol_body_hash_matched'
				: current.fingerprint.symbol.signatureHash && current.fingerprint.symbol.signatureHash === previous.fingerprint.symbol.signatureHash
					? 'signature_hash_matched_body_changed_or_unknown'
					: 'symbol_body_or_signature_changed',
		metadata:
			current.fingerprint.anchorMetadataHash === previous.fingerprint.anchorMetadataHash
				? 'anchor_metadata_hash_matched'
				: 'anchor_metadata_hash_changed',
		semantic:
			current.fingerprint.searchTermsHash === previous.fingerprint.searchTermsHash &&
			current.fingerprint.invariantHash === previous.fingerprint.invariantHash
				? 'search_terms_and_invariant_matched'
				: 'search_terms_or_invariant_changed',
		risk:
			current.fingerprint.riskHash === previous.fingerprint.riskHash
				? hasHighRisk(current.risk)
					? 'high_risk_tags_matched'
					: current.risk.length > 0
						? 'risk_tags_matched'
						: 'no_risk_tags'
				: 'risk_tags_changed',
	};
}

function compareSourceAnchorStatus(current: SourceAnchorSnapshot, previous: SourceAnchorSnapshot | null): Pick<SourceAnchorIndexRecord, 'status' | 'confidence' | 'signals'> {
	if (!previous) {
		return {
			status: 'valid',
			confidence: 1,
			signals: currentAnchorSignals(current.risk),
		};
	}

	const signals = sourceAnchorSignals(current, previous);
	const locationChanged = current.path !== previous.path || current.lineStart !== previous.lineStart;
	const metadataChanged = current.fingerprint.anchorMetadataHash !== previous.fingerprint.anchorMetadataHash;
	const semanticChanged =
		current.fingerprint.searchTermsHash !== previous.fingerprint.searchTermsHash ||
		current.fingerprint.invariantHash !== previous.fingerprint.invariantHash;
	const signatureChanged =
		current.fingerprint.symbol.signatureHash !== previous.fingerprint.symbol.signatureHash &&
		(current.fingerprint.symbol.signatureHash !== null || previous.fingerprint.symbol.signatureHash !== null);
	const bodyChanged =
		current.fingerprint.symbol.bodyHash !== previous.fingerprint.symbol.bodyHash &&
		(current.fingerprint.symbol.bodyHash !== null || previous.fingerprint.symbol.bodyHash !== null);
	const contextChanged = current.fingerprint.contextHash !== previous.fingerprint.contextHash;
	const symbolIdentityChanged = !sameSymbolIdentity(current.fingerprint.symbol, previous.fingerprint.symbol);

	if (hasHighRisk(current.risk) && (bodyChanged || signatureChanged || semanticChanged || metadataChanged)) {
		return {
			status: 'review',
			confidence: 0.55,
			signals: {
				...signals,
				risk: signals.risk.startsWith('high_risk') ? 'high_risk_anchor_requires_review_after_change' : signals.risk,
			},
		};
	}

	if (symbolIdentityChanged && previous.fingerprint.symbol.kind !== 'unknown') {
		return {
			status: 'review',
			confidence: 0.5,
			signals,
		};
	}

	if (locationChanged && sameSymbolTarget(current.fingerprint.symbol, previous.fingerprint.symbol)) {
		return {
			status: 'moved',
			confidence: 0.85,
			signals,
		};
	}

	if (bodyChanged || signatureChanged || contextChanged || metadataChanged || semanticChanged) {
		return {
			status: 'changed',
			confidence: signatureChanged ? 0.65 : 0.75,
			signals,
		};
	}

	return {
		status: 'valid',
		confidence: 1,
		signals,
	};
}

function staleAnchorSignals(previous: SourceAnchorSnapshot, replacement: SourceAnchorSnapshot | null): SourceAnchorStatusSignals {
	if (replacement) {
		return {
			identity: 'previous_anchor_id_missing_unique_symbol_candidate_found',
			location: replacement.path === previous.path ? 'same_path_candidate' : 'path_changed_candidate',
			symbol: 'symbol_identity_candidate_matched',
			body: sameSymbolTarget(replacement.fingerprint.symbol, previous.fingerprint.symbol)
				? 'symbol_body_hash_matched'
				: 'symbol_body_or_signature_changed',
			metadata: 'previous_anchor_metadata_only',
			semantic: 'previous_anchor_semantic_metadata_only',
			risk: hasHighRisk(previous.risk) ? 'high_risk_previous_anchor_requires_review' : 'previous_risk_tags_only',
		};
	}

	return {
		identity: 'previous_anchor_id_missing',
		location: 'previous_location_missing',
		symbol: 'no_unique_symbol_candidate',
		body: 'previous_body_fingerprint_only',
		metadata: 'previous_anchor_metadata_only',
		semantic: 'previous_anchor_semantic_metadata_only',
		risk: hasHighRisk(previous.risk) ? 'high_risk_previous_anchor_stale' : 'previous_risk_tags_only',
	};
}

function findUniqueSymbolCandidate(
	previous: SourceAnchorSnapshot,
	currentRecords: readonly SourceAnchorSnapshot[],
): SourceAnchorSnapshot | null {
	if (previous.fingerprint.symbol.kind === 'unknown' || previous.fingerprint.symbol.name === null) {
		return null;
	}

	const matches = currentRecords.filter((record) => sameSymbolTarget(record.fingerprint.symbol, previous.fingerprint.symbol));
	return matches.length === 1 ? matches[0] ?? null : null;
}

/**
 * mf:anchor core.source-anchor-status.index-records
 * purpose: Build source anchor index records with fingerprints and navigation-only status metadata.
 * search: source anchor status, fingerprint, sqlite, navigation only
 * invariant: Status records are derived search metadata and do not grant command or verification authority.
 * risk: cache, config
 */
export function collectSourceAnchorIndexRecords(
	projectRoot: string,
	previousSnapshots: readonly SourceAnchorSnapshot[] = [],
): SourceAnchorIndexRecord[] {
	const currentRecords: SourceAnchorSnapshot[] = [];

	for (const relativePath of listSourceAnchorFiles(projectRoot)) {
		const filePath = path.join(projectRoot, ...relativePath.split('/'));

		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			continue;
		}

		const content = readFileSync(filePath, 'utf8');

		for (const anchor of parseSourceAnchorsInContent(relativePath, content)) {
			if (!anchor.idValid) {
				continue;
			}

			const search = splitSourceAnchorList(anchor.fields.get('search'));
			const risk = splitSourceAnchorList(anchor.fields.get('risk'));

			currentRecords.push({
				id: anchor.rawId,
				path: relativePath,
				lineStart: anchor.lineStart,
				purpose: anchor.fields.get('purpose') ?? null,
				search,
				invariant: anchor.fields.get('invariant') ?? null,
				risk,
				navigationOnly: true,
				canInstructAgent: false,
				fingerprint: createFingerprint(content, anchor, search, risk),
			});
		}
	}

	const previousById = new Map(previousSnapshots.map((snapshot) => [snapshot.id, snapshot]));
	const currentById = new Set(currentRecords.map((record) => record.id));
	const records: SourceAnchorIndexRecord[] = currentRecords.map((record) => ({
		...record,
		...compareSourceAnchorStatus(record, previousById.get(record.id) ?? null),
	}));

	for (const previous of previousSnapshots) {
		if (currentById.has(previous.id)) {
			continue;
		}

		const replacement = findUniqueSymbolCandidate(previous, currentRecords);
		const status: SourceAnchorStatus = replacement ? (hasHighRisk(previous.risk) ? 'review' : 'moved') : 'stale';

		records.push({
			...(replacement ?? previous),
			id: previous.id,
			purpose: previous.purpose,
			search: previous.search,
			invariant: previous.invariant,
			risk: previous.risk,
			navigationOnly: true,
			canInstructAgent: false,
			fingerprint: replacement?.fingerprint ?? previous.fingerprint,
			status,
			confidence: replacement ? (status === 'review' ? 0.45 : 0.65) : 0.2,
			signals: staleAnchorSignals(previous, replacement),
		});
	}

	return records.sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path));
}
