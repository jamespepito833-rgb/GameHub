# GameHub — Development Backlog (Ordered)

**Version:** v1.0 Approved  
**Date:** 2026-08-23  
**Parents:** All prior docs v1.0  
**Method:** Incremental per Master Instruction §8 — Requirement→Design→Implement→Test→Review→Integrate→Document  
**Branching:** `main` ← `integration` ← `feature/*` (§17)

> Each item is small enough to implement, test, and review independently. Do not start an item until its dependencies are merged to `integration`.

---

## Phase 1 — Project Setup (Next Immediate)

| ID | Title | Branch | Acceptance |
|----|-------|--------|------------|
| 1-01 | SvelteKit + TS + Bun scaffold | `feature/setup` | `bun run dev` serves, `svelte-check` 0 errors |
| 1-02 | Mongo native driver + `lib/server/db/mongo.ts` + `indexes.ts` + replicaSet note | `feature/setup` | `ensureIndexes()` runs on startup, no ORM deps |
| 1-03 | `.env` + `.env.example` + `.gitignore` + `seed.ts` (admin/cashiers/tables/pricing/products) | `feature/setup` | `bun run seed` idempotent, `admin/Admin123!` works |
| 1-04 | Git init + `main`/`integration` branches + push to GitHub | `feature/setup` | `git log --oneline` clean, hooks |

---

## Phase 2 — System & NoSQL Design (Already Done as Docs)

| ID | Title | Status |
|----|-------|--------|
| 2-01 | Workflows v1.0 | ✅ Done `01` |
| 2-02 | Open Questions v1.0 | ✅ Done `02` |
| 2-03 | Business Rules v1.0 | ✅ Done `03` |
| 2-04 | System Scope v1.0 | ✅ Done `04` |
| 2-05 | NoSQL Design v1.0 | ✅ Done `05` |
| 2-06 | Architecture v1.0 | ✅ Done `06` |

---

## Phase 3 — Authentication & Access Control

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 3-01 | `users` + `authSessions` collections + `hash.ts` | `feature/auth` | 1-03 | bcrypt 12, unique username |
| 3-02 | `POST /api/auth/login` + `logout` + `me` + cookie `auth_token` HttpOnly | `feature/auth` | 3-01 | 401/403 correct, tokenHash stored |
| 3-03 | `hooks.server.ts` + `app.d.ts` + `rbac.ts` (`requireRole`) | `feature/auth` | 3-02 | `locals.user` set, protected SSR redirects |
| 3-04 | `(cashier)/+layout.server.ts` + `(admin)/+layout.server.ts` + login page | `feature/auth` | 3-03 | CASHIER blocked from /admin, ADMIN passes |
| 3-05 | Tests: login happy/invalid/rate-limit, RBAC 403 matrix | `feature/auth` | 3-04 | vitest + integration with memory server |

---

## Phase 4 — Admin

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 4-01 | Tables CRUD (`GET/POST/PATCH /api/tables` + `PATCH status`) | `feature/tables` | 3-04 | BR-01/12, cannot MAINTENANCE if OCCUPIED →409 |
| 4-02 | Pricing (`GET current`, `POST create` with snapshot logic, list) | `feature/pricing` | 4-01 | BR-20/21, only one isActive |
| 4-03 | Cashiers (`GET/POST /api/admin/cashiers`, disable, reset pw, `cashierSchedules` CRUD) | `feature/cashiers` | 3-04 | BR-28/29, activity logged |
| 4-04 | Products (`GET/POST/PATCH /api/products`) | `feature/orders` | 3-04 | BR-24 |
| 4-05 | Admin UI: `/ (admin)/tables`, `/pricing`, `/cashiers`, `/products` | `feature/admin-ui` | 4-01..04 | Server-validated forms |
| 4-06 | Dashboard (`GET /api/admin/dashboard` aggs: income, utilization, hours, queue) + page | `feature/reports` | 5-? (needs sessions/transactions) | Poll 30s, correct aggs |
| 4-07 | Reports (`GET /api/admin/reports?type=&from=&to=`) + Activity Logs (`GET /api/admin/logs`) | `feature/reports` | 3-04 | BR-30, filterable, immutable |

