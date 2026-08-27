# GameHub — Business Rules Specification

**Version:** v1.0 Approved  
**Date:** 2026-08-23  
**Status:** ✅ APPROVED (derived from `01-user-workflows.md` v1.0 + `02-open-questions.md` v1.0 Locked)  
**Author:** OpenCode / Muse Spark  
**Stack:** MongoDB NoSQL, SvelteKit, TypeScript, Bun

> Authoritative rulebook. Every `POST/PUT/DELETE` must enforce these server-side. Frontend validation is never sufficient. Violations return the listed HTTP status + `code`. Rules are referenced as `BR-XX` in code comments, tests, and NoSQL validation.

---

## 1. Rule Index

| ID | Category | Title | Enforced In |
|----|----------|-------|-------------|
| BR-01 | Tables | Maintenance blocks operations | W1,W2,W3,W4 |
| BR-02 | Identity | Guest reservation identity | W1 |
| BR-03 | Reservations | No overlapping reservations + buffer + one-per-contact | W1 |
| BR-04 | Reservations | Time window (past / 7-day advance / operating hours) | W1 |
| BR-05 | Tables | One active session per table | W2,W3,W4 |
| BR-06 | Sessions | Session state machine | W4 |
| BR-07 | Sessions | Authoritative timestamps, no per-second writes | W4 |
| BR-08 | Sessions | Duration & cost server-computed | W4,W5 |
| BR-09 | Reservations | CANCELLED/NO_SHOW/EXPIRED cannot be checked in | W2 |
| BR-10 | Reservations | Idempotent check-in (one session per reservation) | W2 |
| BR-11 | Sessions | Atomic state transitions | W2,W4,W5 |
| BR-12 | Tables | Table status transitions | All |
| BR-13 | Reservations | Reservation lifecycle | W1,W2 |
| BR-14 | Reservations | Grace period & NO_SHOW (15min) | W2 |
| BR-15 | Reservations | Cancellation policy (any time before start) | W1 |
| BR-16 | Sessions | Expected end & overrun handling | W4 |
| BR-17 | Sessions | Extension rules (15–240, unlimited, before payment) | W4 |
| BR-18 | Sessions | Extension vs future reservation conflict | W4 |
| BR-19 | Billing | Per-minute ceiling billing | W5 |
| BR-20 | Pricing | Flat hourly with effectiveFrom, snapshot preserved | W1,W4,W5 |
| BR-21 | History | Historical records immutable / snapshot | W5,W6 |
| BR-22 | Queue | FIFO + preference-only + reservation priority | W3,W7 |
| BR-23 | Queue | Queue lifecycle & CALLED expiry (10min) | W7 |
| BR-24 | Orders | Orders linked to session, snapshot pricing | W6 |
| BR-25 | Payments | Methods Cash + GCash | W5 |
| BR-26 | Payments | Full payment required, no partial | W5 |
| BR-27 | Payments | Void requires ADMIN + reason, never delete | W5 |
| BR-28 | AuthZ | Role matrix (ADMIN/CASHIER/GUEST) | W8,W9 |
| BR-29 | Schedules | Cashier schedule soft enforcement | W8 |
| BR-30 | Audit | Activity log immutability & retention | All |
| BR-31 | Privacy | PII visibility | W1,W2 |
| BR-32 | Validation | Server-side validation & error shape | All |

---

## 2. Tables

### BR-01 — Maintenance Blocks Operations (ADMIN only)
- **Rule:** If `tables.status in ["MAINTENANCE","OUT_OF_SERVICE"]` (`UNDER_MAINTENANCE`) then: (a) `POST /api/reservations` → `422 E_TABLE_MAINTENANCE`, (b) `POST /api/sessions` / check-in (CASHIER) → `422 E_TABLE_MAINTENANCE`, (c) queue SEAT (CASHIER) → `422`. Existing `ACTIVE` session on that table is **not** killed when table is set to `UNDER_MAINTENANCE` by ADMIN; new operations are blocked.
- **Authorization:** Only `ADMIN` may set `UNDER_MAINTENANCE` (`MAINTENANCE`/`OUT_OF_SERVICE`) and remove it. `CASHIER` attempting `PATCH /api/admin/tables` with `UNDER_MAINTENANCE` → `403 E_FORBIDDEN`. Conversely, `ADMIN` may **not** set operational `AVAILABLE`/`OCCUPIED` (see BR-12).
- **Transition:** `AVAILABLE → UNDER_MAINTENANCE` (ADMIN) allowed only if no `ACTIVE/EXTENDED` session on that table (else `409 E_TABLE_OCCUPIED`). `UNDER_MAINTENANCE → AVAILABLE` (ADMIN) allowed anytime by ADMIN.
- **Test:** Create reservation on MAINTENANCE → 422. Start walk-in on MAINTENANCE → 422. CASHIER tries `MAINTENANCE` → 403. ADMIN tries `OCCUPIED` → 403.

