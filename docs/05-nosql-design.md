# GameHub — NoSQL / MongoDB Data Model Design

**Version:** v1.0 Approved  
**Date:** 2026-08-23  
**Status:** ✅ APPROVED  
**Parents:** `01-user-workflows.md` v1.0, `03-business-rules.md` v1.0, `04-system-scope.md` v1.0  
**Driver:** `mongodb` native Node.js driver (no ORM per §4)  
**Bun + TypeScript `strict`**

> Final schema for MVP. All field names are canonical. `snake_case` is not used — `camelCase` throughout. Every collection uses `ObjectId` as `_id` unless noted. All dates stored as `Date` (UTC). Money as `number` (PHP, 2 decimals) — no floating-string.

---

## 1. Design Principles

- **Reference + Snapshot:** `sessions`/`reservations`/`transactions`/`orders` store `tableId`/`reservationId` as `ObjectId` refs **plus** `pricingSnapshot`/`productSnapshot` embedded for history (BR-21).
- **Embedded where atomic:** `sessions.extensions[]` embedded (always read with session); `orders.items[]` embedded; `transactions` embeds full cost breakdown.
- **No per-second writes:** `sessions` stores `startedAt/expectedEndAt/endedAt`; no timer field (BR-07).
- **Transactions for invariants:** Check-in, Pay, Seat use MongoDB multi-doc transactions (replica set required locally).
- **Indexes for invariants + query:** Partial unique indexes enforce BR-05, application checks enforce BR-03 range overlaps.
- **Validation:** JSON Schema (`$jsonSchema`) on collections + Zod server-side; schema is permissive on writes but strict on required fields.

---

## 2. Collections Overview

| Collection | Purpose | Est. Size | TTL |
|------------|---------|-----------|-----|
| `users` | ADMIN + CASHIER accounts (USER deferred) | <100 | No |
| `tables` | Billiard tables | <50 | No |
| `pricing` | Flat hourly rate history | <100 | No |
| `products` | Drinks/snacks catalog | <200 | No |
| `sessions` | Billiard sessions (ACTIVE→COMPLETED) | High | No |
| `reservations` | Guest reservations | High | No |
| `transactions` | Payments (PAID/VOIDED) | High | No |
| `orders` | F&B orders linked to session | High | No |
| `cashierSchedules` | Cashier operating hours | Low | No |
| `activityLogs` | Audit log (append-only, forever per BR-30) | Very High | No |
| `authSessions` | Cookie sessions (revocable) | Medium | **TTL 7 days** |

---

## 3. Schemas (TypeScript + MongoDB)

### 3.1 `users` — ADMIN & CASHIER

```ts
interface User {
  _id: ObjectId
  username: string        // unique, 3-30, /^[a-z0-9_]+$/i
  passwordHash: string    // bcrypt, never returned
  role: "ADMIN" | "CASHIER"
  displayName: string
  status: "ACTIVE" | "DISABLED"
  createdAt: Date
  updatedAt: Date
  createdBy?: ObjectId    // ADMIN who created
}
```

**Indexes:**
- `db.users.createIndex({ username: 1 }, { unique: true })`
- `db.users.createIndex({ role: 1, status: 1 })`

**Validation (`$jsonSchema`):** `username` required, `role` enum, `status` enum. `passwordHash` required on insert.

---

### 3.2 `tables` (role-separated)

```ts
interface Table {
  _id: ObjectId
  name: string            // unique, e.g. "Table 1", 1-30 chars
  description?: string    // 0-500
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE" // UNDER_MAINTENANCE = MAINTENANCE/OUT_OF_SERVICE (docs alias, DB keeps MAINTENANCE)
  createdAt: Date
  updatedAt: Date
  updatedBy?: ObjectId
}
```

**Indexes:**
- `db.tables.createIndex({ name: 1 }, { unique: true })`
- `db.tables.createIndex({ status: 1 })`

**Rule (role-separated, BR-12/BR-01):** `AVAILABLE`↔`OCCUPIED` **CASHIER-only** (`POST /api/sessions`, `POST /api/transactions` → `AVAILABLE`, or `POST /api/tables/:id/operational-status`); `ADMIN` attempting `403`. `UNDER_MAINTENANCE` (`MAINTENANCE`/`OUT_OF_SERVICE`) **ADMIN-only** (`PATCH /api/admin/tables`); `CASHIER` attempting `403`. Cannot set `MAINTENANCE` if active `ACTIVE/EXTENDED` session exists (check).

