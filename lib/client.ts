export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, {
      method: data === undefined ? "GET" : "POST",
      headers: data === undefined ? {} : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      "Connection lost before the server confirmed this request. Your draft is retained. Try again.",
      0,
    );
  }
  const result = await r.json().catch(() => {
    throw new ApiError(
      "The service could not complete the request. Your changes have not been confirmed saved.",
      r.status,
    );
  });
  if (!r.ok)
    throw new ApiError(result.error || "Request failed. Try again.", r.status);
  return result;
}
