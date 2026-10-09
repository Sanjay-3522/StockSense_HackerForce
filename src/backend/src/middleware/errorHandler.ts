import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { handlePrismaError } from "../utils/prismaErrors";

/**
 * Centralized error handler for the whole backend (foundation, operations,
 * intelligence all funnel through here via next(err) / asyncHandler).
 * Never leaks raw database or stack details to the client; always returns
 * a consistent JSON shape: { success: false, message, code }.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  let error: AppError;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof AppError) {
    error = err;
  } else {
    console.error("Unexpected error:", err);
    error = new AppError("Internal server error.", 500, "INTERNAL_ERROR");
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    code: error.code,
  });
};
