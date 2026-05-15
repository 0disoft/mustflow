export const REDACTED_SECRET_MARKER = '[REDACTED_SECRET]';

export interface SecretRedactionResult {
	readonly text: string;
	readonly redacted: boolean;
	readonly redactionCount: number;
	readonly redactionKinds: readonly string[];
}

interface SecretRedactionRule {
	readonly kind: string;
	readonly pattern: RegExp;
	readonly replace: (...match: string[]) => string;
}

const SECRET_VALUE_PATTERN = '[A-Za-z0-9_./+=:-]{8,}';

const SECRET_REDACTION_RULES: readonly SecretRedactionRule[] = [
	{
		kind: 'secret_key_value',
		pattern: new RegExp(
			`\\b((?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|secret|password|passwd|private[_-]?key)\\b\\s*[:=]\\s*["']?)(${SECRET_VALUE_PATTERN})`,
			'giu',
		),
		replace: (_match, prefix) => `${prefix}${REDACTED_SECRET_MARKER}`,
	},
	{
		kind: 'secret_token',
		pattern: /\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/gu,
		replace: () => REDACTED_SECRET_MARKER,
	},
] as const;

export const SECRET_LIKE_PATTERNS = SECRET_REDACTION_RULES.map((rule) => {
	const flags = rule.pattern.flags.replace('g', '');
	return new RegExp(rule.pattern.source, flags);
});

export function textContainsSecretLike(value: string): boolean {
	return SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(value));
}

export function redactSecretLikeText(value: string): SecretRedactionResult {
	let text = value;
	let redactionCount = 0;
	const redactionKinds = new Set<string>();

	for (const rule of SECRET_REDACTION_RULES) {
		text = text.replace(rule.pattern, (...match) => {
			redactionCount += 1;
			redactionKinds.add(rule.kind);
			return rule.replace(...match.map(String));
		});
	}

	return {
		text,
		redacted: redactionCount > 0,
		redactionCount,
		redactionKinds: [...redactionKinds].sort(),
	};
}
