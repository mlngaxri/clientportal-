export const dynamic = "force-dynamic";
import { configured, db } from "../../lib/server";
import Onboarding from "../../components/Onboarding";
import { safeReturnPath } from "../../lib/navigation";
import { redirect } from "next/navigation";
export default async function Start({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  let project = null,
    signedIn = false;
  if (configured()) {
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    signedIn = !!user;
    if (user) {
      const { data } = await client
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      project = data?.[0] || null;
      if (
        project &&
        !["DRAFT_ONBOARDING", "AWAITING_INITIAL_PAYMENT"].includes(
          project.phase,
        )
      )
        redirect(safeReturnPath(next, `/projects/${project.id}/overview`));
    }
  }
  return (
    <Onboarding
      returnTo={safeReturnPath(next)}
      signedIn={signedIn}
      project={project}
      configurationReady={configured()}
    />
  );
}
