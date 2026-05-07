import type { LocalizedText } from './i18n.js';

export interface CommandDefinition {
	readonly id: string;
	readonly usage: string;
	readonly summary: LocalizedText;
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
	{
		id: 'init',
		usage: 'mf init',
		summary: {
			en: 'Copy the default mustflow agent workflow',
			ko: '기본 mustflow 에이전트 작업 흐름을 복사합니다',
		},
	},
	{
		id: 'check',
		usage: 'mf check',
		summary: {
			en: 'Validate mustflow files',
			ko: 'mustflow 파일을 검사합니다',
		},
	},
	{
		id: 'status',
		usage: 'mf status',
		summary: {
			en: 'Show local mustflow install status',
			ko: '로컬 mustflow 설치 상태를 보여줍니다',
		},
	},
	{
		id: 'update',
		usage: 'mf update',
		summary: {
			en: 'Preview or apply mustflow workflow updates',
			ko: 'mustflow 작업 흐름 갱신을 미리 보거나 적용합니다',
		},
	},
	{
		id: 'map',
		usage: 'mf map',
		summary: {
			en: 'Generate REPO_MAP.md',
			ko: 'REPO_MAP.md를 생성합니다',
		},
	},
	{
		id: 'run',
		usage: 'mf run',
		summary: {
			en: 'Run a finite configured command intent',
			ko: '설정된 끝나는 명령 의도를 실행합니다',
		},
	},
	{
		id: 'context',
		usage: 'mf context',
		summary: {
			en: 'Print machine-readable agent context',
			ko: '에이전트 작업 맥락을 출력합니다',
		},
	},
	{
		id: 'doctor',
		usage: 'mf doctor',
		summary: {
			en: 'Inspect mustflow health and next steps',
			ko: 'mustflow 상태와 다음 단계를 점검합니다',
		},
	},
	{
		id: 'index',
		usage: 'mf index',
		summary: {
			en: 'Build the local mustflow SQLite index',
			ko: '로컬 mustflow SQLite 색인을 만듭니다',
		},
	},
	{
		id: 'search',
		usage: 'mf search',
		summary: {
			en: 'Search the local mustflow SQLite index',
			ko: '로컬 mustflow SQLite 색인을 검색합니다',
		},
	},
	{
		id: 'dashboard',
		usage: 'mf dashboard',
		summary: {
			en: 'Open the local mustflow dashboard (not implemented yet)',
			ko: '로컬 mustflow 대시보드를 엽니다. 아직 구현되지 않았습니다',
		},
	},
	{
		id: 'help',
		usage: 'mf help',
		summary: {
			en: 'Show installed workflow help',
			ko: '설치된 작업 흐름 도움말을 보여줍니다',
		},
	},
];
