# Admin dashboard directory cleanup

User-requested follow-up to the consolidated release: remove the repeated Administration directory from Home because the functions already exist in navigation.

- Removed the dashboard-only `AdminFunctions` component and its import/render.
- Removed the `Admin Panel` shortcut and group entry, which pointed to the removed `#admin-functions` anchor.
- Retained individual sidebar functions, permissions, dashboard metrics, graphs, refresh/recovery and document widgets.
- Updated browser regression coverage to reject the duplicate directory/search/shortcut while checking admin navigation and real metric rendering. Existing configuration security and tenant denial checks remain.

This is a frontend-only change. No backend, database, payment configuration or production deployment is included in this local change.

Validation: optimized local build and TypeScript passed; six focused Playwright tests passed against the freshly built production-mode server. Targeted ESLint had zero errors and two existing dashboard hook warnings; `git diff --check` passed. The first development-mode run exposed an incorrect new heading selector (corrected) and dev-only interference with two existing tests; all six passed in production mode without weakening the existing assertions.

Logs: `D:/SlickHood-Codex/operations/admin-dashboard-cleanup-build-20260907.log` and `D:/SlickHood-Codex/operations/admin-dashboard-cleanup-browser-20260907.log`.
