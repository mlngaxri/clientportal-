"use client";
import { useEffect, useRef, useState } from "react";
import type {
  SiteManifest,
  SiteContent,
  PublishedVersion,
} from "../lib/site/service";
import { contentChanges } from "../lib/content-diff";
import { contentSchema } from "../lib/site/schema";
import Dialog from "./Dialog";
import CustomerSite from "./site/CustomerSite";
import { useLocalDraft, DraftRecovery } from "./useLocalDraft";
import { api, ApiError } from "../lib/client";
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
  const [confirm, setConfirm] = useState<{ action: "publish" | "rollback"; version?: PublishedVersion } | null>(null);
  const [localPreview, setLocalPreview] = useState(false);
  const [conflict, setConflict] = useState<Data | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [checked, setChecked] = useState<{ url: string; at: string } | null>(null);
  const draft = useLocalDraft(`fourthform:content:${projectId}`, data?.content || null, dirty, data?.manifest.revision || "");
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
    setError("");
    setNeedsReload(false);
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
      const receipt = await api(url, { ...body, key: pending.current.key });
      pending.current = null;
      if (receipt.manifest && receipt.content && receipt.revision) {
        setData({ ...data, manifest: receipt.manifest, content: receipt.content, history: receipt.version ? [receipt.version, ...data.history] : data.history });
        setSaved(receipt.content);
        setDirty(false);
        draft.clear();
      } else {
        setNeedsReload(true);
        setNotice("The change was accepted. Reload the website before making another change.");
        await load(); setDirty(false); draft.clear();
      }
      setConfirm(null);
      setNotice(
        action === "save"
          ? "Draft saved to your account."
          : "Your website has been updated.",
      );
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 409) setNeedsReload(true);
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
      {data && <DraftRecovery draft={draft} revision={data.manifest.revision} onRestore={content => { const parsed = contentSchema.safeParse(content); if (!parsed.success) { setError("This recovery copy is invalid. Keep the saved version or restore an exported draft."); return; } update(parsed.data); }} />}
      {needsReload && <div className="recovery-notice"><p>Reload the latest saved content to compare it with your edits. Your draft remains on this device.</p><button disabled={busy} onClick={async () => { try { setConflict(await api<Data>(url)); setError(""); } catch (e) { setError((e as Error).message); } }}>Compare latest saved version</button></div>}
      {conflict && data && <section className="recovery-notice"><h2>The saved version changed.</h2><ul>{contentChanges(conflict.manifest, conflict.content, data.content).map(c => <li key={c.label}><strong>{c.label}</strong><p>Saved: {c.before || "Empty"}</p><p>Your edit: {c.after || "Empty"}</p></li>)}</ul><div className="connected-actions"><button onClick={() => { setData(conflict); setSaved(conflict.content); setDirty(false); setConflict(null); setNeedsReload(false); draft.clear(); }}>Use saved version</button><button onClick={() => { setSaved(conflict.content); setData({ ...conflict, content: data.content }); setConflict(null); setNeedsReload(false); pending.current = null; setDirty(true); }}>Keep my edits against this version</button></div></section>}
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
          <p role="status">{dirty ? "Unsaved edits on this device" : "Draft saved to your account"} · {data.history[0] ? `Published ${new Date(data.history[0].deployedAt).toLocaleString()}` : "Not published yet"}</p>
          <fieldset className="connected-card" disabled={busy || !!draft.recovery || !!conflict}>
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
                  {f.kind !== "image" && <small>{(data.content.fields[f.id] || "").length} / {f.maxLength || 10000} characters</small>}
                  {f.kind === "link" && <small>Use https://, mailto:you@example.com, tel:+61…, /a-page or #a-section.</small>}
                  {f.role === "image-alt" && <small>Describe what the image communicates. Leave empty only for a decorative image.</small>}
                  {f.kind === "image" && <small>The image follows the approved layout crop. Check its focus in the preview and describe its content in the image description field.</small>}
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
                <p className="notice">This asks search engines to exclude the page after publication. It does not make the page private, and existing search results can take time to update.</p>
                <div className="search-snippet" aria-label="Example search result"><span>{page.path === "/" ? "yourwebsite.com" : `yourwebsite.com${page.path}`}</span><h3>{data.content.seo[page.id]?.title || page.title}</h3><p>{data.content.seo[page.id]?.description || "Add a useful description of this page."}</p><small>Appearance can vary in real search results.</small></div>
              </>
            )}
          </fieldset>
          <div className="connected-actions">
            <button
              className="primary"
              disabled={!dirty || busy || needsReload || !!draft.recovery}
              onClick={() => void command("save")}
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
            {live && (
              <button
                disabled={
                  busy || needsReload || !!draft.recovery ||
                  (!dirty &&
                    data.history[0] &&
                    JSON.stringify(data.history[0].content) ===
                      JSON.stringify(data.content))
                }
                onClick={() => setConfirm({ action: "publish" })}
              >
                Publish changes
              </button>
            )}
            <button disabled={busy} onClick={() => setLocalPreview(true)}>Preview current edits</button>
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
                    draft.clear();
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
                    setChecked({ url: r.url, at: r.checkedAt });
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
              {checked && <p>Inspected <a href={checked.url} target="_blank" rel="noreferrer">{checked.url}</a> at {new Date(checked.at).toLocaleString()}.</p>}
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
                data.history.map((v, index) => (
                  <div className="connected-actions" key={v.id}>
                    <span>Version {data.history.length - index} · {index === 0 ? "Current publication · " : ""}{new Date(v.deployedAt).toLocaleString()}<small>{Object.values(v.content.seo).map(s => s.title).join(" · ")}</small></span>
                    <button
                      disabled={dirty || busy}
                      onClick={() => setConfirm({ action: "rollback", version: v })}
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
          {dirty && <p role="status">Edits are kept on this device for recovery until a save is confirmed.</p>}
          {localPreview && <Dialog title="Preview your current edits" onClose={() => setLocalPreview(false)}><p>{dirty ? "This preview includes unsaved edits. Save the draft before sharing its review link." : "Your saved draft in the approved layout."} It has not changed the public website.</p><div className="content-preview"><CustomerSite inline site={{ project: { id: projectId, name: data.manifest.theme?.name || "Your website", phase: "REVIEW", pro: false }, manifest: data.manifest, content: data.content, revision: data.manifest.revision, base: `/review/${projectId}`, connections: {} }} pageId={page.id} review /></div></Dialog>}
          {confirm && <Dialog title={confirm.action === "publish" ? "Publish these changes?" : "Restore this published version?"} onClose={() => { if (!busy) setConfirm(null); }}><p>{confirm.action === "rollback" ? "This creates a new publication using the selected version. Your history is preserved." : "These changes will replace content on your public website."}</p><ul className="publication-diff">{contentChanges(data.manifest, data.history[0]?.content || null, confirm.version?.content || data.content).map(c => <li key={c.label}><strong>{c.label}</strong><del>{c.before || "Empty"}</del><span>{c.after || "Empty"}</span></li>)}</ul><div className="connected-actions"><button disabled={busy} onClick={() => setConfirm(null)}>Keep editing</button><button className="primary" disabled={busy || needsReload} onClick={() => void command(confirm.action, confirm.version?.id)}>{busy ? "Publishing…" : confirm.action === "publish" ? "Publish changes" : "Restore as new version"}</button></div>{error && <p role="alert">{error}</p>}</Dialog>}
        </>
      )}
    </section>
  );
}
