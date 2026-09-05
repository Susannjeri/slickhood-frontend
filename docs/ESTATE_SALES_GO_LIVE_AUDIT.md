# Estate Management and Property Sale go-live audit

Date: 2026-09-06

## Decision

- **Estate Management:** release candidate after the changes in this audit, subject to the normal MySQL migration test and authenticated staging smoke test.
- **Property Sale Management:** release candidate after replacing manual escrow references with a buyer invoice that must be fully reconciled before the escrow milestone can complete.
- **Google Maps:** the feature exists, but the production frontend was built with an effectively empty `NEXT_PUBLIC_GOOGLE_MAPS_KEY`. A validated key was available locally and a production build with it succeeds. Because `NEXT_PUBLIC_` values are frozen into the browser bundle, setting the value only after build will not activate Maps.
- **Bronze, Silver and Gold:** retain the same essential business workflows. The tiers intentionally differ by unit/property quotas, team seats, support/service levels and price; add-ons extend entitlements independently. Removing core operational screens from lower tiers would strand customer data and is not supported by the canonical subscription catalogue.
- **Production data classification:** the only active AWS property found during the read-only audit was `78 GTC Centre`; it is a rental property with four rent-mode units, so its existing `RENTAL` classification is correct. No active estate or sale property existed to reclassify, and no production data was changed.

## Audited journeys

### Estate Management

1. Estate Manager selects the Estate Management business area.
2. Creates or opens a service-charge property.
3. Guided setup requires units, an operating account, homeowner assignments and a current-year budget; estate team assignment is recommended.
4. Homeowners are added through email-bound invitations and scoped to the selected property/unit.
5. Reassignment closes the earlier ownership record rather than deleting history.
6. Service charges generate invoices and homeowner balances use reconciled invoice/payment data.
7. Budgets, meetings, resolutions, work orders, reminders and ownership termination remain property-scoped.
8. Homeowners can see only their current/historical homes and permitted operations.

### Property Sale Management

1. Sales Manager opens a sale-mode property or listing.
2. Listing data is moderated before public exposure; public inquiries are rate-limited.
3. Buyer is invited by email and joins without a duplicate account.
4. Buyer reviews and signs the offer; internal notes are not exposed to the buyer.
5. Reservation requires the signed/accepted offer.
6. Due diligence, agreement, transfer and handover require ordered milestones and evidence where configured.
7. Completion transfers ownership transactionally and retains ownership history.
8. Contractual escrow is issued as a sale invoice to the buyer; the escrow milestone accepts no client-supplied amount/reference and completes only after the exact linked invoice is fully paid.

## Corrections made

- Aligned Super Admin permissions with the Estate and Sales screens already visible to that role.
- Allowed Super Admin to inspect active estate setup and sale records without a customer staff assignment, while retaining customer resource scoping for all other roles.
- Removed an unsafe browser-query fallback from the Estate workspace; only validated, authorized property scope is used.
- Stopped combining balances in different currencies under one misleading currency label.
- Made property edit and details usable when Maps is unavailable; manual coordinates remain editable and users see a clear fallback instead of a permanent loader/blank map.
- Added a production build guard that rejects an absent or malformed Google Maps key for `app.slickhood.com` builds.
- Added separate browser regression modes for keyless fallback and configured production Maps.
- Prevented source-level Playwright runs from silently using an old `.next` artifact.
- Prevented the sidebar from making authenticated requests before the session token is hydrated.
- Prevented legacy units with no rent value from crashing the unit details screen.
- Prevented legacy units with no measurement-unit record from crashing the unit details screen.
- Replaced manually entered escrow payment claims with a server-created, sale-bound buyer invoice and locked reconciliation check.
- Added one effective-entitlements response that unions enabled primary-plan features with enabled features from live, unexpired add-ons; expired and disabled add-ons are excluded.
- Added server-side searchable pagination for Estate and Property Sales property/unit selectors, including a safe token-scope fallback while the first page loads.
- Required staff who hold the same membership role in multiple workspaces to choose a workspace explicitly. The selected workspace is sent on every request and changing it reloads the screen to clear data from the prior authorization boundary.
- Prevented the debounced property/home selectors from becoming briefly clickable with an empty result set, and stopped effect cleanup from discarding a valid latest response.

## Google Maps activation checklist

1. Restrict the Google key to HTTP referrers `https://app.slickhood.com/*` (and explicitly approved staging domains only).
2. Enable Maps JavaScript API and the required Places API for that Google Cloud project; attach billing and quota alerts.
3. Supply `NEXT_PUBLIC_GOOGLE_MAPS_KEY` securely **before** `npm run build`.
4. Deploy the resulting immutable frontend artifact; do not expect a runtime environment change to modify an already-built bundle.
5. Smoke-test search, map click, marker movement, current location, saved coordinates, edit and details.
6. Confirm key/referrer errors are absent from the browser console and monitor Google API quota/errors.

## Validation evidence

- Backend `mvnw clean verify`: 589 tests passed, 1 existing application-context test skipped; the final two effective-entitlement edge tests also passed after the full run.
- Real MySQL 8.4.11 payment integration: `RentalPaymentMySqlIT` passed against an isolated local server, covering users, property, units, lease, invoice, reconciliation, ledger entries and authorization queries.
- Production-schema migration validation: a schema-only V71 export (132 tables and no row data) validated with no failed or pending Flyway migration. No migration is introduced by this release.
- Frontend TypeScript and optimized production build: passed; 93 routes generated.
- ESLint: 0 errors, 455 warnings within the 478-warning budget.
- Playwright against the corrected optimized production artifact: 99 passed in one uninterrupted run; the one configured-Google-Maps test was intentionally skipped because the local artifact was built without the production browser key.
- The formerly intermittent estate homeowner selector and multi-workspace selection each passed 10 consecutive production-artifact runs after their loading and persistence races were corrected.

## Remaining release gates

1. Provide or configure a staging URL plus dedicated Estate Manager, Homeowner, Sales Manager, Buyer and Super Admin test credentials, then run authenticated journeys and negative cross-property access tests. The repository currently contains only a production live-test target and no staging credentials.
2. Attach and verify a representative payee payment account in staging, then exercise the complete property/estate/sale invoice checkout and callback journey. Production currently has no linked active property payment account, so this gate cannot be inferred from unit tests.
3. Build the deployable frontend with the restricted Google Maps key, then inspect browser console/referrer behavior on the real staging domain.
4. Restore an authenticated canonical Git remote and merge through the protected release workflow. The current backend checkout's `origin` points to a retired local hotfix path and reports `NO_REMOTE`.
5. Deploy backend before frontend only after the above gates pass; record immutable hashes and rollback artifacts and monitor authorization failures, listing inquiries, invoice reconciliation and Maps errors.