---

### 3.3 `pricing`

```ts
interface Pricing {
  _id: ObjectId
  ratePerHour: number     // >0, e.g. 100, 120; 2 decimals
  effectiveFrom: Date
  effectiveTo?: Date | null
  isActive: boolean       // only one true
  createdAt: Date
  createdBy: ObjectId     // ADMIN
}

interface PricingSnapshot {
  pricingId: ObjectId
  ratePerHour: number
  effectiveFrom: Date
}
```

**Indexes:**
- `db.pricing.createIndex({ isActive: 1 }, { partialFilterExpression: { isActive: true }, unique: true })` // at most one active
- `db.pricing.createIndex({ effectiveFrom: -1 })`

---

### 3.4 `products`

```ts
interface Product {
  _id: ObjectId
  name: string            // unique, 1-80
  category: "DRINK" | "SNACK" | "OTHER"
  unitPrice: number       // >0
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `db.products.createIndex({ name: 1 }, { unique: true })`
- `db.products.createIndex({ category: 1, isAvailable: 1 })`

---

### 3.5 `reservations`

```ts
interface Reservation {
  _id: ObjectId
  tableId: ObjectId       // ref tables
  customerName: string    // 2-80, trimmed
  customerContact: string // normalized 09..., indexed
  customerEmail?: string | null
  date: string            // "YYYY-MM-DD" (local date for grouping)
  startTime: Date         // full UTC Date (start)
  endTime: Date           // start + duration (exclusive)
  durationMinutes: number // 30-480
  status: "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "NO_SHOW" | "EXPIRED"
  pricingSnapshot: PricingSnapshot
  createdAt: Date
  updatedAt: Date
  checkedInSessionId?: ObjectId | null
  cancelledAt?: Date | null
  cancelledBy?: "GUEST" | ObjectId | null
}
```

**Indexes:**
- `db.reservations.createIndex({ tableId: 1, startTime: 1, endTime: 1 })` // overlap lookup
- `db.reservations.createIndex({ status: 1, date: 1, startTime: 1 })`
- `db.reservations.createIndex({ customerContact: 1, startTime: 1 })`
- `db.reservations.createIndex({ tableId: 1, status: 1 })`

**Enforcement:** BR-03 overlap check via query: `tableId== && status==CONFIRMED && startTime < newEnd && endTime > newStart` (+10min buffer applied to newEnd/existing). Wrapped in transaction on insert.

---

### 3.6 `sessions`

```ts
interface SessionExtension {
  extendedAt: Date
  addedMinutes: number    // 15-240
  previousExpectedEndAt: Date
  newExpectedEndAt: Date
  approvedBy: ObjectId    // CASHIER/ADMIN
}

