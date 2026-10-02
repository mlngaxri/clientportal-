export const dynamic = "force-dynamic";
import { configured, db, ownedProject } from "../../lib/server";
import references from "../../lib/portfolio-references.json";
import Onboarding from "../../components/Onboarding";
import { capabilities } from "../../lib/capabilities";
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
    mode?: string;
    project?: string;
  }>;
}) {
  const {
    next,
    reference: referenceId,
    package: packageName,
    new: newProject,
    mode,
    project: projectId,
  } = await searchParams;
  const reference = references.find((r) => r.id === referenceId);
  const requestedPackage = packageName === "first" ? "FIRST" : "SITE";
  const startQuery = new URLSearchParams();
  if (reference) startQuery.set("reference", reference.id);
  if (requestedPackage === "FIRST") startQuery.set("package", "first");
  if (newProject === "1") startQuery.set("new", "1");
  if (projectId) startQuery.set("project", projectId);
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
      if (projectId) {
        project = (await ownedProject(projectId)).project;
      } else if (newProject !== "1") {
        const { data, error } = await client.from("projects").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1);
        if (error) throw new Error("Your saved brief could not be loaded. Try again.");
        project = data?.[0] || null;
      }
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
      googleReady={capabilities().google}
      initialMode={mode === "signin" ? "signin" : "signup"}
      createNew={newProject === "1"}
    />
  );
}
