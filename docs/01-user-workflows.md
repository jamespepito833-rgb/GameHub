# GameHub — User Workflow Specification

**Version:** v1.0 Approved (Phase 0 — Planning)  
**Date:** 2026-08-23  
**Status:** ✅ APPROVED by Owner on 2026-08-23 — all Proposed defaults in `02-open-questions.md` adopted as baseline  
**Author:** OpenCode / Muse Spark (AI Programmer)  
**Source:** Master Development Instruction §11  
**Stack Constraint:** MongoDB NoSQL (native driver), SvelteKit + TypeScript + Bun

> This document expands the five high-level workflows from §11 into executable workflows with actors, preconditions, main flow, alternate/error flows, postconditions, and acceptance criteria. It is the input to **Business Rules (02)**, **System Scope (03)**, and **NoSQL Design (04)**. No application code is to be built from this draft until approved.

---

## 1. Glossary & Conventions

### 1.1 Actors

| Actor | Description | Auth |
|-------|-------------|------|
| `GUEST` | Unauthenticated visitor on public site | No |
| `USER` | Customer (if customer accounts are introduced; otherwise same as GUEST with reservation context) | Optional |
| `CASHIER` | Daily operations role | `CASHIER` |
| `ADMIN` | System manager | `ADMIN` |
| `SYSTEM` | Server-side logic, timers, validations, aggregation | — |

### 1.2 Global Entity States (locked v1.0 — see 03-business-rules.md for transition matrix)

| Entity | States |
|--------|--------|
| **Table** | `AVAILABLE` · `OCCUPIED` · `RESERVED` · `MAINTENANCE` · `OUT_OF_SERVICE` |
| **Session** | `ACTIVE` · `EXTENDED` · `ENDED` · `COMPLETED` · `VOIDED` |
| **Reservation** | `CONFIRMED` · `CANCELLED` · `CHECKED_IN` · `NO_SHOW` · `EXPIRED` |
| **QueueEntry** | `WAITING` · `CALLED` · `SEATED` · `CANCELLED` · `EXPIRED` |
| **Transaction** | `PENDING` · `PAID` · `VOIDED` |
| **Order** | `PENDING` · `SERVED` · `CANCELLED` |

> State names are canonical strings stored in documents (`status` field). Transitions are server-authoritative only.

### 1.3 Conventions

- **Server-authoritative:** All validations, pricing, duration, and totals are computed server-side. Frontend is for display only (see Timer Architecture §16).
- **Snapshot rule:** Historical records (`sessions`, `reservations`, `transactions`, `orders`) embed the pricing/product snapshot valid at creation time.
- **Idempotency:** Check-in, End Session, Pay are idempotent server actions (repeat click does not duplicate records).
- **Audit:** Every state-changing cashier/admin action writes `activityLogs`.

---

## 2. Workflow Map (Overview)

```
[Customer] ──W1──> Reservation (CONFIRMED)
                    │
                    ├─W2──> Check-in ──> W4 Session (ACTIVE) ──> W5 Payment ──> Table AVAILABLE
                    │
[Walk-in] ──W3──┬─> if AVAILABLE ──> W4 Session
               └─> else ──> W3 Queue (WAITING) ──CALLED──> W4 Session

W4 Session ──extend──> EXTENDED ──end──> ENDED ──W5──> COMPLETED
W4 Session + W6 Orders ──> W5 Transaction (PAID)
W7 Queue management runs concurrently (CASHIER)
W8 Auth gates all W2-W7 (CASHIER/ADMIN)
W9 Admin manages tables/pricing/cashiers/reports (ADMIN)
```

---

## 3. W1 — Customer Reservation (Public Interface)

**Module:** Reservation Management + Customer/Public Interface  
**Actors:** `GUEST` (primary), `SYSTEM`  
**Related Collections:** `tables`, `reservations`, `pricing`, `activityLogs` (read-only)

### 3.1 Preconditions

