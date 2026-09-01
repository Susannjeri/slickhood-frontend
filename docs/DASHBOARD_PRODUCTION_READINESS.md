# Dashboard production-readiness audit

## Scope

This audit covers the shared role dashboard and the Affiliate, My Wealth, Community Funds, and Insurance Operations dashboards. Reports remain the detailed analysis workspace; dashboards provide a bounded, actionable summary.

## Closed gaps

- Role-specific backend payloads are mapped explicitly for landlords, tenants, property managers, guards, service providers, system owners, estate/homeowner/sales roles, internal teams, insurance teams, affiliates, and asset portfolio managers.
- Placeholder internal-team and insurance totals were replaced with scoped operational counts. On the current production baseline, insurance metrics describe the governed email correspondence pipeline (queued, sent, received for review, and failed); case/claim/renewal metrics remain part of the separately controlled Insurance Operations release.
- Dashboard totals now require authentication, and the requested role must equal the active session role.
- Backend response envelopes are normalized consistently for objects, collections, and paginated results. This fixes real responses that are wrapped differently from earlier browser mocks.
- Optional report requests use `Promise.allSettled`; one unavailable insight no longer clears every graph, task, and activity item.
- Historical, forward-looking, and snapshot reports receive correct local-calendar date windows. Lease expiries cover today through the next 90 days.
- The former single-bar occupancy display was replaced by accessible progress and distribution visualizations.
- Affiliate conversion, wealth projection, community-fund progress, and insurance workload now have concise visual summaries.
- Loading, empty, partial-failure, refresh, responsive, dark-mode, and keyboard-readable states are present.
- Quick actions and document widgets are permission-scoped.
- The report executor is sized from the configured connection pool with a safe minimum of one worker.

## Data and performance guardrails

- Dashboards reuse bounded report endpoints (500 rows) and show at most six activity/task items.
- No chart runtime dependency was added. Visuals use small SVG/CSS components, avoiding extra bundle and hydration cost.
- Currency values are labelled by currency; the shared landlord card avoids presenting mixed-currency rent as a single KES total.
- Every chart has a text-equivalent accessible name and visible labels.
- Operational report failures are isolated and surfaced without hiding valid totals.

## Release verification

Before promotion, run the backend test suite, frontend type validation and lint budget, production build, Playwright suite, and dependency audit. In staging, switch through every available role and confirm that metric labels, counts, links, permissions, report windows, empty states, and refresh behaviour match the scoped account.
