// app/lib/logger.ts

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "authorization",
  "cookie",
  "set-cookie",
  "next-auth.session-token",
  "next-auth.csrf-token",
  "stripe-signature",
  "apiKey",
  "openai_api_key",
  "secret",
  "clientSecret",
  "webhookSecret",
  "email", // treat as PII
  "transcript", // avoid logging
  "jobDesc", // avoid logging
]);

function isPlainObject(x: any): x is Record<string, any> {
  return x && typeof x === "object" && !Array.isArray(x);
}

function truncateString(s: string, max = 500) {
  if (s.length <= max) return s;
  return s.slice(0, max) + `…[truncated ${s.length - max} chars]`;
}

function redact(value: any, depth = 0): any {
  if (depth > 6) return "[redacted:depth]";
  if (value == null) return value;

  if (typeof value === "string") {
    // prevent log blow-ups
    return truncateString(value, 800);
  }

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }

  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const keyLower = k.toLowerCase();

      if (SENSITIVE_KEYS.has(k) || SENSITIVE_KEYS.has(keyLower)) {
        out[k] = "[redacted]";
        continue;
      }

      // Also redact common patterns (headers objects, etc.)
      if (keyLower.includes("token") || keyLower.includes("secret") || keyLower.includes("password")) {
        out[k] = "[redacted]";
        continue;
      }

      out[k] = redact(v, depth + 1);
    }
    return out;
  }

  // numbers/booleans/functions/etc
  return value;
}

function base(level: "info" | "error", event: string, data?: Record<string, any>) {
  return {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(data ? redact(data) : {}),
  };
}

export function logInfo(event: string, data?: Record<string, any>) {
  console.log(JSON.stringify(base("info", event, data)));
}

export function logError(event: string, error: any, data?: Record<string, any>) {
  const payload: Record<string, any> = base("error", event, data);

  payload.message = error?.message ? truncateString(String(error.message), 800) : undefined;

  // Only include stack outside production (or enable explicitly)
  const allowStack =
    process.env.NODE_ENV !== "production" || process.env.LOG_STACKS === "true";

  if (allowStack && error?.stack) {
    payload.stack = truncateString(String(error.stack), 2000);
  }

  console.error(JSON.stringify(payload));
}