# GameHub — System Architecture

**Version:** v1.0 Approved  
**Date:** 2026-08-23  
**Parents:** `01` Workflows, `03` Business Rules, `04` Scope, `05` NoSQL Design  
**Stack:** SvelteKit 2 + Svelte 4/5, TypeScript `strict`, Bun, MongoDB native driver, Zod

---

## 1. High-Level Architecture

```
Browser (Svelte)  ──fetch/SSR──>  SvelteKit Server (Node/Bun)
                                   ├─ +page.server.ts / +layout.server.ts (SSR + RBAC)
                                   ├─ /api/* (JSON, Zod validation)
                                   ├─ hooks.server.ts (auth, locals.user)
                                   └─ lib/server/* (db, services, auth)
                                          │
                                          └─ MongoDB (replicaSet, transactions)
```

Single deployment: SvelteKit handles both SSR pages and JSON API. No separate Express server.

---

## 2. Project Structure (proposed, Phase 1 scaffold)

```
C:\GameHub\
├─ docs\                          # planning docs (this folder)
├─ src\
│  ├─ app.html
│  ├─ hooks.server.ts             # auth cookie → locals.user, CSRF
│  ├─ lib\
│  │  ├─ schemas\                 # Zod schemas (reservation, session, etc.)
│  │  ├─ utils\                   # money, date, phone normalize
│  │  └─ server\
│  │     ├─ db\                   # mongo.ts, indexes.ts, seed.ts
│  │     ├─ auth\                 # hash.ts, session.ts, rbac.ts
│  │     ├─ services\             # reservations.service.ts, sessions.service.ts, ...
│  │     └─ logger.ts
│  ├─ routes\
│  │  ├─ +layout.svelte
│  │  ├─ +page.svelte             # Landing
│  │  ├─ login\                   # GUEST/CASHIER/ADMIN login
│  │  ├─ tables\                  # public availability + rates
│  │  ├─ reservations\[id]\       # confirmation / cancel
│  │  ├─ api\
│  │  │  ├─ auth\{login,logout,me}
│  │  │  ├─ reservations\         # POST / GET / [id]/cancel / [id]/checkin
│  │  │  ├─ tables\               # GET status, ADMIN CRUD
│  │  │  ├─ sessions\             # POST start, [id]/extend, [id]/end, [id]/bill
│  │  │  ├─ queue\                # CRUD + call/seat
│  │  │  ├─ orders\               # POST, PATCH status
│  │  │  ├─ transactions\         # POST pay, [id]/void
│  │  │  ├─ products\             # ADMIN CRUD
│  │  │  ├─ pricing\              # GET current, ADMIN POST
│  │  │  └─ admin\{dashboard,reports,logs,cashiers}
│  │  ├─ (cashier)\               # group, requires CASHIER
│  │  │  ├─ board\                # live table board + timers
│  │  │  ├─ reservations\
│  │  │  ├─ queue\
│  │  │  └─ sessions\
│  │  └─ (admin)\                 # group, requires ADMIN
│  │     ├─ dashboard\
│  │     ├─ tables\
│  │     ├─ pricing\
│  │     ├─ cashiers\
│  │     ├─ reports\
│  │     └─ logs\
│  └─ app.d.ts                    # App.Locals { user? }
├─ static\
├─ .env.example
├─ .gitignore
├─ package.json (Bun)
├─ svelte.config.js
├─ tsconfig.json
└─ vite.config.ts
```

**Module boundaries:** `lib/server/services/*` one file per module (no giant service). Pages thin; logic in services.

---

## 3. Request Lifecycle

1. `hooks.server.ts` reads `auth_token` httpOnly cookie → `sha256` → lookup `authSessions` → validates `expiresAt` → sets `event.locals.user = { _id, username, role }` or `null`.
2. `+layout.server.ts` / `+server.ts` checks `locals.user.role` against required role → `redirect 303 /login` or `403`.
3. API `+server.ts` parses JSON, validates via `zod` schema → calls `service.*` (which opens transaction if needed) → returns `{ data }` or `{ error: { code, message } }`.
4. Service writes to Mongo + appends `activityLogs` in same or separate write (not in same transaction if logs collection is large; but still awaited).

