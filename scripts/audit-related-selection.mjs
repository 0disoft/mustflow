import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function runGit(args) {
	const result = spawnSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
	});

	if (result.status !== 0) {
		return [];
	}

	return result.stdout
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.replaceAll('\\', '/'));
}

function readChangedFilesFromGit() {
	return [
		...runGit(['diff', '--name-only', '--relative']),
		...runGit(['diff', '--name-only', '--cached', '--relative']),
		...runGit(['ls-files', '--others', '--exclude-standard']),
	];
}

function readChangedFilesFromArg() {
	const arg = process.argv.find((value) => value.startsWith('--changed-files='));
	if (!arg) {
		return undefined;
	}

	return arg
		.slice('--changed-files='.length)
		.split(/[\r\n,;]+/u)
		.map((file) => file.trim().replaceAll('\\', '/').replace(/^\.?\//u, ''))
		.filter(Boolean);
}

function uniqueSorted(values) {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function summarizeReason(reason) {
	return {
		file: reason.changed_file,
		reason: reason.reason,
		category: reason.category ?? null,
		rule: reason.rule ?? null,
		test_count: Array.isArray(reason.tests) ? reason.tests.length : 0,
		note: reason.note ?? null,
	};
}

function runSelectionBatch(requests) {
	const tempDir = mkdtempSync(path.join(tmpdir(), 'mustflow-related-audit-'));
	const batchPath = path.join(tempDir, 'requests.json');

	try {
		writeFileSync(batchPath, `${JSON.stringify(requests, null, 2)}\n`);

		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', `--list-batch=${batchPath}`], {
			cwd: repoRoot,
			encoding: 'utf8',
		});

		if (result.error) {
			throw result.error;
		}

		if (result.status !== 0) {
			process.stderr.write(result.stderr);
			process.exit(result.status ?? 1);
		}

		return JSON.parse(result.stdout);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
}

function createAuditRows(changedFiles) {
	const requests = [
		{ label: '__all__', mode: 'related', changed_files: changedFiles },
		...changedFiles.map((file) => ({
			label: file,
			mode: 'related',
			changed_files: [file],
		})),
	];
	const reports = runSelectionBatch(requests.map(({ mode, changed_files }) => ({ mode, changed_files })));

	return reports.map((report, index) => {
		const request = requests[index];
		const fullFallbacks = report.selection_reasons.filter((reason) => reason.reason === 'fallback_full_tests');
		const fastFallbacks = report.selection_reasons.filter((reason) => reason.reason === 'fallback_fast_tests');
		const relatedRules = report.selection_reasons.filter((reason) => reason.reason === 'related_rule');

		return {
			label: request.label,
			changed_count: request.changed_files.length,
			selected_count: report.selected.length,
			full_fallback_count: fullFallbacks.length,
			full_fallback_categories: [...new Set(fullFallbacks.map((reason) => reason.category).filter(Boolean))].sort(),
			fast_fallback_count: fastFallbacks.length,
			related_rule_count: relatedRules.length,
			reasons: report.selection_reasons.map(summarizeReason),
		};
	});
}

function printText(rows) {
	for (const row of rows) {
		console.log(
			[
				row.label,
				`changed=${row.changed_count}`,
				`selected=${row.selected_count}`,
				`related_rules=${row.related_rule_count}`,
				`full_fallbacks=${row.full_fallback_count}`,
				row.full_fallback_categories.length > 0 ? `categories=${row.full_fallback_categories.join(',')}` : '',
				row.fast_fallback_count > 0 ? `fast_fallbacks=${row.fast_fallback_count}` : '',
			]
				.filter(Boolean)
				.join(' '),
		);

		for (const reason of row.reasons) {
			console.log(
				`  ${reason.reason} file=${reason.file ?? 'null'} category=${reason.category ?? 'none'} tests=${reason.test_count} rule=${reason.rule ?? 'none'}`,
			);
		}
	}
}

const changedFiles = uniqueSorted(readChangedFilesFromArg() ?? readChangedFilesFromGit());
const jsonOutput = process.argv.includes('--json');

if (changedFiles.length === 0) {
	if (jsonOutput) {
		process.stdout.write(`${JSON.stringify({ changed_files: [], rows: [] }, null, 2)}\n`);
	} else {
		console.log('No changed files detected.');
	}
	process.exit(0);
}

const rows = createAuditRows(changedFiles);

if (jsonOutput) {
	process.stdout.write(`${JSON.stringify({ changed_files: changedFiles, rows }, null, 2)}\n`);
} else {
	printText(rows);
}
