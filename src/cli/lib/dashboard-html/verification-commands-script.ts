// Browser renderers share dashboardStatus, listFilters and the common presentation helpers.
export const dashboardVerificationCommandsScript = `async function copyVerificationCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.verification.copied", "ok");
}

async function copyVerificationPlan(commands) {
	await navigator.clipboard.writeText(commands.join("\\n"));
	statusKey("dashboard.verification.planCopied", "ok");
}

function appendVerificationFiles(root, files) {
	if (files.length === 0) return;
	const details = document.createElement("div");
	details.className = "verification-files";
	details.textContent = message("dashboard.verification.files") + ": " + files.join(", ");
	root.appendChild(details);
}

function verificationStateMatches(recommendation) {
	const state = listFilters.verification.state;
	return state === "all" || (state === "runnable" && recommendation.runnable) || (state === "unavailable" && !recommendation.runnable);
}

function commandStateMatches(intent) {
	const state = listFilters.commands.state;
	return state === "all" || (state === "runnable" && intent.runnable) || (state === "unavailable" && !intent.runnable);
}

function renderVerificationPanel() {
	const root = document.getElementById("dashboard-verification");
	root.textContent = "";
	const verification = dashboardStatus.verification;

	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.verification.recommendations");
	section.appendChild(heading);

	if (verification.changed_files.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.verification.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	if (verification.recommendations.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.verification.none");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	section.appendChild(renderListFilters("verification", ["all", "runnable", "unavailable"], renderVerificationPanel));
	const recommendations = verification.recommendations.filter((recommendation) =>
		verificationStateMatches(recommendation) &&
		filterTextMatches(listFilters.verification.query, [
			recommendation.intent,
			recommendation.command,
			message(recommendation.reason_key),
			recommendation.files.join(" "),
		]),
	);

	if (recommendations.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.filter.noMatches");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const recommendation of recommendations) {
		const row = document.createElement("div");
		row.className = "verification-row";
		const summary = document.createElement("div");
		const name = document.createElement("div");
		name.className = "command-name";
		name.textContent = recommendation.intent;
		const state = document.createElement("div");
		state.className = recommendation.runnable ? "command-state ok" : "command-state warn";
		state.textContent = recommendation.runnable ? message("dashboard.commands.runnable") : message("dashboard.verification.unavailable");
		summary.appendChild(name);
		summary.appendChild(state);

		const details = document.createElement("div");
		const command = document.createElement("div");
		command.className = "verification-command";
		command.textContent = recommendation.command;
		const reason = document.createElement("div");
		reason.className = "command-note";
		reason.textContent = message(recommendation.reason_key);
		details.appendChild(command);
		details.appendChild(reason);
		appendVerificationFiles(details, recommendation.files);

		const copy = document.createElement("button");
		copy.type = "button";
		copy.className = "verification-copy";
		const copyLabel = copyCommandLabel(recommendation.command);
		setButtonAccessibleLabel(copy, copyLabel);
		copy.disabled = !recommendation.runnable;
		copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
		copy.addEventListener("click", () => {
			copyVerificationCommand(recommendation.command)
				.then(() => showCopyButtonFeedback(copy, copyLabel))
				.catch((error) => statusText(error.message, "error"));
		});

		row.appendChild(summary);
		row.appendChild(details);
		row.appendChild(copy);
		section.appendChild(row);
	}

	root.appendChild(section);

	if (verification.schedule.batches.length > 0) {
		const scheduleSection = document.createElement("section");
		const scheduleHeading = document.createElement("h2");
		scheduleHeading.textContent = message("dashboard.verification.schedule");
		scheduleSection.appendChild(scheduleHeading);
		const entriesByIntent = new Map(verification.schedule.entries.map((entry) => [entry.intent, entry]));
		const recommendedIntents = new Set(recommendations.map((recommendation) => recommendation.intent));
		const scheduleBatches = verification.schedule.batches
			.map((batch) => ({
				...batch,
				intents: batch.intents.filter((intent) => recommendedIntents.has(intent)),
				commands: batch.commands.filter((command) => recommendations.some((recommendation) => recommendation.command === command)),
			}))
			.filter((batch) => batch.intents.length > 0 || batch.commands.length > 0);
		const planCommands = scheduleBatches.flatMap((batch) => batch.commands);
		for (const batch of scheduleBatches) {
			const row = document.createElement("div");
			row.className = "verification-row";
			const summary = document.createElement("div");
			const name = document.createElement("div");
			name.className = "command-name";
			name.textContent = message("dashboard.verification.batch") + " " + batch.index;
			const state = document.createElement("div");
			state.className = "command-state ok";
			state.textContent = batch.locks.length > 0 ? message("dashboard.verification.locks") + ": " + batch.locks.join(", ") : message("dashboard.verification.noLocks");
			summary.appendChild(name);
			summary.appendChild(state);

			const details = document.createElement("div");
			const commands = document.createElement("div");
			commands.className = "verification-command";
			commands.textContent = batch.commands.join(" -> ");
			details.appendChild(commands);
			for (const intent of batch.intents) {
				const entry = entriesByIntent.get(intent);
				if (!entry) continue;
				const effects = document.createElement("div");
				effects.className = "verification-files";
				effects.textContent = message("dashboard.verification.effects") + ": " + entry.effects.map((effect) => effect.mode + " " + (effect.path || effect.lock) + " [" + effect.lock + "]").join(", ");
				details.appendChild(effects);
				if (entry.conflicts.length > 0) {
					const conflicts = document.createElement("div");
					conflicts.className = "command-note";
					conflicts.textContent = message("dashboard.verification.conflicts") + ": " + entry.conflicts.map((conflict) => conflict.intent + " (" + conflict.lock + ")").join(", ");
					details.appendChild(conflicts);
				}
			}

			const copy = document.createElement("button");
			copy.type = "button";
			copy.className = "verification-copy";
			const copyLabel = message("dashboard.a11y.copyVerificationPlan");
			setButtonAccessibleLabel(copy, copyLabel);
			copy.disabled = planCommands.length === 0;
			copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
			copy.addEventListener("click", () => {
				copyVerificationPlan(planCommands)
					.then(() => showCopyButtonFeedback(copy, copyLabel))
					.catch((error) => statusText(error.message, "error"));
			});

			row.appendChild(summary);
			row.appendChild(details);
			row.appendChild(copy);
			scheduleSection.appendChild(row);
		}
		root.appendChild(scheduleSection);
	}

	if (verification.skipped.length > 0) {
		const skippedSection = createCollapsibleDetails("dashboard.verification.skipped");
		for (const skipped of verification.skipped) {
			const row = document.createElement("div");
			row.className = "command-note";
			row.textContent = skipped.intent + ": " + message(skipped.reason_key);
			skippedSection.appendChild(row);
		}
		root.appendChild(skippedSection);
	}
}

function commandStateKey(intent) {
	if (intent.runnable) return "dashboard.commands.runnable";
	if (intent.status === "manual_only") return "dashboard.commands.manualOnly";
	if (intent.status === "unknown") return "dashboard.commands.unavailable";
	return "dashboard.commands.blocked";
}

function formatList(values) {
	return values.length === 0 ? message("value.none") : values.join(", ");
}

function formatCommandWriteLock(writeLock) {
	const paths = writeLock.paths.length === 0 ? message("value.none") : writeLock.paths.join(", ");
	return writeLock.lock + ": " + paths;
}

function formatCommandLockConflict(conflict) {
	const paths = conflict.conflicting_paths.length === 0 ? "" : " / " + conflict.conflicting_paths.join(", ");
	return conflict.intent + " (" + conflict.lock + ")" + paths;
}

function appendCommandEffectGraph(root, intent) {
	const graph = intent.effect_graph;
	if (!graph || graph.status !== "fresh") return;
	if (graph.write_locks.length === 0 && graph.lock_conflicts.length === 0) return;

	const details = createCollapsibleDetails("dashboard.commands.effectGraph");

	if (graph.write_locks.length > 0) {
		const locks = document.createElement("div");
		locks.className = "verification-files";
		locks.textContent = message("dashboard.commands.effectGraph") + ": " + graph.write_locks.map(formatCommandWriteLock).join(", ");
		details.appendChild(locks);
	}

	if (graph.lock_conflicts.length > 0) {
		const conflicts = document.createElement("div");
		conflicts.className = "command-note";
		conflicts.textContent = message("dashboard.verification.conflicts") + ": " + graph.lock_conflicts.map(formatCommandLockConflict).join(", ");
		details.appendChild(conflicts);
	}

	root.appendChild(details);
}

function renderCommandPanel() {
	const root = document.getElementById("dashboard-commands");
	root.textContent = "";
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.commands.heading");
	section.appendChild(heading);

	if (!dashboardStatus.command_contract.exists || dashboardStatus.command_contract.intents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.commands.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	const graphStatus = dashboardStatus.command_contract.effect_graph_status;
	if (graphStatus && graphStatus.status !== "fresh") {
		const note = document.createElement("div");
		note.className = "command-note";
		note.textContent =
			message("dashboard.commands.effectGraphUnavailable") +
			": " +
			(graphStatus.refresh_hint || graphStatus.status);
		section.appendChild(note);
	}

	section.appendChild(renderListFilters("commands", ["all", "runnable", "unavailable"], renderCommandPanel));
	const intents = dashboardStatus.command_contract.intents.filter((intent) =>
		commandStateMatches(intent) &&
		filterTextMatches(listFilters.commands.query, [
			intent.name,
			intent.description,
			intent.status,
			intent.lifecycle,
			intent.run_policy,
			intent.stdin,
			intent.cwd,
			intent.reason,
			intent.agent_action,
			intent.writes.join(" "),
			intent.required_after.join(" "),
		]),
	);

	if (intents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.filter.noMatches");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const intent of intents) {
		const row = document.createElement("div");
		row.className = "command-row";
		const summary = document.createElement("div");
		const name = document.createElement("div");
		name.className = "command-name";
		name.textContent = intent.name;
		const state = document.createElement("div");
		state.className = intent.runnable ? "command-state ok" : "command-state warn";
		state.textContent = message(commandStateKey(intent));
		summary.appendChild(name);
		summary.appendChild(state);

		const details = document.createElement("div");
		const description = document.createElement("div");
		description.className = "command-description";
		description.textContent = intent.description || message("value.none");
		const meta = document.createElement("div");
		meta.className = "command-meta";
		appendCommandMeta(meta, "dashboard.commands.status", intent.status);
		appendCommandMeta(meta, "dashboard.commands.lifecycle", intent.lifecycle);
		appendCommandMeta(meta, "dashboard.commands.runPolicy", intent.run_policy);
		appendCommandMeta(meta, "dashboard.commands.stdin", intent.stdin);
		appendCommandMeta(meta, "dashboard.commands.timeout", intent.timeout_seconds);
		appendCommandMeta(meta, "dashboard.commands.cwd", intent.cwd);
		appendCommandMeta(meta, "dashboard.commands.writes", formatList(intent.writes));
		details.appendChild(description);
		details.appendChild(meta);
		if (intent.reason) {
			const reason = document.createElement("div");
			reason.className = "command-note";
			reason.textContent = message("dashboard.commands.reason") + ": " + intent.reason;
			details.appendChild(reason);
		}
		if (intent.agent_action) {
			const action = document.createElement("div");
			action.className = "command-note";
			action.textContent = message("dashboard.commands.agentAction") + ": " + intent.agent_action;
			details.appendChild(action);
		}
		appendCommandEffectGraph(details, intent);

		row.appendChild(summary);
		row.appendChild(details);
		section.appendChild(row);
	}

	root.appendChild(section);
}`;