- At least one `tables` document exists with `status != MAINTENANCE/OUT_OF_SERVICE`.
- `pricing` has an active rate (hourly rate, special pricing if applicable).
- Customer is on Landing Page; operating hours are defined.

### 3.2 Main Flow (Happy Path)

| Step | Actor | Action | Server Logic |
|------|-------|--------|--------------|
| 1 | GUEST | Views Landing Page | `GET /` — static + featured tables |
| 2 | GUEST | Navigates to **Available Tables** | `GET /tables/availability?date=&startTime=&duration=` — aggregation checks `reservations` (CONFIRMED) and `sessions` (ACTIVE) |
| 3 | GUEST | Views **Rates** | `GET /pricing/current` — returns active pricing snapshot |
| 4 | GUEST | Selects Table + Date + Start Time + Duration | Client validates required fields; server will re-validate |
| 5 | GUEST | Enters Customer Info: Name, Contact Number | Client validation: non-empty, phone format |
| 6 | GUEST | Submits Reservation | `POST /api/reservations` |
| 7 | SYSTEM | Validates | (a) table exists & not MAINTENANCE, (b) no overlapping CONFIRMED reservation for that table, (c) within operating hours, (d) not in past, (e) duration 30min–8h (proposed), (f) contact not blocked |
| 8 | SYSTEM | Creates reservation | `reservations` doc: `{ _id, tableId, customerName, customerContact, date, startTime, endTime (=start+duration), durationMinutes, status: "CONFIRMED", pricingSnapshot, createdAt }` |
| 9 | SYSTEM | Confirms | Returns `201` + reservation ID; frontend shows **Confirmation Screen** with reservation details + cancel link |
| 10 | SYSTEM | Logs | `activityLogs` entry: `RESERVATION_CREATED` (no PII beyond contact hash if required) |

### 3.3 Alternate & Error Flows

| ID | Condition | System Response |
|----|-----------|-----------------|
| W1-A1 | Overlapping reservation | `409 Conflict` — "Table already reserved for that time. Next available: {slot}" |
| W1-A2 | Table MAINTENANCE | `422` — "Table under maintenance" |
| W1-A3 | Outside operating hours | `422` — "Outside operating hours (09:00–02:00)" |
| W1-A4 | Past date/time | `400` — "Cannot reserve in the past" |
| W1-A5 | Invalid phone/name | `400` — validation error per field |
| W1-A6 | Race condition (two guests same slot) | Unique index on `(tableId, date, startTime)` + transaction → one succeeds, one gets W1-A1 |

### 3.4 Postconditions

- Reservation `CONFIRMED` blocks that table/time slot.
- Customer can view/cancel via reservation ID + contact verification (W1-Cancel flow below).

### 3.5 Sub-flow: View / Cancel Reservation

1. GUEST → `GET /reservations/:id?contact=` → SYSTEM verifies contact matches → returns details.
2. GUEST → `POST /reservations/:id/cancel` → SYSTEM checks `status == CONFIRMED` and not within non-cancellable window (to be defined) → updates to `CANCELLED`, frees slot, logs `RESERVATION_CANCELLED`.

### 3.6 Acceptance Criteria

- [ ] Cannot create overlapping `CONFIRMED` reservation for same table.
- [ ] `CANCELLED` reservation cannot be checked in (enforced in W2).
- [ ] Historical pricing snapshot is stored at reservation time.
- [ ] Server re-validates all client inputs.
- [ ] Confirmation displays authoritative server data, not client calculation.

---

## 4. W2 — Reservation Check-in (Cashier)

**Module:** Reservation Management + Session & Time Tracking  
**Actors:** `CASHIER`, `SYSTEM`  
**Preconditions:** Reservation `CONFIRMED`; customer present within grace window; table not `OCCUPIED`/`MAINTENANCE`.

### 4.1 Main Flow

