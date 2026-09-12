import { buildSkillRouteCatalog } from './skill-route-resolution.js';

function cell(value: string): string {
	return value.replace(/[\r\n]+/gu, ' ').replace(/\|/gu, '\\|');
}

export function renderSkillCategoryIndex(projectRoot: string, category?: string): string {
	const entries = buildSkillRouteCatalog(projectRoot).entries;
	const categories: string[] = [...new Set(entries.map(entry => entry.category ?? 'uncategorized'))].sort();
	if (category === undefined) {
		return [
			'# Installed skill categories',
			'',
			entries.length + ' built-in skills. Select a category with mf skill index --category <name>.',
			'',
			'| Category | Installed skills |',
			'| --- | ---: |',
			...categories.map(name => '| ' + name + ' | ' + entries.filter(entry => (entry.category ?? 'uncategorized') === name).length + ' |'),
			'',
		].join('\n');
	}
	if (!categories.includes(category)) throw new Error('Unknown or uninstalled skill category: ' + category + '. Available: ' + categories.join(', '));
	const selected = entries.filter(entry => (entry.category ?? 'uncategorized') === category);
	return [
		'# ' + category,
		'',
		selected.length + ' installed built-in skills. Read the matching SKILL.md before acting; this index grants no command authority.',
		'',
		'| Skill | Trigger | Procedure |',
		'| --- | --- | --- |',
		...selected.map(entry => '| ' + cell(entry.skill) + ' | ' + cell(entry.trigger) + ' | ' + entry.skill_path + ' |'),
		'',
	].join('\n');
}
