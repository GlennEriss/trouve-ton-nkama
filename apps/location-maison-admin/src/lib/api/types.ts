export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiMeta = {
  correlationId: string;
  version: "v1";
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
  meta: ApiMeta;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: ApiError;
  meta: ApiMeta;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
