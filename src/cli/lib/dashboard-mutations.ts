import { existsSync } from 'node:fs';
import path from 'node:path';

import { openPathInFileManager } from './browser-open.js';
import {
	updateDashboardPreferences,
	type DashboardPreferenceUpdate,
	type DashboardPreferencesSnapshot,
} from './dashboard-preferences.js';
import {
	isReviewerKind,
	markDocReviewEntry,
	type DocReviewStatus,
	type ReviewerKind,
} from './doc-review-ledger.js';

const DOC_REVIEW_BULK_PAYLOAD_FIELDS = ['paths', 'documents', 'entries'] as const;

export type DashboardOpenMustflowFolderResult = 'opened' | 'missing' | 'unavailable';

function readPreferenceUpdatePayload(value: unknown): DashboardPreferenceUpdate[] {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Request body must be a JSON object.');
	}

	const updates = (value as { updates?: unknown }).updates;

	if (!Array.isArray(updates)) {
		throw new Error('Request body must include an updates array.');
	}

	return updates.map((entry) => {
		if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
			throw new Error('Each update must be a JSON object.');
		}

		const update = entry as { id?: unknown; value?: unknown };

		if (typeof update.id !== 'string' || update.id.trim().length === 0) {
			throw new Error('Each update must include an id.');
		}

		return { id: update.id, value: update.value };
	});
}

function readOptionalStringField(value: Record<string, unknown>, key: string): string | undefined {
	const field = value[key];
	return typeof field === 'string' && field.trim().length > 0 ? field.trim() : undefined;
}

function readRequiredStringField(value: Record<string, unknown>, key: string): string {
	const field = readOptionalStringField(value, key);
	if (!field) {
		throw new Error(`${key} is required.`);
	}

	return field;
}

function readDocReviewPayload(value: unknown): {
	path: string;
	status: Extract<DocReviewStatus, 'approved' | 'needs_human' | 'ignored'>;
	reviewerKind: ReviewerKind;
	reviewerId: string;
	reviewerLabel?: string;
	reviewerProvider?: string;
	reviewerModel?: string;
	reviewerCommandIntent?: string;
	summary?: string;
} {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Request body must be a JSON object.');
	}

	const payload = value as Record<string, unknown>;
	for (const field of DOC_REVIEW_BULK_PAYLOAD_FIELDS) {
		if (field in payload) {
			throw new Error('Bulk documentation review updates require a separate confirmed flow.');
		}
	}

	const status = readRequiredStringField(payload, 'status');
	if (status !== 'approved' && status !== 'needs_human' && status !== 'ignored') {
		throw new Error('status must be approved, needs_human, or ignored.');
	}

	const reviewerKind = readRequiredStringField(payload, 'reviewerKind');
	if (!isReviewerKind(reviewerKind)) {
		throw new Error('reviewerKind must be human, llm, tool, or external.');
	}

	return {
		path: readRequiredStringField(payload, 'path'),
		status,
		reviewerKind,
		reviewerId: readRequiredStringField(payload, 'reviewerId'),
		reviewerLabel: readOptionalStringField(payload, 'reviewerLabel'),
		reviewerProvider: readOptionalStringField(payload, 'reviewerProvider'),
		reviewerModel: readOptionalStringField(payload, 'reviewerModel'),
		reviewerCommandIntent: readOptionalStringField(payload, 'reviewerCommandIntent'),
		summary: readOptionalStringField(payload, 'summary'),
	};
}

export function updateDashboardPreferencesFromPayload(
	projectRoot: string,
	payload: unknown,
): DashboardPreferencesSnapshot {
	return updateDashboardPreferences(projectRoot, readPreferenceUpdatePayload(payload));
}

export function markDashboardDocReviewFromPayload(projectRoot: string, payload: unknown): void {
	markDocReviewEntry(projectRoot, readDocReviewPayload(payload));
}

export function openDashboardMustflowFolder(projectRoot: string): DashboardOpenMustflowFolderResult {
	const mustflowPath = path.join(projectRoot, '.mustflow');

	if (!existsSync(mustflowPath)) {
		return 'missing';
	}

	return openPathInFileManager(mustflowPath) ? 'opened' : 'unavailable';
}
