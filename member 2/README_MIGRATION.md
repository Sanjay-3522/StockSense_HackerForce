# StockSense — Supabase → Express + Prisma + PostgreSQL Migration

## What changed
- Removed `@supabase/supabase-js`, `src/lib/supabase.ts`, and `supabase/migrations/`.
- Added `backend/` — an Express + TypeScript + Prisma + PostgreSQL API implementing
  every route from the spec (receipts, deliveries, transfers, adjustments, lookups).
- The 6 Postgres RPC functions (`validate_receipt`, `pick_delivery`, `pack_delivery`,
  `validate_delivery`, `complete_transfer`, `confirm_adjustment`) were reimplemented as
  Prisma `$transaction` service functions with the same idempotency/atomicity guarantees
  (row locking via `SELECT ... FOR UPDATE`, status checked before mutating, single
  transaction per operation). See `backend/src/services/`.
- The existing Member 2 UI (`src/components/**`) is untouched except for swapping
  `supabase.from(...)` / `supabase.rpc(...)` calls for calls to the new
  `src/lib/api.ts` REST client — same functions, same signatures, same return shapes.
  No JSX, styling, or component structure changed.
- Added `PATCH /api/{receipts,deliveries,transfers}/:id/status` — a plain status
  update (no stock/ledger effect) needed by the Kanban board's drag-and-drop, which
  previously updated Supabase directly.

## Running it

### Backend
```
cd backend
cp .env.example .env   # set DATABASE_URL to your Postgres instance
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed    # optional: loads the same sample data the old SQL migration seeded
npm run dev             # http://localhost:4000
```

### Frontend
```
cp .env.example .env    # VITE_API_URL defaults to http://localhost:4000
npm install
npm run dev
```

## Verified in this environment
- `npm run typecheck` (frontend, `tsc --noEmit`) — passes.
- `npm run build` (frontend, Vite) — passes.
- `grep -ri supabase` across the repo — zero functional/config references (only
  a few explanatory code comments mentioning the old system, e.g. "replaces
  src/lib/supabase.ts").

## Not verified here (needs your machine / normal internet access)
This sandbox's network allowlist blocks `binaries.prisma.sh`, so `npx prisma generate`
could not download the query-engine binary here, which means I could not run
`tsc --noEmit` or `npm run build` for the **backend** in this session. The backend
code was written and reviewed carefully by hand, mirroring the original SQL
line-for-line, but please run this yourself once you have Postgres + normal
internet access:
```
cd backend && npm install && npx prisma generate && npm run typecheck
```

## Assumptions about Member 1's foundation models
`Product`, `Warehouse`, `Location`, `Stock`, and `ProductCategory` are defined in
`backend/prisma/schema.prisma` with the exact same field names as the old Supabase
tables, marked with a comment as placeholders. When Member 1's backend/schema is
ready, replace these models with theirs (or point the foreign keys at their
service) — nothing in Member 2's operation tables needs to change since they
only reference `productId`/`locationId`/`warehouseId` as opaque UUIDs.
