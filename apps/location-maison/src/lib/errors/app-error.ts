export interface AppErrorOptions {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  expose?: boolean;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly expose: boolean;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.expose = options.expose ?? options.status < 500;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 400,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: 'NOT_FOUND',
      status: 404,
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: 'UNAUTHORIZED',
      status: 401,
      details,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

