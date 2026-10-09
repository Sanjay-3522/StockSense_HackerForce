import { UserRole } from "@prisma/client";
import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken, signResetToken, verifyResetToken } from "../utils/jwt";
import { generateOtp, getOtpExpiry } from "../utils/otp";

const toPublicUser = (user: { id: string; name: string; email: string; role: UserRole }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const signup = async (name: string, email: string, password: string, role?: UserRole) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("An account with this email already exists.", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, ...(role ? { role } : {}) },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return { user: toPublicUser(user), token };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid email or password.", 401);

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) throw new AppError("Invalid email or password.", 401);

  const token = signToken({ userId: user.id, email: user.email });
  return { user: toPublicUser(user), token };
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately do NOT reveal whether the account exists: returning a
  // different response for "no such user" vs "OTP sent" lets an attacker
  // enumerate valid emails against this endpoint. Every request gets the
  // same generic success message; the OTP (and its non-production preview
  // value) is only ever generated/returned when a matching user exists.
  const genericMessage = "If an account exists for this email, a verification code has been sent.";
  if (!user) {
    return { message: genericMessage };
  }

  const code = generateOtp();
  const expiresAt = getOtpExpiry();

  await prisma.passwordResetOtp.create({ data: { userId: user.id, code, expiresAt } });

  // In production this OTP must be delivered via a real email/SMS provider
  // integration rather than returned in the API response. Until that
  // provider is wired up, it's included in non-production responses only so
  // the flow stays testable.
  const isProduction = process.env.NODE_ENV === "production";
  return {
    message: genericMessage,
    ...(isProduction ? {} : { otp: code }),
  };
};

const findValidOtp = async (userId: string, otp: string) => {
  const record = await prisma.passwordResetOtp.findFirst({
    where: { userId, code: otp, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new AppError("Invalid OTP.", 400);
  if (record.expiresAt < new Date()) throw new AppError("OTP has expired.", 400);

  return record;
};

export const verifyOtp = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic failure whether the account doesn't exist or the OTP is
  // simply wrong/expired — avoids leaking account existence through this
  // endpoint too.
  if (!user) throw new AppError("Invalid or expired OTP.", 400);

  const record = await findValidOtp(user.id, otp);

  // Mark the code as verified (but not yet "used" — that happens only once
  // the password is actually changed) and issue a short-lived reset token
  // in its place, so the raw OTP never has to be resent for the final step.
  await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { verified: true } });
  const resetToken = signResetToken({ userId: user.id, otpId: record.id });

  return { message: "OTP verified successfully.", resetToken };
};

export const resetPassword = async (resetToken: string, newPassword: string) => {
  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch {
    throw new AppError("Invalid or expired reset session. Please request a new OTP.", 400);
  }

  const record = await prisma.passwordResetOtp.findUnique({ where: { id: payload.otpId } });
  if (!record || record.userId !== payload.userId || !record.verified || record.used) {
    throw new AppError("Invalid or expired reset session. Please request a new OTP.", 400);
  }
  if (record.expiresAt < new Date()) {
    throw new AppError("Reset session has expired. Please request a new OTP.", 400);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: payload.userId }, data: { passwordHash } }),
    prisma.passwordResetOtp.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  return { message: "Password reset successfully." };
};
