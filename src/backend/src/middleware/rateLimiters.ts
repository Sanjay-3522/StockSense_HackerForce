import rateLimit from "express-rate-limit";

/**
 * Applied to the whole /api surface. Generous enough for normal UI usage
 * (list/detail pages firing several requests per navigation) while still
 * bounding scripted abuse and accidental infinite-retry loops.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down and try again shortly." },
});

/**
 * Applied only to the auth router. Login/signup/forgot-password/verify-otp
 * are the endpoints an attacker would actually want to brute force or
 * enumerate against, so they get a much tighter budget than the rest of
 * the API. Keyed by IP + the submitted email/identifier so a single
 * attacker can't just rotate emails to dodge the limit, and a shared
 * office IP doesn't get punished for one user's typos.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${req.ip}:${identifier}`;
  },
  message: {
    success: false,
    message: "Too many attempts. Please wait a few minutes before trying again.",
  },
});

/**
 * Extra-tight limiter specifically for OTP verification, since a 6-digit
 * numeric code has a much smaller search space than a password and is
 * otherwise guessable within the general auth budget above.
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${req.ip}:${identifier}`;
  },
  message: {
    success: false,
    message: "Too many verification attempts. Please request a new code.",
  },
});
