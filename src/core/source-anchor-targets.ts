import type { CodeOutlineSymbol } from './code-outline.js';

export function createSourceAnchorTargetLookup(
	relativePath: string,
	lines: readonly string[],
	symbols: readonly CodeOutlineSymbol[],
): (anchorEndLine: number) => CodeOutlineSymbol | null {
	const ordered = symbols.filter((symbol) => symbol.path === relativePath)
		.sort((left, right) => left.start_line - right.start_line);
	const blockers = [0];
	for (const line of lines) {
		const trimmed = line.trim();
		const bridge = trimmed.length === 0 || trimmed.startsWith('//') || trimmed.startsWith('#') ||
			trimmed.startsWith('*') || trimmed.startsWith('@');
		blockers.push(blockers[blockers.length - 1] + (bridge ? 0 : 1));
	}
	return (anchorEndLine) => {
		let low = 0;
		let high = ordered.length;
		while (low < high) {
			const middle = low + Math.floor((high - low) / 2);
			if (ordered[middle].start_line <= anchorEndLine) low = middle + 1;
			else high = middle;
		}
		const target = ordered[low];
		if (!target || blockers[target.start_line - 1] !== blockers[anchorEndLine]) return null;
		return target;
	};
}
