import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

/**
 * Protects routes by requiring a valid Bearer JWT. Attaches the decoded
 * payload to req.user for downstream controllers/services to use.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Authentication token missing.", 401));
  }

  const token = header.split(" ")[1];

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError("Invalid or expired token.", 401));
  }
};
