import type { DashboardPreferencesSnapshot } from './dashboard-preferences.js';
import { getDashboardLocaleBundle } from './dashboard-locale.js';

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function renderDashboardHtml(snapshot: DashboardPreferencesSnapshot, token: string): string {
	const root = escapeHtml(snapshot.projectRoot);
	const preferencesPath = escapeHtml(snapshot.preferencesPath);
	const serializedSnapshot = JSON.stringify(snapshot);
	const serializedToken = JSON.stringify(token);
	const localeBundle = getDashboardLocaleBundle();
	const serializedLocaleBundle = JSON.stringify(localeBundle);
	const serializedAvailableLocales = JSON.stringify(localeBundle.locales);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mustflow dashboard</title>
<style>
:root {
	color-scheme: light dark;
	--bg: #101216;
	--panel: #181b21;
	--line: #2a2f3a;
	--text: #eef1f7;
	--muted: #aeb6c5;
	--accent: #8fb4ff;
	--danger: #ff9a9a;
	--ok: #9be7ba;
	font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body {
	margin: 0;
	background: var(--bg);
	color: var(--text);
	font-size: 17px;
}
header {
	border-bottom: 1px solid var(--line);
	padding: 16px 20px;
}
.title-row {
	align-items: center;
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
}
h1 {
	font-size: 22px;
	line-height: 1.2;
	margin: 0;
	font-weight: 650;
}
.icon-button {
	align-items: center;
	display: inline-flex;
	height: 34px;
	justify-content: center;
	padding: 0;
	width: 34px;
}
.icon-button svg {
	height: 18px;
	width: 18px;
}
.path {
	color: var(--muted);
	font-size: 14px;
	overflow-wrap: anywhere;
}
main {
	max-width: 980px;
	margin: 0 auto;
	padding: 20px;
}
.toolbar {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	justify-content: flex-end;
	margin-bottom: 14px;
	min-height: 36px;
}
.language-picker {
	align-items: center;
	display: inline-flex;
	flex-shrink: 0;
	gap: 8px;
}
.language-picker span {
	color: var(--muted);
	font-size: 14px;
	white-space: nowrap;
}
.language-picker select {
	min-width: 130px;
}
.status {
	color: var(--muted);
	font-size: 15px;
	margin-right: auto;
}
.status.ok { color: var(--ok); }
.status.error { color: var(--danger); }
button, select, input {
	background: #11141a;
	border: 1px solid var(--line);
	border-radius: 6px;
	color: var(--text);
	font: inherit;
	min-height: 38px;
}
button {
	cursor: pointer;
	padding: 0 14px;
}
button:disabled {
	cursor: not-allowed;
	opacity: 0.6;
}
section {
	border-top: 1px solid var(--line);
	padding: 14px 0;
}
h2 {
	font-size: 15px;
	line-height: 1.25;
	margin: 0 0 8px;
	color: var(--muted);
	font-weight: 650;
}
.setting {
	align-items: center;
	display: grid;
	gap: 12px;
	grid-template-columns: minmax(220px, 1fr) minmax(120px, 240px);
	min-height: 48px;
	padding: 6px 0;
}
.label {
	font-size: 16px;
}
.value-description {
	color: var(--muted);
	font-size: 13px;
	line-height: 1.35;
	margin-left: 10px;
}
.meta {
	color: var(--muted);
	font-size: 13px;
	margin-top: 2px;
}
select, input[type="number"], input[type="text"] {
	padding: 0 12px;
	width: 100%;
}
select {
	appearance: none;
	background-image:
		linear-gradient(45deg, transparent 50%, currentColor 50%),
		linear-gradient(135deg, currentColor 50%, transparent 50%);
	background-position:
		calc(100% - 22px) 50%,
		calc(100% - 16px) 50%;
	background-repeat: no-repeat;
	background-size: 6px 6px, 6px 6px;
	padding-right: 44px;
}
select::-ms-expand {
	display: none;
}
.setting-control {
	width: 100%;
}
.locale-tag-control {
	display: grid;
	gap: 8px;
	width: 100%;
}
.locale-tag-control input[hidden] {
	display: none;
}
input[type="checkbox"] {
	height: 22px;
	justify-self: end;
	min-height: 22px;
	width: 22px;
}
@media (max-width: 640px) {
	main { padding: 14px; }
	.setting {
		grid-template-columns: 1fr;
		gap: 6px;
	}
	input[type="checkbox"] {
		justify-self: start;
	}
}
</style>
</head>
<body>
<header>
	<div class="title-row">
		<h1 id="dashboard-title">mustflow dashboard</h1>
		<button id="open-mustflow" class="icon-button" type="button" aria-label="Open .mustflow folder" title="Open .mustflow folder">
			<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.2a2 2 0 0 1-1.6-.8L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"></path>
			</svg>
		</button>
	</div>
	<div class="path">${root}</div>
	<div class="path">${preferencesPath}</div>
</header>
<main>
	<div class="toolbar">
		<div id="status" class="status">No changes</div>
		<label class="language-picker" for="dashboard-language">
			<span id="dashboard-language-label">Language</span>
			<select id="dashboard-language" name="dashboard-language"></select>
		</label>
		<button id="reload" type="button">Reload</button>
		<button id="save" type="button" disabled>Save</button>
	</div>
	<div id="settings"></div>
</main>
<script>
const initialSnapshot = ${serializedSnapshot};
const dashboardToken = ${serializedToken};
const dashboardLocales = ${serializedLocaleBundle};
const availableLocales = ${serializedAvailableLocales};
let snapshot = initialSnapshot;
let pending = new Map();
let currentLocale = resolveInitialLocale();
let statusState = { key: "dashboard.ui.noChanges", text: "", type: "" };

const groups = [
	["dashboard.group.git", ["git.auto_stage", "git.auto_commit", "git.auto_push"]],
	["dashboard.group.commitMessage", "git.commit_message."],
	["dashboard.group.reporting", "reporting."],
	["dashboard.group.verification", "verification.selection."],
	["dashboard.group.testAuthoring", "testing.authoring."],
	["dashboard.group.codeStyle", "code_style."],
	["dashboard.group.versioning", "release.versioning."]
];

function resolveInitialLocale() {
	const stored = window.localStorage.getItem("mustflow.dashboard.language");
	if (availableLocales.includes(stored)) return stored;
	const browserLocale = (window.navigator.language || "").slice(0, 2).toLowerCase();
	return availableLocales.includes(browserLocale) ? browserLocale : "en";
}

function message(key) {
	return dashboardLocales.messages[currentLocale]?.[key] ?? dashboardLocales.messages.en[key] ?? key;
}

function messageExists(key) {
	return Boolean(dashboardLocales.messages[currentLocale]?.[key] ?? dashboardLocales.messages.en[key]);
}

function statusText(text, type = "") {
	statusState = { key: "", text, type };
	renderStatus();
}

function statusKey(key, type = "") {
	statusState = { key, text: "", type };
	renderStatus();
}

function renderStatus() {
	const element = document.getElementById("status");
	const text = statusState.key ? message(statusState.key) : statusState.text;
	element.textContent = text;
	element.className = statusState.type ? "status " + statusState.type : "status";
}

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

function setPending(id, value) {
	const original = snapshot.settings.find((setting) => setting.id === id)?.value;
	if (Object.is(original, value)) {
		pending.delete(id);
	} else {
		pending.set(id, value);
	}
	document.getElementById("save").disabled = pending.size === 0;
	statusKey(pending.size === 0 ? "dashboard.ui.noChanges" : "dashboard.ui.unsavedChanges");
	updateSettingDescription(id);
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
			labelName.textContent = message("dashboard.setting." + setting.id) || setting.label;
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

function renderLocaleSelector() {
	const select = document.getElementById("dashboard-language");
	select.textContent = "";
	for (const locale of availableLocales) {
		const option = document.createElement("option");
		option.value = locale;
		option.textContent = dashboardLocales.names[locale] ?? locale;
		option.selected = locale === currentLocale;
		select.appendChild(option);
	}
}

function renderChrome() {
	document.documentElement.lang = currentLocale;
	document.getElementById("dashboard-title").textContent = message("dashboard.ui.title");
	const openMustflow = document.getElementById("open-mustflow");
	openMustflow.title = message("dashboard.ui.openMustflow");
	openMustflow.setAttribute("aria-label", message("dashboard.ui.openMustflow"));
	document.getElementById("dashboard-language-label").textContent = message("dashboard.ui.language");
	document.getElementById("reload").textContent = message("dashboard.ui.reload");
	document.getElementById("save").textContent = message("dashboard.ui.save");
	renderStatus();
}

async function openMustflowFolder() {
	const response = await fetch("/api/open-mustflow", {
		method: "POST",
		headers: { "x-mustflow-dashboard-token": dashboardToken }
	});
	if (!response.ok) throw new Error(await response.text());
	statusKey("dashboard.ui.openedMustflow", "ok");
}

async function loadSnapshot() {
	const response = await fetch("/api/preferences", {
		headers: { "x-mustflow-dashboard-token": dashboardToken }
	});
	if (!response.ok) throw new Error(await response.text());
	snapshot = await response.json();
	pending = new Map();
	document.getElementById("save").disabled = true;
	statusKey("dashboard.ui.reloaded", "ok");
	render();
}

async function save() {
	const updates = Array.from(pending, ([id, value]) => ({ id, value }));
	const response = await fetch("/api/preferences", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-mustflow-dashboard-token": dashboardToken
		},
		body: JSON.stringify({ updates })
	});
	if (!response.ok) throw new Error(await response.text());
	snapshot = await response.json();
	pending = new Map();
	document.getElementById("save").disabled = true;
	statusKey("dashboard.ui.saved", "ok");
	render();
}

document.getElementById("dashboard-language").addEventListener("change", (event) => {
	currentLocale = event.target.value;
	window.localStorage.setItem("mustflow.dashboard.language", currentLocale);
	renderLocaleSelector();
	renderChrome();
	render();
});

document.getElementById("reload").addEventListener("click", () => {
	loadSnapshot().catch((error) => statusText(error.message, "error"));
});
document.getElementById("save").addEventListener("click", () => {
	save().catch((error) => statusText(error.message, "error"));
});
document.getElementById("open-mustflow").addEventListener("click", () => {
	openMustflowFolder().catch((error) => statusText(error.message, "error"));
});
renderLocaleSelector();
renderChrome();
render();
</script>
</body>
</html>`;
}