### BR-05 — One Active Session Per Table
- **Rule:** At most one `sessions` with `status in ["ACTIVE","EXTENDED"]` per `tableId`. Enforced by **partial unique index** + application check in transaction.
- **Error:** `409 E_TABLE_OCCUPIED` — "Table already occupied until {expectedEndAt}".
- **Test:** Two concurrent `POST /api/sessions` same table → one 201, one 409.

### BR-12 — Table Status Transitions (authoritative, role-separated)

```
Operational (CASHIER):
  AVAILABLE --start/checkin (CASHIER)--> OCCUPIED --end/pay (CASHIER)--> AVAILABLE
  OCCUPIED --CASHIER mark AVAILABLE--> AVAILABLE  (explicit operational, e.g., after clean)
  AVAILABLE --CASHIER mark OCCUPIED--> OCCUPIED    (explicit operational, e.g., walk-in without session)

Maintenance (ADMIN):
  AVAILABLE --ADMIN--> UNDER_MAINTENANCE (MAINTENANCE/OUT_OF_SERVICE) --ADMIN--> AVAILABLE
  OCCUPIED --ADMIN set UNDER_MAINTENANCE--> stays OCCUPIED until session COMPLETED, then UNDER_MAINTENANCE
  RESERVED is logical (derived from future CONFIRMED reservation), not stored; board shows RESERVED when next reservation within 30min
```
- **Role separation:** `AVAILABLE`↔`OCCUPIED` transitions are **CASHIER-only** (via `POST /api/sessions`, `POST /api/transactions` → `AVAILABLE`, or explicit `POST /api/tables/:id/operational-status`). `ADMIN` attempting operational `403 E_FORBIDDEN`. `UNDER_MAINTENANCE` transitions are **ADMIN-only** (`PATCH /api/admin/tables`); `CASHIER` attempting `403`.
- Table status is **derived + stored**: stored `status` is `AVAILABLE`/`OCCUPIED`/`MAINTENANCE`/`OUT_OF_SERVICE` (`UNDER_MAINTENANCE` = `MAINTENANCE`/`OUT_OF_SERVICE` alias, DB keeps `MAINTENANCE`); `RESERVED` is computed for display but not stored.

---

## 3. Reservations

### BR-02 — Guest Reservation Identity
- **Fields:** `customerName` (2–80 chars, trimmed), `customerContact` (PH phone `09xxxxxxxxx` or `+639xxxxxxxxx`, normalized to `09...`), `customerEmail?` optional. No account required (Phase 6 Guest only).
- **Privacy:** Full contact visible to `CASHIER/ADMIN` only; public `GET /reservations/:id` requires `?contact=` match; list endpoints for guests return masked contact.
- **Error:** `400 E_INVALID_CONTACT` / `E_INVALID_NAME`.

### BR-03 — No Overlapping Reservations
- **Rule:** No two `reservations` with `status=CONFIRMED` may overlap on same `tableId` and overlapping `[startTime, endTime)` inclusive-exclusive, accounting for **10-minute buffer** on both sides. Also one contact may not hold overlapping CONFIRMED reservations (any table) in same time window.
- **Buffer:** `effectiveEnd = endTime + 10min`; next reservation `startTime` must be `>= effectiveEnd`.
- **Enforcement:** Application overlap query + **unique partial index cannot fully enforce range** → application check inside transaction is authoritative; index on `{ tableId, date, startTime }` supports lookup.
- **Error:** `409 E_RESERVATION_CONFLICT` with `nextAvailableSlot`.
- **Edge:** Back-to-back with buffer → 409. Same contact different tables same time → 409.

### BR-04 — Time Window
- **Past:** `startTime < now()` → `400 E_RESERVATION_IN_PAST`.
- **Advance:** `startTime > now() + 7 days` → `422 E_RESERVATION_TOO_FAR`.
- **Operating hours:** Proposed `09:00–02:00` (next day). `startTime` and `endTime` must be within window; else `422 E_OUTSIDE_OPERATING_HOURS`.
- **Duration:** `30 min ≤ duration ≤ 8 hours`; else `400 E_INVALID_DURATION`.

### BR-13 — Reservation Lifecycle

