// A controlled, expected error surfaced to the client with a specific HTTP
// status code (validation failures, business-rule violations like "already
// validated" or "insufficient stock", not-found, etc). Single definition
// for the whole backend — Member 1's foundation and Member 2/3's
// operations+intelligence layers previously each had their own
// (incompatible: `statusCode` vs `status`, no `code` field vs one). This
// version keeps `statusCode` (Member 1's name, used throughout the
// foundation controllers/services and by prismaErrors.ts) and adds the
// optional `code` field Member 3's intelligence layer relies on for
// machine-readable error identification.
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 400, code = "REQUEST_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
