export function renderDashboardStyles(): string {
	return `:root {
	color-scheme: light dark;
	--bg: #101216;
	--panel: #181b21;
	--line: #2a2f3a;
	--text: #eef1f7;
	--muted: #aeb6c5;
	--accent: #8fb4ff;
	--danger: #ff9a9a;
	--ok: #9be7ba;
	--row-bg: rgba(255, 255, 255, 0.018);
	--row-bg-alt: rgba(255, 255, 255, 0.035);
	--status-neutral-bg: rgba(174, 182, 197, 0.1);
	--status-ok-bg: rgba(155, 231, 186, 0.1);
	--status-warn-bg: rgba(255, 154, 154, 0.1);
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
.tabs {
	display: flex;
	gap: 8px;
	margin-bottom: 14px;
	overflow-x: auto;
}
.tab {
	border-color: transparent;
	min-width: 110px;
}
.tab[aria-selected="true"] {
	background: var(--panel);
	border-color: var(--line);
}
.tab-panel[hidden] {
	display: none;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
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
.last-updated {
	color: var(--muted);
	font-size: 13px;
	white-space: nowrap;
}
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
.settings-pending {
	border: 1px solid var(--line);
	border-radius: 6px;
	margin-bottom: 14px;
	padding: 10px 12px;
}
.settings-pending[hidden] {
	display: none;
}
.settings-pending-header {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	justify-content: space-between;
}
.settings-pending-title {
	color: var(--text);
	font-size: 15px;
	font-weight: 650;
}
.settings-pending-list {
	color: var(--muted);
	font-size: 13px;
	line-height: 1.45;
	margin: 8px 0 0;
	padding-left: 18px;
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
.status-grid {
	display: grid;
	gap: 8px;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}
.status-item {
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 4px;
	padding: 8px 0;
}
.status-label {
	color: var(--muted);
	font-size: 13px;
}
.status-value {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	font-size: 15px;
	overflow-wrap: anywhere;
}
.status-value.ok { color: var(--ok); }
.status-value.warn { color: var(--danger); }
.status-badge {
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--text);
	display: inline-flex;
	font-size: 12px;
	font-weight: 650;
	line-height: 1;
	padding: 3px 7px;
	white-space: nowrap;
}
.status-badge.ok {
	border-color: rgba(155, 231, 186, 0.55);
	color: var(--ok);
}
.status-badge.warn {
	border-color: rgba(255, 154, 154, 0.55);
	color: var(--danger);
}
.next-actions {
	display: grid;
	gap: 0;
}
.next-action-row {
	align-items: center;
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(0, 1fr) auto;
	padding: 8px 0;
}
.next-action-title {
	font-size: 15px;
	font-weight: 650;
	overflow-wrap: anywhere;
}
.next-action-meta {
	color: var(--muted);
	font-size: 13px;
	margin-top: 2px;
	overflow-wrap: anywhere;
}
.next-action-row button {
	min-height: 34px;
	padding: 0 10px;
}
.issue-list {
	margin: 0;
	padding-left: 18px;
}
.issue-list li {
	margin: 4px 0;
	overflow-wrap: anywhere;
}
.command-row {
	align-items: start;
	background: var(--row-bg);
	border-bottom: 1px solid var(--line);
	border-radius: 6px;
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(160px, 220px) 1fr;
	margin-bottom: 6px;
	padding: 10px;
}
.command-row:nth-of-type(even) {
	background: var(--row-bg-alt);
}
.command-name {
	font-weight: 650;
	overflow-wrap: anywhere;
}
.command-state {
	align-items: center;
	background: var(--status-neutral-bg);
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--muted);
	display: inline-flex;
	font-size: 13px;
	font-weight: 650;
	line-height: 1;
	margin-top: 4px;
	padding: 4px 7px;
	white-space: nowrap;
}
.command-state.ok {
	background: var(--status-ok-bg);
	border-color: rgba(155, 231, 186, 0.55);
	color: var(--ok);
}
.command-state.warn {
	background: var(--status-warn-bg);
	border-color: rgba(255, 154, 154, 0.55);
	color: var(--danger);
}
.command-description {
	font-size: 15px;
	overflow-wrap: anywhere;
}
.command-meta {
	color: var(--muted);
	display: flex;
	flex-wrap: wrap;
	font-size: 13px;
	gap: 8px 14px;
	margin-top: 6px;
}
.command-note {
	color: var(--muted);
	font-size: 13px;
	margin-top: 6px;
	overflow-wrap: anywhere;
}
.collapsible-details {
	border-top: 1px solid var(--line);
	padding: 10px 0;
}
.collapsible-details > summary {
	color: var(--muted);
	cursor: pointer;
	font-size: 15px;
	font-weight: 650;
	overflow-wrap: anywhere;
}
.collapsible-details > summary:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}
.collapsible-details[open] > summary {
	color: var(--text);
	margin-bottom: 8px;
}
.verification-row {
	align-items: start;
	background: var(--row-bg);
	border-bottom: 1px solid var(--line);
	border-radius: 6px;
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(160px, 220px) 1fr auto;
	margin-bottom: 6px;
	padding: 10px;
}
.verification-row:nth-of-type(even) {
	background: var(--row-bg-alt);
}
.verification-command {
	font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
	font-size: 14px;
	overflow-wrap: anywhere;
}
.verification-files {
	color: var(--muted);
	font-size: 13px;
	margin-top: 6px;
	overflow-wrap: anywhere;
}
.verification-copy {
	min-height: 34px;
	padding: 0 10px;
}
.list-filters {
	align-items: end;
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(180px, 1fr) minmax(130px, 190px);
	margin: 0 0 12px;
}
.list-filters label {
	display: grid;
	gap: 5px;
}
.list-filters span {
	color: var(--muted);
	font-size: 13px;
}
.doc-controls {
	display: grid;
	gap: 10px;
	margin-bottom: 14px;
}
.doc-filter-controls,
.doc-review-controls {
	align-items: end;
	display: grid;
	gap: 10px;
}
.doc-filter-controls {
	grid-template-columns: minmax(130px, 160px) minmax(180px, 1fr);
}
.doc-review-controls {
	grid-template-columns: minmax(130px, 170px) minmax(160px, 1fr) minmax(180px, 1fr);
}
.doc-controls label,
.doc-control-group-label {
	display: grid;
	gap: 5px;
}
.doc-controls span,
.doc-control-group-label {
	color: var(--muted);
	font-size: 13px;
}
.doc-reviewer-state {
	color: var(--muted);
	font-size: 13px;
	margin-bottom: 10px;
}
.doc-reviewer-state.warn {
	color: var(--danger);
}
.doc-list {
	border-top: 1px solid var(--line);
}
.doc-row {
	align-items: start;
	background: var(--row-bg);
	border-bottom: 1px solid var(--line);
	border-radius: 6px;
	display: grid;
	gap: 12px;
	grid-template-columns: minmax(0, 1fr) minmax(90px, auto) auto;
	margin-bottom: 6px;
	padding: 10px;
}
.doc-row:nth-of-type(even) {
	background: var(--row-bg-alt);
}
.doc-path {
	font-size: 15px;
	overflow-wrap: anywhere;
}
.doc-meta {
	color: var(--muted);
	font-size: 13px;
	margin-top: 3px;
	overflow-wrap: anywhere;
}
.doc-comment {
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid var(--line);
	border-radius: 6px;
	color: var(--text);
	font: inherit;
	font-size: 13px;
	line-height: 1.45;
	margin: 8px 0 0;
	max-height: 180px;
	overflow: auto;
	padding: 8px;
	white-space: pre-wrap;
}
.doc-status {
	align-items: center;
	background: var(--status-neutral-bg);
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--muted);
	display: inline-flex;
	font-size: 13px;
	font-weight: 650;
	line-height: 1;
	padding: 4px 7px;
	white-space: nowrap;
}
.doc-status.approved {
	background: var(--status-ok-bg);
	border-color: rgba(155, 231, 186, 0.55);
	color: var(--ok);
}
.doc-status.needs_human {
	background: var(--status-warn-bg);
	border-color: rgba(255, 154, 154, 0.55);
	color: var(--danger);
}
.doc-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	justify-content: flex-end;
}
.doc-actions button {
	min-height: 34px;
	padding: 0 10px;
}
.empty {
	color: var(--muted);
	padding: 14px 0;
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
	.doc-controls,
	.doc-filter-controls,
	.doc-review-controls,
	.list-filters,
	.doc-row,
	.verification-row,
	.status-grid {
		grid-template-columns: 1fr;
	}
	.doc-actions {
		justify-content: flex-start;
	}
}`;
}