```
CONFIRMED --cancel--> CANCELLED (terminal)
CONFIRMED --checkin--> CHECKED_IN (terminal, spawns session)
CONFIRMED --grace exceeded--> NO_SHOW (terminal, frees slot) // via job or cashier action
CONFIRMED --past + not checked--> EXPIRED (sweeper)
```
- No transitions out of terminal states.

### BR-09 — Terminal Reservations Cannot Be Checked In
- `CANCELLED`/`NO_SHOW`/`EXPIRED`/`CHECKED_IN` → `POST /checkin` → `422 E_RESERVATION_NOT_CHECKINABLE`.

### BR-10 — Idempotent Check-in
- Re-`POST /reservations/:id/checkin` when already `CHECKED_IN` returns `200` with existing `sessionId` (no duplicate session). Uses `reservationId` unique on `sessions`.

### BR-14 — Grace Period & NO_SHOW (15min)
- If `now() > startTime + 15min` and `status==CONFIRMED` and not checked in → status becomes `NO_SHOW` (via cron every 1min or on next read). Slot freed. Cashier may **override** with ADMIN approval to still check in within +30min (logs `CHECKIN_OVERRIDDEN`).

### BR-15 — Cancellation Policy
- `CANCELLED` allowed iff `status==CONFIRMED` and `now() < startTime`. No fee. After `startTime` → `422 E_CANNOT_CANCEL`. CANCELLED frees slot immediately. Logged.

---

## 4. Sessions & Time Tracking

### BR-06 — Session State Machine

```
ACTIVE --extend--> EXTENDED --extend--> EXTENDED
ACTIVE/EXTENDED --end--> ENDED --pay--> COMPLETED
ACTIVE/EXTENDED --void(admin)--> VOIDED (rare, reason required)
ENDED --extend--> EXTENDED // allowed per Q11 before payment (reopens)
```
- `COMPLETED`/`VOIDED` are terminal — no further mutations except audit.

### BR-07 — Authoritative Timestamps (No Per-Second Writes)
- **Persisted:** `startedAt: Date`, `expectedEndAt: Date`, `endedAt?: Date`, `extensions: Array<{ extendedAt, addedMinutes, previousExpectedEndAt, newExpectedEndAt, approvedBy }>`, `pricingSnapshot`.
- **Frontend:** `elapsed = now - startedAt`, `remaining = expectedEndAt - now` via `setInterval(1000)` — no DB write.
- **Test:** Assert no UPDATE to `sessions` during active play except extend/end.

### BR-08 — Duration & Cost Server-Computed
- On End: `durationMinutes = ceil((endedAt - startedAt)/60000)` — at least 1 minute if <1min (but min reservation is 30min; walk-in min 15min).
- Cost computed server-side; client total ignored.

### BR-11 — Atomic Transitions
- Check-in (`reservation→CHECKED_IN` + `session` + `table→OCCUPIED`) in **MongoDB transaction**.
- Payment (`transaction PAID` + `session→COMPLETED` + `table→AVAILABLE`) in transaction.
- Queue SEAT (`queue→SEATED` + `session` + `table→OCCUPIED`) in transaction.

### BR-16 — Expected End & Overrun
- `expectedEndAt = startedAt + durationMinutes` (initial) then incremented per extension. If `now() > expectedEndAt` and not yet `ENDED` → considered **overrun**; still billable per-minute until `endedAt`. UI shows negative remaining.

### BR-17 — Extension Rules
- **Increment:** `15 ≤ addedMinutes ≤ 240`; else `400 E_INVALID_EXTENSION`.
- **When:** `status in [ACTIVE,EXTENDED,ENDED]` and session not `COMPLETED/VOIDED` and `table` not MAINTENANCE.
- **Count:** Unlimited, each audited.
- **Who:** `CASHIER` or `ADMIN` (authenticated). `approvedBy` persisted.
- **Overrun extension:** Allowed before payment to extend past overrun (recomputes `expectedEndAt`).

### BR-18 — Extension vs Future Reservation
- Extension that would overlap a future `CONFIRMED` reservation on same table (including 10min buffer) → `409 E_EXTENSION_CONFLICTS_RESERVATION` with `conflictingReservationId`. Cashier must offer different table.

### BR-19 — Per-Minute Ceiling Billing
- `sessionCost = durationMinutes * (pricingSnapshot.ratePerHour / 60)`. No rounding per hour — exact per-minute. Currency PHP, 2 decimals. `Math.ceil` on minutes, then `Math.round(cost*100)/100`.
- Example: 90min × ₱100/hr = 90 × 1.666… = ₱150.00.

