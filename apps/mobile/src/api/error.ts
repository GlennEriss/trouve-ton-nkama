// Le backend (apps/location-maison) répond toujours avec cette enveloppe en cas d'erreur —
// vu dans ProfileInformationErrorCode, jsonApiError (admin), handleApiError... Un seul parseur
// ici plutôt que chaque écran qui réinvente sa propre gestion d'erreur API.
export type ApiErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { success?: unknown }).success === false &&
    typeof (value as { error?: unknown }).error === 'object'
  );
}

/** À appeler avec le JSON déjà parsé d'une réponse non-ok. Ne lève jamais — best-effort,
 * retombe sur un message générique si la réponse ne suit pas l'enveloppe attendue. */
export function parseApiError(status: number, body: unknown): ApiError {
  if (isApiErrorPayload(body)) {
    return new ApiError(status, body.error.code, body.error.message, body.error.details);
  }
  return new ApiError(status, 'UNKNOWN_ERROR', 'Une erreur inattendue est survenue.');
}
