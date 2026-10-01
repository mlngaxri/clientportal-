export function safeReturnPath(value: unknown, fallback = "/start") {
  if (
    typeof value !== "string" ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  try {
    const u = new URL(value, "https://fourthform.invalid");
    return u.origin === "https://fourthform.invalid"
      ? `${u.pathname}${u.search}`
      : fallback;
  } catch {
    return fallback;
  }
}
