import PasswordRecovery from "../../../components/PasswordRecovery";
import { userDb } from "../../../lib/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
  try {
    await userDb();
  } catch (error) {
    // Keep recovery evidence category-only; auth/provider messages can contain account or token details.
    console.error(JSON.stringify({
      event: "auth_recovery_session_missing",
      category: error instanceof Error ? error.name : "unknown",
    }));
    redirect("/account/recover?expired=1");
  }
  return <PasswordRecovery update />;
}
