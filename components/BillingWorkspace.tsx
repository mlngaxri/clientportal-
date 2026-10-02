"use client";
import { useEffect, useState } from "react";
import Dialog from "./Dialog";
import { api } from "../lib/client";
import type { Project } from "../lib/model";
const paymentNames: Record<string, string> = { initial: "Website start", final: "Site remaining balance", revision: "Additional revision round", pro: "Pro subscription" };
type Receipt = { id: string; kind: string; amount: number; paid_at: string };
export default function BillingWorkspace({
  project,
  onPay,
  busy = false,
}: {
  project: Project;
  onPay: (kind: string) => void;
  busy?: boolean;
}) {
  const [managing, setManaging] = useState(false), [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0),
    [subscriptions, setSubscriptions] = useState<
      { id: string; status: string; periodEnd?: number | null; cancelAtPeriodEnd?: boolean }[]
    >([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setReceipts([]);
    setSubscriptions([]);
    setReceipt(null);
    setManaging(false);
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
            View confirmed payments and manage your optional Pro subscription. If you have just paid, allow a moment for confirmation.
          </p>
        </div>
      </header>
      {loading && <p role="status">Loading confirmed billing records…</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>Reload billing</button></div>}
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
            <button type="button" className="primary" disabled={busy} onClick={() => onPay("final")}>
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
          <p>Pro is A$39 per month. Core remains included when Pro ends.</p>
          {subscriptions[0]?.periodEnd && <p>{subscriptions[0].cancelAtPeriodEnd ? "Pro ends" : "Next renewal"}: {new Date(subscriptions[0].periodEnd * 1000).toLocaleDateString()}</p>}
          {!loading && !error && (subscriptions.length > 0 ? (
            <button
              type="button"
              disabled={busy || managing}
              onClick={async () => { if (managing) return; setManaging(true); setError(""); try { const r = await api<{ url: string }>("/api/billing", { projectId: project.id }); window.location.assign(r.url); } catch (e) { setError((e as Error).message); setManaging(false); } }}
            >
              {managing ? "Opening billing…" : "Manage subscription"}
            </button>
          ) : (
            project.phase === "LIVE" && (
              <button type="button" disabled={busy} onClick={() => onPay("pro")}>Add Pro · A$39/month</button>
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
          <button type="button" disabled={busy} onClick={() => onPay("pro")}>Restart Pro · A$39/month</button>
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
              <td>{paymentNames[p.kind] || "Website payment"}<button type="button" className="text-button" onClick={() => setReceipt(p)}>View confirmation</button></td>
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
      {receipt && <Dialog title="Payment confirmation" onClose={() => setReceipt(null)}><dl><dt>For</dt><dd>{paymentNames[receipt.kind] || "Website payment"} · {project.name}</dd><dt>Amount</dt><dd>A${(receipt.amount / 100).toFixed(2)}</dd><dt>Confirmed</dt><dd>{new Date(receipt.paid_at).toLocaleString()}</dd><dt>Reference</dt><dd className="connected-code">{receipt.id}</dd></dl><p>This is your Fourthform payment record. Your payment provider sends its receipt to your checkout email address.</p><button type="button" onClick={() => { const url = URL.createObjectURL(new Blob([`Fourthform payment confirmation\n${project.name}\n${paymentNames[receipt.kind] || receipt.kind}\nA$${(receipt.amount / 100).toFixed(2)}\n${receipt.paid_at}\nReference: ${receipt.id}`], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = "fourthform-payment-confirmation.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Download confirmation</button></Dialog>}
    </section>
  );
}