---

## 5. Pricing

### BR-20 — Flat Hourly with effectiveFrom
- `pricing` docs: `{ ratePerHour: number (>0), effectiveFrom: Date, effectiveTo?: Date, isActive: bool, createdBy, createdAt }`. Only one `isActive=true` at a time (enforced). Creating new rate sets previous `effectiveTo = now()` and `isActive=false`.
- **Future:** Peak/off-peak extension possible but out of scope v1.

### BR-21 — Historical Snapshot Preservation
- At reservation/session/order/transaction creation, embed `pricingSnapshot: { ratePerHour, pricingId, effectiveFrom }`. Rate changes never retroactively alter historical docs. Billing always uses snapshot.

---

## 6. Queue

### BR-22 — FIFO + Preference-Only + Reservation Priority
- **FIFO:** `WAITING` ordered by `createdAt ASC` (and `_id` tie-break).
- **Preference:** `preferredTableId` is hint, not guarantee; SEAT can assign any AVAILABLE table.
- **Reservation priority:** A table with upcoming `CONFIRMED` reservation within 30min is not offered to queue (shown RESERVED).

### BR-23 — Queue Lifecycle

```
WAITING --call--> CALLED --seat--> SEATED (terminal, spawns session)
WAITING/CALLED --cancel--> CANCELLED
CALLED --10min timeout--> EXPIRED (via sweeper)
WAITING --timeout 2h no call?--> remains WAITING (no auto-expire except after CALLED)
```
- **One per contact:** One `WAITING`/`CALLED` per `customerContact`; else `409 E_ALREADY_IN_QUEUE`.
- **CALLED expiry:** `now - calledAt > 10min` → sweeper or on read → `EXPIRED`, next WAITING auto-called (or cashier manually calls).

---

## 7. Orders & Products

### BR-24 — Orders Linked to Session, Snapshot Pricing
- `orders` require `sessionId` with `status in [ACTIVE,EXTENDED,ENDED]` (not COMPLETED/VOIDED). `products` must be `isAvailable=true`.
- Each line: `{ productId, nameSnapshot, unitPriceSnapshot, qty (>=1), lineTotal = qty*unitPriceSnapshot }`. `total = Σ lineTotal`.
- **Status:** `PENDING → SERVED`; `PENDING → CANCELLED` allowed; `SERVED → CANCELLED` requires ADMIN void.
- Orders roll into `GET /api/sessions/:id/bill` total; snapshot preserved even if product price changes.

---

## 8. Payments

### BR-25 — Methods
- Enum `["CASH","GCASH"]`. GCash requires `gcashRef?` (6–20 chars) when method=GCASH.
- Else `400 E_INVALID_PAYMENT_METHOD`.

### BR-26 — Full Payment Required
- `amountTendered >= total`; else `422 E_INSUFFICIENT_PAYMENT`. No partial/deposit in v1. `change = amountTendered - total` (≥0).

### BR-27 — Void Requires ADMIN + Reason
- `POST /api/transactions/:id/void { reason: string(10–500) }` → `role==ADMIN` else `403 E_FORBIDDEN`. Creates `VOIDED` transaction (does not delete), sets `voidedAt`, `voidedBy`, `voidReason`, logs `TRANSACTION_VOIDED`. Original `PAID` remains for audit (flagged voided). Session stays `COMPLETED` (void does not revert session).

---

## 9. Auth & Access Control

### BR-28 — Role Matrix (Corrected: CASHIER = Operational, ADMIN = Maintenance)

| Resource | GUEST | CASHIER | ADMIN |
|----------|-------|---------|-------|
| `GET /`, `/tables`, `/rates`, `POST /reservations`, `GET /reservations/:id?contact=` | ✅ | ✅ | ✅ |
| `POST /reservations/:id/cancel` (own) | ✅ (with contact) | ✅ | ✅ |
| **Operational:** `GET /api/tables/status`, `POST /api/tables/:id/operational-status` (`AVAILABLE`↔`OCCUPIED`), `POST /api/sessions`, `POST /api/sessions/:id/extend|end`, `GET /api/reservations` (all), `POST /api/reservations/:id/checkin`, `POST /api/queue`, `POST /api/orders`, `POST /api/transactions` (pay), `GET /api/sessions/:id/bill` | ❌ 403 | ✅ | ❌ 403 |
| **Maintenance:** `PATCH /api/admin/tables/:id` with `UNDER_MAINTENANCE` (`MAINTENANCE`/`OUT_OF_SERVICE`), `POST /api/admin/tables`, `DELETE /api/admin/tables/:id`, manage `pricing`/`products`/`cashiers`, `GET /admin/*`, `GET /activity-logs`, `POST /transactions/:id/void` | ❌ | ❌ 403 | ✅ |
| Manage own password | — | ✅ | ✅ |

