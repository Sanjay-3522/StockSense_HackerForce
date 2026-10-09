import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route/controller function so that any rejected promise
 * (thrown error) is forwarded to Express's centralized error handler
 * instead of crashing the process or requiring a manual try/catch.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
