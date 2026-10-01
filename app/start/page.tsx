export const dynamic = "force-dynamic";
import { configured, db } from "../../lib/server";
import references from "../../lib/portfolio-references.json";
import Onboarding from "../../components/Onboarding";
import { safeReturnPath } from "../../lib/navigation";
import { redirect } from "next/navigation";
export default async function Start({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    reference?: string;
    package?: string;
    new?: string;
  }>;
}) {
  const {
    next,
    reference: referenceId,
    package: packageName,
    new: newProject,
  } = await searchParams;
  const reference = references.find((r) => r.id === referenceId);
  const requestedPackage = packageName === "first" ? "FIRST" : "SITE";
  const startQuery = new URLSearchParams();
  if (reference) startQuery.set("reference", reference.id);
  if (requestedPackage === "FIRST") startQuery.set("package", "first");
  if (newProject === "1") startQuery.set("new", "1");
  const startPath = "/start" + (startQuery.size ? `?${startQuery}` : "");
  let project = null,
    signedIn = false;
  if (configured()) {
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    signedIn = !!user;
    if (user) {
      let query = client
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (newProject === "1")
        query = query.in("phase", [
          "DRAFT_ONBOARDING",
          "AWAITING_INITIAL_PAYMENT",
        ]);
      const { data } = await query.limit(1);
      project = data?.[0] || null;
      if (
        project &&
        !["DRAFT_ONBOARDING", "AWAITING_INITIAL_PAYMENT"].includes(
          project.phase,
        )
      )
        redirect(
          safeReturnPath(
            next?.startsWith("/start") ? undefined : next,
            `/projects/${project.id}/overview`,
          ),
        );
    }
  }
  return (
    <Onboarding
      returnTo={safeReturnPath(next, startPath)}
      reference={reference}
      requestedPackage={requestedPackage}
      signedIn={signedIn}
      project={project}
      configurationReady={configured()}
    />
  );
}
