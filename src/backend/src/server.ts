import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiLimiter } from "./middleware/rateLimiters";

// Fail fast and loudly if critical secrets are missing or obviously weak,
// rather than letting jwt.sign()/verify() throw confusing errors deep in a
// request, or — worse — silently running with an empty/undefined secret.
function assertSecureEnv() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Refusing to start: without it, tokens cannot be signed/verified securely. " +
        "Set a long, random value in your .env (see backend/.env.example).",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      "JWT_SECRET is too short (< 32 characters). Use a long, random secret " +
        "(e.g. `openssl rand -hex 32`) so tokens cannot be brute-forced.",
    );
  }
  if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
    throw new Error(
      "CORS_ORIGIN must be explicitly set in production. Refusing to fall back to the " +
        "localhost defaults, which would either block your real frontend or (if edited " +
        "carelessly) accidentally allow every origin.",
    );
  }
}
assertSecureEnv();

const app = express();

// Trust the first proxy hop (e.g. a load balancer/reverse proxy in front of
// the app) so req.ip reflects the real client IP rather than the proxy's —
// required for the rate limiters below to key on the right address instead
// of accidentally rate-limiting the whole fleet as one "user".
app.set("trust proxy", 1);

// Security headers (HSTS, no-sniff, frame-deny/clickjacking protection,
// disables the old X-Powered-By fingerprinting header, etc). This is a pure
// JSON API consumed cross-origin by the frontend (already gated by the CORS
// allowlist above), so Cross-Origin-Resource-Policy is relaxed to
// "cross-origin" — helmet's "same-origin" default would otherwise cause
// browsers to block the frontend's own fetches whenever frontend and
// backend aren't served from behind the same reverse-proxy origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS_ORIGIN may be a single origin or a comma-separated list.
const DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

const resolveCorsOrigins = (raw: string | undefined): string[] => {
  if (!raw) return DEFAULT_CORS_ORIGINS;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : DEFAULT_CORS_ORIGINS;
};

app.use(cors({ origin: resolveCorsOrigins(process.env.CORS_ORIGIN) }));

// Bound request body size — an unauthenticated (or authenticated but
// malicious) client sending a huge JSON body is a cheap denial-of-service
// vector against a default "no limit" body parser.
app.use(express.json({ limit: "1mb" }));

// Baseline throttle across the whole API; auth-specific routes layer a much
// tighter limiter on top of this (see routes/authRoutes.ts).
app.use("/api", apiLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ONE API namespace for the whole unified backend: foundation, operations,
// and intelligence all live under /api (see routes/index.ts for the mount
// points and which ones require authentication).
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`StockSense backend running on port ${PORT}`);
});

export default app;