interface Session {
  _id: ObjectId
  tableId: ObjectId
  reservationId?: ObjectId | null // null = walk-in
  customerName?: string | null    // denormalized for walk-in / display
  customerContact?: string | null
  status: "ACTIVE" | "EXTENDED" | "ENDED" | "COMPLETED" | "VOIDED"
  startedAt: Date
  expectedEndAt: Date
  endedAt?: Date | null
  durationMinutes?: number | null // computed on end
  pricingSnapshot: PricingSnapshot
  extensions: SessionExtension[]  // embedded, default []
  startedBy: ObjectId     // CASHIER
  endedBy?: ObjectId | null
  createdAt: Date
  updatedAt: Date
  // derived for queries: not stored as status RESERVED (see BR-12)
}
```

**Indexes:**
- `db.sessions.createIndex({ tableId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["ACTIVE","EXTENDED"] } } })` // BR-05
- `db.sessions.createIndex({ status: 1, startedAt: -1 })`
- `db.sessions.createIndex({ reservationId: 1 }, { unique: true, sparse: true })` // one session per reservation (BR-10)
- `db.sessions.createIndex({ tableId: 1, startedAt: -1 })`

---

### 3.7 `transactions`

```ts
interface Transaction {
  _id: ObjectId
  sessionId: ObjectId     // unique per session when PAID
  reservationId?: ObjectId | null
  tableId: ObjectId
  cashierId: ObjectId
  status: "PAID" | "VOIDED"
  method: "CASH" | "GCASH"
  gcashRef?: string | null // required if GCASH
  sessionCost: number     // computed
  ordersCost: number      // Σ orders total
  total: number           // sessionCost + ordersCost
  amountTendered: number
  change: number
  pricingSnapshot: PricingSnapshot
  paidAt: Date
  voidedAt?: Date | null
  voidedBy?: ObjectId | null
  voidReason?: string | null // 10-500 if voided
  createdAt: Date
}
```

**Indexes:**
- `db.transactions.createIndex({ sessionId: 1 }, { unique: true, partialFilterExpression: { status: "PAID" } })`
- `db.transactions.createIndex({ tableId: 1, paidAt: -1 })`
- `db.transactions.createIndex({ cashierId: 1, paidAt: -1 })`
- `db.transactions.createIndex({ status: 1, paidAt: -1 })`
- `db.transactions.createIndex({ paidAt: -1 })` // reports

---

### 3.8 `orders`

```ts
interface OrderItem {
  productId: ObjectId
  nameSnapshot: string
  unitPriceSnapshot: number
  qty: number             // >=1
  lineTotal: number
}

