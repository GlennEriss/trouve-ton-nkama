import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import type { ApiError, ApiResponse } from "@/lib/api/types";

function buildMeta(correlationId?: string) {
  const resolvedCorrelationId = correlationId ?? randomUUID();
  return {
    correlationId: resolvedCorrelationId,
    version: "v1" as const,
  };
}

export function jsonSuccess<T>(data: T, correlationId?: string, status = 200) {
  const meta = buildMeta(correlationId);
  const payload: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta,
  };

  const response = NextResponse.json(payload, { status });
  response.headers.set("x-correlation-id", meta.correlationId);
  return response;
}

export function jsonError(
  error: ApiError,
  status = 400,
  correlationId?: string,
) {
  const meta = buildMeta(correlationId);
  const payload: ApiResponse<never> = {
    success: false,
    data: null,
    error,
    meta,
  };

  const response = NextResponse.json(payload, { status });
  response.headers.set("x-correlation-id", meta.correlationId);
  return response;
}
