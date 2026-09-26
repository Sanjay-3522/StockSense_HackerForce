import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found', code: 'NOT_FOUND' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with that value already exists', code: 'CONFLICT' });
    }
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
