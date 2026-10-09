import { z } from "zod";

// A modest strength floor: 8+ characters with at least one letter and one
// number. Deliberately not maximalist (no forced symbols/uppercase, no
// silly max-length) — those rules push people toward predictable patterns
// or password reuse without meaningfully raising real-world guess cost.
// Length + a mix of character types is what actually matters against
// offline brute force.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  password: passwordSchema,
  role: z.enum(["INVENTORY_MANAGER", "WAREHOUSE_STAFF"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  // Intentionally not re-checking strength rules on login: a user's
  // existing password may predate a policy change, and login should only
  // ever say "invalid credentials" — never "your password doesn't meet
  // our current rules", which would leak information about the account.
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email is required"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("A valid email is required"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});
