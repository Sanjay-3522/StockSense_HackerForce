import { apiFetchEnveloped } from "./client"
import type { User } from "../types"

export interface AuthResult {
  user: User
  token: string
}

export function signup(input: { name: string; email: string; password: string; role?: User["role"] }) {
  return apiFetchEnveloped<AuthResult>("/auth/signup", { method: "POST", body: input })
}

export function login(input: { email: string; password: string }) {
  return apiFetchEnveloped<AuthResult>("/auth/login", { method: "POST", body: input })
}

export function forgotPassword(input: { email: string }) {
  return apiFetchEnveloped<{ message: string; otp?: string }>("/auth/forgot-password", {
    method: "POST",
    body: input,
  })
}

export function verifyOtp(input: { email: string; otp: string }) {
  return apiFetchEnveloped<{ message: string; resetToken: string }>("/auth/verify-otp", {
    method: "POST",
    body: input,
  })
}

export function resetPassword(input: { resetToken: string; newPassword: string }) {
  return apiFetchEnveloped<{ message: string }>("/auth/reset-password", { method: "POST", body: input })
}
