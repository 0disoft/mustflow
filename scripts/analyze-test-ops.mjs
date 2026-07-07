import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultOpsDir = path.join(repoRoot, '.mustflow', 'cache', 'test-ops');

function readInputPaths() {
	const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

	if (args.length > 0) {
		return args.map((arg) => path.resolve(repoRoot, arg));
	}

	if (!existsSync(defaultOpsDir)) {
		return [];
	}

	return readdirSync(defaultOpsDir)
		.filter((name) => name.endsWith('.jsonl'))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => path.join(defaultOpsDir, name));
}

function percentile(sortedValues, percentileValue) {
	if (sortedValues.length === 0) {
		return 0;
	}

	const index = Math.min(
		sortedValues.length - 1,
		Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1),
	);

	return sortedValues[index];
}

function round(value) {
	return Math.round(value * 1000) / 1000;
}

function createBucket() {
	return {
		count: 0,
		total_ms: 0,
		failed: 0,
		durations: [],
		max_ms: 0,
	};
}

function addRecord(bucket, record) {
	const duration = Number(record.duration_ms);

	if (!Number.isFinite(duration)) {
		return;
	}

	bucket.count += 1;
	bucket.total_ms += duration;
	bucket.failed += record.status === 'failed' ? 1 : 0;
	bucket.durations.push(duration);
	bucket.max_ms = Math.max(bucket.max_ms, duration);
}

function finalizeBucket(bucket) {
	const sorted = [...bucket.durations].sort((left, right) => left - right);

	return {
		count: bucket.count,
		total_ms: round(bucket.total_ms),
		avg_ms: bucket.count > 0 ? round(bucket.total_ms / bucket.count) : 0,
		p95_ms: round(percentile(sorted, 95)),
		max_ms: round(bucket.max_ms),
		failed: bucket.failed,
	};
}

function readRecords(paths) {
	const records = [];

	for (const filePath of paths) {
		const content = readFileSync(filePath, 'utf8');

		for (const [index, line] of content.split(/\r?\n/u).entries()) {
			if (!line.trim()) {
				continue;
			}

			try {
				records.push(JSON.parse(line));
			} catch (error) {
				throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
			}
		}
	}

	return records;
}

function buildReport(records, inputPaths) {
	const byTest = new Map();
	const byTestAndOperation = new Map();

	for (const record of records) {
		const testFile = record.test_file ?? 'unknown';
		const operation = record.operation ?? 'unknown';
		const testBucket = byTest.get(testFile) ?? createBucket();
		byTest.set(testFile, testBucket);
		addRecord(testBucket, record);

		const key = `${testFile}\0${operation}`;
		const operationBucket = byTestAndOperation.get(key) ?? createBucket();
		byTestAndOperation.set(key, operationBucket);
		addRecord(operationBucket, record);
	}

	const tests = [...byTest.entries()]
		.map(([test_file, bucket]) => ({
			test_file,
			...finalizeBucket(bucket),
		}))
		.sort((left, right) => right.total_ms - left.total_ms || left.test_file.localeCompare(right.test_file));

	const operations = [...byTestAndOperation.entries()]
		.map(([key, bucket]) => {
			const [test_file, operation] = key.split('\0');

			return {
				test_file,
				operation,
				...finalizeBucket(bucket),
			};
		})
		.sort((left, right) => right.total_ms - left.total_ms || left.test_file.localeCompare(right.test_file));

	return { files: inputPaths, record_count: records.length, tests, operations };
}

function printText(report) {
	console.log(`Read ${report.record_count} operation records from ${report.files.length} file(s).`);
	console.log('');
	console.log('Slowest test files by instrumented operations:');

	for (const row of report.tests.slice(0, 30)) {
		const metrics = [
			`${String(row.total_ms).padStart(10)} ms total`,
			`${String(row.count).padStart(5)} ops`,
			`p95=${String(row.p95_ms).padStart(8)}`,
			`max=${String(row.max_ms).padStart(8)}`,
			`failed=${row.failed}`,
		];
		console.log(`${metrics.join(' ')} ${row.test_file}`);
	}

	console.log('');
	console.log('Slowest test file operations:');

	for (const row of report.operations.slice(0, 60)) {
		const metrics = [
			`${String(row.total_ms).padStart(10)} ms total`,
			`${String(row.count).padStart(5)} ops`,
			`p95=${String(row.p95_ms).padStart(8)}`,
			`max=${String(row.max_ms).padStart(8)}`,
			`failed=${row.failed}`,
		];
		console.log(`${metrics.join(' ')} ${row.test_file} ${row.operation}`);
	}
}

const jsonOutput = process.argv.includes('--json');
const inputPaths = readInputPaths();

if (inputPaths.length === 0) {
	console.error(`No ops profile files found under ${path.relative(repoRoot, defaultOpsDir).replaceAll('\\', '/')}`);
	process.exit(1);
}

const report = buildReport(readRecords(inputPaths), inputPaths);

if (jsonOutput) {
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
	printText(report);
}
