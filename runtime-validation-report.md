# Runtime Validation Report

**Generated:** 2026-10-26  
**Target:** Autovia MERN application  
**Scope:** Admin workspace APIs, admin-to-customer data propagation, auth/validation failures, and browser access control

## Summary

| Step | Status | Exit Code | Details |
|---|---|---:|---|
| Backend unit and integration tests | PASS | 0 | `npm run test:backend`; 7 passed, 0 failed |
| Frontend production build | PASS | 0 | `npm run build` |
| Lint | PASS with warnings | 0 | `npm run lint`; two existing Fast Refresh warnings |
| Live API readiness | PASS | 0 | Health endpoint returned 200; customer site and car APIs returned data |
| Browser security flows | PASS | 0 | Anonymous admin route redirected to sign-in; invalid credentials showed an error; customer role was redirected away from the admin workspace |
| Authenticated admin browser CRUD | UNVERIFIED | — | No successful authenticated browser session or end-to-end UI save flow was verified in this run |

**Overall:** NEEDS_SIGNOFF — backend workflows and API propagation passed, but complete authenticated browser CRUD remains unverified and policy/scale gaps were identified.

## Coverage and Evidence

The backend suite uses a separate `autovia_test` MongoDB database and exercises Express routes against MongoDB. The integration test was extended to verify:

- Admin-created and edited car types, banners, add-ons, and business settings are reflected by the customer-facing site API.
- Admin-created add-ons and festival rates are applied to customer price quotes.
- Admin-updated car rates are reflected in customer car details and subsequent quotes.
- Service blocks prevent customer quotes; disabled locations are omitted from customer content and rejected for quotes/bookings.
- Admin endpoints reject anonymous and customer access.
- Invalid GST and late-fee values, invalid booking transitions, and invalid return odometer data are rejected.
- Licence verification, booking status lifecycle, return charges, cancellation, and released booking dates work through the API.

The live customer API check returned 1 banner, 4 active car types, 30 active locations, 4 active add-ons, and 7 cars with rates. These are counts only; no customer details were inspected.

Browser checks were limited to route protection and bad-credential handling. An attempted mocked admin-screen run did not receive the mocked API responses and is not counted as a pass. No browser CRUD data was written to the live database.

## Issues and Gaps Found

| # | Severity | Description | Evidence |
|---|---|---|---|
| 1 | Medium | The cancellation cut-off can be saved and returned by the settings API, but no booking flow consumes `cancellationHours`. The customer booking routes also do not expose a cancellation endpoint. As a result, the configured policy is not enforced by the current booking flow. | `cancellationHours` is referenced only in settings, model, seed, and site response code; booking routes expose create/list/read/quote/availability only. |
| 2 | Low | The admin booking list silently caps results at 250 and has no pagination. Older bookings will not be reachable from this screen once the cap is exceeded. | `listAdminBookings` uses `.limit(250)` and does not return pagination metadata. |
| 3 | Medium | Authenticated admin browser flows (create/edit/delete through the actual UI) were not verified in this run. API-level flows and browser access-control flows passed, but this does not prove every form interaction or browser-to-API save path. | Browser testing verified anonymous redirect, invalid login, and customer-role redirect only. |
| 4 | Low | Car images are stored as data URLs in the car document rather than in a dedicated image-storage service. The UI limits uploads, but this increases MongoDB document and API payload sizes as the fleet grows. | Admin car form converts image files to data URLs; Express JSON payload limit is 5 MB. |
| 5 | Low | There is no root-level frontend unit-test command or frontend component/E2E test suite in the repository. The runnable test suite is backend `node --test`. | Root scripts include build/lint but no test script; backend contains the existing three test files. |

## Environment and Verdict

```text
environment:
  docker: UNAVAILABLE — `Get-Command docker` found no Docker command
  node: AVAILABLE — v24.12.0
  playwright: AVAILABLE — integrated browser tooling used for route/login negative flows; repository Playwright package is not installed
  infra-tier: PRIMARY(local MongoDB) — integration tests connected to isolated `autovia_test`; Docker was not required
  browser-tier: PARTIAL(Integrated browser) — browser security flows verified; authenticated admin CRUD UI not verified
startup: PASS — existing app; `/api/v1/health` returned 200 and frontend sign-in page returned 200
integration: PASS — exit_code: 0, passed: 7, failed: 0, skipped: 0; Express + MongoDB admin/customer API and persistence flows
e2e: PARTIAL — exit_code: 0 for executed browser checks; anonymous, invalid-login, and customer-role flows tested; full authenticated admin CRUD and browser-to-live-database flow not tested
overall: NEEDS_SIGNOFF — backend/API behavior passed, but full UI CRUD and cancellation policy enforcement remain gaps
```
