# Dashboard HTML Modules

This directory contains the build-free pieces used by `../dashboard-html.ts`.

- `template.ts` owns the server-rendered HTML shell and public `renderDashboardHtml` function.
- `styles.ts` owns the inline CSS string.
- `client-script.ts` owns the inline browser script string.
- `release-update-script.ts` owns release/update tab rendering and command copying.
  It shares `dashboardStatus`, setting values, locale and presentation helpers with
  the client. Buttons preserve runnable/apply-readiness gates and only copy commands.
- `settings-script.ts` owns setting controls, pending-change summaries, reset,
  preference loading/saving and save/unload event bindings. Its fragments share
  `snapshot`, `pending`, locale/status helpers and `updateDashboardView` with the client;
  the client inserts each fragment once and keeps cross-tab composition.
- `documents-script.ts` owns document review loading, filtering, reviewer controls,
  actions and event bindings. Its inline fragments share the browser scope with the
  client script: `docReview`, locale/status helpers and `updateDashboardView` stay shared.
  The client composes each fragment once and retains cross-tab rendering calls.
- `request-script.ts` owns authenticated requests, a 30-second response/body deadline,
  and latest-view result ownership. Superseded reads are aborted; stale results and
  errors cannot update the current view even if transport cancellation arrives late.
  Mutations are never automatically retried or treated as rolled back on timeout.
- `locale-bootstrap.ts` serializes the dashboard locale bundle for the browser script.
- `types.ts` owns the dashboard snapshot types re-exported by the facade.

Keep `../dashboard-html.ts` as the stable import facade for callers.