- **Operational vs Maintenance split:** `CASHIER` owns `AVAILABLE`↔`OCCUPIED`; `ADMIN` owns `UNDER_MAINTENANCE`. Cross-attempt → `403 E_FORBIDDEN` with distinct code, not just hidden UI.
- Every protected route checks `locals.user.role` server-side (`hooks.server.ts` + `+layout.server.ts`); hiding UI is not authorization.
- Passwords: `bcrypt` hash (cost 12), never returned; login rate-limited (5/min per IP).

### BR-29 — Cashier Schedule Soft Enforcement
- `cashierSchedules` is informational; login outside schedule **allowed** but logs `LOGIN_OUTSIDE_SCHEDULE` warning and shows banner. Hard block is future if needed.

---

## 10. Audit & Privacy

### BR-30 — Activity Log Immutability & Retention
- Every state-changing action writes `activityLogs: { actorId, actorRole, action, targetCollection, targetId, before?, after?, ip, createdAt }`. Logs are **append-only** (no UPDATE/DELETE API); retention **forever** (no TTL). Admin can read/filter, cannot delete.
- Actions logged: `LOGIN`, `LOGOUT`, `RESERVATION_CREATED/CANCELLED/CHECKED_IN/NO_SHOW`, `SESSION_STARTED/EXTENDED/ENDED/COMPLETED`, `QUEUE_*`, `ORDER_*`, `TRANSACTION_PAID/VOIDED`, `TABLE_*`, `PRICING_*`, `CASHIER_*`.

### BR-31 — PII Visibility
- `customerContact`/`customerName` stored plaintext (needed for operations) but: public endpoints mask contact (`09****1234`); `CASHIER`/`ADMIN` see full; logs store `contactHash` not plaintext where feasible.

### BR-32 — Server-Side Validation & Error Shape
- All inputs validated with `zod` (or equivalent) server-side; client validation is UX only.
- **Error shape:** `{ error: { code: "E_...", message: string, details?: object } }` with HTTP status. `code` is stable for frontend mapping. Never expose stack traces, password hashes, or Mongo internals.
- **Idempotency keys:** Check-in and Pay accept `Idempotency-Key` header; replay returns original result.

---

## 11. Operating Hours & System Constants

| Constant | Value | Override |
|----------|-------|----------|
| Operating hours | `09:00–02:00` (next day) | `.env` `OPERATING_HOURS=09:00-02:00` |
| Reservation duration | 30–480 min | BR-04 |
| Walk-in duration | 15–480 min | W3 |
| Grace NO_SHOW | 15 min | BR-14 |
| Cleaning buffer | 10 min | BR-03 |
| CALLED expiry | 10 min | BR-23 |
| Queue FIFO | `createdAt ASC` | BR-22 |
| Billing unit | 1 min ceil | BR-19 |
| Currency | PHP (₱), 2 decimals | — |

---

## 12. Acceptance Test Matrix (per rule)

| Rule | Happy Path Test | Negative Test |
|------|-----------------|---------------|
| BR-01 | Set MAINTENANCE → try reserve → 422 | Active session → set MAINTENANCE → 409 |
| BR-03 | Reserve 10:00–11:00 → next 11:10+ succeeds | Reserve 10:00–11:00 → 10:30–11:30 → 409 |
| BR-05 | Start session on AVAILABLE → OCCUPIED | Second session same table → 409 |
| BR-09 | Cancel then check-in → 422 | NO_SHOW then check-in → 422 |
| BR-14 | Start 10:00, check at 10:10 → OK | Check at 10:20 → NO_SHOW |
| BR-17 | Extend 30min → expectedEnd +30, status EXTENDED | Extend 5min → 400; extend 300min → 400 |
| BR-18 | No future reservation → extend OK | Future reservation 11:00, extend to 11:30 → 409 |
| BR-26 | Pay exact → PAID | Pay -1 → 422 |
| BR-27 | ADMIN void with reason → VOIDED | CASHIER void → 403 |
| BR-28 | CASHIER hits /admin → 403 | GUEST hits /api/sessions → 401/403 |

---

*End of 03-business-rules.md — Phase 0 Planning. Next: 04-system-scope.md, 05-nosql-design.md.*

