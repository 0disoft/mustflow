import { MESSAGE_CATALOGS, SUPPORTED_CLI_LANGS, type CliLang, type MessageKey } from './i18n.js';

export const DASHBOARD_LOCALE_NAMES = {
	en: 'English',
	ko: '한국어',
	zh: '中文',
	es: 'Español',
	fr: 'Français',
	hi: 'हिन्दी',
} satisfies Record<CliLang, string>;

export const DASHBOARD_UI_MESSAGE_KEYS = [
	'dashboard.ui.title',
	'dashboard.ui.language',
	'dashboard.ui.noChanges',
	'dashboard.ui.unsavedChanges',
	'dashboard.ui.reloaded',
	'dashboard.ui.saved',
	'dashboard.ui.reload',
	'dashboard.ui.save',
	'dashboard.ui.locked',
	'dashboard.ui.customLocale',
	'dashboard.ui.openMustflow',
	'dashboard.ui.openedMustflow',
	'dashboard.locked.git.auto_push',
	'dashboard.group.git',
	'dashboard.group.commitMessage',
	'dashboard.group.reporting',
	'dashboard.group.verification',
	'dashboard.group.codeStyle',
	'dashboard.group.versioning',
	'dashboard.setting.git.auto_stage',
	'dashboard.setting.git.auto_commit',
	'dashboard.setting.git.auto_push',
	'dashboard.setting.git.commit_message.style',
	'dashboard.setting.git.commit_message.style.description.conventional',
	'dashboard.setting.git.commit_message.style.description.descriptive',
	'dashboard.setting.git.commit_message.style.description.gitmoji',
	'dashboard.setting.git.commit_message.language',
	'dashboard.setting.git.commit_message.language.description.preserve_existing',
	'dashboard.setting.git.commit_message.language.description.agent_response',
	'dashboard.setting.git.commit_message.language.description.docs',
	'dashboard.setting.git.commit_message.language.description.en',
	'dashboard.setting.git.commit_message.language.description.ko',
	'dashboard.setting.git.commit_message.language.description.zh',
	'dashboard.setting.git.commit_message.language.description.es',
	'dashboard.setting.git.commit_message.language.description.fr',
	'dashboard.setting.git.commit_message.language.description.hi',
	'dashboard.setting.git.commit_message.language.description',
	'dashboard.setting.git.commit_message.max_suggestions',
	'dashboard.setting.git.commit_message.include_body',
	'dashboard.setting.git.commit_message.include_body.description.never',
	'dashboard.setting.git.commit_message.include_body.description.when_non_trivial',
	'dashboard.setting.git.commit_message.include_body.description.always',
	'dashboard.setting.git.commit_message.split_when_multiple_concerns',
	'dashboard.setting.git.commit_message.avoid_sensitive_details',
	'dashboard.setting.git.commit_message.avoid_sensitive_details.description',
	'dashboard.setting.reporting.commit_suggestion.enabled',
	'dashboard.setting.verification.selection.strategy',
	'dashboard.setting.verification.selection.strategy.description.risk_based',
	'dashboard.setting.verification.selection.strategy.description.targeted',
	'dashboard.setting.verification.selection.strategy.description.full',
	'dashboard.setting.verification.selection.prefer_related_tests',
	'dashboard.setting.verification.selection.skip_docs_only_full_test',
	'dashboard.setting.verification.selection.skip_low_risk_code_full_test',
	'dashboard.setting.verification.selection.skip_low_risk_code_full_test.description',
	'dashboard.setting.verification.selection.skip_translation_only_full_test',
	'dashboard.setting.verification.selection.skip_copy_only_full_test',
	'dashboard.setting.verification.selection.report_skipped',
	'dashboard.setting.code_style.avoid_drive_by_refactors',
	'dashboard.setting.release.versioning.impact_check',
	'dashboard.setting.release.versioning.impact_check.description',
	'dashboard.setting.release.versioning.suggest_bump',
	'dashboard.setting.release.versioning.suggest_bump.description',
	'dashboard.setting.release.versioning.auto_bump',
	'dashboard.setting.release.versioning.auto_bump.description',
	'dashboard.setting.release.versioning.require_user_confirmation',
	'dashboard.setting.release.versioning.require_user_confirmation.description',
	'dashboard.setting.release.versioning.sync_template_version',
	'dashboard.setting.release.versioning.sync_template_version.description',
	'dashboard.setting.release.versioning.sync_docs_examples',
	'dashboard.setting.release.versioning.sync_docs_examples.description',
	'dashboard.setting.release.versioning.sync_tests',
	'dashboard.setting.release.versioning.sync_tests.description',
] as const satisfies readonly MessageKey[];

type DashboardUiMessageKey = (typeof DASHBOARD_UI_MESSAGE_KEYS)[number];

export interface DashboardLocaleBundle {
	readonly locales: readonly CliLang[];
	readonly names: Record<CliLang, string>;
	readonly messages: Record<CliLang, Record<DashboardUiMessageKey, string>>;
}

export function getDashboardLocaleBundle(): DashboardLocaleBundle {
	const messages = Object.fromEntries(
		SUPPORTED_CLI_LANGS.map((lang) => [
			lang,
			Object.fromEntries(DASHBOARD_UI_MESSAGE_KEYS.map((key) => [key, MESSAGE_CATALOGS[lang][key]])),
		]),
	) as Record<CliLang, Record<DashboardUiMessageKey, string>>;

	return {
		locales: SUPPORTED_CLI_LANGS,
		names: DASHBOARD_LOCALE_NAMES,
		messages,
	};
}
