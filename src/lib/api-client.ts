import type { ApiResponse, PaginationMeta } from "@/types/loans";

export type FetchWithAuth = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ApiMeta = PaginationMeta & {
  timestamp?: string;
  pagination?: PaginationMeta;
  unreadCount?: number;
};

export type ApiPayload<T> = ApiResponse<T> & {
  meta?: ApiMeta;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("No se encontró VITE_API_URL para consultar el servidor.");
  }

  return API_BASE_URL;
}

export function buildApiUrl(
  path: string,
  params?: Record<string, boolean | number | string | null | undefined>,
) {
  const url = new URL(`${getApiBaseUrl()}${path}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export async function readApiPayload<T>(
  response: Response,
): Promise<ApiPayload<T>> {
  const payload = (await response
    .json()
    .catch(() => null)) as ApiPayload<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "No se pudo completar la solicitud.");
  }

  return payload;
}

export async function readApiPath<T>(
  fetchWithAuth: FetchWithAuth,
  path: string,
  init?: RequestInit,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}${path}`, init);
  return readApiPayload<T>(response);
}

export async function readApiUrl<T>(
  fetchWithAuth: FetchWithAuth,
  url: string,
  init?: RequestInit,
) {
  const response = await fetchWithAuth(url, init);
  return readApiPayload<T>(response);
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
