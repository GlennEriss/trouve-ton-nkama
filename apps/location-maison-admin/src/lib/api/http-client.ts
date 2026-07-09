import type { ApiResponse } from "@/lib/api/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions<TBody> = {
  method?: HttpMethod;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export async function apiRequest<TResponse, TBody = unknown>(
  input: string,
  options: RequestOptions<TBody> = {},
): Promise<ApiResponse<TResponse>> {
  const response = await fetch(input, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const payload = (await response.json()) as ApiResponse<TResponse>;
  return payload;
}
