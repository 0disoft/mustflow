export interface SkillRouteCoverageCase {
	readonly positive: readonly string[];
	readonly forbidden: readonly string[];
	readonly passed: boolean;
}

export interface SkillRouteCoverage {
	readonly installed_skill_count: number;
	readonly expected_skill_count: number;
	readonly passed_skill_count: number;
	readonly passed_skill_rate: number;
	readonly untested_skills: readonly string[];
	readonly failing_skills: readonly string[];
	readonly negative_only_skills: readonly string[];
	readonly unknown_references: readonly string[];
	readonly categories: readonly {
		readonly category: string;
		readonly installed_skill_count: number;
		readonly expected_skill_count: number;
		readonly passed_skill_count: number;
	}[];
}

export function summarizeSkillRouteCoverage(
	skills: readonly { readonly skill: string; readonly category: string | null }[],
	cases: readonly SkillRouteCoverageCase[],
): SkillRouteCoverage {
	const installed = new Map(skills.map(skill => [skill.skill, skill.category ?? 'uncategorized']));
	const positive = new Set(cases.flatMap(fixture => [...fixture.positive]));
	const passed = new Set(cases.filter(fixture => fixture.passed).flatMap(fixture => [...fixture.positive]));
	const forbidden = new Set(cases.flatMap(fixture => [...fixture.forbidden]));
	const names = [...installed.keys()].sort();
	const expectedNames = names.filter(name => positive.has(name));
	const passedNames = names.filter(name => passed.has(name));
	const categories = [...new Set(installed.values())].sort().map(category => {
		const members = names.filter(name => installed.get(name) === category);
		return {
			category,
			installed_skill_count: members.length,
			expected_skill_count: members.filter(name => positive.has(name)).length,
			passed_skill_count: members.filter(name => passed.has(name)).length,
		};
	});
	return {
		installed_skill_count: names.length,
		expected_skill_count: expectedNames.length,
		passed_skill_count: passedNames.length,
		passed_skill_rate: names.length === 0 ? 0 : Number((passedNames.length / names.length).toFixed(6)),
		untested_skills: names.filter(name => !positive.has(name)),
		failing_skills: expectedNames.filter(name => !passed.has(name)),
		negative_only_skills: names.filter(name => forbidden.has(name) && !positive.has(name)),
		unknown_references: [...new Set([...positive, ...forbidden])].filter(name => !installed.has(name)).sort(),
		categories,
	};
}
