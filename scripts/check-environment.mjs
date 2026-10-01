import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function inspectEnvironment(env) {
  const failures = [];
  const mode = env.APP_ENV || "development";
  if (!["development", "staging", "production"].includes(mode))
    failures.push("APP_ENV must be development, staging or production.");
  const required = [
    "APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  if (mode !== "development")
    required.push(
      "SUPABASE_PROJECT_REF",
      "ANALYTICS_SIGNING_SECRET",
      "SITE_ADAPTER_SIGNING_SECRET",
      "CRON_SECRET",
      "HEALTHCHECK_TOKEN",
    );
  if (
    env.STRIPE_SECRET_KEY ||
    env.STRIPE_WEBHOOK_SECRET ||
    env.ENABLE_LIVE_CUSTOMERS === "true" ||
    env.ENABLE_PRO_BILLING === "true" ||
    env.ENABLE_FIRST_BILLING === "true"
  )
    required.push("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
  if (env.VERCEL_TOKEN || env.VERCEL_PROJECT_ID || env.VERCEL_TEAM_ID)
    required.push("VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_TEAM_ID");
  if (env.RESEND_API_KEY || env.RESEND_WEBHOOK_SECRET || env.EMAIL_FROM)
    required.push("RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "EMAIL_FROM");
  if (env.FILE_SCAN_URL || env.FILE_SCAN_TOKEN)
    required.push("FILE_SCAN_URL", "FILE_SCAN_TOKEN");
  if (env.SITE_ADAPTER_URL) required.push("SITE_ADAPTER_TOKEN");
  const missing = required.filter((k) => !env[k]?.trim());
  for (const k of missing) failures.push(`${k}: missing.`);
  for (const k of [
    "APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "FILE_SCAN_URL",
    "SITE_ADAPTER_URL",
  ])
    if (env[k]) {
      try {
        const url = new URL(env[k]);
        if (url.username || url.password)
          failures.push(`${k}: embedded credentials are not allowed.`);
        if (mode !== "development" && url.protocol !== "https:")
          failures.push(`${k}: HTTPS is required.`);
      } catch {
        failures.push(`${k}: invalid URL.`);
      }
    }
  if (env.SUPABASE_PROJECT_REF && env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      if (
        new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !==
        `${env.SUPABASE_PROJECT_REF}.supabase.co`
      )
        failures.push(
          "SUPABASE_PROJECT_REF does not match the configured hosted project.",
        );
    } catch {}
  }
  if (mode === "staging") {
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_test_"))
      failures.push("Staging requires a Stripe test-mode secret.");
    if (
      env.SUPABASE_PROJECT_REF &&
      env.PRODUCTION_SUPABASE_PROJECT_REF === env.SUPABASE_PROJECT_REF
    )
      failures.push(
        "Staging and production Supabase projects must be separate.",
      );
    if (env.ENABLE_LIVE_CUSTOMERS === "true")
      failures.push("Staging cannot enable live customer billing.");
  }
  for (const key of [
    "ANALYTICS_SIGNING_SECRET",
    "SITE_ADAPTER_SIGNING_SECRET",
    "CRON_SECRET",
    "HEALTHCHECK_TOKEN",
    "RATE_LIMIT_SECRET",
    "SESSION_SIGNING_SECRET",
  ])
    if (env[key] && env[key].length < 32)
      failures.push(`${key} must contain at least 32 characters.`);
  if (
    mode === "production" &&
    env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
    env.ENABLE_LIVE_CUSTOMERS === "true"
  )
    failures.push("Live customer billing requires a live-mode Stripe secret.");
  return {
    mode,
    required: required.length,
    present: required.length - missing.length,
    missing,
    failures,
    configurationReady: failures.length === 0,
    capabilities: {
      accounts: !!env.SUPABASE_SERVICE_ROLE_KEY,
      cms: !!env.SUPABASE_SERVICE_ROLE_KEY,
      payments: !!env.STRIPE_SECRET_KEY,
      customDomains: !!env.VERCEL_TOKEN,
      notifications: !!env.RESEND_API_KEY,
      documentScanning: !!env.FILE_SCAN_URL,
      externalCms: !!env.SITE_ADAPTER_URL,
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const env = { ...process.env };
  const file = process.argv[2];
  if (file) {
    if (!existsSync(file)) {
      console.error("Environment file not found.");
      process.exit(1);
    }
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match)
        env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  const result = inspectEnvironment(env);
  // Never print any credential value, including in validation errors.
  console.log(JSON.stringify(result, null, 2));
  console.log(
    "This checks configuration shape only. It does not prove service connectivity or release readiness.",
  );
  process.exitCode = result.configurationReady ? 0 : 1;
}
