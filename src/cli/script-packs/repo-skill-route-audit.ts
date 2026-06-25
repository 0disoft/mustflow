import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import {
	auditSkillRoutes,
	SKILL_ROUTE_AUDIT_SCRIPT_REF,
	type SkillRouteAuditReport,
} from '../../core/skill-route-audit.js';

const SKILL_ROUTE_AUDIT_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedSkillRouteAuditOptions {
	readonly action: 'audit';
	readonly json: boolean;
	readonly error?: string;
}

export function getRepoSkillRouteAuditHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/skill-route-audit audit [options]',
			summary: t(lang, 'skillRouteAudit.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/skill-route-audit audit',
				'mf script-pack run repo/skill-route-audit audit --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'skillRouteAudit.help.exit.ok') },
				{ label: '1', description: t(lang, 'skillRouteAudit.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseSkillRouteAuditOptions(args: readonly string[], lang: CliLang): ParsedSkillRouteAuditOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, SKILL_ROUTE_AUDIT_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'audit') {
		return {
			action: 'audit',
			json,
			error: action
				? t(lang, 'skillRouteAudit.error.unknownAction', { action })
				: t(lang, 'skillRouteAudit.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json };
}

function renderSkillRouteAuditSummary(report: SkillRouteAuditReport, lang: CliLang): string {
	const lines = [
		t(lang, 'skillRouteAudit.title'),
		`${t(lang, 'scriptPack.label.script')}: ${SKILL_ROUTE_AUDIT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'skillRouteAudit.label.sourceSkills')}: ${report.counts.source_skills}`,
		`${t(lang, 'skillRouteAudit.label.routeMetadata')}: ${report.counts.route_metadata}`,
		`${t(lang, 'skillRouteAudit.label.indexRoutes')}: ${report.counts.index_routes}`,
		`${t(lang, 'skillRouteAudit.label.templateSkills')}: ${report.counts.template_skills}`,
		`${t(lang, 'skillRouteAudit.label.findings')}: ${report.findings.length}`,
	];

	if (report.findings.length > 0) {
		lines.push(t(lang, 'skillRouteAudit.label.findings'));
		for (const finding of report.findings) {
			const target = finding.skill ?? finding.route ?? finding.path;
			lines.push(`- ${target}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'generatedBoundary.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'skillRouteAudit.clean'));
	}

	return lines.join('\n');
}

export function runRepoSkillRouteAuditScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoSkillRouteAuditHelp(lang));
		return 0;
	}

	const options = parseSkillRouteAuditOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/skill-route-audit --help',
			getRepoSkillRouteAuditHelp(lang),
			lang,
		);
		return 1;
	}

	const report = auditSkillRoutes(resolveMustflowRoot());
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderSkillRouteAuditSummary(report, lang));
	return report.ok ? 0 : 1;
}
