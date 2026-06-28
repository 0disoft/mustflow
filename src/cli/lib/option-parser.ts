import { t, type CliLang, type MessageKey } from './i18n.js';

export type CliOptionKind = 'boolean' | 'string';

export interface CliOptionSpec {
	readonly name: string;
	readonly kind: CliOptionKind;
	readonly aliases?: readonly string[];
}

export interface CliOptionParseError {
	readonly kind: 'unknown_option' | 'missing_value';
	readonly option: string;
}

export interface ParsedCliOptionOccurrence {
	readonly name: string;
	readonly value: boolean | string;
	readonly token: string;
}

export interface ParsedCliOptions {
	readonly values: ReadonlyMap<string, boolean | string>;
	readonly occurrences: readonly ParsedCliOptionOccurrence[];
	readonly positionals: readonly string[];
	readonly error: CliOptionParseError | null;
}

export interface ParsedIntegerCliOption {
	readonly value: number | null;
	readonly error?: string;
}

export interface CliOptionParseConfig {
	readonly allowPositionals?: boolean;
	readonly allowUnknownOptions?: boolean;
	readonly allowEmptyStringValues?: boolean;
}

function createSpecMap(specs: readonly CliOptionSpec[]): ReadonlyMap<string, CliOptionSpec> {
	const map = new Map<string, CliOptionSpec>();

	for (const spec of specs) {
		map.set(spec.name, spec);
		for (const alias of spec.aliases ?? []) {
			map.set(alias, spec);
		}
	}

	return map;
}

function splitOptionToken(token: string): { readonly name: string; readonly inlineValue: string | null } {
	const separatorIndex = token.indexOf('=');

	if (separatorIndex === -1) {
		return { name: token, inlineValue: null };
	}

	return {
		name: token.slice(0, separatorIndex),
		inlineValue: token.slice(separatorIndex + 1),
	};
}

export function hasCliOptionToken(args: readonly string[], name: string, aliases: readonly string[] = []): boolean {
	const tokens = new Set([name, ...aliases]);
	return args.some((arg) => tokens.has(splitOptionToken(arg).name));
}

export function parseCliOptions(
	args: readonly string[],
	specs: readonly CliOptionSpec[],
	config: CliOptionParseConfig = {},
): ParsedCliOptions {
	const specByToken = createSpecMap(specs);
	const values = new Map<string, boolean | string>();
	const occurrences: ParsedCliOptionOccurrence[] = [];
	const positionals: string[] = [];
	const allowPositionals = config.allowPositionals === true;
	const allowUnknownOptions = config.allowUnknownOptions === true;
	const allowEmptyStringValues = config.allowEmptyStringValues === true;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg) {
			continue;
		}

		if (!arg.startsWith('-')) {
			if (allowPositionals) {
				positionals.push(arg);
				continue;
			}

			return { values, occurrences, positionals, error: { kind: 'unknown_option', option: arg } };
		}

		const { name, inlineValue } = splitOptionToken(arg);
		const spec = specByToken.get(name);

		if (!spec) {
			if (allowUnknownOptions && allowPositionals) {
				positionals.push(arg);
				continue;
			}

			return { values, occurrences, positionals, error: { kind: 'unknown_option', option: arg } };
		}

		if (spec.kind === 'boolean') {
			if (inlineValue !== null) {
				return { values, occurrences, positionals, error: { kind: 'unknown_option', option: arg } };
			}

			values.set(spec.name, true);
			occurrences.push({ name: spec.name, value: true, token: arg });
			continue;
		}

		if (inlineValue !== null) {
			if (inlineValue.length === 0 && !allowEmptyStringValues) {
				return { values, occurrences, positionals, error: { kind: 'missing_value', option: name } };
			}

			values.set(spec.name, inlineValue);
			occurrences.push({ name: spec.name, value: inlineValue, token: arg });
			continue;
		}

		const nextArg = args[index + 1];
		if (!nextArg || nextArg.startsWith('-')) {
			return { values, occurrences, positionals, error: { kind: 'missing_value', option: name } };
		}

		values.set(spec.name, nextArg);
		occurrences.push({ name: spec.name, value: nextArg, token: arg });
		index += 1;
	}

	return { values, occurrences, positionals, error: null };
}

export function hasParsedCliOption(parsed: ParsedCliOptions, name: string): boolean {
	return parsed.values.get(name) === true;
}

export function getParsedCliStringOption(parsed: ParsedCliOptions, name: string): string | null {
	const value = parsed.values.get(name);
	return typeof value === 'string' ? value : null;
}

export function parsePositiveIntegerCliOption(
	value: string | null,
	option: string,
	invalidMessageKey: MessageKey,
	lang: CliLang,
): ParsedIntegerCliOption {
	if (value === null) {
		return { value: null };
	}

	if (!/^[1-9]\d*$/u.test(value)) {
		return { value: null, error: t(lang, invalidMessageKey, { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, invalidMessageKey, { option, value }) };
	}

	return { value: parsed };
}

export function parseNonNegativeIntegerCliOption(
	value: string | null,
	option: string,
	invalidMessageKey: MessageKey,
	lang: CliLang,
): ParsedIntegerCliOption {
	if (value === null) {
		return { value: null };
	}

	if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
		return { value: null, error: t(lang, invalidMessageKey, { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, invalidMessageKey, { option, value }) };
	}

	return { value: parsed };
}

export function formatCliOptionParseError(error: CliOptionParseError, lang: CliLang): string {
	if (error.kind === 'missing_value') {
		return t(lang, 'cli.error.missingValue', { option: error.option });
	}

	return t(lang, 'cli.error.unknownOption', { option: error.option });
}
