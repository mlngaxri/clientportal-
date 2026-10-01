export const dynamic = "force-dynamic";
import Link from "next/link";
import { configured, userDb } from "../../lib/server";
import { redirect } from "next/navigation";
export default async function Projects() {
  if (!configured()) redirect("/start");
  let session;
  try {
    session = await userDb();
  } catch {
    redirect("/start");
  }
  const { data } = await session.client
    .from("projects")
    .select("*")
    .order("created_at");
  if (!data?.length) redirect("/start");
  return (
    <main className="projects-index">
      <Link className="wordmark" href="/">
        fourthform
      </Link>
      <h1>Your websites</h1>
      {data.map((p) => (
        <Link
          className="project-list-item"
          key={p.id}
          href={
            ["DRAFT_ONBOARDING", "AWAITING_INITIAL_PAYMENT"].includes(p.phase)
              ? "/start"
              : `/projects/${p.id}/${p.phase === "DIRECTION" ? "direction" : p.phase === "REVIEW" ? "review" : "overview"}`
          }
        >
          <span>{p.name}</span>
          <span>Open Form ↗</span>
        </Link>
      ))}
    </main>
  );
}
