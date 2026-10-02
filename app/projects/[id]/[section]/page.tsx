import { notFound, redirect } from "next/navigation";
import { ownedProject, AccessError } from "../../../../lib/server";
import { projectSections, type Phase } from "../../../../lib/model";
import ProjectWorkspace from "../../../../components/ProjectWorkspace";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = await params;
  let result;
  try {
    result = await ownedProject(id);
  } catch (error) {
    if (error instanceof AccessError && error.status === 404) notFound();
    if (error instanceof AccessError && error.status === 401) redirect(`/start?mode=signin&next=${encodeURIComponent(`/projects/${id}/${section}`)}`);
    throw error;
  }
  const { client, project, user } = result;
  if (["DRAFT_ONBOARDING", "AWAITING_INITIAL_PAYMENT"].includes(project.phase))
    redirect(`/start?project=${id}`);
  if (
    !projectSections(
      project.phase as Phase,
      user.app_metadata?.role === "operator",
    ).includes(section)
  )
    notFound();
  const { data: boards, error } = await client
    .from("boards")
    .select("*")
    .eq("project_id", id)
    .order("created_at");
  if (error) throw new Error("Project content could not be loaded. Try again.");
  return (
    <ProjectWorkspace
      initialProject={project}
      initialBoards={boards || []}
      section={section}
      operator={user.app_metadata?.role === "operator"}
    />
  );
}
