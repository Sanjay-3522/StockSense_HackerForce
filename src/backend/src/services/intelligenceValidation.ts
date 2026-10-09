import type { Request } from 'express';
import { AppError } from '../utils/AppError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new AppError(`Query parameter ${key} must be a single string`, 400, 'VALIDATION_ERROR');
  const normalized = value.trim();
  return normalized.length ? normalized : undefined;
}

export function requiredString(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(`${field} is required and must be at most ${maxLength} characters`, 400, 'VALIDATION_ERROR');
  }
  return value.trim();
}

export function optionalUuid(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (!UUID_RE.test(value)) throw new AppError(`${field} must be a valid UUID`, 400, 'VALIDATION_ERROR');
  return value;
}

export function requiredUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new AppError(`${field} must be a valid UUID`, 400, 'VALIDATION_ERROR');
  }
  return value;
}

export function parseDate(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${field} must be a valid ISO date`, 400, 'VALIDATION_ERROR');
  return date;
}

export function parseDateRange(from: string | undefined, to: string | undefined) {
  const start = parseDate(from, 'from');
  const end = parseDate(to, 'to');
  if (start && end && start > end) throw new AppError('from must be earlier than or equal to to', 400, 'VALIDATION_ERROR');
  return { start, end };
}

export function parseInteger(value: unknown, field: string, options: { min?: number; max?: number } = {}): number {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || (options.min !== undefined && number < options.min) || (options.max !== undefined && number > options.max)) {
    const bounds = [options.min !== undefined ? `at least ${options.min}` : '', options.max !== undefined ? `at most ${options.max}` : ''].filter(Boolean).join(' and ');
    throw new AppError(`${field} must be an integer${bounds ? ` ${bounds}` : ''}`, 400, 'VALIDATION_ERROR');
  }
  return number;
}

export function parsePagination(req: Request, defaultLimit = 50, maxLimit = 200) {
  const page = queryString(req, 'page');
  const limit = queryString(req, 'limit');
  return {
    page: page === undefined ? 1 : parseInteger(page, 'page', { min: 1 }),
    limit: limit === undefined ? defaultLimit : parseInteger(limit, 'limit', { min: 1, max: maxLimit }),
  };
}

export function parseEnum<T extends string>(value: string | undefined, field: string, allowed: readonly T[]): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) throw new AppError(`${field} must be one of: ${allowed.join(', ')}`, 400, 'VALIDATION_ERROR');
  return value as T;
}

export function parseOptionalIntBody(value: unknown, field: string): number {
  return parseInteger(value, field, { min: 0 });
}