| Step | Actor | Action |
|------|-------|--------|
| 1 | CASHIER | Opens **Reservations** board (today's CONFIRMED) — `GET /api/reservations?status=CONFIRMED&date=today` |
| 2 | CASHIER | Searches/Verifies reservation (ID, name, contact) |
| 3 | CASHIER | Clicks **Verify** → SYSTEM returns reservation + table status |
| 4 | CASHIER | Clicks **Check-in** → `POST /api/reservations/:id/checkin` |
| 5 | SYSTEM | Validates: `status == CONFIRMED`, not `CANCELLED/NO_SHOW/EXPIRED`, table `AVAILABLE` or `RESERVED` (reserved for this reservation), grace window not exceeded |
| 6 | SYSTEM | Atomically: reservation → `CHECKED_IN`, creates `sessions` doc `{ tableId, reservationId, startedAt: now(), expectedEndAt: now()+duration, status: "ACTIVE", pricingSnapshot, startedBy: cashierId }`, table → `OCCUPIED` |
| 7 | SYSTEM | Logs `RESERVATION_CHECKED_IN` + `SESSION_STARTED` |
| 8 | CASHIER | Sees timer start on Table Board (elapsed = `now - startedAt` computed client-side) |

### 4.2 Alternate Flows

| ID | Condition | Response |
|----|-----------|----------|
| W2-A1 | Grace exceeded (proposed 15min late) | Auto or manual → `NO_SHOW`, slot freed; cashier can override with ADMIN approval (to be decided) |
| W2-A2 | Table already OCCUPIED | `409` — "Table occupied. Free at {expectedEndAt} or assign alternative table" |
| W2-A3 | Reservation CANCELLED | `422` — "Cannot check in cancelled reservation" |
| W2-A4 | Early arrival (before startTime - buffer) | Allowed only if table AVAILABLE; otherwise queue or wait |
| W2-A5 | Double check-in click | Idempotent — second call returns existing session |

### 4.3 Acceptance Criteria

- [ ] Only `CONFIRMED` can become `CHECKED_IN`.
- [ ] Check-in creates exactly one `ACTIVE` session per reservation.
- [ ] Table state transition is atomic with session creation (transaction).
- [ ] Timer uses `startedAt`, not DB writes every second.

---

## 5. W3 — Walk-in Customer

**Module:** Queue Management + Session & Time Tracking  
**Actors:** `GUEST`/`CASHIER`, `SYSTEM`

### 5.1 Main Flow — Table Available

| Step | Action |
|------|--------|
| 1 | Customer arrives → CASHIER checks **Table Status Board** (`GET /api/tables/status`) |
| 2 | SYSTEM returns live statuses (AVAILABLE / OCCUPIED / RESERVED / MAINTENANCE + timers) |
| 3 | IF `AVAILABLE` exists → CASHIER → **Start Session** (`POST /api/sessions { tableId, customerName, customerContact, durationMinutes }` — walk-in, no reservationId) |
| 4 | SYSTEM validates: table AVAILABLE, not MAINTENANCE, cashier authorized → creates `sessions` (ACTIVE), table → OCCUPIED, logs `WALKIN_SESSION_STARTED` |

### 5.2 Alternate Flow — No Table Available → Queue

| Step | Action |
|------|--------|
| 1 | No AVAILABLE table → CASHIER → **Add to Queue** (`POST /api/queue { customerName, customerContact, partySize, preferredTableId? }`) |
| 2 | SYSTEM validates: not already in `WAITING`/`CALLED` with same contact, creates `queueEntries` `{ position: autoIncrement, status: WAITING, createdAt, preferredTableId }` |
| 3 | Queue Board shows FIFO ordered by `createdAt` |
| 4 | When table freed (W5) → SYSTEM or CASHIER pops next `WAITING` → `CALLED` (notifies), CASHIER → **Seat** → creates session → `SEATED` |

### 5.3 Queue Rules (locked v1.0)

- FIFO by `createdAt`; preferredTable is preference, not guarantee.
- `CALLED` expires after X minutes (proposed 10min) → `EXPIRED`, next in line called.
- Customer can cancel queue → `CANCELLED`.

### 5.4 Acceptance Criteria

- [ ] Walk-in cannot start session on OCCUPIED/MAINTENANCE table.
- [ ] One customer has at most one `WAITING`/`CALLED` entry.
- [ ] Queue → Session transition is atomic.
- [ ] Table board updates without polling every second (SvelteKit load + optional websocket/polling at reasonable interval — to be architected).

---

## 6. W4 — Billiard Session & Time Tracking (including Extension)

**Module:** Session & Time Tracking  
**Actors:** `CASHIER`, `SYSTEM`

### 6.1 Lifecycle

```
ACTIVE --extend--> EXTENDED --extend--> EXTENDED --end--> ENDED --pay--> COMPLETED
  |                                                              \
  └──────────────── direct end ─────────────────────────────────> ENDED
```

### 6.2 Main Flow — Active Session

| Step | Action |
|------|--------|
| 1 | Session `ACTIVE` — frontend displays `elapsed = now - startedAt`, `remaining = expectedEndAt - now` (client calc) |
| 2 | SYSTEM is source of truth: `startedAt`, `expectedEndAt`, `extensions[]` |
| 3 | Cashier monitors all active timers on board |

### 6.3 Extension Sub-flow

| Step | Action |
|------|--------|
| 1 | Customer requests extension → CASHIER → **Extend** (`POST /api/sessions/:id/extend { addedMinutes }`) |
| 2 | SYSTEM validates: session `ACTIVE`/`EXTENDED`, `addedMinutes` in allowed range (proposed 15–240), table not `RESERVED` for overlapping future reservation, cashier authorized |
| 3 | SYSTEM appends to `sessions.extensions[]`: `{ extendedAt: now(), addedMinutes, previousExpectedEndAt, newExpectedEndAt, approvedBy }`, updates `expectedEndAt`, `status → EXTENDED` if first extension |
| 4 | Logs `SESSION_EXTENDED` |
| 5 | Can be repeated; each extension is audited |

### 6.4 End Session

| Step | Action |
|------|--------|
| 1 | CASHIER → **End Session** (`POST /api/sessions/:id/end`) — manual or when `now >= expectedEndAt` |
| 2 | SYSTEM sets `endedAt: now()`, computes `durationMinutes = ceil((endedAt - startedAt)/60000)`, `status: ENDED` |
| 3 | Logs `SESSION_ENDED` |
| 4 | Triggers W5 (Payment) — session remains `ENDED` until paid |

### 6.5 Acceptance Criteria

- [ ] No DB write every second; only `startedAt`, `endedAt`, `extensions[]`, `expectedEndAt`.
- [ ] Duration and cost are server-computed on End.
- [ ] Cannot extend a `COMPLETED`/`VOIDED`/`ENDED` session (ENDED can still extend before payment — to be decided; default: allow extension only while not yet COMPLETED).
- [ ] Overlapping reservation blocks extension.

---

## 7. W5 — Payment & Transaction Management

**Module:** Payment & Transaction Management  
**Actors:** `CASHIER`, `SYSTEM`  
**Preconditions:** Session `ENDED`; optional `orders` linked to session.

### 7.1 Main Flow

| Step | Action |
|------|--------|
| 1 | CASHIER opens **Payment** for session (`GET /api/sessions/:id/bill` → server-computed) |
| 2 | SYSTEM calculates: `sessionCost = durationMinutes * (pricingSnapshot.ratePerHour / 60)` (or pro-rata per minute) + `Σ order.total` (each order has `unitPriceSnapshot * qty`) |
| 3 | CASHIER reviews, selects payment method, enters amount tendered |
| 4 | CASHIER → **Confirm Payment** (`POST /api/transactions { sessionId, method, amountTendered }`) |
| 5 | SYSTEM validates: session `ENDED`, transaction not already `PAID`, amountTendered >= total, method allowed, cashier authorized |
| 6 | SYSTEM atomically: creates `transactions` `{ sessionId, reservationId?, tableId, cashierId, sessionCost, ordersCost, total, method, amountTendered, change, pricingSnapshot, paidAt: now(), status: PAID }`, session → `COMPLETED`, table → `AVAILABLE` (or `RESERVED` if next reservation imminent), logs `TRANSACTION_PAID` |
| 7 | Receipt displayed/printed |

### 7.2 Alternate Flows

| ID | Condition | Response |
|----|-----------|----------|
| W5-A1 | Insufficient payment | `422` — "Insufficient amount" |
| W5-A2 | Already PAID (double click) | Idempotent — return existing transaction |
| W5-A3 | Void needed | `POST /api/transactions/:id/void` — ADMIN only, reason required, creates void log, does not delete record |
| W5-A4 | Partial payment | Not allowed by default (to be confirmed); full payment required to complete |

### 7.3 Snapshot & Audit Guarantees

- `transactions.pricingSnapshot` and `orders.unitPriceSnapshot` preserve historical rates.
- Completed `PAID` transactions are immutable (no silent edits); voids create new log entry.

### 7.4 Acceptance Criteria

- [ ] Total is server-computed; client total is never trusted.
- [ ] Session `COMPLETED` only after `PAID`.
- [ ] Table freed atomically with transaction.
- [ ] Void requires ADMIN and reason.

---

## 8. W6 — Food & Beverage Ordering

**Module:** Food & Beverage Ordering  
**Actors:** `CASHIER`, `SYSTEM`  
**Preconditions:** Session `ACTIVE`/`EXTENDED`/`ENDED` (before payment).

| Step | Action |
|------|--------|
| 1 | CASHIER → **Add Order** to session (`POST /api/orders { sessionId, items: [{ productId, qty }] }`) |
| 2 | SYSTEM validates: session not `COMPLETED`/`VOIDED`, products exist & available, qty >0 |
| 3 | SYSTEM creates `orders` doc `{ sessionId, tableId, items: [{ productId, nameSnapshot, unitPriceSnapshot, qty, lineTotal }], total, status: PENDING, createdBy, createdAt }` — price snapshot taken at order time |
| 4 | Kitchen/bar serves → CASHIER marks `SERVED` |
| 5 | Order total rolls into W5 bill (`GET /api/sessions/:id/bill` aggregates `orders` with status != CANCELLED) |

**Alt:** Cancel order before `SERVED` → `CANCELLED`; after `SERVED` requires void with reason.

---

## 9. W7 — Queue Management (Detailed)

**Module:** Queue Management  
**Actors:** `CASHIER`, `SYSTEM`

| Action | Endpoint | Validation |
|--------|----------|------------|
| View Queue | `GET /api/queue?status=WAITING` | Sorted by `createdAt` ASC |
| Add | `POST /api/queue` | One WAITING per contact |
| Call Next | `POST /api/queue/:id/call` | `WAITING` → `CALLED`, `calledAt: now()` |
| Seat | `POST /api/queue/:id/seat { tableId }` | `CALLED` → `SEATED` + create session (atomic) |
| Cancel | `POST /api/queue/:id/cancel` | `WAITING`/`CALLED` → `CANCELLED` |
| Expire | System cron / on poll | `CALLED` and `now - calledAt > 10min` → `EXPIRED` |

---

## 10. W8 — Authentication & Access Control

**Module:** Authentication & Access Control  
**Actors:** All

| Flow | Steps |
|------|-------|
| **Login (CASHIER/ADMIN)** | `POST /api/auth/login { username, password }` → server verifies hash → creates session (cookie/JWT) with `{ userId, role }` → `activityLogs: LOGIN` |
| **Logout** | `POST /api/auth/logout` → invalidate session → `LOGOUT` |
| **Authorization** | Every `/api/*` and protected SvelteKit `+layout.server.ts` checks `role` server-side; `ADMIN` can access all, `CASHIER` limited to operations, `GUEST` only public routes |
| **Session** | Stored server-side (MongoDB `sessions` or `authSessions` collection — to be designed); never trust client role |

**Acceptance:** Hiding a button is not security; all checks are server-side; password hashes never exposed.

---

## 11. W9 — Admin Workflows

**Module:** User & Cashier Management, Table Management, Pricing, Dashboard/Reports/Audit  
**Actor:** `ADMIN`

| Area | Workflow |
|------|----------|
| **Cashiers** | List → Create (`POST /api/admin/cashiers`) → Set status active/disabled → Set schedules (`cashierSchedules`) → Reset password. All → `activityLogs`. |
| **Tables** | CRUD (`tables` { name, status, description }); cannot delete table with active session/reservation; setting to `MAINTENANCE` blocks new sessions/reservations but does not kill active session |
| **Pricing** | Create rate (`pricing` { ratePerHour, effectiveFrom, effectiveTo?, isActive }); new rate does not retroactively change historical snapshots |
| **Dashboard** | `GET /api/admin/dashboard` aggregation: income today/week/month, table utilization, total hours, active sessions, queue length |
| **Reports** | Income reports, table usage, total hours, transactions, sessions, reservations — filtered by date range, exportable |
| **Audit Logs** | `GET /api/admin/activity-logs` — filterable, immutable |

---

## 12. Cross-Cutting Rules (References to Business Rules doc)

- [BR-01] MAINTENANCE table cannot start session — enforced W2/W3/W4
- [BR-02] One active session per table — unique partial index `tables` + `sessions.status ACTIVE/EXTENDED`
- [BR-03] Reservation conflict prevention — unique index + application check
- [BR-04] CANCELLED cannot be checked in — W2 validation
- [BR-05] Historical pricing preservation — snapshot in session/reservation/transaction/order
- [BR-06] Server-authoritative timer & billing — W4/W5
- [BR-07] Completed transactions immutable — W5
- [BR-08] All privileged actions logged — W8/W9

Full rule definitions with error codes and edge cases will be in `02-business-rules.md`.

---

## 13. Non-Functional & Technical Notes

- **Timer Architecture:** Persist `startedAt`, `endedAt`, `expectedEndAt`, `extensions[]`; frontend computes elapsed via `setInterval` (no DB write). Server computes authoritative `durationMinutes` on End.
- **Indexes (locked v1.0 — see 05-nosql-design.md):** `reservations: { tableId, date, startTime }` unique partial where `status=CONFIRMED`; `sessions: { tableId, status }` partial where `status in [ACTIVE, EXTENDED]` unique; `queueEntries: { status, createdAt }`; `transactions: { paidAt }`; `activityLogs: { createdAt, actorId }`.
- **Validation:** All inputs validated server-side with TypeScript + Zod (or equivalent) before DB write.
- **SvelteKit Routes (locked v1.0 — see 06-architecture.md):** `/` (landing), `/tables`, `/rates`, `/reservations/[id]`, `/login`, `/(cashier)/board`, `/(cashier)/sessions`, `/(admin)/dashboard`, `/(admin)/tables`, `/(admin)/cashiers`, `/(admin)/pricing`, `/(admin)/reports`, `/(admin)/logs`.

---

## 14. Approval & Next Steps

| Step | Owner | Status |
|------|-------|--------|
| W1–W9 draft (this doc) | AI Programmer | **✅ Approved v1.0 on 2026-08-23** |
| Open questions resolution | Project Owner | **✅ Approved — all Proposed adopted** |
| Business Rules (03) | AI Programmer | **In progress** |
| System Scope (04) | AI Programmer | Next |
| NoSQL Design (05) | AI Programmer | Next |

**Approved baseline:** This doc is now the frozen reference for `03-business-rules.md` onward.

---

*End of 01-user-workflows.md — Phase 0 Planning*
