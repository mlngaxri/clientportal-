export const dynamic = "force-dynamic";
import Link from "next/link";
import { configured, userDb, AccessError } from "../../lib/server";
import { phaseLabels, type Phase } from "../../lib/model";
import { redirect } from "next/navigation";
export default async function Projects() {
  if (!configured()) redirect("/start");
  let session;
  try {
    session = await userDb();
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect("/start?mode=signin&next=/app");
    throw error;
  }
  const { data, error } = await session.client
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Your websites could not be loaded. Try again.");
  if (!data?.length) redirect("/start");
  return (
    <main className="projects-index">
      <Link className="wordmark" href="/">
        fourthform
      </Link>
      <span className="overline">
        {session.user.app_metadata?.role === "operator"
          ? "Fourthform / Agency"
          : "Your account / Fourthform"}
      </span>
      <h1>
        {session.user.app_metadata?.role === "operator"
          ? "Client websites"
          : "Your websites"}
      </h1>
      <p>
        Open a project to see its next step, saved content and confirmed
        activity.
      </p>
      <div className="connected-actions">
        <Link className="primary" href="/start?new=1">
          Start another website
        </Link>
        <Link href="/account/password">Change password</Link>
        <Link href="/preview">Explore the example portal</Link>
      </div>
      {data.map((p) => (
        <Link
          className="project-list-item"
          key={p.id}
          href={
            ["DRAFT_ONBOARDING", "AWAITING_INITIAL_PAYMENT"].includes(p.phase)
              ? `/start?project=${p.id}`
              : `/projects/${p.id}/${p.phase === "DIRECTION" ? "direction" : p.phase === "REVIEW" ? "review" : "overview"}`
          }
        >
          <span>{p.name}</span>
          <span>{phaseLabels[p.phase as Phase]} · Open workspace ↗</span>
        </Link>
      ))}
    </main>
  );
}
