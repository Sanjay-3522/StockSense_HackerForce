import { randomInt } from "crypto";

/**
 * Generates a 6-digit numeric OTP and its expiry timestamp, driven by
 * OTP_EXPIRY_MINUTES from the environment. Uses Node's cryptographically
 * secure `crypto.randomInt` rather than `Math.random`, which is not safe
 * for security-sensitive values like OTPs.
 */
export const generateOtp = (): string => randomInt(100000, 1000000).toString();

export const getOtpExpiry = (): Date => {
  const minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  return new Date(Date.now() + minutes * 60 * 1000);
};
