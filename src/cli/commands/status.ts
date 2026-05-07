import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Reporter } from '../lib/reporter.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { inspectManifestLock } from '../lib/manifest-lock.js';
import { resolveMustflowRoot } from '../lib/project-root.js';


interface StatusSnapshot {
	readonly installed: boolean;
	readonly manifestLock: 'missing' | 'invalid' | 'present';
	readonly trackedFiles: number;
	readonly changedFiles: readonly string[];
	readonly missingFiles: readonly string[];
	readonly issues: readonly string[];
	readonly template: { readonly id: string; readonly version: string } | null;
}

export function getStatusHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf status [options]',
			summary:
				lang === 'ko'
					? '파일을 수정하지 않고 로컬 mustflow 설치 상태를 보여줍니다.'
					: 'Show the local mustflow install status without modifying files.',
			options: [
				{ label: '--json', description: lang === 'ko' ? '기계가 읽기 쉬운 JSON을 출력합니다' : 'Print machine-readable JSON' },
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf status', 'mf status --json'],
			exitCodes: [
				{ label: '0', description: lang === 'ko' ? '상태를 확인하고 출력했습니다' : 'Status was inspected and printed' },
				{ label: '1', description: lang === 'ko' ? '잘못된 입력이 있었습니다' : 'The command received invalid input' },
			],
		},
		lang,
	);
}

function hasInstalledEntrypoints(projectRoot: string): boolean {
	return existsSync(path.join(projectRoot, 'AGENTS.md')) && existsSync(path.join(projectRoot, '.mustflow'));
}

function getStatusSnapshot(projectRoot: string): StatusSnapshot {
	const inspection = inspectManifestLock(projectRoot);
	const lock = inspection.readResult.kind === 'present' ? inspection.readResult.lock : undefined;

	return {
		installed: hasInstalledEntrypoints(projectRoot),
		manifestLock: inspection.readResult.kind,
		trackedFiles: lock?.files.length ?? 0,
		changedFiles: inspection.changedFiles,
		missingFiles: inspection.missingFiles,
		issues: inspection.issues,
		template: lock ? { id: lock.templateId, version: lock.templateVersion } : null,
	};
}

export function runStatus(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getStatusHelp(lang));
		return 0;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf status --help', getStatusHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	const status = getStatusSnapshot(projectRoot);

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(status, null, 2));
		return 0;
	}

	reporter.stdout(lang === 'ko' ? 'mustflow 상태' : 'mustflow status');
	reporter.stdout(`${lang === 'ko' ? '설치됨' : 'Installed'}: ${status.installed ? 'yes' : 'no'}`);
	reporter.stdout(`${lang === 'ko' ? '잠금 파일' : 'Manifest lock'}: ${status.manifestLock}`);
	reporter.stdout(`${lang === 'ko' ? '추적 파일' : 'Tracked files'}: ${status.trackedFiles}`);
	reporter.stdout(`${lang === 'ko' ? '변경 파일' : 'Changed files'}: ${status.changedFiles.length}`);
	reporter.stdout(`${lang === 'ko' ? '누락 파일' : 'Missing files'}: ${status.missingFiles.length}`);

	for (const issue of status.issues) {
		reporter.stdout(`- ${issue.replace(/^Lock hash mismatch: /, '').replace(/^Locked file missing: /, '')}`);
	}

	return 0;
}
