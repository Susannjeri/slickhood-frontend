# Estate Management and Property Sale go-live audit

Date: 2026-09-04

## Decision

- **Estate Management:** release candidate after the changes in this audit, subject to the normal MySQL migration test and authenticated staging smoke test.
- **Property Sale Management:** release candidate after replacing manual escrow references with a buyer invoice that must be fully reconciled before the escrow milestone can complete.
- **Google Maps:** the feature exists, but the production frontend was built with an effectively empty `NEXT_PUBLIC_GOOGLE_MAPS_KEY`. A validated key was available locally and a production build with it succeeds. Because `NEXT_PUBLIC_` values are frozen into the browser bundle, setting the value only after build will not activate Maps.

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

## Google Maps activation checklist

1. Restrict the Google key to HTTP referrers `https://app.slickhood.com/*` (and explicitly approved staging domains only).
2. Enable Maps JavaScript API and the required Places API for that Google Cloud project; attach billing and quota alerts.
3. Supply `NEXT_PUBLIC_GOOGLE_MAPS_KEY` securely **before** `npm run build`.
4. Deploy the resulting immutable frontend artifact; do not expect a runtime environment change to modify an already-built bundle.
5. Smoke-test search, map click, marker movement, current location, saved coordinates, edit and details.
6. Confirm key/referrer errors are absent from the browser console and monitor Google API quota/errors.

## Validation evidence

- Backend focused Estate/Sales tests: 25 passed after the escrow guard was added.
- Backend `mvnw clean verify`: 559 unit tests passed, 1 application-context test skipped; 2 payment integration tests passed.
- Docker-capable release rehearsal: the data-free production V67 schema migrated cleanly through V68, V69 and V70 on MySQL 8.4; `RentalPaymentMySqlIT` also passed against real MySQL.
- Frontend TypeScript through optimized build: passed; 91 routes generated.
- ESLint: 0 errors, 451 warnings within the 478-warning budget.
- Playwright against the optimized production artifact: 95 passed, 2 keyless-only tests intentionally skipped. The configured Maps request test passed.
- Keyless source run separately: 2 passed, confirming create/edit manual-coordinate fallback.

## Remaining release gates

1. Run authenticated staging journeys with representative Estate Manager, Homeowner, Sales Manager, Buyer and Super Admin accounts, including negative cross-property access tests.
2. Build production with the restricted Google Maps key, then inspect browser console/referrer behavior on the real domain.
3. Deploy backend before frontend, record immutable hashes and rollback artifacts, and monitor authorization failures, listing inquiries, invoice reconciliation and Maps errors.
