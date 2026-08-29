# GameHub — System Scope Specification

**Version:** v1.0 Approved  
**Date:** 2026-08-23  
**Status:** ✅ APPROVED  
**Parents:** `01-user-workflows.md` v1.0, `03-business-rules.md` v1.0  
**Phase:** Phase 0 — Planning → Phase 1 Setup (next)

---

## 1. Purpose

Defines what GameHub **will** and **will not** build for **MVP (Phase 1–7)**. Prevents scope creep. Any item in §5 Out-of-Scope requires explicit owner approval to add.

---

## 2. In-Scope — MVP Must Have

### 2.1 Modules (per Master Instruction §7)

| # | Module | MVP Deliverable |
|---|--------|-----------------|
| M1 | Authentication & Access Control | Login/logout, cookie session, RBAC (ADMIN/CASHIER/GUEST), protected routes server-side, password hashing |
| M2 | User & Cashier Management | ADMIN CRUD cashiers, enable/disable, reset password, `cashierSchedules` (soft) |
| M3 | Billiard Table Management | **CASHIER**: operational `AVAILABLE`↔`OCCUPIED` (via sessions/pay or explicit `POST /api/tables/:id/operational-status`), board; **ADMIN**: config + `UNDER_MAINTENANCE` (`MAINTENANCE`/`OUT_OF_SERVICE`), not operational |
| M4 | Pricing Management | Flat hourly `pricing` with `effectiveFrom`, snapshot preservation, current rate display |
| M5 | Session & Time Tracking | Start (walk-in/check-in), extend, end, server-authoritative `startedAt/endedAt`, per-minute billing, timer via timestamps |
| M6 | Reservation Management | Public create/cancel/view (guest name+contact), CASHIER check-in/NO_SHOW, conflict + buffer enforcement |
| M7 | Payment & Transaction | Bill calc (session+orders), Cash+GCash, full payment, PAID→COMPLETED, ADMIN void with reason |
| M8 | Food & Beverage Ordering | `products` catalog (ADMIN), CASHIER add `orders` to session, PENDING→SERVED, snapshot pricing |
| M9 | Dashboard, Reports & Audit | ADMIN dashboard (income today/week/month, utilization, hours), reports by date range, `activityLogs` append-only |
| M10 | Customer/Public Interface | Landing, table availability, rates, reservation form, confirmation/cancellation |

### 2.2 Cross-Cutting MVP

- MongoDB native driver, collections as §5 NoSQL design, indexes, transactions for atomicity
- Server-side Zod validation, error shape `{ error: { code, message } }`
- SvelteKit + TypeScript + Bun, `.env` for secrets, `.env.example` committed
- Git feature branches `feature/*` → `integration` → `main` (per §17)

---

## 3. In-Scope — Explicit Boundaries

| Area | Boundary |
|------|----------|
| **Operating hours** | 09:00–02:00 configurable via `.env`, enforced server-side |
| **Currency** | PHP, 2 decimals, per-minute ceil |
| **Rate change** | Never retroactive (snapshot) |
| **Timer** | No per-second DB writes; `startedAt` + computed elapsed |
| **Auth** | Cookie session stored in MongoDB (`authSessions`), not JWT stateless (revocable) |
| **Reports** | Aggregation pipelines, not external BI |
| **Receipt** | Screen + print via `window.print()`, no thermal printer integration in MVP |
| **Notifications** | In-app board only; no SMS/email/push in MVP |

---

## 4. Out-of-Scope — Deferred / Not MVP

