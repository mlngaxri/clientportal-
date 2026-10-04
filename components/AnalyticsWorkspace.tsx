"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/client";
type Stats = {
  views: number;
  visitors: number;
  actions: number;
  forms: number;
  daily: { date: string; views: number }[];
  pages: { page: string; views: number }[];
  sources: { source: string; views: number }[];
  devices: { device: string; views: number }[];
  days: number;
  pro: boolean;
  comparison: { views: number; visitors: number; actions: number; forms: number } | null;
  countries: { country: string; views: number }[] | null;
  pageActions: { page: string; actions: number }[] | null;
};
export default function AnalyticsWorkspace({ projectId }: { projectId: string }) {
  const [days, setDays] = useState(30), [data, setData] = useState<Stats | null>(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0), [loading, setLoading] = useState(true), [proProject, setProProject] = useState<string | null>(null);
  const pro = proProject === projectId;
  useEffect(() => {
    let active = true;
    setError(""); setLoading(true); setData(null);
    void api<Stats>(`/api/projects/${projectId}/analytics?days=${days}`)
      .then((d) => { if (active) { setData(d); setProProject(d.pro ? projectId : null); } })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, days, attempt]);
  const maximum = Math.max(1, ...(data?.daily.map((d) => d.views) || []));
  return (
    <section className="direction-workspace">
      <header className="workspace-heading"><div><span className="overline">Website / Analytics</span><h1>Understand your audience.</h1><p>Activity from your published website. Visitor days add each day’s anonymous visitor estimate, so a returning person may count on several days. Action clicks show intent, not completed bookings. Tracking respects browser privacy signals.</p></div></header>
      <div className="chips">{(pro ? [7, 30, 90] : [7, 30]).map((d) => (<button type="button" aria-pressed={days === d} key={d} onClick={() => setDays(d)} disabled={loading && days === d}>{d} days</button>))}</div>
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>Reload report</button></div>}
      {loading && !error && <p role="status">Loading your {days}-day report…</p>}
      {data && !loading && (<>
        <p className="overline">{data.daily[0]?.date || "Start of period"} to {data.daily.at(-1)?.date || "today"} · UTC reporting days</p>
        <div className="connected-metrics">{[["Page views", data.views], ["Visitor days", data.visitors], ["Action clicks", data.actions], ["Enquiries", data.forms]].map(([label, value]) => (<div key={label}><span>{label}</span><strong>{value}</strong></div>))}</div>
        {!data.views ? <p className="connected-empty">No recorded visits in this period. Traffic appears here after people visit your live website.</p> : <div className="connected-chart" role="img" aria-label="Daily page views">{data.daily.map((d) => (<div key={d.date} title={`${d.date}: ${d.views} views`}><span style={{ height: `${(d.views / maximum) * 155}px` }} /><small>{d.date}</small></div>))}</div>}
        <details className="connected-card"><summary>Daily page views as a table</summary><table className="connected-table"><thead><tr><th>Date (UTC)</th><th>Page views</th></tr></thead><tbody>{data.daily.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.views}</td></tr>)}</tbody></table></details>
        <div className="connected-grid">{[["Pages", data.pages.map((d) => [d.page, d.views])], ["Sources", data.sources.map((d) => [d.source, d.views])], ["Devices", data.devices.map((d) => [d.device, d.views])]].map(([label, rows]) => (<div className="connected-card" key={String(label)}><h2>{String(label)}</h2><div role="region" aria-label={`${String(label)} analytics table`} tabIndex={0} style={{ overflowX: "auto" }}><table className="connected-table"><thead><tr><th>{String(label)}</th><th>Views</th></tr></thead><tbody>{(rows as (string | number)[][]).map(([name, value]) => (<tr key={name}><td>{name}</td><td>{value}</td></tr>))}</tbody></table></div></div>))}</div>
        {data.pro && <div className="connected-card"><span className="overline">Pro / Audience detail</span><h2>What changed?</h2><div role="region" aria-label="Analytics period comparison" tabIndex={0} style={{ overflowX: "auto" }}><table className="connected-table"><thead><tr><th>Metric</th><th>Current {days} days</th><th>Previous {days} days</th><th>Change</th></tr></thead><tbody>{([["Page views", "views"], ["Visitor days", "visitors"], ["Action clicks", "actions"], ["Enquiries", "forms"]] as const).map(([label, key]) => { const current = data[key], previous = data.comparison?.[key] || 0; return <tr key={key}><td>{label}</td><td>{current}</td><td>{previous}</td><td>{previous ? `${Math.round((current - previous) / previous * 100)}%` : current ? "New activity" : "No change"}</td></tr>; })}</tbody></table></div><h3>Countries</h3>{data.countries?.length ? <ul>{data.countries.map((c) => <li key={c.country}>{c.country}: {c.views} views</li>)}</ul> : <p>No country data recorded.</p>}<h3>Actions by page</h3>{data.pageActions?.length ? <ul>{data.pageActions.map((p) => <li key={p.page}>{p.page}: {p.actions} clicks</li>)}</ul> : <p>No action clicks recorded.</p>}<p>Country information is supplied by hosting when available. These are aggregate event counts; enquiries may also come from visitors who disable analytics.</p></div>}
        {!data.pro && <p>Pro adds 90-day reports, comparisons, country detail and action counts by page.</p>}
        <button type="button" onClick={() => { const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`; const rows = [["Fourthform analytics", `${days} days`, "UTC"], ["Metric", "Value"], ["Page views", data.views], ["Visitor days", data.visitors], ["Action clicks", data.actions], ["Enquiries", data.forms], [], ["Date", "Page views"], ...data.daily.map(d => [d.date, d.views]), [], ["Page", "Views"], ...data.pages.map(d => [d.page, d.views]), [], ["Source", "Views"], ...data.sources.map(d => [d.source, d.views])]; const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `fourthform-analytics-${days}-days.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Export CSV report</button>
      </>)}
    </section>
  );
}
