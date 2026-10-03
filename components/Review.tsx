"use client";
import { useEffect, useRef, useState } from "react";
import { uploadAsset, assetType } from "../lib/upload-client";
import { api } from "../lib/client";
import type { Board, BoardObject, Project } from "../lib/model";
import { useSave, SaveControl } from "./useSave";
import RecoveryNotice from "./RecoveryNotice";
import ReviewCanvas from "./ReviewCanvas";
import RevisionSubmitDialog from "./RevisionSubmitDialog";
import AnnotationLayer from "./AnnotationLayer";
import { incompleteDirections } from "../lib/review-direction";
export default function Review({ project, board, otherBoards, onRefresh }: { project: Project; board: Board; otherBoards: Board[]; onRefresh: () => void; }) {
  const locked = board.status !== "DRAFT";
  const editor = useSave(board, locked);
  const { data, update, state, error, save, version } = editor;
  const [selected, setSelected] = useState<string | null>(null), [submit, setSubmit] = useState(false), [message, setMessage] = useState(""), [announcement, setAnnouncement] = useState("");
  const keys = useRef<Record<string, string>>({});
  const [uploading, setUploading] = useState(0), [busy, setBusy] = useState(false);
  const [context, setContext] = useState<BoardObject["target"]>();
  const [reattach, setReattach] = useState<string | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null), addDirectionButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { textInput.current?.focus({ preventScroll: true }); textInput.current?.scrollIntoView({ block: "nearest" }); }, [selected]);
  useEffect(() => {
    if (!selected || data.objects.some((object) => object.id === selected)) return;
    setSelected(null);
    setAnnouncement(locked ? "Selected Direction is no longer available." : "Selected Direction is no longer available. Focus moved to Add Direction.");
    if (!locked) requestAnimationFrame(() => addDirectionButton.current?.focus());
  }, [selected, data.objects, locked]);
  const obj = data.objects.find((o) => o.id === selected), incomplete = incompleteDirections(data.objects);
  function add(patch: Partial<BoardObject> = {}) { if (locked) return; const id = crypto.randomUUID(); update((d) => ({ ...d, objects: [...d.objects, { id, type: "text", text: "", ...patch }] })); setAnnouncement(""); setSelected(id); }
  async function replacement(file: File, target: BoardObject["target"]) { if (locked) return; setUploading((n) => n + 1); try { const asset = await uploadAsset(project.id, file); add({ type: assetType(asset.mime), text: target ? "Replace this image" : "", name: asset.name, url: asset.url, assetId: asset.id, target }); setMessage(""); } catch (e) { setMessage(`${(e as Error).message} Your existing Directions are preserved; choose the file again to retry.`); } finally { setUploading((n) => n - 1); } }
  async function command(action: string) { if (busy || uploading) throw new Error("Wait for current uploads or submission to finish."); setBusy(true); try { const b = locked ? board : await save(); if (!b) throw new Error("Save your Directions before submitting."); await api(`/api/projects/${project.id}/command`, { action, payload: { boardId: board.id }, expected: b.version, key: (keys.current[action] ||= crypto.randomUUID()) }); delete keys.current[action]; onRefresh(); } finally { setBusy(false); } }
  return <>
    {project.preview_url ? <ReviewCanvas url={project.preview_url} readOnly={locked} selectedId={selected} directions={data.objects} onSelect={setSelected} onContext={next => setContext(previous => previous?.page === next?.page && previous?.width === next?.width && previous?.scroll === next?.scroll ? previous : next)} onAnnotate={strokes => { if (selected) update(d => ({ ...d, objects: d.objects.map(o => o.id === selected ? { ...o, strokes } : o) })); }} onDirection={patch => { if (reattach && patch.target) { update(d => ({ ...d, objects: d.objects.map(o => o.id === reattach ? { ...o, target: patch.target } : o) })); setSelected(reattach); setReattach(null); setMessage(""); } else add(patch); }} onReplace={replacement} /> : <div className="empty-workspace">The website preview has not been delivered yet.</div>}
    <aside className="portal-v2-inspector">
      <div className="inspector-head"><div><span className="overline">Review</span><h2>{locked ? "Submitted Directions" : "Draft Directions"}</h2></div>{!locked && <button ref={addDirectionButton} type="button" aria-label="Add Direction" onClick={() => add()}>+</button>}</div>
      <RecoveryNotice editor={editor} />
      <div className="inspector-comments">
        {data.objects.map((o, i) => <button type="button" className={`inspector-comment ${selected === o.id ? "active" : ""}`} key={o.id} onClick={() => setSelected(o.id)}><span className="inspector-number">{i + 1}</span><div><span>{o.target?.page ? o.target.page.replace(/^\/review\/[0-9a-f-]{36}/i, "") || "Home" : "General"} · {board.status === "DRAFT" ? "Draft" : board.status === "SUBMITTED" ? "Submitted" : board.status === "IN_PROGRESS" ? "In progress" : "Done"}</span><p>{o.text || o.name || "New Direction"}</p></div></button>)}
        {!data.objects.length && <p className="muted">Click an element on your site, or add a general Direction.</p>}
        {!locked && <><button type="button" className="inspector-new-comment" onClick={() => add()}>+ General Direction</button><button type="button" className="inspector-new-comment" disabled={!context} onClick={() => add({ type: "drawing", strokes: [], target: context })}>Draw a Direction</button><label className="upload-label">Attach a file<input type="file" onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) void replacement(f, undefined); }} /></label></>}
      </div>
      {obj && <div className="selected-comment-editor"><span>{obj.name || obj.target?.selector || "Direction"}</span>{obj.target && <p className="direction-location">Page {obj.target.page.replace(/^\/review\/[0-9a-f-]{36}/i, "") || "Home"} · {obj.target.width} px · {Math.round(obj.target.scroll)} px down the page</p>}{!locked && obj.target && <button type="button" onClick={() => { setReattach(obj.id); setMessage("Click the new location on your website to reattach this Direction."); }}>Reattach to website</button>}{obj.type === "image" && <img className="replacement-preview" src={obj.url} alt={obj.name || "Replacement"} />}<textarea ref={textInput} aria-label="Direction text" maxLength={10000} value={obj.text} readOnly={locked} placeholder="What would you like to change?" onChange={(e) => update((d) => ({ ...d, objects: d.objects.map((o) => o.id === obj.id ? { ...o, text: e.target.value } : o) }))} />{obj.type === "video" && <video controls src={obj.url} />}{obj.type === "audio" && <audio controls src={obj.url} />}{obj.type === "file" && <a href={obj.url} target="_blank" rel="noreferrer">Open {obj.name}</a>}{obj.type === "drawing" && <p>Draw directly over the website preview. Add a written description so your feedback can be understood without the drawing.</p>}{!locked && <div className="row"><button type="button" onClick={() => void save()}>Save Direction</button><button type="button" onClick={() => { editor.removeObjects([obj.id]); setSelected(null); setAnnouncement("Direction deleted. Focus moved to Add Direction."); requestAnimationFrame(() => addDirectionButton.current?.focus()); }}>Delete</button></div>}</div>}
      {otherBoards.filter((b) => b.status !== "DRAFT").map((b) => <details className="history-item" key={b.id}><summary>{b.status === "IN_PROGRESS" ? "Revision in progress" : b.status === "DONE" ? "Completed Revision" : "Submitted Revision"} · {b.data.objects.length} Directions</summary>{(b.submitted_data || b.data).objects.map((o) => <p key={o.id}>{o.text || o.name || o.type}</p>)}</details>)}
      <div className="portal-submit-panel"><span className="mono">Revision {String(locked ? project.revision_used : project.revision_used + 1).padStart(2, "0")} / {String(project.revision_limit).padStart(2, "0")}</span>{!locked && <SaveControl state={state} error={error} onSave={() => void save()} label="Save revision" />}{announcement && <p role="status">{announcement}</p>}{uploading > 0 && <p role="status">Uploading {uploading} file(s)…</p>}{message && <p role="alert">{message}</p>}{locked && board.status === "SUBMITTED" ? <><p>Waiting for Fourthform. You can withdraw before work begins.</p><button type="button" disabled={busy} onClick={() => command("withdraw_revision").catch((e) => setMessage(e.message))}>Withdraw Revision</button></> : !locked ? <><p>{Math.max(0, project.revision_limit - project.revision_used)} rounds remaining. Saving preserves this batch. Only submitting uses a round.</p><button type="button" disabled={busy || uploading > 0 || !data.objects.length || incomplete.length > 0 || project.phase === "REVISION_IN_PROGRESS" || project.revision_used >= project.revision_limit} onClick={() => setSubmit(true)}>Submit Revision</button>{incomplete.length > 0 && <p role="status">Finish or delete {incomplete.length} empty Direction{incomplete.length === 1 ? "" : "s"} before submitting.</p>}{project.phase === "REVISION_IN_PROGRESS" && <p>Your next batch can be drafted and saved while we work.</p>}</> : null}</div>
    </aside>
    {submit && <RevisionSubmitDialog objects={data.objects} number={project.revision_used + 1} limit={project.revision_limit} onClose={() => setSubmit(false)} onSubmit={() => command("submit_revision")} />}
  </>;
}
