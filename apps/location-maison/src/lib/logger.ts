type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED_KEYS = [
  'password',
  'pass',
  'token',
  'secret',
  'authorization',
  'cookie',
  'oobcode',
  'refresh_token',
  'access_token',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLogLevel(value: string): value is LogLevel {
  return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
}

function resolveLogLevel(): LogLevel {
  const fallback: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  const fromEnv = (process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL || fallback).toLowerCase();
  return isLogLevel(fromEnv) ? fromEnv : fallback;
}

function shouldRedactKey(key: string): boolean {
  const loweredKey = key.toLowerCase();
  return REDACTED_KEYS.some((sensitiveKey) => loweredKey.includes(sensitiveKey));
}

function serializeError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(isObject(error) && 'code' in error ? { code: (error as { code?: unknown }).code } : {}),
  };
}

function sanitizeForLog(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, seen));
  }

  if (!isObject(value)) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (shouldRedactKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeForLog(nestedValue, seen);
  }
  return sanitized;
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

export function createLogger(scope: string): Logger {
  const minimumLogLevel = resolveLogLevel();

  const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minimumLogLevel]) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      ...(context ? { context: sanitizeForLog(context) } : {}),
    };

    const line = JSON.stringify(payload);
    switch (level) {
      case 'debug':
        console.debug(line);
        break;
      case 'info':
        console.info(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
      default:
        console.log(line);
    }
  };

  return {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}

