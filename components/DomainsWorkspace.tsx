"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/client";
type RecordRow = { type: string; name: string; value: string; purpose: string };
type Domain = { hostname: string; token: string; status: string };
export default function DomainsWorkspace({ projectId }: { projectId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]),
    [hostname, setHostname] = useState(""),
    [platform, setPlatform] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [instructions, setInstructions] = useState<{ host: string; rows: RecordRow[] } | null>(null),
    [notice, setNotice] = useState("");
  async function load() {
    const r = await api(`/api/projects/${projectId}/domains`);
    setError("");
    setLoading(false);
    setDomains(r.domains);
    setPlatform(r.platformUrl);
  }
  useEffect(() => {
    void load().catch((e) => { setError(e.message); setLoading(false); });
  }, [projectId]);
  async function action(action: string, host = hostname) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice(action === "connect" ? `Checking ${host}…` : `Preparing DNS records for ${host}…`);
    try {
      const r = await api(`/api/projects/${projectId}/domains`, {
        action,
        hostname: host,
      });
      setInstructions({ host, rows: r.hosting || [] });
      setNotice(
        r.notice ||
          (action === "reserve"
            ? "Add the ownership record shown below, then connect the domain."
            : "Domain connected and HTTPS verified."),
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="direction-workspace">
      <header className="workspace-heading">
        <div>
          <span className="overline">Website / Domains</span>
          <h1>Your address on the web.</h1>
          <p>
            Use the included website address or connect a domain you own. Domain
            registration and renewal remain with your registrar.
          </p>
        </div>
      </header>
      {loading && <p role="status">Loading domain connections…</p>}
      {error && !platform && <button type="button" onClick={() => void load().catch(e => setError(e.message))}>Retry loading domains</button>}
      <div className="connected-card">
        <h2>Included address</h2>
        <p className="connected-code">{platform}</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form
        className="connected-card"
        onSubmit={(e) => {
          e.preventDefault();
          void action("reserve");
        }}
      >
        <label>
          Domain name
          <input
            value={hostname}
            placeholder="yourbusiness.com"
            required
            disabled={busy}
            onChange={(e) => setHostname(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>Add domain</button>
      </form>
      {domains.map((d) => (
        <article className="connected-card" key={d.hostname}>
          <h2>{d.hostname}</h2>
          <p>
            {d.status === "connected"
              ? "Connected with verified HTTPS"
              : d.status === "owned"
                ? "Ownership verified. Hosting setup pending."
                : "Ownership verification pending"}
          </p>
          {d.status !== "connected" && (
            <>
              <p>Add this TXT record in your registrar’s DNS settings:</p>
              <div className="connected-code">
                Name: _fourthform.{d.hostname}
                <br />
                Value: fourthform={d.token}
              </div>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(`fourthform=${d.token}`).then(() => setNotice(`Ownership value copied for ${d.hostname}.`)).catch(() => setNotice("Select and copy the ownership value.")); }}>Copy ownership value</button>
            </>
          )}
          <div className="connected-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void action("connect", d.hostname)}
            >
              Check and connect
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void action("reserve", d.hostname)}
            >
              Show hosting records
            </button>
          </div>
        </article>
      ))}
      {instructions && instructions.rows.length > 0 && (
        <details className="connected-card" open>
          <summary>Hosting DNS records for {instructions.host}</summary>
          <p>
            For a root domain, use the A records. For a subdomain, use the CNAME
            alternative. Do not set both A and CNAME for the same name. Add any
            hosting ownership TXT record as well. Some registrars expect @ for a
            root domain or only the subdomain prefix.
          </p>
          <div
            role="region"
            aria-label={`Hosting DNS records for ${instructions.host}`}
            tabIndex={0}
            style={{ overflowX: "auto" }}
          >
            <table className="connected-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {instructions.rows.map((r) => (
                  <tr key={`${r.type}:${r.name}:${r.value}`}>
                    <td>{r.type}</td>
                    <td>{r.name}<button type="button" onClick={() => { void navigator.clipboard.writeText(r.name).then(() => setNotice("Record name copied.")).catch(() => setNotice("Select and copy the record name.")); }}>Copy name</button></td>
                    <td className="dns-value">{r.value}<button type="button" onClick={() => { void navigator.clipboard.writeText(r.value).then(() => setNotice(`Copied ${r.type} value for ${instructions.host}.`)).catch(() => setNotice("Clipboard unavailable. Select and copy the value shown here.")); }}>Copy value</button></td>
                    <td>{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
