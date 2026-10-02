import "server-only";
import { configured } from "./server";
export function capabilities() {
  return {
    accounts: configured(),
    google: configured() && process.env.ENABLE_GOOGLE_SIGN_IN === "true",
    payments: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
    email: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
    documents: !!process.env.FILE_SCAN_URL && !!process.env.FILE_SCAN_TOKEN,
    domains: !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID,
  };
}
