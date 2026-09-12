// Inline tab renderers share dashboardStatus, settings, locale and clipboard UI helpers.
export const dashboardReleaseUpdateScript = `async function copyReleaseCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.release.copied", "ok");
}

async function copyUpdateCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.update.copied", "ok");
}

function findIntent(name) {
	return dashboardStatus.command_contract.intents.find((intent) => intent.name === name);
}

function renderReleaseCommand(root, intentName, fallbackCommand, reasonKey) {
	const intent = findIntent(intentName);
	const row = document.createElement("div");
	row.className = "verification-row";
	const summary = document.createElement("div");
	const name = document.createElement("div");
	name.className = "command-name";
	name.textContent = intentName;
	const state = document.createElement("div");
	const runnable = intent ? intent.runnable : false;
	state.className = runnable ? "command-state ok" : "command-state warn";
	state.textContent = runnable ? message("dashboard.commands.runnable") : message("dashboard.verification.unavailable");
	summary.appendChild(name);
	summary.appendChild(state);

	const details = document.createElement("div");
	const command = document.createElement("div");
	command.className = "verification-command";
	command.textContent = fallbackCommand;
	const reason = document.createElement("div");
	reason.className = "command-note";
	reason.textContent = message(reasonKey);
	details.appendChild(command);
	details.appendChild(reason);

	const copy = document.createElement("button");
	copy.type = "button";
	copy.className = "verification-copy";
	const copyLabel = copyCommandLabel(fallbackCommand);
	setButtonAccessibleLabel(copy, copyLabel);
	copy.disabled = !runnable;
	copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
	copy.addEventListener("click", () => {
		copyReleaseCommand(fallbackCommand)
			.then(() => showCopyButtonFeedback(copy, copyLabel))
			.catch((error) => statusText(error.message, "error"));
	});

	row.appendChild(summary);
	row.appendChild(details);
	row.appendChild(copy);
	root.appendChild(row);
}

function renderReleasePanel() {
	const root = document.getElementById("dashboard-release");
	root.textContent = "";
	const overview = document.createElement("section");
	const overviewHeading = document.createElement("h2");
	overviewHeading.textContent = message("dashboard.release.overview");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.release.packageVersion", dashboardStatus.release.package_name + " " + dashboardStatus.release.package_version);
	appendStatusItem(grid, "dashboard.release.templateVersion", dashboardStatus.template ? dashboardStatus.template.id + " " + dashboardStatus.template.version : message("value.none"));
	appendStatusItem(grid, "dashboard.release.autoBump", formatBoolean(Boolean(settingValue("release.versioning.auto_bump"))), settingValue("release.versioning.auto_bump") ? "ok" : "");
	appendStatusItem(grid, "dashboard.release.requireConfirmation", formatBoolean(Boolean(settingValue("release.versioning.require_user_confirmation"))));
	appendStatusItem(grid, "dashboard.release.changedFiles", String(dashboardStatus.release.release_sensitive_changed_files.length), dashboardStatus.release.release_sensitive_changed_files.length === 0 ? "ok" : "warn");
	overview.appendChild(overviewHeading);
	overview.appendChild(grid);
	root.appendChild(overview);

	const sources = document.createElement("section");
	const sourcesHeading = document.createElement("h2");
	sourcesHeading.textContent = message("dashboard.release.versionSources");
	sources.appendChild(sourcesHeading);
	if (dashboardStatus.release.version_sources.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.release.noVersionSources");
		sources.appendChild(empty);
	} else {
		for (const source of dashboardStatus.release.version_sources) {
			const row = document.createElement("div");
			row.className = "command-row";
			const summary = document.createElement("div");
			const name = document.createElement("div");
			name.className = "command-name";
			name.textContent = source.path;
			const state = document.createElement("div");
			state.className = "command-state";
			state.textContent = source.kind;
			summary.appendChild(name);
			summary.appendChild(state);
			const details = document.createElement("div");
			const meta = document.createElement("div");
			meta.className = "command-meta";
			appendCommandMeta(meta, "dashboard.release.declared", source.declared ? message("dashboard.status.yes") : message("dashboard.status.no"));
			appendCommandMeta(meta, "dashboard.release.authority", source.authority || message("value.none"));
			details.appendChild(meta);
			row.appendChild(summary);
			row.appendChild(details);
			sources.appendChild(row);
		}
	}
	root.appendChild(sources);

	const changed = document.createElement("section");
	const changedHeading = document.createElement("h2");
	changedHeading.textContent = message("dashboard.release.changedFiles");
	changed.appendChild(changedHeading);
	if (dashboardStatus.release.release_sensitive_changed_files.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.release.noChangedFiles");
		changed.appendChild(empty);
	} else {
		const list = document.createElement("ul");
		list.className = "issue-list";
		for (const file of dashboardStatus.release.release_sensitive_changed_files) {
			const item = document.createElement("li");
			item.textContent = file;
			list.appendChild(item);
		}
		changed.appendChild(list);
	}
	root.appendChild(changed);

	const commands = document.createElement("section");
	const commandsHeading = document.createElement("h2");
	commandsHeading.textContent = message("dashboard.release.commands");
	commands.appendChild(commandsHeading);
	renderReleaseCommand(commands, "version_check", "mf version --check", "dashboard.release.reason.versionCheck");
	renderReleaseCommand(commands, "test_release", "mf run test_release", "dashboard.release.reason.testRelease");
	renderReleaseCommand(commands, "docs_validate", "mf run docs_validate", "dashboard.release.reason.docsValidate");
	root.appendChild(commands);
}

function renderUpdateCommand(root, command, labelKey, reasonKey, enabled = true) {
	const row = document.createElement("div");
	row.className = "verification-row";
	const summary = document.createElement("div");
	const name = document.createElement("div");
	name.className = "command-name";
	name.textContent = message(labelKey);
	const state = document.createElement("div");
	state.className = enabled ? "command-state ok" : "command-state warn";
	state.textContent = enabled ? message("dashboard.commands.runnable") : message("dashboard.update.blocked");
	summary.appendChild(name);
	summary.appendChild(state);

	const details = document.createElement("div");
	const commandText = document.createElement("div");
	commandText.className = "verification-command";
	commandText.textContent = command;
	const reason = document.createElement("div");
	reason.className = "command-note";
	reason.textContent = message(reasonKey);
	details.appendChild(commandText);
	details.appendChild(reason);

	const copy = document.createElement("button");
	copy.type = "button";
	copy.className = "verification-copy";
	const copyLabel = copyCommandLabel(command);
	setButtonAccessibleLabel(copy, copyLabel);
	copy.disabled = !enabled;
	copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
	copy.addEventListener("click", () => {
		copyUpdateCommand(command)
			.then(() => showCopyButtonFeedback(copy, copyLabel))
			.catch((error) => statusText(error.message, "error"));
	});

	row.appendChild(summary);
	row.appendChild(details);
	row.appendChild(copy);
	root.appendChild(row);
}

function renderUpdateItem(root, item) {
	const row = document.createElement("div");
	row.className = "command-row";
	const summary = document.createElement("div");
	const name = document.createElement("div");
	name.className = "command-name";
	name.textContent = item.relativePath;
	const state = document.createElement("div");
	state.className = item.action === "create" || item.action === "update" ? "command-state ok" : "command-state warn";
	state.textContent = message("dashboard.update.action." + item.action);
	summary.appendChild(name);
	summary.appendChild(state);

	const details = document.createElement("div");
	const meta = document.createElement("div");
	meta.className = "command-meta";
	appendCommandMeta(meta, "dashboard.update.source", item.sourceKind);
	const reason = document.createElement("div");
	reason.className = "command-note";
	reason.textContent = message("dashboard.update.reason") + ": " + item.reason;
	details.appendChild(meta);
	details.appendChild(reason);

	row.appendChild(summary);
	row.appendChild(details);
	root.appendChild(row);
}

function renderUpdateItemList(root, titleKey, emptyKey, items) {
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message(titleKey);
	section.appendChild(heading);
	if (items.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message(emptyKey);
		section.appendChild(empty);
	} else {
		for (const item of items) renderUpdateItem(section, item);
	}
	root.appendChild(section);
}

function renderUpdatePanel() {
	const root = document.getElementById("dashboard-update");
	root.textContent = "";
	const update = dashboardStatus.update;

	const overview = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.update.overview");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.update.dryRun", update.ok ? message("dashboard.status.yes") : message("dashboard.status.no"), update.ok ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.applyReady", update.apply_ready ? message("dashboard.status.yes") : message("dashboard.status.no"), update.apply_ready ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.wouldUpdate", String(update.summary.wouldUpdate));
	appendStatusItem(grid, "dashboard.update.wouldCreate", String(update.summary.wouldCreate));
	appendStatusItem(grid, "dashboard.update.wouldRemove", String(update.summary.wouldRemove));
	appendStatusItem(grid, "dashboard.update.blockedLocalChanges", String(update.summary.blockedLocalChanges), update.summary.blockedLocalChanges === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.manualReview", String(update.summary.manualReview), update.summary.manualReview === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.unchanged", String(update.summary.unchanged));
	overview.appendChild(heading);
	overview.appendChild(grid);
	if (update.error) {
		const error = document.createElement("div");
		error.className = "command-note";
		error.textContent = message("dashboard.update.error") + ": " + update.error;
		overview.appendChild(error);
	}
	root.appendChild(overview);

	const commands = document.createElement("section");
	const commandsHeading = document.createElement("h2");
	commandsHeading.textContent = message("dashboard.update.commands");
	commands.appendChild(commandsHeading);
	renderUpdateCommand(commands, update.dry_run_command, "dashboard.update.command.dryRun", "dashboard.update.reason.dryRun", update.ok);
	renderUpdateCommand(commands, update.apply_command, "dashboard.update.command.apply", "dashboard.update.reason.apply", update.ok && update.apply_ready);
	root.appendChild(commands);

	renderUpdateItemList(root, "dashboard.update.blockers", "dashboard.update.noBlockers", update.blockers);
	renderUpdateItemList(root, "dashboard.update.changes", "dashboard.update.noChanges", update.changes);
}`;
