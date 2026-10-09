import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

/**
 * Generic request-body validation middleware backed by a Zod schema.
 * Rejects invalid payloads before any controller/service/database logic runs.
 */
export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new AppError(message, 422));
    }

    req.body = result.data;
    next();
  };
