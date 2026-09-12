// Shared browser presentation helpers used by multiple dashboard tabs.
export const dashboardListUiScript = `function setButtonAccessibleLabel(button, label) {
	button.textContent = label;
	button.title = label;
	button.setAttribute("aria-label", label);
}

function copyCommandLabel(command) {
	return messageFormat("dashboard.a11y.copyCommand", { command });
}

function showCopyButtonFeedback(button, restoreLabel) {
	if (button.copyFeedbackTimeout) window.clearTimeout(button.copyFeedbackTimeout);
	const originalDisabled = button.disabled;
	setButtonAccessibleLabel(button, message("dashboard.ui.copied"));
	button.disabled = true;
	button.copyFeedbackTimeout = window.setTimeout(() => {
		setButtonAccessibleLabel(button, restoreLabel);
		button.disabled = originalDisabled;
		button.copyFeedbackTimeout = null;
	}, copyFeedbackMs);
}

function normalizeFilterText(value) {
	return String(value || "").toLowerCase();
}

function filterTextMatches(query, values) {
	const normalizedQuery = normalizeFilterText(query).trim();
	if (!normalizedQuery) return true;
	return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

function renderListFilters(kind, stateOptions, rerender) {
	const filter = listFilters[kind];
	const wrapper = document.createElement("div");
	wrapper.className = "list-filters";

	const searchLabel = document.createElement("label");
	const searchText = document.createElement("span");
	searchText.textContent = message("dashboard.filter.search");
	const search = document.createElement("input");
	const searchId = "dashboard-" + kind + "-filter-search";
	search.id = searchId;
	search.type = "text";
	search.autocomplete = "off";
	search.spellcheck = false;
	search.value = filter.query;
	search.placeholder = message("dashboard.filter.searchPlaceholder");
	search.addEventListener("input", () => {
		const cursor = search.selectionStart;
		filter.query = search.value;
		rerender();
		const nextSearch = document.getElementById(searchId);
		if (nextSearch) {
			nextSearch.focus();
			if (cursor !== null) nextSearch.setSelectionRange(cursor, cursor);
		}
	});
	searchLabel.appendChild(searchText);
	searchLabel.appendChild(search);
	wrapper.appendChild(searchLabel);

	const stateLabel = document.createElement("label");
	const stateText = document.createElement("span");
	stateText.textContent = message("dashboard.filter.state");
	const state = document.createElement("select");
	const stateId = "dashboard-" + kind + "-filter-state";
	state.id = stateId;
	for (const option of stateOptions) {
		const child = document.createElement("option");
		child.value = option;
		child.textContent = message("dashboard.filter." + option);
		child.selected = option === filter.state;
		state.appendChild(child);
	}
	state.addEventListener("change", () => {
		filter.state = state.value;
		rerender();
		const nextState = document.getElementById(stateId);
		if (nextState) nextState.focus();
	});
	stateLabel.appendChild(stateText);
	stateLabel.appendChild(state);
	wrapper.appendChild(stateLabel);
	return wrapper;
}

function createCollapsibleDetails(titleKey) {
	const details = document.createElement("details");
	details.className = "collapsible-details";
	const summary = document.createElement("summary");
	summary.textContent = message(titleKey);
	details.appendChild(summary);
	return details;
}

function appendCommandMeta(root, labelKey, value) {
	if (value === null || value === undefined || value === "") return;
	const item = document.createElement("span");
	item.textContent = message(labelKey) + ": " + value;
	root.appendChild(item);
}`;
