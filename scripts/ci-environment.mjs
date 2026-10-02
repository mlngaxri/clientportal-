import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const result = JSON.parse(
  execFileSync("supabase", ["status", "--output", "json"], {
    encoding: "utf8",
  }),
);
const values = {
  APP_ENV: "development",
  APP_URL: "http://127.0.0.1:4173",
  NEXT_PUBLIC_SUPABASE_URL: result.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: result.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: result.SERVICE_ROLE_KEY,
  ANALYTICS_SIGNING_SECRET: randomBytes(32).toString("hex"),
  SITE_ADAPTER_SIGNING_SECRET: randomBytes(32).toString("hex"),
  CRON_SECRET: randomBytes(32).toString("hex"),
  HEALTHCHECK_TOKEN: randomBytes(32).toString("hex"),
  ENABLE_LIVE_CUSTOMERS: "false",
  ENABLE_PRO_BILLING: "false",
  ENABLE_FIRST_BILLING: "false",
};
if (Object.values(values).some((v) => !v))
  throw Error("Supabase did not return its disposable credentials.");
writeFileSync(
  ".env.local",
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Configured disposable local services. Credential values are not printed.",
);