---

## Phase 5 — Cashier Operations

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 5-01 | Table Status Board (`GET /api/tables/status` + page `(cashier)/board` with timers) | `feature/sessions` | 4-01 | Derived timers, RESERVED computed |
| 5-02 | Sessions: `POST /api/sessions` (walk-in), `POST /sessions/:id/extend`, `POST /sessions/:id/end` | `feature/sessions` | 5-01, 4-02 | BR-05..08, BR-17/18 |
| 5-03 | Reservations: `POST /api/reservations` (public), `GET` (cashier list), `POST /reservations/:id/checkin` (atomic) + `POST /cancel` + sweepers (NO_SHOW/EXPIRED) | `feature/reservations` | 5-02 | BR-03/04/09/10/13/14/15 |
| 5-04 | Queue: `POST/GET /api/queue`, `POST /queue/:id/call|seat|cancel`, sweeper for CALLED→EXPIRED | `feature/queue` | 5-02 | BR-22/23, FIFO |
| 5-05 | Orders: `POST /api/orders`, `PATCH /orders/:id` (SERVED/CANCELLED) + `GET by sessionId` | `feature/orders` | 4-04, 5-02 | BR-24, snapshot |
| 5-06 | Payments: `GET /api/sessions/:id/bill`, `POST /api/transactions` (pay), `POST /transactions/:id/void` | `feature/payments` | 5-02, 5-05 | BR-19/25/26/27, transaction atomic |
| 5-07 | Cashier pages: `(cashier)/reservations`, `/queue`, `/sessions/[id]` with extend/end/bill | `feature/cashier-ui` | 5-01..06 | No giant components |

---

## Phase 6 — Customer / Public

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 6-01 | Landing (`/`) + Rates (`/rates`) + Public Tables (`/tables?date=&start=`) | `feature/customer` | 4-01, 4-02 | SSR, availability agg |
| 6-02 | Reservation form (`/reserve` → POST /api/reservations) + confirmation (`/reservations/[id]?contact=`) + cancel | `feature/customer` | 6-01 | BR-02/03/04, masked contact |
| 6-03 | Public polish + validation UX + print receipt | `feature/customer` | 6-02 | Zod client + server |

---

## Phase 7 — Integration (E2E Workflows)

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 7-01 | E2E: Guest reserve → Cashier check-in → Play → Extend → Order → End → Pay → COMPLETED → AVAILABLE | `feature/integration` | 5-06, 6-02 | Manual + Playwright green |
| 7-02 | E2E: Walk-in → Queue → Seat → Play → Pay | `feature/integration` | 5-04 | — |
| 7-03 | E2E: NO_SHOW + cancellation + void paths | `feature/integration` | 7-01 | — |

---

## Phase 8 — Testing & Security

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 8-01 | `vitest` unit + `mongodb-memory-server` integration per module + coverage | `feature/testing` | 7-01 | Each BR negative test |
| 8-02 | Security audit: no hash exposure, server RBAC, Zod, rate-limit, cookie flags | `feature/testing` | 8-01 | Checklist pass |
| 8-03 | Regression + Playwright E2E suite | `feature/testing` | 8-02 | CI green |

---

## Phase 9 — Deployment & Docs

| ID | Title | Branch | Depends | Acceptance |
|----|-------|--------|---------|------------|
| 9-01 | `adapter-node`, `bun run build`, prod env docs | `feature/deploy` | 8-03 | Build succeeds |
| 9-02 | User docs (ADMIN/CASHIER/GUEST) + Technical docs | `feature/deploy` | 9-01 | Docs complete |

---

## Backlog Rules

- Pick **one** `feature/*` at a time, smallest first.
- Before coding: read relevant `docs/0*` + inspect existing code; do not rewrite working code.
- Definition of Done (§22): TS 0 errors, app runs, DB ops, validation, auth, error handling, manually tested, no regression, documented.

---

*Phase 0 docs locked. Next actionable: `1-01` Project Setup (SvelteKit scaffold) — awaiting owner go-ahead to start Phase 1 implementation.*

