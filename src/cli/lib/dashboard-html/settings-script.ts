// Inline fragments share snapshot, pending and common UI/request helpers with the client.
export const dashboardSettingsScript = `const groups = [
	["dashboard.group.git", ["git.auto_stage", "git.auto_commit", "git.auto_push"]],
	["dashboard.group.commitMessage", "git.commit_message."],
	["dashboard.group.reporting", "reporting."],
	["dashboard.group.verification", "verification.selection."],
	["dashboard.group.testAuthoring", "testing.authoring."],
	["dashboard.group.codeStyle", "code_style."],
	["dashboard.group.refactoring", "refactoring.hotspots."],
	["dashboard.group.versioning", "release.versioning."]
];

function settingValue(id) {
	return pending.has(id) ? pending.get(id) : snapshot.settings.find((setting) => setting.id === id)?.value;
}

function settingDescriptionKey(setting) {
	const valueSpecificKey = "dashboard.setting." + setting.id + ".description." + String(settingValue(setting.id));
	if (messageExists(valueSpecificKey)) return valueSpecificKey;
	const key = "dashboard.setting." + setting.id + ".description";
	return messageExists(key) ? key : "";
}

function settingDescription(setting) {
	const key = settingDescriptionKey(setting);
	return key ? message(key) : "";
}

function updateSettingDescription(id) {
	const setting = snapshot.settings.find((item) => item.id === id);
	if (!setting) return;
	const element = document.getElementById(controlId(setting) + "-description");
	if (element) element.textContent = settingDescription(setting);
}

function formatSettingValue(value) {
	if (typeof value === "boolean") {
		return message(value ? "dashboard.status.yes" : "dashboard.status.no");
	}
	return String(value);
}

function settingDisplayName(setting) {
	return message("dashboard.setting." + setting.id) || setting.label;
}

function updateSaveState() {
	document.getElementById("save").disabled = pending.size === 0;
}

function hasUnsavedChanges() {
	return pending.size > 0;
}

function setPending(id, value) {
	const original = snapshot.settings.find((setting) => setting.id === id)?.value;
	if (Object.is(original, value)) {
		pending.delete(id);
	} else {
		pending.set(id, value);
	}
	updateSaveState();
	statusKey(pending.size === 0 ? "dashboard.ui.noChanges" : "dashboard.ui.unsavedChanges");
	updateSettingDescription(id);
	renderSettingsPendingSummary();
}

function controlId(setting) {
	return "setting-" + setting.id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function renderInput(setting) {
	if (setting.kind === "boolean") {
		const input = document.createElement("input");
		const inputId = controlId(setting);
		input.id = inputId;
		input.name = setting.id;
		input.type = "checkbox";
		input.checked = Boolean(settingValue(setting.id));
		input.disabled = !setting.editable;
		input.addEventListener("change", () => setPending(setting.id, input.checked));
		return input;
	}

	if (setting.kind === "number") {
		const input = document.createElement("input");
		const inputId = controlId(setting);
		input.id = inputId;
		input.name = setting.id;
		input.type = "number";
		input.value = String(settingValue(setting.id));
		if (setting.min !== undefined) input.min = String(setting.min);
		if (setting.max !== undefined) input.max = String(setting.max);
		input.disabled = !setting.editable;
		input.addEventListener("input", () => setPending(setting.id, Number(input.value)));
		return input;
	}

	if (setting.acceptsLocaleTag) {
		const wrapper = document.createElement("div");
		const select = document.createElement("select");
		const customInput = document.createElement("input");
		const inputId = controlId(setting);
		const customInputId = inputId + "-custom";
		const optionValues = setting.options || [];
		const currentValue = String(settingValue(setting.id));
		const customLocaleOptionValue = "__mustflow_custom_locale__";
		const isCustomValue = !optionValues.includes(currentValue);
		wrapper.className = "locale-tag-control";
		select.id = inputId;
		select.name = setting.id;
		for (const option of optionValues) {
			const child = document.createElement("option");
			child.value = option;
			child.textContent = option;
			child.selected = option === currentValue;
			select.appendChild(child);
		}
		const customChild = document.createElement("option");
		customChild.value = customLocaleOptionValue;
		customChild.textContent = message("dashboard.ui.customLocale");
		customChild.selected = isCustomValue;
		select.appendChild(customChild);
		select.disabled = !setting.editable;

		customInput.id = customInputId;
		customInput.name = setting.id + ".custom";
		customInput.type = "text";
		customInput.autocomplete = "off";
		customInput.spellcheck = false;
		customInput.placeholder = "pt-BR";
		customInput.value = isCustomValue ? currentValue : "";
		customInput.hidden = !isCustomValue;
		customInput.disabled = !setting.editable || !isCustomValue;
		customInput.setAttribute("aria-label", message("dashboard.ui.customLocale"));

		function updateCustomPending() {
			const value = customInput.value.trim();
			if (value.length > 0) {
				setPending(setting.id, value);
			} else {
				const original = snapshot.settings.find((item) => item.id === setting.id)?.value;
				if (original !== undefined) {
					setPending(setting.id, original);
				}
			}
		}

		select.addEventListener("change", () => {
			const customSelected = select.value === customLocaleOptionValue;
			customInput.hidden = !customSelected;
			customInput.disabled = !setting.editable || !customSelected;
			if (customSelected) {
				customInput.focus();
				updateCustomPending();
			} else {
				setPending(setting.id, select.value);
			}
		});
		customInput.addEventListener("input", updateCustomPending);
		wrapper.appendChild(select);
		wrapper.appendChild(customInput);
		return wrapper;
	}

	const select = document.createElement("select");
	const inputId = controlId(setting);
	select.id = inputId;
	select.name = setting.id;
	for (const option of setting.options || []) {
		const child = document.createElement("option");
		child.value = option;
		child.textContent = option;
		child.selected = option === settingValue(setting.id);
		select.appendChild(child);
	}
	select.disabled = !setting.editable;
	select.addEventListener("change", () => setPending(setting.id, select.value));
	return select;
}

function render() {
	const root = document.getElementById("settings");
	root.textContent = "";
	renderSettingsPendingSummary();
	for (const [titleKey, matcher] of groups) {
		const settings = Array.isArray(matcher)
			? snapshot.settings.filter((setting) => matcher.includes(setting.id))
			: snapshot.settings.filter((setting) => setting.id.startsWith(matcher));
		if (settings.length === 0) continue;
		const section = document.createElement("section");
		const heading = document.createElement("h2");
		heading.textContent = message(titleKey);
		section.appendChild(heading);
		for (const setting of settings) {
			const row = document.createElement("div");
			row.className = "setting";
			const label = document.createElement("label");
			label.htmlFor = controlId(setting);
			const labelText = document.createElement("div");
			labelText.className = "label";
			const labelName = document.createElement("span");
			labelName.textContent = settingDisplayName(setting);
			labelText.appendChild(labelName);
			const descriptionText = settingDescription(setting);
			if (descriptionText) {
				const description = document.createElement("span");
				description.id = controlId(setting) + "-description";
				description.className = "value-description";
				description.textContent = descriptionText;
				labelText.appendChild(description);
			}
			label.appendChild(labelText);
			if (!setting.editable) {
				const meta = document.createElement("div");
				meta.className = "meta";
				meta.textContent = setting.lockedReason
					? message("dashboard.ui.locked") + ": " + message(setting.lockedReason)
					: message("dashboard.ui.locked");
				label.appendChild(meta);
			}
			row.appendChild(label);
			row.appendChild(renderInput(setting));
			section.appendChild(row);
		}
		root.appendChild(section);
	}
}

function renderSettingsPendingSummary() {
	const root = document.getElementById("settings-pending-summary");
	if (!root) return;
	root.textContent = "";
	if (pending.size === 0) {
		root.hidden = true;
		return;
	}
	root.hidden = false;

	const header = document.createElement("div");
	header.className = "settings-pending-header";
	const title = document.createElement("div");
	title.className = "settings-pending-title";
	title.textContent = messageWithCount("dashboard.settings.pendingHeading", String(pending.size));
	const reset = document.createElement("button");
	reset.type = "button";
	reset.textContent = message("dashboard.settings.resetChanges");
	reset.addEventListener("click", resetPendingSettings);
	header.appendChild(title);
	header.appendChild(reset);
	root.appendChild(header);

	const list = document.createElement("ul");
	list.className = "settings-pending-list";
	for (const [id, value] of pending) {
		const setting = snapshot.settings.find((item) => item.id === id);
		if (!setting) continue;
		const item = document.createElement("li");
		item.textContent = messageFormat("dashboard.settings.pendingItem", {
			name: settingDisplayName(setting),
			from: formatSettingValue(setting.value),
			to: formatSettingValue(value),
		});
		list.appendChild(item);
	}
	root.appendChild(list);
}

function resetPendingSettings() {
	pending = new Map();
	updateSaveState();
	statusKey("dashboard.ui.noChanges");
	render();
}

async function loadSnapshot() {
	return updateDashboardView("/api/preferences", {}, (data) => {
		snapshot = data;
		pending = new Map();
		updateSaveState();
		markDataUpdated();
		statusKey("dashboard.ui.reloaded", "ok");
		render();
	});
}

async function save() {
	const updates = Array.from(pending, ([id, value]) => ({ id, value }));
	return updateDashboardView("/api/preferences", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-mustflow-dashboard-token": dashboardToken
		},
		body: JSON.stringify({ updates })
	}, (data) => {
		snapshot = data;
		pending = new Map();
		updateSaveState();
		markDataUpdated();
		statusKey("dashboard.ui.saved", "ok");
		render();
	});
}`;

export const dashboardSettingsEventsScript = `document.getElementById("save").addEventListener("click", () => {
	save().catch((error) => statusText(error.message, "error"));
});
window.addEventListener("beforeunload", (event) => {
	if (!hasUnsavedChanges()) return;
	event.preventDefault();
	event.returnValue = "";
});`;
