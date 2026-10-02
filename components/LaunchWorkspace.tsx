"use client";
import { useEffect, useRef, useState } from "react";
import type { Project } from "../lib/model";
import { api } from "../lib/client";
import { useUnsavedGuard } from "./useUnsavedGuard";
import Dialog from "./Dialog";
type Check = {
  kind: string;
  evidence: {
    revision: string;
    domain: string;
    url: string;
    delivery?: string;
  };
  verified_at: string;
};
export default function LaunchWorkspace({
  project,
  onRefresh,
}: {
  project: Project;
  onRefresh: () => void;
}) {
  const [domain, setDomain] = useState(String(project.launch.domain || "")),
    [options, setOptions] = useState<{ host: string; url: string }[]>([]),
    [siteRevision, setSiteRevision] = useState(""),
    [clock, setClock] = useState(Date.now()),
    [operation, setOperation] = useState(""),
    [checks, setChecks] = useState<Check[]>([]),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [notice, setNotice] = useState("");
  const pending = useRef<{ serial: string; key: string } | null>(null);
  useUnsavedGuard(dirty);
  async function load() {
    const [domains, result] = await Promise.all([
      api(`/api/projects/${project.id}/domains`),
      api(`/api/projects/${project.id}/checks`),
    ]);
    const platform = new URL(domains.platformUrl).hostname;
    setSiteRevision(result.revision || "");
    setOptions([
      { host: platform, url: domains.platformUrl },
      ...domains.domains
        .filter((d: { status: string }) => d.status === "connected")
        .map((d: { hostname: string }) => ({ host: d.hostname, url: `https://${d.hostname}/` })),
    ]);
    setChecks(result.checks);
    if (!domain) {
      setDomain(platform);
      setDirty(true);
    }
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [project.id]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const destination = options.find(o => o.host === domain)?.url || checks.find(c => c.evidence.domain === domain)?.evidence.url;
  const fresh = (check?: Check) => !!check && String(check.evidence.revision) === siteRevision && check.evidence.domain === domain && check.evidence.url === destination && clock - Date.parse(check.verified_at) < 24 * 3600000;
  const ready = ["domain", "deployment", "forms", "analytics", "seo"].every(kind => fresh(checks.find(c => c.kind === kind)));
  async function command(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    if (busy) return;
    setBusy(true);
    setOperation(action);
    setError("");
    const serial = JSON.stringify({
      action,
      payload,
      version: project.version,
    });
    if (pending.current?.serial !== serial)
      pending.current = { serial, key: crypto.randomUUID() };
    try {
      await api(`/api/projects/${project.id}/command`, {
        action,
        payload,
        expected: project.version,
        key: pending.current.key,
      });
      pending.current = null;
      setDirty(false);
      setNotice(
        action === "launch"
          ? "Your website is live."
          : "Launch settings saved.",
      );
      setConfirm(false);
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="direction-workspace">
      <header className="workspace-heading">
        <div>
          <span className="overline">Project / Launch</span>
          <h1>Bring your website into the world.</h1>
          <p>
            Your approved website becomes public after its saved content,
            hosting and data connections pass their checks.
          </p>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <fieldset className="connected-card" disabled={busy}>
        <legend>Website address</legend>
        <label>
          Launch domain
          <select
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setDirty(true);
              setChecks([]);
            }}
          >
            {options.map(option => (
              <option key={option.host} value={option.host}>{option.url}</option>
            ))}
          </select>
        </label>
        <p>
          The included address uses a project path. Custom domains can be
          connected in Domains after launch, or by the agency before launch.
        </p>
        <button
          className="primary"
          disabled={!dirty}
          onClick={() =>
            void command("save_launch", { data: { ...project.launch, domain } })
          }
        >
          {busy && operation === "save_launch" ? "Saving launch settings…" : "Save launch settings"}
        </button>
      </fieldset>
      <div className="connected-card">
        <h2>Final checks</h2>
        <p>
          Checks confirm the deployed application and the exact saved website
          version. Changing the content or domain requires another check.
        </p>
        <ul className="connected-checks">
          {[
            ["domain", "Website address and HTTPS"],
            ["deployment", "Published content version"],
            ["forms", "Enquiry inbox storage"],
            ["analytics", "Traffic collection storage"],
            ["seo", "Search metadata"],
          ].map(([kind, label]) => {
            const check = checks.find((c) => c.kind === kind);
            return (
              <li key={kind}>
                <strong>{label}</strong>
                <span>
                  {check
                    ? `${fresh(check) ? "Verified" : "Expired or changed. Check again"} · ${new Date(check.verified_at).toLocaleString()}`
                    : "Waiting for verification"}
                </span>
              </li>
            );
          })}
        </ul>
        <button
          disabled={busy || dirty || !domain}
          onClick={async () => {
            setBusy(true);
            setOperation("checks");
            setError("");
            try {
              const r = await api(`/api/projects/${project.id}/checks`, {});
              setChecks(r.checks);
              setNotice("Launch checks passed for the saved website version.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && operation === "checks" ? "Checking website…" : "Run launch checks"}
        </button>
      </div>
      <button
        className="primary"
        disabled={busy || dirty || !ready}
        onClick={() => setConfirm(true)}
      >
        Review launch
      </button>
      {confirm && (
        <Dialog
          title="Publish your approved website?"
          onClose={() => setConfirm(false)}
        >
          <p>
            The website will be available to visitors at the verified address.
            Later content changes can be published from Pages.
          </p>
          <dl><dt>Public address</dt><dd className="connected-code">{destination}</dd><dt>Saved website revision</dt><dd>{siteRevision}</dd><dt>Verification</dt><dd>All five checks must match this version and address, and be less than 24 hours old.</dd></dl>
          <div className="connected-actions">
            <button onClick={() => setConfirm(false)} disabled={busy}>
              Back
            </button>
            <button
              className="primary"
              disabled={busy || !ready}
              onClick={() => void command("launch")}
            >
              {busy ? "Publishing…" : "Launch website"}
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </section>
  );
}
