export const LOCAL_INDEX_SCHEMA_VERSION = '20';
export const LOCAL_INDEX_PARSER_VERSION = '1';
export const DEFAULT_DATABASE_RELATIVE_PATH = '.mustflow/cache/mustflow.sqlite';
export const LATEST_RUN_STATE_RELATIVE_PATH = '.mustflow/state/runs/latest.json';
export const LOCAL_INDEX_CONTENT_MODE = 'metadata_and_snippets';
export const LOCAL_INDEX_STORE_FULL_CONTENT = false;
export const MAX_SNIPPET_BYTES_PER_DOCUMENT = 2048;
export const LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS = [
	'full_source_text',
	'raw_diffs',
	'raw_terminal_logs',
	'full_transcripts',
	'hidden_reasoning',
	'environment_values',
	'secrets',
	'personal_data',
	'long_term_memory_summaries',
] as const;
export const MAX_SEARCH_MATCH_SNIPPET_CHARS = 240;
export const SEARCH_MATCH_CONTEXT_BEFORE_CHARS = 48;
export const SEARCH_MATCH_CONTEXT_AFTER_CHARS = 96;
export const SEARCH_MATCH_TRUNCATION_MARKER = '...';
export const SEARCH_NGRAM_MIN_LENGTH = 2;
export const SEARCH_NGRAM_MAX_LENGTH = 3;
export const SEARCH_NGRAM_MAX_TOKEN_CHARS = 64;
export const SEARCH_NGRAM_MAX_GRAMS_PER_TARGET = 512;
export const SOURCE_INDEX_MAX_FILE_BYTES = 262144;
export const SEARCH_BACKEND_FTS5 = 'fts5';
export const SEARCH_BACKEND_TABLE_SCAN = 'table_scan';
export const TEST_DISABLE_FTS5_ENV = 'MUSTFLOW_TEST_DISABLE_FTS5';
export const MUSTFLOW_RELATIVE_PATH = '.mustflow/config/mustflow.toml';
export const INDEX_CONFIG_RELATIVE_PATH = '.mustflow/config/index.toml';
export const DEFAULT_PROMPT_CACHE_STABLE_READ = [
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/skills/INDEX.md',
] as const;
export const DEFAULT_PROMPT_CACHE_TASK_SOURCES = [
	'.mustflow/context/INDEX.md',
	'REPO_MAP.md',
	'matching_skill',
	'relevant_source_files',
] as const;
export const DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES = [
	'.mustflow/state/runs/latest.json',
	'changed_files',
	'command_output_tail',
	'current_user_task',
] as const;

export type LocalIndexContentMode = typeof LOCAL_INDEX_CONTENT_MODE;
export type LocalIndexStoreFullContent = typeof LOCAL_INDEX_STORE_FULL_CONTENT;
export type MaxSnippetBytesPerDocument = typeof MAX_SNIPPET_BYTES_PER_DOCUMENT;
export type LocalIndexExcludedRawDataKind = (typeof LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS)[number];
export type SearchBackendKind = typeof SEARCH_BACKEND_FTS5 | typeof SEARCH_BACKEND_TABLE_SCAN;
