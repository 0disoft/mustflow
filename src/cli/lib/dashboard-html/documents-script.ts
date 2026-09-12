// Inline fragments share the dashboard's browser scope; this module has no runtime imports.
export const dashboardDocumentsScript = `const docStatusFilters = ["active", "pending", "in_review", "changes_made", "needs_human", "approved", "ignored", "all"];
const reviewerKinds = ["human", "llm", "tool", "external"];

function docStatusQuery() {
	const value = document.getElementById("doc-status-filter").value;
	if (value === "active") return "";
	if (value === "all") return "?all=1";
	return "?status=" + encodeURIComponent(value);
}

async function loadDocuments() {
	return updateDashboardView("/api/docs/review" + docStatusQuery(), {}, (data) => {
		docReview = data;
		markDataUpdated();
		statusKey("dashboard.docs.reloaded", "ok");
		renderChrome();
		renderDocuments();
	});
}

async function markDocument(path, status) {
	const reviewerId = document.getElementById("doc-reviewer-id").value.trim();
	if (!reviewerId) {
		statusKey("dashboard.docs.missingReviewerId", "error");
		return;
	}

	return updateDashboardView("/api/docs/review" + docStatusQuery(), {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-mustflow-dashboard-token": dashboardToken
		},
		body: JSON.stringify({
			path,
			status,
			reviewerKind: document.getElementById("doc-reviewer-kind").value,
			reviewerId,
			summary: document.getElementById("doc-review-summary").value.trim()
		})
	}, (data) => {
		docReview = data;
		markDataUpdated();
		statusKey("dashboard.docs.updated", "ok");
		renderChrome();
		renderDocuments();
	});
}

function renderDocFilters() {
	const statusSelect = document.getElementById("doc-status-filter");
	const currentStatus = statusSelect.value || "active";
	statusSelect.textContent = "";
	for (const value of docStatusFilters) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = message("dashboard.docs.filter." + value);
		option.selected = value === currentStatus;
		statusSelect.appendChild(option);
	}

	const kindSelect = document.getElementById("doc-reviewer-kind");
	const currentKind = kindSelect.value || "human";
	kindSelect.textContent = "";
	for (const value of reviewerKinds) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = message("dashboard.docs.reviewerKind." + value);
		option.selected = value === currentKind;
		kindSelect.appendChild(option);
	}
}

function documentMatchesPathFilter(entry, query) {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;
	const path = String(entry.path || "");
	const fileName = path.split(/[\\\\/]/u).pop() || path;
	return path.toLowerCase().includes(normalizedQuery) || fileName.toLowerCase().includes(normalizedQuery);
}

function currentReviewerId() {
	return document.getElementById("doc-reviewer-id").value.trim();
}

function currentReviewerKind() {
	const value = document.getElementById("doc-reviewer-kind").value;
	return value || "human";
}

function renderDocumentReviewerState() {
	const element = document.getElementById("doc-reviewer-state");
	if (!element) return;
	const reviewerId = currentReviewerId();
	if (!reviewerId) {
		element.className = "doc-reviewer-state warn";
		element.textContent = message("dashboard.docs.reviewerStateMissing");
		return;
	}
	element.className = "doc-reviewer-state";
	element.textContent = messageFormat("dashboard.docs.reviewerState", {
		kind: message("dashboard.docs.reviewerKind." + currentReviewerKind()),
		id: reviewerId,
	});
}

function renderDocuments() {
	const root = document.getElementById("docs-review-list");
	root.textContent = "";
	renderDocumentReviewerState();

	if (docReview.documents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.docs.empty");
		root.appendChild(empty);
		return;
	}

	const pathFilter = document.getElementById("doc-path-filter").value;
	const documents = docReview.documents.filter((entry) => documentMatchesPathFilter(entry, pathFilter));
	if (documents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.docs.noSearchMatches");
		root.appendChild(empty);
		return;
	}

	for (const entry of documents) {
		const row = document.createElement("div");
		row.className = "doc-row";
		const details = document.createElement("div");
		const docPath = document.createElement("div");
		docPath.className = "doc-path";
		docPath.textContent = entry.path;
		const meta = document.createElement("div");
		meta.className = "doc-meta";
		meta.textContent = entry.reason;
		details.appendChild(docPath);
		details.appendChild(meta);
		if (entry.review_comment) {
			const comment = document.createElement("pre");
			comment.className = "doc-comment";
			comment.textContent = message("dashboard.docs.comment") + ":\\n" + entry.review_comment;
			details.appendChild(comment);
		}

		const status = document.createElement("div");
		status.className = "doc-status " + entry.status;
		status.textContent = message("dashboard.docs.status." + entry.status);

		const actions = document.createElement("div");
		actions.className = "doc-actions";
		const reviewerIdMissing = currentReviewerId().length === 0;
		for (const [nextStatus, labelKey, tooltipKey] of [
			["approved", "dashboard.docs.action.approve", "dashboard.docs.action.approve.tooltip"],
			["needs_human", "dashboard.docs.action.needsReview", "dashboard.docs.action.needsReview.tooltip"],
			["ignored", "dashboard.docs.action.ignore", "dashboard.docs.action.ignore.tooltip"]
		]) {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = message(labelKey);
			const alreadySelected = entry.status === nextStatus;
			const actionLabel = reviewerIdMissing
				? message("dashboard.docs.missingReviewerId")
				: alreadySelected
					? messageFormat("dashboard.docs.action.currentStatus", { status: message("dashboard.docs.status." + nextStatus) })
					: message(tooltipKey);
			button.title = actionLabel;
			button.setAttribute("aria-label", actionLabel);
			button.disabled = reviewerIdMissing || alreadySelected;
			button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
			button.addEventListener("click", () => {
				markDocument(entry.path, nextStatus).catch((error) => statusText(error.message, "error"));
			});
			actions.appendChild(button);
		}

		row.appendChild(details);
		row.appendChild(status);
		row.appendChild(actions);
		root.appendChild(row);
	}
}`;

export const dashboardDocumentEventsScript = `document.getElementById("doc-status-filter").addEventListener("change", () => {
	loadDocuments().catch((error) => statusText(error.message, "error"));
});
document.getElementById("doc-path-filter").addEventListener("input", () => {
	renderDocuments();
});
document.getElementById("doc-reviewer-id").addEventListener("input", () => {
	renderDocuments();
});
document.getElementById("doc-reviewer-kind").addEventListener("change", () => {
	renderDocuments();
});`;