---

## 4. Auth & RBAC

- **Password:** `bcrypt` hash (`Bun.password` or `bcryptjs`), cost 12.
- **Session creation:** `POST /api/auth/login` → verify hash → generate `crypto.randomUUID()` token → store `sha256(token)` in `authSessions` with `expiresAt = now+7d` → set `Set-Cookie: auth_token=rawToken; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.
- **Logout:** delete `authSessions` doc + clear cookie.
- **RBAC helper:**
```ts
export function requireRole(locals: App.Locals, ...roles: Role[]) {
  if (!locals.user) throw error(401, { code: "E_UNAUTHENTICATED" });
  if (!roles.includes(locals.user.role)) throw error(403, { code: "E_FORBIDDEN" });
}
```
- **Protected groups:** `(cashier)/+layout.server.ts` calls `requireRole(locals, "CASHIER","ADMIN")`; `(admin)` requires `"ADMIN"`.

---

## 5. API Conventions

- **Base:** `/api/*` returns JSON.
- **Success:** `200/201 { data: ... }` or `204`.
- **Error:** `{ error: { code: "E_...", message: string, details?: object } }` with status (400/401/403/404/409/422/500). Codes stable per BR-32.
- **Validation:** `400 E_VALIDATION` with `details: { fieldErrors }` from Zod.
- **Idempotency:** `Idempotency-Key` header for check-in/pay (stored 24h in separate collection or in-memory if single instance; replay returns cached response).
- **No lean ORM:** Direct `db.collection("...")` with typed helpers `collection<T>`.

---

## 6. Timer Architecture (BR-07)

```ts
// Client (board.svelte)
let elapsed = $derived(Math.floor((Date.now() - new Date(session.startedAt).getTime())/1000));
let interval: ReturnType<typeof setInterval>;
onMount(() => { interval = setInterval(() => elapsed = ..., 1000); });
onDestroy(() => clearInterval(interval));

// Server (end)
// durationMinutes = Math.ceil((endedAt.getTime() - startedAt.getTime())/60000);
```

Poll board data every 10–30s (`fetch /api/tables/status`) rather than per-second. `expectedEndAt` drives remaining display.

---

## 7. Security

- `.env` never committed; `.env.example` lists `MONGODB_URI`, `AUTH_SECRET`, `OPERATING_HOURS`.
- Cookies `HttpOnly`, `Secure` in production, `SameSite=Lax`.
- Rate limit login: 5/min per IP (in-memory or `authSessions` count).
- No passwordHash/ tokenHash returned to client.
- All inputs `zod` validated server-side; `ObjectId.isValid` check → 400 if invalid.
- `activityLogs` append-only; no client can write directly.

---

## 8. Environment & Config

```env
# .env.example
MONGODB_URI=mongodb://localhost:27017/gamehub?replicaSet=rs0
AUTH_SECRET=change-me-32chars
OPERATING_HOURS=09:00-02:00
ORIGIN=http://localhost:5173
```

Loaded via `$env/static/private` or `$env/dynamic/private`.

---

## 9. Testing Strategy

- **Unit:** `vitest` for services (mock `Db`), Zod schemas, money calc.
- **Integration:** `mongodb-memory-server` with replSet for transactions.
- **E2E:** `playwright` for critical path: reserve → check-in → extend → order → pay → dashboard.
- **Coverage:** Each BR has a negative test (see `03-business-rules.md` §12).

---

## 10. Deployment (Phase 9 outline)

- `bun run build` → Vite + SvelteKit `adapter-node` (or `adapter-auto`).
- `MONGODB_URI` from Atlas/self-hosted; replica set required for transactions.
- `ORIGIN` and `AUTH_SECRET` set in prod env.
- Seed script idempotent; indexes ensured on startup.

---

*Next: `07-backlog.md` — ordered development backlog.*

