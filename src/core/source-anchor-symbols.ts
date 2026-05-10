import { createHash } from 'node:crypto';

export type SourceAnchorSymbolKind = 'function' | 'class' | 'method' | 'const' | 'unknown';

export interface SourceAnchorSymbol {
	readonly kind: SourceAnchorSymbolKind;
	readonly name: string | null;
	readonly exported: boolean;
	readonly signatureHash: string | null;
	readonly bodyHash: string | null;
	readonly startLine: number | null;
	readonly endLine: number | null;
}

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function countBraceDelta(line: string): number {
	let delta = 0;
	let quote: '"' | "'" | '`' | null = null;
	let escaped = false;

	for (const char of line) {
		if (escaped) {
			escaped = false;
			continue;
		}

		if (char === '\\') {
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = null;
			}
			continue;
		}

		if (char === '"' || char === "'" || char === '`') {
			quote = char;
			continue;
		}

		if (char === '{') {
			delta += 1;
			continue;
		}

		if (char === '}') {
			delta -= 1;
		}
	}

	return delta;
}

function findBracedBodyEndLine(lines: readonly string[], startIndex: number): number | null {
	let depth = 0;
	let hasBodyStart = false;

	for (let index = startIndex; index < lines.length; index += 1) {
		const delta = countBraceDelta(lines[index] ?? '');
		depth += delta;

		if (delta > 0) {
			hasBodyStart = true;
		}

		if (hasBodyStart && depth <= 0) {
			return index + 1;
		}
	}

	return hasBodyStart ? lines.length : null;
}

function indentationWidth(line: string): number {
	return line.match(/^\s*/u)?.[0].length ?? 0;
}

function findIndentedBodyEndLine(lines: readonly string[], startIndex: number): number | null {
	const declarationIndent = indentationWidth(lines[startIndex] ?? '');

	for (let index = startIndex + 1; index < lines.length; index += 1) {
		const line = lines[index] ?? '';

		if (line.trim().length === 0) {
			continue;
		}

		if (indentationWidth(line) <= declarationIndent) {
			return index;
		}
	}

	return lines.length;
}

function normalizeSignature(line: string): string {
	return line.trim().replace(/\s+/gu, ' ');
}

function extractSymbolFromLine(line: string): Omit<SourceAnchorSymbol, 'signatureHash' | 'bodyHash' | 'startLine' | 'endLine'> | null {
	const trimmed = line.trim();
	const functionMatch = trimmed.match(/^(export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/u);
	if (functionMatch) {
		return {
			kind: 'function',
			name: functionMatch[2],
			exported: Boolean(functionMatch[1]),
		};
	}

	const classMatch = trimmed.match(/^(export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)\b/u);
	if (classMatch) {
		return {
			kind: 'class',
			name: classMatch[2],
			exported: Boolean(classMatch[1]),
		};
	}

	const constMatch = trimmed.match(/^(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/u);
	if (constMatch) {
		return {
			kind: 'const',
			name: constMatch[2],
			exported: Boolean(constMatch[1]),
		};
	}

	const rustFunctionMatch = trimmed.match(/^(pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)\s*[<(]/u);
	if (rustFunctionMatch) {
		return {
			kind: 'function',
			name: rustFunctionMatch[2],
			exported: Boolean(rustFunctionMatch[1]),
		};
	}

	const goFunctionMatch = trimmed.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)\s*\(/u);
	if (goFunctionMatch) {
		return {
			kind: trimmed.startsWith('func (') ? 'method' : 'function',
			name: goFunctionMatch[1],
			exported: /^[A-Z]/u.test(goFunctionMatch[1] ?? ''),
		};
	}

	const pythonFunctionMatch = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/u);
	if (pythonFunctionMatch) {
		return {
			kind: 'function',
			name: pythonFunctionMatch[1],
			exported: !pythonFunctionMatch[1]?.startsWith('_'),
		};
	}

	const pythonClassMatch = trimmed.match(/^class\s+([A-Za-z_][\w]*)\b/u);
	if (pythonClassMatch) {
		return {
			kind: 'class',
			name: pythonClassMatch[1],
			exported: !pythonClassMatch[1]?.startsWith('_'),
		};
	}

	const methodMatch = trimmed.match(/^(?:public\s+|private\s+|protected\s+|static\s+|async\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^={]+)?\s*\{/u);
	if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(methodMatch[1] ?? '')) {
		return {
			kind: 'method',
			name: methodMatch[1],
			exported: !trimmed.startsWith('private ') && !trimmed.startsWith('protected '),
		};
	}

	return null;
}

export function unknownSourceAnchorSymbol(): SourceAnchorSymbol {
	return {
		kind: 'unknown',
		name: null,
		exported: false,
		signatureHash: null,
		bodyHash: null,
		startLine: null,
		endLine: null,
	};
}

export function extractSourceAnchorSymbol(content: string, anchorLineStart: number): SourceAnchorSymbol {
	const lines = content.split(/\r?\n/u);
	const scanStart = Math.max(0, anchorLineStart);
	const scanEnd = Math.min(lines.length, scanStart + 24);

	for (let index = scanStart; index < scanEnd; index += 1) {
		const line = lines[index] ?? '';
		const trimmed = line.trim();

		if (
			trimmed.length === 0 ||
			trimmed.startsWith('*') ||
			trimmed.startsWith('//') ||
			trimmed.startsWith('#') ||
			trimmed.startsWith('@') ||
			trimmed === '*/'
		) {
			continue;
		}

		const symbol = extractSymbolFromLine(line);
		if (!symbol) {
			continue;
		}

		const endLine = line.includes('{') ? findBracedBodyEndLine(lines, index) : findIndentedBodyEndLine(lines, index);
		const body = endLine ? lines.slice(index, endLine).join('\n') : null;

		return {
			...symbol,
			signatureHash: sha256(normalizeSignature(line)),
			bodyHash: body ? sha256(body) : null,
			startLine: index + 1,
			endLine,
		};
	}

	return unknownSourceAnchorSymbol();
}
