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

export type SourceAnchorStatus = 'valid' | 'moved' | 'changed' | 'review' | 'stale' | 'invalid';

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

/**
 * mf:anchor core.source-anchor-status.index-records
 * purpose: Build source anchor index records with fingerprints and navigation-only status metadata.
 * search: source anchor status, fingerprint, sqlite, navigation only
 * invariant: Status records are derived search metadata and do not grant command or verification authority.
 * risk: cache, config
 */
export function collectSourceAnchorIndexRecords(projectRoot: string): SourceAnchorIndexRecord[] {
	const records: SourceAnchorIndexRecord[] = [];

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

			records.push({
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
				status: 'valid',
				confidence: 1,
				signals: currentAnchorSignals(risk),
			});
		}
	}

	return records.sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path));
}
