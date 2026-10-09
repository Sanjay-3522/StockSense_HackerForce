import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as authService from "../services/authService";

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const result = await authService.signup(name, email, password, role);
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, data: result });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(200).json({ success: true, data: result });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOtp(email, otp);
  res.status(200).json({ success: true, data: result });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;
  const result = await authService.resetPassword(resetToken, newPassword);
  res.status(200).json({ success: true, data: result });
});
