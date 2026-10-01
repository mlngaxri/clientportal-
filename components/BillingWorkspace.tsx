"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/client";
import type { Project } from "../lib/model";
type Receipt = { id: string; kind: string; amount: number; paid_at: string };
export default function BillingWorkspace({
  project,
  onPay,
}: {
  project: Project;
  onPay: (kind: string) => void;
}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0),
    [subscriptions, setSubscriptions] = useState<
      { id: string; status: string }[]
    >([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void api(`/api/projects/${project.id}/billing`)
      .then((r) => {
        if (!active) return;
        setReceipts(r.payments);
        setSubscriptions(r.subscriptions);
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
  }, [project.id, attempt]);
  return (
    <section className="direction-workspace">
      <header className="workspace-heading">
        <div>
          <span className="overline">Account / Billing</span>
          <h1>Clear costs. Confirmed payments.</h1>
          <p>
            Payments are confirmed by signed provider events. Returning from
            checkout alone does not change your project status.
          </p>
        </div>
      </header>
      {loading && <p role="status">Loading confirmed billing records…</p>}
      {error && <div role="alert"><p>{error}</p><button onClick={() => setAttempt((n) => n + 1)}>Reload billing</button></div>}
      <div className="connected-grid">
        <div className="connected-card">
          <h2>Fourthform {project.package === "FIRST" ? "First" : "Site"}</h2>
          <p>
            {project.package === "FIRST"
              ? "A$199 once for one page and one revision round."
              : "A$1,500 once. A$200 to start, A$1,300 after approval."}
          </p>
          <p>
            {project.initial_paid_at
              ? "Initial payment confirmed"
              : "Initial payment pending"}
          </p>
          {project.package === "SITE" && (
            <p>
              {project.final_paid_at
                ? "Remaining balance confirmed"
                : "Remaining balance not yet paid"}
            </p>
          )}
          {project.phase === "APPROVED_AWAITING_FINAL_PAYMENT" && (
            <button className="primary" onClick={() => onPay("final")}>
              Pay remaining A$1,300
            </button>
          )}
        </div>
        <div className="connected-card">
          <h2>{project.pro ? "Pro active" : "Core included"}</h2>
          <p>
            Core covers website editing, traffic reports, search metadata and
            your enquiry inbox. Pro adds scheduled content, longer reports,
            comparisons and guidance across published pages.
          </p>
          {subscriptions.length > 0 && (
            <p>Subscription: {subscriptions[0].status.replaceAll("_", " ")}</p>
          )}
          {!loading && !error && (subscriptions.length > 0 ? (
            <button
              onClick={() =>
                void api<{ url: string }>("/api/billing", {
                  projectId: project.id,
                })
                  .then((r) => window.location.assign(r.url))
                  .catch((e) => setError(e.message))
              }
            >
              Manage subscription
            </button>
          ) : (
            project.phase === "LIVE" && (
              <button onClick={() => onPay("pro")}>Add Pro · A$39/month</button>
            )
          ))}
        </div>
      </div>
      {!loading && !error && !project.pro &&
        subscriptions.length > 0 &&
        subscriptions.every((s) =>
          ["canceled", "incomplete_expired"].includes(s.status),
        ) &&
        project.phase === "LIVE" && (
          <button onClick={() => onPay("pro")}>Restart Pro · A$39/month</button>
        )}
      <h2>Payment history</h2>
      <table className="connected-table">
        <thead>
          <tr>
            <th>Payment</th>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((p) => (
            <tr key={p.id}>
              <td>{p.kind}</td>
              <td>{new Date(p.paid_at).toLocaleDateString()}</td>
              <td>
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                }).format(p.amount / 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && !error && !receipts.length && <p>No confirmed payments yet.</p>}
    </section>
  );
}
