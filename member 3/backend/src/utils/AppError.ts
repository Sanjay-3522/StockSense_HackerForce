// A controlled, expected error that should be surfaced to the client with a
// specific HTTP status code (e.g. validation failures, business-rule
// violations like "already validated" or "insufficient stock").
export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'REQUEST_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}
