import { dashboardRequestScript } from './request-script.js';
import { dashboardListUiScript } from './list-ui-script.js';
import { dashboardVerificationCommandsScript } from './verification-commands-script.js';
import { dashboardReleaseUpdateScript } from './release-update-script.js';
import { dashboardSettingsScript, dashboardSettingsEventsScript } from './settings-script.js';
import { dashboardDocumentsScript, dashboardDocumentEventsScript } from './documents-script.js';

export interface DashboardClientScriptOptions {
	readonly serializedSnapshot: string;
	readonly serializedToken: string;
	readonly serializedLocaleBundle: string;
	readonly serializedAvailableLocales: string;
	readonly serializedStatusSnapshot: string;
	readonly serializedDocReviewSnapshot: string;
}

export function renderDashboardClientScript(options: DashboardClientScriptOptions): string {
	const {
		serializedSnapshot,
		serializedToken,
		serializedLocaleBundle,
		serializedAvailableLocales,
		serializedStatusSnapshot,
		serializedDocReviewSnapshot,
	} = options;

	return `const initialSnapshot = ${serializedSnapshot};
const dashboardToken = ${serializedToken};
const dashboardLocales = ${serializedLocaleBundle};
const availableLocales = ${serializedAvailableLocales};
const initialStatusSnapshot = ${serializedStatusSnapshot};
const initialDocReview = ${serializedDocReviewSnapshot};
let snapshot = initialSnapshot;
let pending = new Map();
let currentLocale = resolveInitialLocale();
let statusState = { key: "dashboard.ui.noChanges", text: "", type: "" };
let currentTab = "status";
let dashboardStatus = initialStatusSnapshot;
let docReview = initialDocReview;
let lastUpdatedAt = new Date();
let loadingCount = 0;
${dashboardRequestScript}
const listFilters = {
	verification: { query: "", state: "all" },
	commands: { query: "", state: "all" },
	skills: { query: "", state: "all" }
};

${dashboardSettingsScript}
const copyFeedbackMs = 1500;
${dashboardDocumentsScript}

function resolveInitialLocale() {
	const stored = window.localStorage.getItem("mustflow.dashboard.language");
	if (availableLocales.includes(stored)) return stored;
	const browserLocale = (window.navigator.language || "").slice(0, 2).toLowerCase();
	return availableLocales.includes(browserLocale) ? browserLocale : "en";
}

function message(key) {
	return dashboardLocales.messages[currentLocale]?.[key] ?? dashboardLocales.messages.en[key] ?? key;
}

function messageWithTime(key, time) {
	return messageFormat(key, { time });
}

function messageWithCount(key, count) {
	return messageFormat(key, { count });
}

function messageFormat(key, values) {
	let text = message(key);
	for (const [name, value] of Object.entries(values)) {
		text = text.replaceAll("{" + name + "}", String(value));
	}
	return text;
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

function renderLastUpdated() {
	const element = document.getElementById("last-updated");
	const formatted = new Intl.DateTimeFormat(currentLocale, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).format(lastUpdatedAt);
	element.textContent = messageWithTime("dashboard.ui.lastUpdated", formatted);
}

function setLoading(loading) {
	loadingCount = Math.max(0, loadingCount + (loading ? 1 : -1));
	const isLoading = loadingCount > 0;
	const reload = document.getElementById("reload");
	document.body.setAttribute("aria-busy", isLoading ? "true" : "false");
	reload.disabled = isLoading;
	reload.setAttribute("aria-disabled", isLoading ? "true" : "false");
	if (isLoading) statusKey("dashboard.ui.loading");
}

function markDataUpdated() {
	lastUpdatedAt = new Date();
	renderLastUpdated();
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
	document.getElementById("tab-status").textContent = message("dashboard.tab.status");
	document.getElementById("tab-verification").textContent = message("dashboard.tab.verification") + " (" + dashboardStatus.verification.recommendations.length + ")";
	document.getElementById("tab-commands").textContent = message("dashboard.tab.commands");
	document.getElementById("tab-release").textContent = message("dashboard.tab.release");
	document.getElementById("tab-update").textContent = message("dashboard.tab.update") + " (" + (dashboardStatus.update.blockers.length + dashboardStatus.update.changes.length) + ")";
	document.getElementById("tab-runs").textContent = message("dashboard.tab.runs");
	document.getElementById("tab-skills").textContent = message("dashboard.tab.skills") + " (" + dashboardStatus.skills.count + ")";
	document.getElementById("tab-settings").textContent = message("dashboard.tab.settings");
	document.getElementById("tab-documents").textContent = message("dashboard.tab.documents") + " (" + docReview.count + ")";
	const openMustflow = document.getElementById("open-mustflow");
	openMustflow.title = message("dashboard.ui.openMustflow");
	openMustflow.setAttribute("aria-label", message("dashboard.ui.openMustflow"));
	document.getElementById("dashboard-language-label").textContent = message("dashboard.ui.language");
	document.getElementById("reload").textContent = message("dashboard.ui.reload");
	document.getElementById("save").textContent = message("dashboard.ui.save");
	document.getElementById("save").hidden = currentTab !== "settings";
	document.getElementById("doc-status-filter-label").textContent = message("dashboard.docs.statusFilter");
	document.getElementById("doc-path-filter-label").textContent = message("dashboard.docs.pathFilter");
	document.getElementById("doc-review-fields-label").textContent = message("dashboard.docs.reviewFields");
	document.getElementById("doc-reviewer-kind-label").textContent = message("dashboard.docs.reviewerKind");
	document.getElementById("doc-reviewer-id-label").textContent = message("dashboard.docs.reviewerId");
	document.getElementById("doc-review-summary-label").textContent = message("dashboard.docs.summary");
	document.getElementById("doc-path-filter").placeholder = message("dashboard.docs.pathFilterPlaceholder");
	document.getElementById("doc-reviewer-id").placeholder = message("dashboard.docs.reviewerIdPlaceholder");
	document.getElementById("doc-review-summary").placeholder = message("dashboard.docs.summaryPlaceholder");
	renderStatus();
	renderLastUpdated();
	renderDocumentReviewerState();
}

function renderTabState() {
	for (const tab of document.querySelectorAll(".tab")) {
		const selected = tab.dataset.tab === currentTab;
		tab.setAttribute("aria-selected", selected ? "true" : "false");
		tab.setAttribute("tabindex", selected ? "0" : "-1");
	}
	document.getElementById("panel-status").hidden = currentTab !== "status";
	document.getElementById("panel-verification").hidden = currentTab !== "verification";
	document.getElementById("panel-commands").hidden = currentTab !== "commands";
	document.getElementById("panel-release").hidden = currentTab !== "release";
	document.getElementById("panel-update").hidden = currentTab !== "update";
	document.getElementById("panel-runs").hidden = currentTab !== "runs";
	document.getElementById("panel-skills").hidden = currentTab !== "skills";
	document.getElementById("panel-settings").hidden = currentTab !== "settings";
	document.getElementById("panel-documents").hidden = currentTab !== "documents";
	renderChrome();
}

function loadCurrentTabData() {
	if (currentTab === "documents") return loadDocuments();
	if (currentTab === "settings") return Promise.resolve();
	return loadStatus();
}

function reloadCurrentTabData() {
	if (currentTab === "settings") return loadSnapshot();
	return loadCurrentTabData();
}

function activateTab(tabName, options = {}) {
	invalidateDashboardView();
	statusText("");
	currentTab = tabName;
	renderTabState();
	if (options.focus) {
		const selectedTab = Array.from(document.querySelectorAll(".tab")).find((tab) => tab.dataset.tab === currentTab);
		if (selectedTab) selectedTab.focus();
	}
	loadCurrentTabData().catch((error) => statusText(error.message, "error"));
}

function handleTabKeydown(event) {
	const tabs = Array.from(document.querySelectorAll(".tab"));
	const currentIndex = tabs.findIndex((tab) => tab === event.currentTarget);
	if (currentIndex < 0) return;

	let nextIndex = null;
	if (event.key === "ArrowRight" || event.key === "ArrowDown") {
		nextIndex = (currentIndex + 1) % tabs.length;
	} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
		nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
	} else if (event.key === "Home") {
		nextIndex = 0;
	} else if (event.key === "End") {
		nextIndex = tabs.length - 1;
	}

	if (nextIndex === null) return;
	event.preventDefault();
	activateTab(tabs[nextIndex].dataset.tab, { focus: true });
}

async function openMustflowFolder() {
	await requestDashboard("/api/open-mustflow", { method: "POST" }, undefined, "text");
	statusKey("dashboard.ui.openedMustflow", "ok");
}

async function loadStatus() {
	return updateDashboardView("/api/status", {}, (data) => {
		dashboardStatus = data;
		markDataUpdated();
		statusKey(
			currentTab === "commands"
				? "dashboard.commands.reloaded"
				: currentTab === "verification"
					? "dashboard.verification.reloaded"
				: currentTab === "release"
					? "dashboard.release.reloaded"
				: currentTab === "update"
					? "dashboard.update.reloaded"
				: currentTab === "runs"
					? "dashboard.runs.reloaded"
					: currentTab === "skills"
						? "dashboard.skills.reloaded"
						: "dashboard.status.reloaded",
			"ok"
		);
		renderStatusPanel();
		renderVerificationPanel();
		renderCommandPanel();
		renderReleasePanel();
		renderUpdatePanel();
		renderRunsPanel();
		renderSkillsPanel();
	});
}

function formatBoolean(value) {
	return message(value ? "dashboard.status.yes" : "dashboard.status.no");
}

function formatLatestRun(latestRun) {
	if (!latestRun.exists) return message("dashboard.status.latestRunMissing");
	if (!latestRun.valid) return message("dashboard.status.latestRunInvalid") + ": " + latestRun.error;
	const parts = [latestRun.intent, latestRun.status];
	if (latestRun.exit_code !== null) parts.push("exit " + latestRun.exit_code);
	if (latestRun.finished_at) parts.push(latestRun.finished_at);
	return parts.join(" / ");
}

function statusStateLabel(tone) {
	if (tone === "ok") return message("dashboard.a11y.state.ok");
	if (tone === "warn") return message("dashboard.a11y.state.warn");
	return message("dashboard.a11y.state.neutral");
}

function appendStatusItem(root, labelKey, value, tone = "") {
	const item = document.createElement("div");
	item.className = "status-item";
	const label = document.createElement("div");
	label.className = "status-label";
	label.textContent = message(labelKey);
	const content = document.createElement("div");
	content.className = tone ? "status-value " + tone : "status-value";
	if (tone) {
		const badge = document.createElement("span");
		badge.className = "status-badge " + tone;
		badge.textContent = statusStateLabel(tone);
		content.appendChild(badge);
		content.appendChild(document.createTextNode(value));
	} else {
		content.textContent = value;
	}
	content.setAttribute(
		"aria-label",
		message(labelKey) + ": " + value + " (" + statusStateLabel(tone) + ")"
	);
	item.appendChild(label);
	item.appendChild(content);
	root.appendChild(item);
}

function latestRunNeedsAttention(latestRun) {
	if (!latestRun.exists) return false;
	if (!latestRun.valid) return true;
	return latestRun.status !== "passed" || latestRun.timed_out;
}

function deriveDashboardActions() {
	const actions = [];
	if (dashboardStatus.missing_files.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.missingFiles", dashboardStatus.missing_files.length),
			meta: dashboardStatus.missing_files.slice(0, 2).join(", "),
			tab: "status",
			buttonKey: "dashboard.actions.openStatus"
		});
	}
	if (dashboardStatus.issues.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.manifestIssues", dashboardStatus.issues.length),
			meta: dashboardStatus.issues[0],
			tab: "status",
			buttonKey: "dashboard.actions.openStatus"
		});
	}
	if (latestRunNeedsAttention(dashboardStatus.latest_run)) {
		actions.push({
			title: message("dashboard.actions.latestRun"),
			meta: formatLatestRun(dashboardStatus.latest_run),
			tab: "runs",
			buttonKey: "dashboard.actions.openRuns"
		});
	}
	if (dashboardStatus.update.blockers.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.updateBlockers", dashboardStatus.update.blockers.length),
			meta: dashboardStatus.update.blockers[0].relativePath,
			tab: "update",
			buttonKey: "dashboard.actions.openUpdate"
		});
	}
	if (dashboardStatus.verification.recommendations.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.verification", dashboardStatus.verification.recommendations.length),
			meta: dashboardStatus.verification.recommendations.map((recommendation) => recommendation.intent).slice(0, 3).join(", "),
			tab: "verification",
			buttonKey: "dashboard.actions.openVerification"
		});
	}
	if (dashboardStatus.active_review_documents > 0 || docReview.count > 0) {
		const count = Math.max(dashboardStatus.active_review_documents, docReview.count);
		actions.push({
			title: messageWithCount("dashboard.actions.documents", count),
			meta: docReview.items?.[0]?.path || "",
			tab: "documents",
			buttonKey: "dashboard.actions.openDocuments"
		});
	}
	return actions.slice(0, 5);
}

function renderNextActions(root) {
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.actions.heading");
	section.appendChild(heading);
	const actions = deriveDashboardActions();
	if (actions.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.actions.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}
	const list = document.createElement("div");
	list.className = "next-actions";
	for (const action of actions) {
		const row = document.createElement("div");
		row.className = "next-action-row";
		const body = document.createElement("div");
		const title = document.createElement("div");
		title.className = "next-action-title";
		title.textContent = action.title;
		body.appendChild(title);
		if (action.meta) {
			const meta = document.createElement("div");
			meta.className = "next-action-meta";
			meta.textContent = action.meta;
			body.appendChild(meta);
		}
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = message(action.buttonKey);
		button.addEventListener("click", () => activateTab(action.tab, { focus: true }));
		row.appendChild(body);
		row.appendChild(button);
		list.appendChild(row);
	}
	section.appendChild(list);
	root.appendChild(section);
}

function renderStatusPanel() {
	const root = document.getElementById("dashboard-status");
	root.textContent = "";
	renderNextActions(root);
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.status.overview");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	const hasIssues = dashboardStatus.issues.length > 0 || dashboardStatus.changed_files.length > 0 || dashboardStatus.missing_files.length > 0;
	appendStatusItem(grid, "dashboard.status.installed", formatBoolean(dashboardStatus.installed), dashboardStatus.installed ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.manifestLock", dashboardStatus.manifest_lock, dashboardStatus.manifest_lock === "present" ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.template", dashboardStatus.template ? dashboardStatus.template.id + " " + dashboardStatus.template.version : message("value.none"));
	appendStatusItem(grid, "dashboard.status.trackedFiles", String(dashboardStatus.tracked_files));
	appendStatusItem(grid, "dashboard.status.changedFiles", String(dashboardStatus.changed_files.length), dashboardStatus.changed_files.length === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.missingFiles", String(dashboardStatus.missing_files.length), dashboardStatus.missing_files.length === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.runnableIntents", String(dashboardStatus.runnable_intents.length));
	appendStatusItem(grid, "dashboard.status.activeReviewDocuments", String(dashboardStatus.active_review_documents));
	appendStatusItem(grid, "dashboard.status.latestRun", formatLatestRun(dashboardStatus.latest_run), dashboardStatus.latest_run.exists && dashboardStatus.latest_run.valid ? "ok" : "");
	section.appendChild(heading);
	section.appendChild(grid);
	root.appendChild(section);

	const issuesSection = document.createElement("section");
	const issuesHeading = document.createElement("h2");
	issuesHeading.textContent = message("dashboard.status.issues");
	issuesSection.appendChild(issuesHeading);
	if (!hasIssues) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.status.noIssues");
		issuesSection.appendChild(empty);
	} else {
		const list = document.createElement("ul");
		list.className = "issue-list";
		for (const issue of dashboardStatus.issues) {
			const item = document.createElement("li");
			item.textContent = issue;
			list.appendChild(item);
		}
		for (const changed of dashboardStatus.changed_files) {
			const item = document.createElement("li");
			item.textContent = message("dashboard.status.changedFile") + ": " + changed;
			list.appendChild(item);
		}
		for (const missing of dashboardStatus.missing_files) {
			const item = document.createElement("li");
			item.textContent = message("dashboard.status.missingFile") + ": " + missing;
			list.appendChild(item);
		}
		issuesSection.appendChild(list);
	}
	root.appendChild(issuesSection);
}

function skillRouteState(route) {
	if (!route.exists) return "missing";
	return route.aligned ? "aligned" : "mismatch";
}

function skillStateMatches(route) {
	const state = listFilters.skills.state;
	return state === "all" || skillRouteState(route) === state;
}

${dashboardListUiScript}
${dashboardVerificationCommandsScript}
${dashboardReleaseUpdateScript}

function formatDuration(value) {
	if (typeof value !== "number") return message("value.none");
	if (value < 1000) return String(value) + " ms";
	return (value / 1000).toFixed(2) + " s";
}

function renderRunOutput(root, titleKey, output) {
	const section = createCollapsibleDetails(titleKey);
	const meta = document.createElement("div");
	meta.className = "command-meta";
	appendCommandMeta(meta, "dashboard.runs.bytes", output.bytes);
	appendCommandMeta(meta, "dashboard.runs.truncated", formatBoolean(output.truncated));
	section.appendChild(meta);
	if (output.tail) {
		const pre = document.createElement("pre");
		pre.className = "doc-comment";
		pre.textContent = output.tail;
		section.appendChild(pre);
	} else {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.runs.emptyOutput");
		section.appendChild(empty);
	}
	root.appendChild(section);
}

function renderRunsPanel() {
	const root = document.getElementById("dashboard-runs");
	root.textContent = "";
	const run = dashboardStatus.run_history;

	const overview = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.runs.heading");
	overview.appendChild(heading);

	if (!run.exists) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.runs.empty");
		overview.appendChild(empty);
		root.appendChild(overview);
		return;
	}

	if (!run.valid) {
		const error = document.createElement("div");
		error.className = "command-note";
		error.textContent = message("dashboard.runs.invalid") + ": " + run.error;
		overview.appendChild(error);
		root.appendChild(overview);
		return;
	}

	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.runs.intent", run.intent);
	appendStatusItem(grid, "dashboard.runs.status", run.status, run.status === "passed" ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.runs.exitCode", run.exit_code === null ? message("value.none") : String(run.exit_code));
	appendStatusItem(grid, "dashboard.runs.timedOut", formatBoolean(run.timed_out), run.timed_out ? "warn" : "ok");
	appendStatusItem(grid, "dashboard.runs.startedAt", run.started_at || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.finishedAt", run.finished_at || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.duration", formatDuration(run.duration_ms));
	appendStatusItem(grid, "dashboard.runs.cwd", run.cwd || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.mode", run.mode || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.timeout", String(run.timeout_seconds));
	appendStatusItem(grid, "dashboard.runs.receiptPath", run.receipt_path || run.path);
	overview.appendChild(grid);

	const meta = document.createElement("div");
	meta.className = "command-meta";
	appendCommandMeta(meta, "dashboard.runs.lifecycle", run.lifecycle);
	appendCommandMeta(meta, "dashboard.runs.runPolicy", run.run_policy);
	appendCommandMeta(meta, "dashboard.runs.successExitCodes", formatList(run.success_exit_codes.map(String)));
	appendCommandMeta(meta, "dashboard.runs.signal", run.signal || message("value.none"));
	appendCommandMeta(meta, "dashboard.runs.killMethod", run.kill_method || message("value.none"));
	overview.appendChild(meta);

	if (run.command_line.length > 0) {
		const command = document.createElement("div");
		command.className = "verification-command";
		command.textContent = run.command_line.join(" ");
		overview.appendChild(command);
	}

	if (run.error) {
		const error = document.createElement("div");
		error.className = "command-note";
		error.textContent = message("dashboard.runs.error") + ": " + run.error;
		overview.appendChild(error);
	}

	root.appendChild(overview);
	renderRunOutput(root, "dashboard.runs.stdout", run.stdout);
	renderRunOutput(root, "dashboard.runs.stderr", run.stderr);
}

function skillAlignmentKey(route) {
	if (!route.exists) return "dashboard.skills.missing";
	return route.aligned ? "dashboard.skills.aligned" : "dashboard.skills.mismatch";
}

function renderSkillsPanel() {
	const root = document.getElementById("dashboard-skills");
	root.textContent = "";
	const overview = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.skills.heading");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.skills.indexPath", dashboardStatus.skills.index_path);
	appendStatusItem(grid, "dashboard.skills.routes", String(dashboardStatus.skills.count));
	overview.appendChild(heading);
	overview.appendChild(grid);
	root.appendChild(overview);

	const section = document.createElement("section");
	const routesHeading = document.createElement("h2");
	routesHeading.textContent = message("dashboard.skills.routes");
	section.appendChild(routesHeading);

	if (!dashboardStatus.skills.exists || dashboardStatus.skills.routes.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.skills.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	section.appendChild(renderListFilters("skills", ["all", "aligned", "mismatch", "missing"], renderSkillsPanel));
	const routes = dashboardStatus.skills.routes.filter((route) =>
		skillStateMatches(route) &&
		filterTextMatches(listFilters.skills.query, [
			route.skill,
			route.trigger,
			route.skill_path,
			route.required_input,
			route.edit_scope,
			route.risk,
			route.expected_output,
			route.verification_intents.join(" "),
			route.declared_command_intents.join(" "),
		]),
	);

	if (routes.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.filter.noMatches");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const route of routes) {
		const row = document.createElement("div");
		row.className = "command-row";
		const summary = document.createElement("div");
		const name = document.createElement("div");
		name.className = "command-name";
		name.textContent = route.skill;
		const state = document.createElement("div");
		state.className = route.exists && route.aligned ? "command-state ok" : "command-state warn";
		state.textContent = message(skillAlignmentKey(route));
		summary.appendChild(name);
		summary.appendChild(state);

		const details = document.createElement("div");
		const trigger = document.createElement("div");
		trigger.className = "command-description";
		trigger.textContent = route.trigger;
		const meta = document.createElement("div");
		meta.className = "command-meta";
		appendCommandMeta(meta, "dashboard.skills.path", route.skill_path);
		appendCommandMeta(meta, "dashboard.skills.requiredInput", route.required_input);
		appendCommandMeta(meta, "dashboard.skills.editScope", route.edit_scope);
		appendCommandMeta(meta, "dashboard.skills.risk", route.risk);
		appendCommandMeta(meta, "dashboard.skills.verificationIntents", formatList(route.verification_intents));
		appendCommandMeta(meta, "dashboard.skills.declaredCommandIntents", formatList(route.declared_command_intents));
		details.appendChild(trigger);
		details.appendChild(meta);
		if (route.expected_output) {
			const output = document.createElement("div");
			output.className = "command-note";
			output.textContent = message("dashboard.skills.expectedOutput") + ": " + route.expected_output;
			details.appendChild(output);
		}

		row.appendChild(summary);
		row.appendChild(details);
		section.appendChild(row);
	}

	root.appendChild(section);
}

document.getElementById("dashboard-language").addEventListener("change", (event) => {
	currentLocale = event.target.value;
	window.localStorage.setItem("mustflow.dashboard.language", currentLocale);
	renderLocaleSelector();
	renderChrome();
	renderDocFilters();
	renderStatusPanel();
	renderVerificationPanel();
	renderCommandPanel();
	renderReleasePanel();
	renderUpdatePanel();
	renderRunsPanel();
	renderSkillsPanel();
	render();
	renderDocuments();
});

document.getElementById("reload").addEventListener("click", () => {
	reloadCurrentTabData().catch((error) => statusText(error.message, "error"));
});
${dashboardSettingsEventsScript}
document.getElementById("open-mustflow").addEventListener("click", () => {
	openMustflowFolder().catch((error) => statusText(error.message, "error"));
});
${dashboardDocumentEventsScript}
for (const tab of document.querySelectorAll(".tab")) {
	tab.addEventListener("click", () => {
		activateTab(tab.dataset.tab);
	});
	tab.addEventListener("keydown", handleTabKeydown);
}
renderLocaleSelector();
renderDocFilters();
renderChrome();
renderTabState();
renderStatusPanel();
renderVerificationPanel();
renderCommandPanel();
renderReleasePanel();
renderUpdatePanel();
renderRunsPanel();
renderSkillsPanel();
render();
renderDocuments();`;
}
