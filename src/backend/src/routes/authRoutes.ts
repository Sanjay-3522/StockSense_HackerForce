import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authLimiter, otpLimiter } from "../middleware/rateLimiters";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "../validations/authValidation";

const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), authController.signup);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;
