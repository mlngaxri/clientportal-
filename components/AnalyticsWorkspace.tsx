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
  comparison: {
    views: number;
    visitors: number;
    actions: number;
    forms: number;
  } | null;
  countries: { country: string; views: number }[] | null;
  pageActions: { page: string; actions: number }[] | null;
};
export default function AnalyticsWorkspace({
  projectId,
}: {
  projectId: string;
}) {
  const [days, setDays] = useState(30),
    [data, setData] = useState<Stats | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    void api<Stats>(`/api/projects/${projectId}/analytics?days=${days}`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [projectId, days, attempt]);
  const maximum = Math.max(1, ...(data?.daily.map((d) => d.views) || []));
  return (
    <section className="direction-workspace">
      <header className="workspace-heading">
        <div>
          <span className="overline">Website / Analytics</span>
          <h1>Understand your audience.</h1>
          <p>
            Real activity from your published website. Visitors are anonymous
            daily estimates. Tracking respects Do Not Track and Global Privacy
            Control.
          </p>
        </div>
      </header>
      <div className="chips">
        {(data?.pro ? [7, 30, 90] : [7, 30]).map((d) => (
          <button aria-pressed={days === d} key={d} onClick={() => setDays(d)}>
            {d} days
          </button>
        ))}
      </div>
      {error && <div role="alert"><p>{error}</p><button onClick={() => setAttempt((n) => n + 1)}>Reload report</button></div>}
      {!data && !error && <p role="status">Loading your {days}-day report…</p>}
      {data && (
        <>
          <div className="connected-metrics">
            {[
              ["Page views", data.views],
              ["Daily visitors", data.visitors],
              ["Action clicks", data.actions],
              ["Enquiries", data.forms],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {!data.views ? (
            <p className="connected-empty">
              No recorded visits in this period. Traffic appears here after
              people visit your live website.
            </p>
          ) : (
            <div
              className="connected-chart"
              role="img"
              aria-label="Daily page views"
            >
              {data.daily.map((d) => (
                <div key={d.date} title={`${d.date}: ${d.views} views`}>
                  <span style={{ height: `${(d.views / maximum) * 155}px` }} />
                  <small>{d.date}</small>
                </div>
              ))}
            </div>
          )}
          <div className="connected-grid">
            {[
              ["Pages", data.pages.map((d) => [d.page, d.views])],
              ["Sources", data.sources.map((d) => [d.source, d.views])],
              ["Devices", data.devices.map((d) => [d.device, d.views])],
            ].map(([label, rows]) => (
              <div className="connected-card" key={String(label)}>
                <h2>{String(label)}</h2>
                <table className="connected-table">
                  <thead>
                    <tr>
                      <th>{String(label)}</th>
                      <th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as (string | number)[][]).map(([name, value]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {data.pro && (
            <div className="connected-card">
              <span className="overline">Pro / Audience detail</span>
              <h2>What changed?</h2>
              <p>
                Previous {days} days: {data.comparison?.views || 0} page views,{" "}
                {data.comparison?.actions || 0} action clicks and{" "}
                {data.comparison?.forms || 0} enquiries. Current period:{" "}
                {data.views} page views, {data.actions} action clicks and{" "}
                {data.forms} enquiries.
              </p>
              <h3>Countries</h3>
              {data.countries?.length ? (
                <ul>
                  {data.countries.map((c) => (
                    <li key={c.country}>
                      {c.country}: {c.views} views
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No country data recorded.</p>
              )}
              <h3>Actions by page</h3>
              {data.pageActions?.length ? (
                <ul>
                  {data.pageActions.map((p) => (
                    <li key={p.page}>
                      {p.page}: {p.actions} clicks
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No action clicks recorded.</p>
              )}
              <p>
                Country information is supplied by hosting when available. These
                are aggregate event counts; enquiries may also come from
                visitors who disable analytics.
              </p>
            </div>
          )}
          {!data.pro && (
            <p>
              Pro adds 90-day reports, comparisons, country detail and action
              counts by page.
            </p>
          )}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                }),
                url = URL.createObjectURL(blob),
                a = document.createElement("a");
              a.href = url;
              a.download = `fourthform-analytics-${days}-days.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export report
          </button>
        </>
      )}
    </section>
  );
}
