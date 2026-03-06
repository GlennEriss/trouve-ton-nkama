import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { AppError, isAppError } from '@/lib/errors/app-error';

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface MappedError {
  status: number;
  code: string;
  message: string;
}

export interface HandleApiErrorOptions {
  logger: Logger;
  route: string;
  fallbackMessage?: string;
  knownCodes?: Record<string, MappedError>;
}

function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  if (!('code' in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function jsonApiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  const payload: ApiErrorPayload = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return NextResponse.json(payload, { status });
}

export function handleApiError(error: unknown, options: HandleApiErrorOptions) {
  const {
    logger,
    route,
    fallbackMessage = 'Erreur interne du serveur',
    knownCodes = {},
  } = options;

  if (isAppError(error)) {
    const logMethod = error.status >= 500 ? logger.error : logger.warn;
    logMethod('API request failed with AppError', {
      route,
      code: error.code,
      status: error.status,
      details: error.details,
      error,
    });
    return jsonApiError(error.status, error.code, error.message, error.details);
  }

  const rawCode = getErrorCode(error);
  if (rawCode && knownCodes[rawCode]) {
    const mapped = knownCodes[rawCode];
    const logMethod = mapped.status >= 500 ? logger.error : logger.warn;
    logMethod('API request failed with mapped error code', {
      route,
      rawCode,
      mapped,
      error,
    });
    return jsonApiError(mapped.status, mapped.code, mapped.message);
  }

  logger.error('API request failed with unhandled error', { route, error });
  return jsonApiError(500, 'INTERNAL_SERVER_ERROR', fallbackMessage);
}

export function assertStringField(
  value: unknown,
  field: string,
  message: string
): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(message, {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: { field },
    });
  }
}

