import { z } from "zod";
const session = { remember: z.boolean().default(false), next: z.string().max(2048).optional() };
const credentials = { email: z.string().trim().email().max(254), password: z.string().min(8).max(128) };
export const authInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("signup"), ...credentials, ...session }),
  z.object({ mode: z.literal("signin"), ...credentials, ...session }),
  z.object({ mode: z.literal("google"), ...session }),
  z.object({ mode: z.literal("logout") }),
  z.object({ mode: z.literal("confirmation"), email: credentials.email, ...session }),
]);
