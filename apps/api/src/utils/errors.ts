/** Stub error classes for backend compatibility. */
export class AppError extends Error {
  constructor(code: string, message: string, _status?: number) {
    super(message);
    this.name = 'AppError';
  }
}
export class ValidationError extends AppError {
  constructor(message: string) { super('VALIDATION_ERROR', message, 400); this.name = 'ValidationError'; }
}
export class UnauthorizedError extends AppError {
  constructor(message: string) { super('UNAUTHORIZED', message, 401); this.name = 'UnauthorizedError'; }
}
export class NotFoundError extends AppError {
  constructor(message: string) { super('NOT_FOUND', message, 404); this.name = 'NotFoundError'; }
}
export class ConflictError extends AppError {
  constructor(message: string) { super('CONFLICT', message, 409); this.name = 'ConflictError'; }
}
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
