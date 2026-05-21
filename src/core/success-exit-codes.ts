export const MIN_SUCCESS_EXIT_CODE = 0;
export const MAX_SUCCESS_EXIT_CODE = 255;

export const SUCCESS_EXIT_CODES_CONTRACT_DESCRIPTION =
	`a non-empty integer array with values from ${MIN_SUCCESS_EXIT_CODE} through ${MAX_SUCCESS_EXIT_CODE}`;

export function successExitCodeIsValid(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= MIN_SUCCESS_EXIT_CODE &&
		value <= MAX_SUCCESS_EXIT_CODE
	);
}

export function successExitCodesAreValid(value: unknown): value is readonly number[] {
	return Array.isArray(value) && value.length > 0 && value.every(successExitCodeIsValid);
}

export function normalizeSuccessExitCodes(value: unknown): number[] {
	if (!successExitCodesAreValid(value)) {
		return [0];
	}

	return [...new Set(value.map(Number))].sort((left, right) => left - right);
}
