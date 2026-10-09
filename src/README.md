# StockSense

Full-stack inventory management system — Express + Prisma + PostgreSQL backend, React + TypeScript + Vite frontend.

## Project layout

```
backend/   Express + Prisma + PostgreSQL API (source of truth for all data)
frontend/  React + TypeScript + Vite SPA (talks only to backend/src via /api)
```

The two are already wired together:

- **Frontend → backend**: `frontend/vite.config.ts` proxies `/api/*` to `http://localhost:4000` in dev, so the frontend's `api/client.ts` can call relative paths like `/api/products` with no CORS issues.
- **Backend → frontend**: `backend/src/server.ts` reads `CORS_ORIGIN` (defaults include `http://localhost:5173`, Vite's default port) and only mounts one API namespace at `/api`.
- **Root scripts**: the root `package.json` uses `concurrently` to run both dev servers with one command.

## First-time setup

```bash
npm install              # installs concurrently at the root
npm install --prefix backend
npm install --prefix frontend
```

`backend`'s `postinstall` script runs `prisma generate` automatically. If you ever need to run it manually:

```bash
npm run prisma:generate --prefix backend
```

### Configure the database

Edit `backend/.env` (copy from `backend/.env.example` if you don't have one) and set `DATABASE_URL` to your PostgreSQL instance. Then apply migrations and (optionally) seed data:

```bash
npm run prisma:migrate --prefix backend
npm run seed --prefix backend
```

## Running in development

From the repo root:

```bash
npm run dev
```

This starts the backend on **:4000** and the frontend on **:5173** together (colored `backend`/`frontend` log prefixes). Open `http://localhost:5173`.

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Building for production

```bash
npm run build             # builds the frontend (tsc -b && vite build) into frontend/dist
npm run build --prefix backend   # compiles the backend into backend/dist
```

Serve `frontend/dist` with any static host / reverse proxy, and run the compiled backend with `npm start --prefix backend`. Point the proxy's `/api` path at the backend process, and set `CORS_ORIGIN` to your production frontend origin.

## Security

Hardening applied on top of the existing bcrypt + JWT + Prisma + Zod foundation:

- **Rate limiting**: a tight limiter (`authLimiter`, keyed by IP + submitted email) on signup/login/forgot-password/reset-password, an even tighter one (`otpLimiter`) on OTP verification, and a general limiter across all of `/api` — see `backend/src/middleware/rateLimiters.ts`.
- **Security headers**: `helmet()` is applied globally (HSTS, no-sniff, clickjacking protection, no `X-Powered-By` fingerprinting).
- **User enumeration fixed**: `/auth/forgot-password` and `/auth/verify-otp` now return the same generic response whether or not the email exists, instead of leaking account existence.
- **Startup secret validation**: the server refuses to boot if `JWT_SECRET` is missing or under 32 characters, or if `NODE_ENV=production` without an explicit `CORS_ORIGIN`.
- **Stronger passwords**: 8+ characters with a letter and a number (was 6, no complexity check), enforced by Zod on both signup and reset.
- **Stronger hashing**: bcrypt cost factor raised from 10 to 12.
- **Request size limit**: JSON bodies capped at 1MB to blunt payload-based DoS.
- **`.gitignore` fixed**: it previously only ignored `.env*.local`, so a real `backend/.env` would have been committed. It now ignores all real `.env` files and keeps only the `.env.example` templates.
- **Already solid, verified rather than changed**: no SQL injection surface (Prisma's parameterized queries throughout, including the two `$queryRaw` calls in `ledgerService.ts`/`adjustmentService.ts`, which use tagged-template interpolation, not string concatenation); password hashes are never included in any API response; the centralized error handler never leaks stack traces or raw database errors to the client; `npm audit` is clean on both `backend` and `frontend`; no `dangerouslySetInnerHTML`/`eval` in the frontend (React escapes all rendered content by default).

### You must do this before deploying

**`backend/.env` in this project contains a live Neon Postgres connection string and JWT secret.** Treat both as already compromised — rotate the database password/connection string in Neon and generate a fresh `JWT_SECRET` (`openssl rand -hex 32`) before this goes anywhere near production. Anyone who has seen this repo, this chat, or any copy of `backend/.env` has those credentials.

### Known gaps not addressed here (need a product decision, not a guess)

- **No role-based authorization.** `WAREHOUSE_STAFF` and `INVENTORY_MANAGER` currently have identical access to every endpoint, including destructive ones (deleting warehouses, products, categories). Every route only checks "is this a valid logged-in user", never "is this user allowed to do *this*". If staff should be restricted from certain actions, that needs an explicit permission matrix — tell me what each role should/shouldn't be able to do and I'll implement an `authorize(...)` middleware for it rather than guessing and breaking legitimate workflows.
- **JWT stored in `localStorage`** (`frontend/src/api/client.ts`), which is readable by any JavaScript that runs on the page — so a successful XSS anywhere in the app would be able to steal the token. The app doesn't currently have an XSS hole (no `dangerouslySetInnerHTML`, no unescaped rendering), so this is a defense-in-depth gap rather than an active vulnerability. The stronger alternative is an httpOnly cookie-based session, which is a real architecture change (backend sets/reads cookies, CSRF protection needed, frontend stops managing the token) — happy to do that as a separate, focused task if you want it.
- **Token lifetime**: `JWT_EXPIRES_IN=1d` with no refresh-token/revocation mechanism, so a stolen token is valid for up to a day with no way to invalidate it server-side. Shortening this is a one-line config change but pushes users to log in more often; a refresh-token flow avoids that trade-off but is a bigger addition.
- **OTP delivery**: `forgotPassword` still returns the OTP directly in the response outside of `NODE_ENV=production`. That's fine for local/dev use but means any non-production deployment (staging, demos) effectively has no real OTP secrecy. Wiring up a real email/SMS provider is a prerequisite for using this flow anywhere the response body isn't fully trusted.

## Notes

- No Supabase/Firebase — PostgreSQL via Prisma and the backend's own JWT auth are the only persistence/auth layers.
- The frontend never talks to the database directly; every page goes through the existing `backend/src/routes` + `frontend/src/api/*.ts` clients.