| Item | Reason | Future Phase |
|------|--------|--------------|
| Customer USER accounts / login | Guest (name+contact) sufficient per Q03 | Phase 6+ |
| Online payment gateway (PayMongo/Stripe) | Cash+GCash manual ref only (Q16) | Post-MVP |
| Email/SMS notifications | No provider, board-only | Post-MVP |
| Real-time websockets | Poll 30s for dashboard/board (Q25) | Post-MVP (SvelteKit websockets) |
| Thermal printer integration | Screen printable only | Post-MVP |
| Peak/off-peak or per-table pricing | Flat hourly only (Q21) | Post-MVP |
| Multi-branch / multi-tenant | Single location | Post-MVP |
| Partial payment / deposits | Full payment only (Q17) | Post-MVP |
| Inventory management | Orders snapshot only, no stock deduction | Post-MVP |
| Mobile app | SvelteKit responsive web only | Post-MVP |
| Automated NO_SHOW SMS | Cron sets NO_SHOW only | Post-MVP |
| Hard cashier schedule block | Soft warning only (Q23) | Post-MVP if needed |

> Any out-of-scope item requested mid-build will be logged in `docs/08-change-log.md` and requires owner approval.

---

## 5. User Roles — Scope Per Role

| Capability | GUEST | CASHIER | ADMIN |
|------------|-------|---------|-------|
| View landing/rates/availability | ✅ | ✅ | ✅ |
| Create/cancel own reservation | ✅ | ✅ | ✅ |
| View all reservations / check-in | ❌ | ✅ | ❌ |
| Start/extend/end sessions | ❌ | ✅ | ❌ |
| Mark table AVAILABLE↔OCCUPIED (operational) | ❌ | ✅ | ❌ |
| Set UNDER_MAINTENANCE (MAINTENANCE/OUT_OF_SERVICE) | ❌ | ❌ | ✅ |
| Add/serve orders | ❌ | ✅ | ❌ |
| Collect payment (Cash/GCash) | ❌ | ✅ | ❌ |
| Void transaction | ❌ | ❌ | ✅ |
| CRUD pricing/products/cashiers (config) | ❌ | ❌ | ✅ |
| Create tables (config) | ❌ | ❌ | ✅ |
| Dashboard/reports/logs | ❌ | ❌ | ✅ |

---

## 6. Environments

| Env | DB | Auth | Notes |
|-----|----|------|-------|
| **Local** | `mongodb://localhost:27017/gamehub` | seeded ADMIN `admin / Admin123!` | `.env` not committed |
| **Production** | Atlas or self-hosted `MONGODB_URI` | env-provided ADMIN creds | Secrets via env only |

---

## 7. Constraints & Assumptions

- **NoSQL only** (§4): no MySQL/Postgres/Prisma/Drizzle/ORM.
- **Bun** as runtime + package manager.
- **Type-safe** throughout (`strict` TS).
- **Single deployment** (one SvelteKit server handles API + frontend).
- **Forever logs** (no TTL) — monitor disk.
- **Phone only** for guest contact (email optional).

---

## 8. Deliverables & Phase Mapping

| Phase | Deliverable | Scope Ref |
|-------|-------------|-----------|
| Phase 1 | SvelteKit+TS+Bun+Mongo scaffold, `.env.example`, git | M1 init |
| Phase 2 | NoSQL design + indexes + validation (05) | All collections |
| Phase 3 | Auth (login/logout/RBAC/protected routes) | M1 |
| Phase 4 | Admin: tables, pricing, cashiers, dashboard, logs | M2,M3,M4,M10 |
| Phase 5 | Cashier: board, sessions, timers, orders, payments | M5,M7,M8 |
| Phase 6 | Customer: landing, availability, reservation | M6,M11 |
| Phase 7 | Integration E2E (reserve→checkin→extend→order→pay) | All |
| Phase 8 | Tests + security + regressions | BR-32 |
| Phase 9 | Deploy + docs | — |

---

## 9. Acceptance Criteria for Scope Sign-off

- [ ] MVP modules M1–M11 listed above are agreed as must-have.
- [ ] Out-of-scope list is agreed; additions require change approval.
- [ ] No SQL ORM will be introduced.
- [ ] Single-location, flat hourly, guest-only reservations are accepted for MVP.

---

*Next: `05-nosql-design.md` — collections, documents, relationships, indexes, validation.*

