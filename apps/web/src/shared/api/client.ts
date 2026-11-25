export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers?: Headers,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(url, {
      ...init,
      headers: init.body ? { 'content-type': 'application/json' } : undefined,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, 'Сервер недоступен');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;

    throw new ApiError(res.status, message ?? res.statusText, res.headers);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}
