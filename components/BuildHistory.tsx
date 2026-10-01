"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/client";
const labels: Record<string, string> = {
  save_business: "Business information saved",
  send_initial: "Initial Direction sent",
  begin_build: "Build started",
  internal_check: "Internal review",
  deliver: "Website delivered for review",
  submit_revision: "Revision submitted",
  withdraw_revision: "Revision withdrawn",
  start_revision: "Revision started",
  complete_revision: "Revision delivered",
  approve: "Website approved",
  launch: "Website launched",
  website_publish: "Website content published",
  website_rollback: "Website content restored",
};
export default function BuildHistory({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<
      { id: string; type: string; created_at: string }[]
    >([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void api(`/api/projects/${projectId}/history`)
      .then((r) => {
        if (active) setEvents(r.events);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, attempt]);
  const milestones = events.filter((e) => labels[e.type]);
  return (
    <section className="direction-workspace">
      <span className="overline">Project / Build</span>
      <h1>The work, as it happens.</h1>
      <p>Confirmed project milestones from your account history.</p>
      {loading && <p role="status">Loading your project history…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </div>
      )}
      {!loading && !error && <ol className="connected-checks">
        {milestones
          .map((e) => (
            <li key={e.id}>
              <strong>{labels[e.type]}</strong>
              <span>{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
      </ol>}
      {!loading && !error && !milestones.length && <p>No recorded milestones yet.</p>}
    </section>
  );
}
