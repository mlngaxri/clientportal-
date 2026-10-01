"use client";
import { useEffect, useRef, useState } from "react";
import type {
  SiteManifest,
  SiteContent,
  PublishedVersion,
} from "../lib/site/service";
import { api } from "../lib/client";
import { uploadAsset } from "../lib/upload-client";
import { useUnsavedGuard } from "./useUnsavedGuard";
type Data = {
  manifest: SiteManifest;
  content: SiteContent;
  history: PublishedVersion[];
};
export default function SiteContentEditor({
  projectId,
  section,
  live,
}: {
  projectId: string;
  section: "pages" | "seo";
  live: boolean;
}) {
  const [data, setData] = useState<Data | null>(null),
    [saved, setSaved] = useState<SiteContent | null>(null),
    [selected, setSelected] = useState(""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [inspection, setInspection] = useState<
      { label: string; status: string; detail: string }[] | null
    >(null);
  const [insights, setInsights] = useState<string[] | null>(null);
  const pending = useRef<{ body: string; key: string } | null>(null);
  useUnsavedGuard(dirty);
  const url = `/api/projects/${projectId}/site`;
  async function load(signal?: AbortSignal) {
    const r = await fetch(url, { cache: "no-store", signal });
    const value = await r.json();
    if (!r.ok)
      throw new Error(value.error || "Your website could not be loaded.");
    setData(value);
    setSaved(value.content);
    setSelected((p) => p || value.manifest.pages[0].id);
  }
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal).catch((e) => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [projectId]);
  const page =
    data?.manifest.pages.find((p) => p.id === selected) ||
    data?.manifest.pages[0];
  function update(content: SiteContent) {
    if (data) {
      setData({ ...data, content });
      setDirty(true);
      setNotice("");
      setInspection(null);
    }
  }
  async function command(
    action: "save" | "publish" | "rollback",
    versionId?: string,
  ) {
    if (!data || busy) return;
    const body = {
      action,
      content: data.content,
      versionId,
      expectedRevision: data.manifest.revision,
    };
    const serial = JSON.stringify(body);
    if (pending.current?.body !== serial)
      pending.current = { body: serial, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await api(url, { ...body, key: pending.current.key });
      pending.current = null;
      await load();
      setDirty(false);
      setNotice(
        action === "save"
          ? "Draft saved to your account."
          : "Your website has been updated.",
      );
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
          <span className="overline">
            Website / {section === "seo" ? "Search" : "Pages"}
          </span>
          <h1>
            {section === "seo"
              ? "Help people find you."
              : "Keep your website current."}
          </h1>
          <p>
            Save your draft first, then publish when you are ready. Published
            versions can be restored.
          </p>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && (
        <button onClick={() => void load().catch((e) => setError(e.message))}>
          Load website
        </button>
      )}
      {data && page && (
        <>
          <div className="chips">
            {data.manifest.pages.map((p) => (
              <button
                key={p.id}
                aria-pressed={p.id === page.id}
                onClick={() => {
                  setSelected(p.id);
                  setInspection(null);
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
          <fieldset className="connected-card" disabled={busy}>
            <legend>{page.title}</legend>
            {section === "pages" ? (
              page.fields.map((f) => (
                <label key={f.id}>
                  {f.label}
                  {f.kind === "image" ? (
                    <>
                      {data.content.fields[f.id] && (
                        <img
                          src={`/api/assets/${data.content.fields[f.id]}`}
                          alt="Selected website image"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBusy(true);
                          setError("");
                          try {
                            const asset = await uploadAsset(projectId, file);
                            update({
                              ...data.content,
                              fields: {
                                ...data.content.fields,
                                [f.id]: asset.id,
                              },
                            });
                          } catch (err) {
                            setError((err as Error).message);
                          } finally {
                            setBusy(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      {data.content.fields[f.id] && (
                        <button
                          type="button"
                          onClick={() =>
                            update({
                              ...data.content,
                              fields: { ...data.content.fields, [f.id]: "" },
                            })
                          }
                        >
                          Remove image
                        </button>
                      )}
                    </>
                  ) : f.role === "body" ? (
                    <textarea
                      rows={5}
                      maxLength={f.maxLength || 10000}
                      value={data.content.fields[f.id] || ""}
                      onChange={(e) =>
                        update({
                          ...data.content,
                          fields: {
                            ...data.content.fields,
                            [f.id]: e.target.value,
                          },
                        })
                      }
                    />
                  ) : (
                    <input
                      type={f.kind === "link" ? "text" : "text"}
                      maxLength={f.maxLength || 10000}
                      value={data.content.fields[f.id] || ""}
                      onChange={(e) =>
                        update({
                          ...data.content,
                          fields: {
                            ...data.content.fields,
                            [f.id]: e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </label>
              ))
            ) : (
              <>
                {["title", "description"].map((f) => (
                  <label key={f}>
                    {f === "title" ? "Search title" : "Search description"}
                    <textarea
                      rows={f === "title" ? 2 : 4}
                      maxLength={f === "title" ? 160 : 500}
                      value={
                        data.content.seo[page.id]?.[
                          f as "title" | "description"
                        ] || ""
                      }
                      onChange={(e) =>
                        update({
                          ...data.content,
                          seo: {
                            ...data.content.seo,
                            [page.id]: {
                              ...(data.content.seo[page.id] || {
                                title: "",
                                description: "",
                                noindex: false,
                              }),
                              [f]: e.target.value,
                            },
                          },
                        })
                      }
                    />
                    <small>
                      {
                        (
                          data.content.seo[page.id]?.[
                            f as "title" | "description"
                          ] || ""
                        ).length
                      }{" "}
                      characters
                    </small>
                  </label>
                ))}
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={data.content.seo[page.id]?.noindex || false}
                    onChange={(e) =>
                      update({
                        ...data.content,
                        seo: {
                          ...data.content.seo,
                          [page.id]: {
                            ...data.content.seo[page.id],
                            noindex: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Keep this page out of search results
                </label>
              </>
            )}
          </fieldset>
          <div className="connected-actions">
            <button
              className="primary"
              disabled={!dirty || busy}
              onClick={() => void command("save")}
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
            {live && (
              <button
                disabled={
                  busy ||
                  (!dirty &&
                    data.history[0] &&
                    JSON.stringify(data.history[0].content) ===
                      JSON.stringify(data.content))
                }
                onClick={() => {
                  if (
                    window.confirm(
                      "Publish these changes to your live website?",
                    )
                  )
                    void command("publish");
                }}
              >
                Publish changes
              </button>
            )}
            <a
              href={`/review/${projectId}${page.path}`}
              target="_blank"
              rel="noreferrer"
            >
              Preview saved draft ↗
            </a>
            {dirty && (
              <button
                disabled={busy}
                onClick={() => {
                  if (saved && window.confirm("Discard your unsaved edits?")) {
                    setData({ ...data, content: saved });
                    setDirty(false);
                  }
                }}
              >
                Discard edits
              </button>
            )}
          </div>
          {section === "seo" && live && (
            <>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const r = await api(
                      `/api/projects/${projectId}/inspect?page=${page.id}`,
                    );
                    setInspection(r.checks);
                    setInsights(r.insights);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Inspect the published page
              </button>
              {insights && (
                <div className="connected-card">
                  <span className="overline">Pro / Search insights</span>
                  <h2>Across your published pages</h2>
                  <ul>
                    {insights.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  <p>
                    These observations come from your website content. Search
                    placement and indexing are decided by search engines.
                  </p>
                </div>
              )}
              {inspection && (
                <ul className="connected-checks">
                  {inspection.map((c) => (
                    <li key={c.label}>
                      <strong>
                        {c.label} · {c.status}
                      </strong>
                      <span>{c.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {live && (
            <details className="connected-card">
              <summary>Published history</summary>
              {data.history.length ? (
                data.history.map((v) => (
                  <div className="connected-actions" key={v.id}>
                    <span>{new Date(v.deployedAt).toLocaleString()}</span>
                    <button
                      disabled={dirty || busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Restore this content as a new published version?",
                          )
                        )
                          void command("rollback", v.id);
                      }}
                    >
                      Restore version
                    </button>
                  </div>
                ))
              ) : (
                <p>No published versions yet.</p>
              )}
            </details>
          )}
          {dirty && <p role="status">Unsaved edits on this page</p>}
        </>
      )}
    </section>
  );
}
