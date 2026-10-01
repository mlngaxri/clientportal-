import PasswordRecovery from "../../../components/PasswordRecovery";
import { userDb } from "../../../lib/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
  try {
    await userDb();
  } catch {
    redirect("/account/recover?expired=1");
  }
  return <PasswordRecovery update />;
}
