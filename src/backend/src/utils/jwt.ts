import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
const RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN || "10m";

export interface TokenPayload {
  userId: string;
  email: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, JWT_SECRET) as TokenPayload;

/**
 * Short-lived, single-purpose token issued after a successful OTP check
 * (see authService.verifyOtp). It stands in for a "reset session" so that
 * /reset-password no longer needs the raw OTP re-sent, and so a verified
 * OTP can't be reused indefinitely once its short window has passed.
 */
export interface ResetTokenPayload {
  userId: string;
  otpId: string;
  purpose: "password-reset";
}

export const signResetToken = (payload: Omit<ResetTokenPayload, "purpose">): string =>
  jwt.sign({ ...payload, purpose: "password-reset" }, JWT_SECRET, {
    expiresIn: RESET_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);

export const verifyResetToken = (token: string): ResetTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
  if (decoded.purpose !== "password-reset") {
    throw new Error("Invalid token purpose.");
  }
  return decoded;
};
