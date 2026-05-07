// @ts-check

const arrowDirections = {
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	ArrowUp: 'up',
};

const focusableSelector = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'summary',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

const nativeArrowSelector = [
	'input',
	'select',
	'textarea',
	'[contenteditable=""]',
	'[contenteditable="true"]',
	'[role="combobox"]',
	'[role="listbox"]',
	'[role="menu"]',
	'[role="radiogroup"]',
	'[role="slider"]',
	'[role="spinbutton"]',
	'[role="textbox"]',
].join(',');

const directionalSelectSelector = ['starlight-lang-select select', 'starlight-theme-select select'].join(',');

const widgetScopeSelector = [
	'dialog',
	'[role="dialog"]',
	'starlight-search',
	'.pagefind-ui',
	'[data-pagefind-ui]',
].join(',');

const getFocusableElements = () =>
	Array.from(document.querySelectorAll(focusableSelector)).filter(
		/** @param {Element} element */
		(element) => {
			if (!(element instanceof HTMLElement)) return false;
			if (element.matches('[disabled], [aria-disabled="true"]')) return false;
			if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

			const style = window.getComputedStyle(element);
			if (style.display === 'none' || style.visibility === 'hidden') return false;

			const rect = element.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}
	);

/** @param {DOMRect} rect */
const centerOf = (rect) => ({
	x: rect.left + rect.width / 2,
	y: rect.top + rect.height / 2,
});

const rangesOverlap = (firstStart, firstEnd, secondStart, secondEnd) =>
	Math.max(firstStart, secondStart) <= Math.min(firstEnd, secondEnd);

const offAxisPenalty = 1000000000;

/**
 * @param {DOMRect} currentRect
 * @param {DOMRect} candidateRect
 * @param {string} direction
 */
const scoreCandidate = (currentRect, candidateRect, direction) => {
	const currentCenter = centerOf(currentRect);
	const candidateCenter = centerOf(candidateRect);

	if (direction === 'down') {
		if (candidateCenter.y <= currentCenter.y) return Number.POSITIVE_INFINITY;
		const sameColumnPenalty = rangesOverlap(currentRect.left, currentRect.right, candidateRect.left, candidateRect.right)
			? 0
			: offAxisPenalty;
		return (
			Math.max(candidateRect.top - currentRect.bottom, 0) * 1000 +
			Math.abs(candidateCenter.x - currentCenter.x) +
			sameColumnPenalty
		);
	}

	if (direction === 'up') {
		if (candidateCenter.y >= currentCenter.y) return Number.POSITIVE_INFINITY;
		const sameColumnPenalty = rangesOverlap(currentRect.left, currentRect.right, candidateRect.left, candidateRect.right)
			? 0
			: offAxisPenalty;
		return (
			Math.max(currentRect.top - candidateRect.bottom, 0) * 1000 +
			Math.abs(candidateCenter.x - currentCenter.x) +
			sameColumnPenalty
		);
	}

	if (direction === 'right') {
		if (candidateCenter.x <= currentCenter.x) return Number.POSITIVE_INFINITY;
		const sameRowPenalty = rangesOverlap(currentRect.top, currentRect.bottom, candidateRect.top, candidateRect.bottom)
			? 0
			: offAxisPenalty;
		return (
			Math.max(candidateRect.left - currentRect.right, 0) * 1000 +
			Math.abs(candidateCenter.y - currentCenter.y) +
			sameRowPenalty
		);
	}

	if (direction === 'left') {
		if (candidateCenter.x >= currentCenter.x) return Number.POSITIVE_INFINITY;
		const sameRowPenalty = rangesOverlap(currentRect.top, currentRect.bottom, candidateRect.top, candidateRect.bottom)
			? 0
			: offAxisPenalty;
		return (
			Math.max(currentRect.left - candidateRect.right, 0) * 1000 +
			Math.abs(candidateCenter.y - currentCenter.y) +
			sameRowPenalty
		);
	}

	return Number.POSITIVE_INFINITY;
};

/**
 * @param {HTMLElement} current
 * @param {string} direction
 */
const findNextFocusableElement = (current, direction) => {
	const currentRect = current.getBoundingClientRect();

	return getFocusableElements()
		.filter((candidate) => candidate !== current)
		.map((candidate) => ({
			candidate,
			score: scoreCandidate(currentRect, candidate.getBoundingClientRect(), direction),
		}))
		.filter(({ score }) => Number.isFinite(score))
		.sort((a, b) => a.score - b.score)[0]?.candidate;
};

/** @param {KeyboardEvent} event */
const shouldUseDirectionalFocus = (event) => {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
	if (!(event.key in arrowDirections)) return false;

	const target = event.target;
	if (!(target instanceof HTMLElement)) return false;
	if (target.closest(nativeArrowSelector) && !target.matches(directionalSelectSelector)) return false;
	if (target.closest(widgetScopeSelector)) return false;

	return target.matches(focusableSelector);
};

document.addEventListener('keydown', (event) => {
	if (!shouldUseDirectionalFocus(event)) return;

	const current = event.target;
	if (!(current instanceof HTMLElement)) return;

	const direction = arrowDirections[event.key];
	const next = findNextFocusableElement(current, direction);
	if (!next) {
		if (current.matches(directionalSelectSelector)) event.preventDefault();
		return;
	}

	event.preventDefault();
	next.focus();
	next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});

window.__mustflowKeyboardNavigation = { enabled: true };
