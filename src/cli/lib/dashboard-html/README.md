# Dashboard HTML Modules

This directory contains the build-free pieces used by `../dashboard-html.ts`.

- `template.ts` owns the server-rendered HTML shell and public `renderDashboardHtml` function.
- `styles.ts` owns the inline CSS string.
- `client-script.ts` owns the inline browser script string.
- `locale-bootstrap.ts` serializes the dashboard locale bundle for the browser script.
- `types.ts` owns the dashboard snapshot types re-exported by the facade.

Keep `../dashboard-html.ts` as the stable import facade for callers.
