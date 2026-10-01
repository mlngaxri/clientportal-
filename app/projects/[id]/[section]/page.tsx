import { notFound, redirect } from "next/navigation";
import { ownedProject } from "../../../../lib/server";
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
  } catch {
    redirect(`/start?next=${encodeURIComponent(`/projects/${id}/${section}`)}`);
  }
  const { client, project, user } = result;
  if (["DRAFT_ONBOARDING", "AWAITING_INITIAL_PAYMENT"].includes(project.phase))
    redirect(`/start?next=${encodeURIComponent(`/projects/${id}/${section}`)}`);
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
