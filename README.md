# GameHub — Billiard Time Tracking and Management System

**Phase:** 1 — Project Setup (SvelteKit + TypeScript + Bun + MongoDB)  
**Docs:** `docs/01-user-workflows.md` through `docs/07-backlog.md` (v1.0 Approved)

## Quick Start

```bash
# install
bun install

# env (copy and edit if needed)
# .env already created with default mongodb://localhost:27017/gamehub?replicaSet=rs0
# If your Mongo is not replicaSet, use: mongodb://localhost:27017/gamehub

# check DB + indexes
bun run db:check

# seed (idempotent)
bun run seed
# admin / Admin123!  — cashier1 / Cashier123!

# dev
bun run dev
# http://localhost:5173

# type check
bun run check

# build
bun run build
```

## Stack (per Master Instruction §3)

- SvelteKit 2 + Svelte 5 (runes) + TypeScript strict + Bun
- MongoDB native driver (no SQL ORM)
- Zod (validation, next phase), bcryptjs

## Collections (05-nosql-design.md)

`users`, `tables`, `pricing`, `products`, `sessions`, `reservations`, `transactions`, `orders`, `queueEntries`, `cashierSchedules`, `activityLogs`, `authSessions`

## Notes

- Timer architecture: store `startedAt`/`endedAt`, frontend computes elapsed — no per-second DB writes.
- ReplicaSet `rs0` recommended for transactions (see `docs/05-nosql-design.md` §9). App works without it for Phase 1, but Phase 5 transactions require it.
- To enable replicaSet locally: see `mongod.cfg` `replSetName: rs0` + `rs.initiate()` in mongosh.

## Progress � 2026-08-29 14:47
- QA ? main sync, MongoDB local data fix, green contribution trigger