interface Order {
  _id: ObjectId
  sessionId: ObjectId     // ref sessions
  tableId: ObjectId       // denormalized
  items: OrderItem[]      // 1..N
  total: number
  status: "PENDING" | "SERVED" | "CANCELLED"
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
  servedAt?: Date | null
}
```

**Indexes:**
- `db.orders.createIndex({ sessionId: 1, createdAt: 1 })`
- `db.orders.createIndex({ tableId: 1, status: 1 })`
- `db.orders.createIndex({ status: 1, createdAt: -1 })`

---

### 3.10 `cashierSchedules`

```ts
interface CashierSchedule {
  _id: ObjectId
  cashierId: ObjectId     // ref users
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sun
  startTime: string       // "09:00"
  endTime: string         // "18:00"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `db.cashierSchedules.createIndex({ cashierId: 1, dayOfWeek: 1 })`

---

### 3.11 `activityLogs` (append-only)

```ts
interface ActivityLog {
  _id: ObjectId
  actorId?: ObjectId | null // null = system / guest
  actorRole?: "ADMIN" | "CASHIER" | "GUEST" | "SYSTEM" | null
  action: string // e.g. "RESERVATION_CREATED", "SESSION_EXTENDED" (enum in code)
  targetCollection?: string | null
  targetId?: ObjectId | string | null
  before?: object | null
  after?: object | null
  ip?: string | null
  createdAt: Date // indexed, never updated
}
```

**Indexes:**
- `db.activityLogs.createIndex({ createdAt: -1 })`
- `db.activityLogs.createIndex({ actorId: 1, createdAt: -1 })`
- `db.activityLogs.createIndex({ action: 1, createdAt: -1 })`
- `db.activityLogs.createIndex({ targetCollection: 1, targetId: 1 })`

**No UPDATE/DELETE API.** No TTL (BR-30).

---

### 3.12 `authSessions` (cookie sessions)

```ts
interface AuthSession {
  _id: ObjectId
  userId: ObjectId
  role: "ADMIN" | "CASHIER"
  tokenHash: string       // sha256 of random token, not raw token
  createdAt: Date
  expiresAt: Date         // +7 days
  lastActiveAt: Date
  ip?: string | null
  userAgent?: string | null
}
```

**Indexes:**
- `db.authSessions.createIndex({ tokenHash: 1 }, { unique: true })`
- `db.authSessions.createIndex({ userId: 1 })`
- `db.authSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })` // TTL — auto-deletes after expiry

---

## 4. Relationships (Reference Diagram)

```
users 1──* cashierSchedules
users 1──* pricing (createdBy)
users 1──* tables (updatedBy)
users 1──* authSessions

tables 1──* reservations
tables 1──* sessions
tables 1──* transactions / orders (denormalized tableId)

reservations 1──0..1 sessions (reservationId unique)
sessions 1──* orders
sessions 1──0..1 transactions

products 1──* orders.items.productId (snapshot, not FK cascade)

users 1──* activityLogs (actorId)
```

---

## 5. Index Creation Script (Bun + native driver)

```ts
// src/lib/server/db/indexes.ts
export async function ensureIndexes(db: Db) {
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("tables").createIndex({ name: 1 }, { unique: true });
  await db.collection("pricing").createIndex({ isActive: 1 }, { partialFilterExpression: { isActive: true }, unique: true });
  await db.collection("products").createIndex({ name: 1 }, { unique: true });
  await db.collection("reservations").createIndex({ tableId: 1, startTime: 1, endTime: 1 });
  await db.collection("reservations").createIndex({ status: 1, date: 1 });
  await db.collection("sessions").createIndex({ tableId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["ACTIVE","EXTENDED"] } } });
  await db.collection("sessions").createIndex({ reservationId: 1 }, { unique: true, sparse: true });
  await db.collection("transactions").createIndex({ sessionId: 1 }, { unique: true, partialFilterExpression: { status: "PAID" } });
  await db.collection("orders").createIndex({ sessionId: 1, createdAt: 1 });
  await db.collection("activityLogs").createIndex({ createdAt: -1 });
  await db.collection("authSessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  // ... remaining indexes as above
}
```

Run on server startup (`hooks.server.ts` or `src/lib/server/db/index.ts`).

---

## 6. Validation Strategy

- **MongoDB `$jsonSchema`:** Minimal — require `_id`, `createdAt`, enums, `ratePerHour >0`, etc. Not full business logic (overlaps, state machines are app-enforced).
- **Zod:** Authoritative for all writes (`src/lib/schemas/*.ts`). Example:

```ts
export const reservationCreateSchema = z.object({
  tableId: z.string().length(24),
  customerName: z.string().trim().min(2).max(80),
  customerContact: z.string().regex(/^(\+639|09)\d{9}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.coerce.date(),
  durationMinutes: z.number().int().min(30).max(480),
});
```

---

## 7. Aggregation Examples (Reports)

**Income per day:**
```js
db.transactions.aggregate([
  { $match: { status: "PAID", paidAt: { $gte: from, $lte: to } } },
  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } }, total: { $sum: "$total" }, count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

**Table utilization:**
```js
db.sessions.aggregate([
  { $match: { status: "COMPLETED", startedAt: { $gte: from } } },
  { $group: { _id: "$tableId", totalMinutes: { $sum: "$durationMinutes" }, sessions: { $sum: 1 } } },
  { $lookup: { from: "tables", localField: "_id", foreignField: "_id", as: "table" } }
])
```

**Sweeper (NO_SHOW):**
```js
db.reservations.updateMany(
  { status: "CONFIRMED", startTime: { $lt: new Date(Date.now() - 15*60*1000) } },
  { $set: { status: "NO_SHOW", updatedAt: new Date() } }
)
```

---

## 8. Seed Data (Development)

- 1 ADMIN `admin / Admin123!` (hashed)
- 2 CASHIER `cashier1 / Cashier123!`
- 8 Tables `Table 1..8` AVAILABLE
- 1 Pricing `₱120/hr` isActive
- 6 Products (Coke, Water, Beer, Chips, Nuts, Burger)

Seed script: `src/lib/server/db/seed.ts` (idempotent, upsert).

---

## 9. Operational Notes

- **Replica set required** for transactions locally: `mongod --replSet rs0` + `rs.initiate()`, or use `mongodb-memory-server` with replSet for tests.
- **ObjectId vs string:** Driver stores `ObjectId`; API accepts `string` (24 hex) and converts via `new ObjectId(id)` with validation; invalid → `400 E_INVALID_ID`.
- **Dates:** Always `new Date()` server-side; never trust client `startedAt`.
- **Money:** Store as `number` with 2-decimals; use `Math.round(v*100)/100` on server calc.
- **NoSQL anti-patterns avoided:** No SQL JOIN emulation via app loops — use `$lookup` when needed; no Prisma; no relational FK cascade — snapshot instead.

---

*Next: `06-architecture.md` — SvelteKit layers, API routes, auth, error handling, timer architecture.*

