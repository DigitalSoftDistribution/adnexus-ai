const TOKEN_KEY = 'adnexus_token';

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax; Secure; max-age=86400`;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('workspace_id');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export interface AuthFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

export interface JsonEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string } | string;
  [key: string]: unknown;
}

function buildUrl(path: string, params?: AuthFetchOptions['params']): string {
  const url = path.startsWith('http') ? new URL(path) : new URL(path, window.location.origin);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return path.startsWith('http') ? url.toString() : `${url.pathname}${url.search}`;
}

function authHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as JsonEnvelope<unknown>;
    const message =
      typeof body.error === 'string'
        ? body.error
        : body.error?.message ?? `Request failed with status ${response.status}`;
    return new Error(message);
  } catch {
    return new Error(`Request failed with status ${response.status}`);
  }
}

export async function authFetch(path: string, options: AuthFetchOptions = {}): Promise<Response> {
  const { params, ...init } = options;
  const response = await fetch(buildUrl(path, params), {
    ...init,
    headers: authHeaders(init),
  });

  if (!response.ok) {
    throw await responseError(response);
  }

  return response;
}

export async function authFetchJson<T>(path: string, options: AuthFetchOptions = {}): Promise<JsonEnvelope<T>> {
  const response = await authFetch(path, options);
  return (await response.json()) as JsonEnvelope<T>;
}
